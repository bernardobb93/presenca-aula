import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase, supabaseConfigured } from '../src/lib/supabase';
import { useApp } from '../src/context/AppContext';

type School = { id: string; name: string; invite_code: string; created_by: string };
type Member = { school_id: string; user_id: string; role: 'administrador'|'coordenador'|'professor'|'consulta' };
type SchoolClass = { id: string; name: string; teacher?: string|null };
type ClassSubject = { id: string; class_id: string; name: string };
type Assignment = { class_subject_id: string; user_id: string };
type Profile = { id: string; full_name: string | null };
const roles: Member['role'][] = ['administrador','coordenador','professor','consulta'];

export default function SchoolManagement() {
  const { refresh } = useApp();
  const [school, setSchool] = useState<School|null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [myRole, setMyRole] = useState<Member['role']|null>(null);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const load = useCallback(async () => {
    if (!supabaseConfigured) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: membership, error: memberError } = await supabase.from('school_members').select('school_id,user_id,role').eq('user_id', user.id).order('created_at').limit(1).maybeSingle();
    if (memberError) { setError(`${memberError.message}. Se ainda não executou supabase/school_management.sql, execute-o no SQL Editor.`); return; }
    if (!membership) { setSchool(null); setMembers([]); setMyRole(null); setClasses([]); setAssignments([]); setClassSubjects([]); setProfiles([]); return; }
    setMyRole(membership.role);
    const [{ data: schoolRow, error: schoolError }, { data: memberRows, error: listError }, { data: classRows }, { data: assignmentRows }] = await Promise.all([
      supabase.from('schools').select('id,name,invite_code,created_by').eq('id', membership.school_id).single(),
      supabase.from('school_members').select('school_id,user_id,role').eq('school_id', membership.school_id).order('created_at'),
      supabase.from('classes').select('id,name,teacher').eq('school_id', membership.school_id).order('name'),
      supabase.from('class_subject_teachers').select('class_subject_id,user_id').eq('school_id', membership.school_id)
    ]);
    const [{ data: subjectRows, error: subjectError }] = await Promise.all([supabase.from('class_subjects').select('id,class_id,name').eq('school_id', membership.school_id).order('name')]);
    if (subjectError) { setError(`${subjectError.message}. Execute supabase/multiple_subjects_attendance.sql e a nova migração de atribuição por disciplina.`); return; }
    const { data: profileRows } = await supabase.from('profiles').select('id,full_name').in('id', (memberRows || []).map((m: Member) => m.user_id));
    if (schoolError || listError) { setError((schoolError || listError)?.message || 'Falha ao carregar escola.'); return; }
    setSchool(schoolRow as School); setMembers((memberRows || []) as Member[]); setClasses((classRows || []) as SchoolClass[]); setAssignments((assignmentRows || []) as Assignment[]); setClassSubjects((subjectRows || []) as ClassSubject[]); setProfiles((profileRows || []) as Profile[]); setError('');
  }, []);

  useEffect(() => { load().catch(e => setError(e instanceof Error ? e.message : String(e))); }, [load]);

  async function run(action: 'create'|'join') {
    setBusy(true); setError(''); setNotice('');
    try {
      const { data, error: rpcError } = action === 'create'
        ? await supabase.rpc('create_school', { school_name: name.trim() })
        : await supabase.rpc('join_school', { code: code.trim().toUpperCase() });
      if (rpcError) throw rpcError;
      setNotice(action === 'create' ? 'Escola criada! Compartilhe o código de convite com a equipe.' : 'Você entrou na escola.');
      setName(''); setCode('');
      await load();
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  async function changeRole(member: Member, role: Member['role']) {
    setError('');
    const { error: updateError } = await supabase.from('school_members').update({ role }).eq('school_id', member.school_id).eq('user_id', member.user_id);
    if (updateError) setError(updateError.message); else await load();
  }

  async function removeMember(member: Member, action: 'remove_from_school'|'delete_account') {
    if (!school || myRole !== 'administrador') return;
    setBusy(true); setError(''); setNotice('');
    try {
      const { data, error: fnError } = await supabase.functions.invoke('delete-user', {
        body: { school_id: school.id, user_id: member.user_id, action },
      });
      if (fnError) throw new Error(data?.error || fnError.message || 'Não foi possível concluir a operação.');
      if (data?.error) throw new Error(data.error);
      setNotice(data?.message || 'Operação concluída.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  }

  function confirmMemberAction(member: Member, action: 'remove_from_school'|'delete_account') {
    const displayName = profiles.find(p => p.id === member.user_id)?.full_name || 'este usuário';
    const destructive = action === 'delete_account';
    const message = destructive
      ? `Excluir definitivamente a conta de ${displayName}? Isso remove a conta do Supabase Auth e pode afetar o acesso a todas as escolas. Esta ação não pode ser desfeita.`
      : `Remover ${displayName} desta escola? A conta continuará existindo e poderá ser adicionada a outra escola.`;
    const proceed = () => { void removeMember(member, action); };
    const browserConfirm = (globalThis as any).confirm;
    if (Platform.OS === 'web' && typeof browserConfirm === 'function') {
      if (browserConfirm(message)) proceed();
      return;
    }
    Alert.alert(destructive ? 'Excluir conta definitivamente' : 'Remover da escola', message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: destructive ? 'Excluir conta' : 'Remover', style: 'destructive', onPress: proceed },
    ]);
  }

  async function toggleAssignment(classSubjectId: string, userId: string) {
    if (!school || !['administrador','coordenador'].includes(myRole || '')) return;
    setError('');
    const exists = assignments.some(a => a.class_subject_id === classSubjectId && a.user_id === userId);
    const result = exists
      ? await supabase.from('class_subject_teachers').delete().eq('school_id', school.id).eq('class_subject_id', classSubjectId).eq('user_id', userId)
      : await supabase.from('class_subject_teachers').insert({ school_id: school.id, class_subject_id: classSubjectId, user_id: userId });
    if (result.error) { setError(result.error.message); return; }
    await load();
  }

  async function copyCode() {
    if (!school?.invite_code) return;
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) await navigator.clipboard.writeText(school.invite_code);
      else Alert.alert('Código de convite', school.invite_code);
      setNotice('Código de convite pronto para compartilhar.');
    } catch { Alert.alert('Código de convite', school.invite_code); }
  }

  if (!supabaseConfigured) return <View style={s.page}><Text style={s.title}>Gestão da escola</Text><Text style={s.muted}>Configure o Supabase para usar escolas e permissões.</Text><Action label="Voltar" onPress={() => router.back()} /></View>;

  return <ScrollView style={s.page} contentContainerStyle={s.content}>
    <TouchableOpacity onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={20} color="#0F766E"/><Text style={s.backText}>Voltar ao painel</Text></TouchableOpacity>
    <View style={s.header}><View style={s.icon}><Ionicons name="business" size={27} color="#FFFFFF"/></View><Text style={s.title}>Gestão da escola</Text><Text style={s.muted}>Turmas, professores e permissões em um só lugar.</Text></View>
    {error ? <View style={s.error}><Text style={s.errorText}>{error}</Text></View> : null}
    {notice ? <View style={s.notice}><Text style={s.noticeText}>{notice}</Text></View> : null}
    {school ? <>
      <View style={s.card}>
        <Text style={s.eyebrow}>ESCOLA ATUAL</Text><Text style={s.schoolName}>{school.name}</Text>
        <Text style={s.muted}>Seu perfil: {myRole || 'membro'}</Text>
        <View style={s.codeBox}><View style={{flex:1}}><Text style={s.eyebrow}>CÓDIGO DE CONVITE</Text><Text style={s.code}>{school.invite_code}</Text></View><TouchableOpacity onPress={copyCode} style={s.smallButton}><Ionicons name="copy-outline" size={17} color="#FFFFFF"/><Text style={s.smallButtonText}>Copiar</Text></TouchableOpacity></View>
        <Text style={s.help}>Compartilhe esse código com os professores. Você também pode participar de outra escola usando o código dela abaixo.</Text>
      </View>
      <View style={s.card}><Text style={s.cardTitle}>Entrar em outra escola</Text><Text style={s.help}>Sua conta pode participar de mais de uma escola. Digite o código de convite da outra escola; depois, alterne entre elas no painel inicial.</Text><TextInput style={s.input} value={code} onChangeText={setCode} autoCapitalize="characters" placeholder="Código de convite" placeholderTextColor="#94A3B8"/><Action label={busy?'Aguarde…':'Entrar na escola'} disabled={busy||code.trim().length<4} onPress={() => run('join')}/></View>
      <View style={s.card}><Text style={s.cardTitle}>Professores por turma e disciplina</Text>
        <Text style={s.help}>Marque cada professor nas disciplinas que leciona. A chamada e as permissões são independentes por disciplina.</Text>
        {classes.length === 0 ? <Text style={s.empty}>Ainda não há turmas cadastradas. Cadastre uma em “Turmas e alunos” e volte aqui.</Text> : classes.map(c => <View key={c.id} style={s.classBlock}><Text style={s.className}>{c.name}</Text>
          {classSubjects.filter(cs => cs.class_id === c.id).length === 0 ? <Text style={s.memberSub}>Nenhuma disciplina cadastrada. Execute as migrações de disciplinas no Supabase.</Text> : classSubjects.filter(cs => cs.class_id === c.id).map(cs => <View key={cs.id} style={{paddingVertical:8,borderTopWidth:1,borderTopColor:'#E2E8F0'}}><Text style={{fontSize:13,fontWeight:'800',color:'#0F766E',marginBottom:5}}>{cs.name}</Text>{members.filter(m => m.role === 'professor').length === 0 ? <Text style={s.memberSub}>Nenhum membro com perfil Professor.</Text> : members.filter(m => m.role === 'professor').map(m => { const assigned = assignments.some(a => a.class_subject_id === cs.id && a.user_id === m.user_id); return <TouchableOpacity key={m.user_id} disabled={!['administrador','coordenador'].includes(myRole || '')} onPress={() => toggleAssignment(cs.id,m.user_id)} style={s.assignmentRow}><Ionicons name={assigned?'checkbox':'square-outline'} size={20} color={assigned?'#0F766E':'#94A3B8'}/><Text style={s.assignmentText}>{profiles.find(p => p.id === m.user_id)?.full_name || `Professor ${m.user_id.slice(0,8)}`}</Text><Text style={s.assignmentStatus}>{assigned?'Atribuído':'Não atribuído'}</Text></TouchableOpacity>; })}</View>)}
        </View>)}
      </View>
      <View style={s.card}><Text style={s.cardTitle}>Membros e níveis de acesso</Text>
        {members.map((m) => <View key={m.user_id} style={s.memberRow}><View style={s.avatar}><Ionicons name="person" size={18} color="#0F766E"/></View><View style={{flex:1}}><Text style={s.memberId}>{profiles.find(p => p.id === m.user_id)?.full_name || (m.user_id === school.created_by ? 'Responsável pela escola' : 'Professor sem nome cadastrado')}</Text><Text style={s.memberSub}>{m.user_id.slice(0,8)}…{m.user_id.slice(-4)}</Text></View><View style={{alignItems:'flex-end',gap:6}}>{myRole === 'administrador' && m.user_id !== school.created_by ? <><View style={s.roleSelect}>{roles.map(r=><TouchableOpacity key={r} onPress={() => changeRole(m,r)} style={[s.roleChip,m.role===r&&s.roleActive]}><Text style={[s.roleText,m.role===r&&s.roleTextActive]}>{r}</Text></TouchableOpacity>)}</View><TouchableOpacity disabled={busy} onPress={() => confirmMemberAction(m,'remove_from_school')} style={s.removeButton}><Ionicons name="person-remove-outline" size={14} color="#B45309"/><Text style={s.removeText}>Remover da escola</Text></TouchableOpacity><TouchableOpacity disabled={busy} onPress={() => confirmMemberAction(m,'delete_account')} style={s.deleteButton}><Ionicons name="trash-outline" size={14} color="#B91C1C"/><Text style={s.deleteText}>Excluir conta</Text></TouchableOpacity></> : <Text style={s.roleLabel}>{m.role}</Text>}</View></View>)}
        <Text style={s.help}>Administrador: gerencia a escola e os acessos. Coordenador: gerencia turmas e acompanha registros. Professor: acessa turmas atribuídas. Consulta: visualização.</Text>
      </View>
    </> : <>
      <View style={s.card}><Text style={s.cardTitle}>Criar uma escola</Text><Text style={s.help}>Você será o administrador e poderá compartilhar um código de convite com a equipe.</Text><TextInput style={s.input} value={name} onChangeText={setName} placeholder="Nome da escola" placeholderTextColor="#94A3B8"/><Action label={busy?'Aguarde…':'Criar escola'} disabled={busy||name.trim().length<2} onPress={() => run('create')}/></View>
      <View style={s.card}><Text style={s.cardTitle}>Entrar em uma escola</Text><Text style={s.help}>Digite o código de convite fornecido pelo administrador.</Text><TextInput style={s.input} value={code} onChangeText={setCode} autoCapitalize="characters" placeholder="Ex.: A1B2C3D4" placeholderTextColor="#94A3B8"/><Action label={busy?'Aguarde…':'Entrar com código'} disabled={busy||code.trim().length<4} onPress={() => run('join')}/></View>
    </>}
    <Text style={s.footer}>As permissões são verificadas no banco de dados por políticas RLS.</Text>
  </ScrollView>;
}

function Action({label,onPress,disabled}:{label:string;onPress:()=>void;disabled?:boolean}) { return <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={onPress} style={[s.button,disabled&&{opacity:.55}]}><Text style={s.buttonText}>{label}</Text></TouchableOpacity>; }
const s = StyleSheet.create({page:{flex:1,backgroundColor:'#F3F6FA'},content:{padding:22,paddingTop:24,paddingBottom:44,width:'100%',maxWidth:900,alignSelf:'center'},back:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:20},backText:{color:'#0F766E',fontWeight:'700'},header:{backgroundColor:'#DCEBFF',borderRadius:18,padding:22,alignItems:'center',marginBottom:18},icon:{width:48,height:48,borderRadius:14,backgroundColor:'#4778D0',alignItems:'center',justifyContent:'center',marginBottom:12},title:{fontSize:27,fontWeight:'900',color:'#172033',textAlign:'center'},muted:{fontSize:14,color:'#64748B',marginTop:5,textAlign:'center'},card:{backgroundColor:'#FFFFFF',borderRadius:17,padding:20,marginBottom:16,borderWidth:1,borderColor:'#E2E8F0'},cardTitle:{fontSize:19,fontWeight:'800',color:'#172033',marginBottom:9},eyebrow:{fontSize:11,fontWeight:'800',letterSpacing:1,color:'#64748B'},schoolName:{fontSize:24,fontWeight:'900',color:'#0F766E',marginTop:7},codeBox:{flexDirection:'row',alignItems:'center',backgroundColor:'#F1F5F9',borderRadius:13,padding:14,marginTop:18,gap:12},code:{fontSize:24,fontWeight:'900',letterSpacing:3,color:'#172033',marginTop:5},smallButton:{flexDirection:'row',gap:6,alignItems:'center',backgroundColor:'#0F766E',paddingVertical:10,paddingHorizontal:12,borderRadius:10},smallButtonText:{color:'#FFFFFF',fontWeight:'800'},help:{fontSize:13,lineHeight:19,color:'#64748B',marginTop:12},memberRow:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:13,borderBottomWidth:1,borderBottomColor:'#E2E8F0'},avatar:{width:36,height:36,borderRadius:18,backgroundColor:'#D1FAE5',alignItems:'center',justifyContent:'center'},memberId:{fontSize:14,fontWeight:'700',color:'#172033'},memberSub:{fontSize:11,color:'#94A3B8',marginTop:3},roleLabel:{fontSize:12,fontWeight:'800',color:'#0F766E'},roleSelect:{maxWidth:180,flexDirection:'row',flexWrap:'wrap',justifyContent:'flex-end',gap:4},roleChip:{paddingHorizontal:6,paddingVertical:5,borderRadius:8,backgroundColor:'#F1F5F9'},roleActive:{backgroundColor:'#0F766E'},roleText:{fontSize:10,color:'#475569'},roleTextActive:{color:'#FFFFFF',fontWeight:'800'},removeButton:{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:7,paddingVertical:5,borderRadius:7,backgroundColor:'#FFFBEB'},removeText:{fontSize:10,fontWeight:'800',color:'#B45309'},deleteButton:{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:7,paddingVertical:5,borderRadius:7,backgroundColor:'#FEF2F2'},deleteText:{fontSize:10,fontWeight:'800',color:'#B91C1C'},input:{backgroundColor:'#F8FAFC',borderWidth:1,borderColor:'#CBD5E1',borderRadius:11,padding:13,fontSize:15,color:'#172033',marginTop:14,marginBottom:12},button:{backgroundColor:'#0F766E',borderRadius:11,padding:14,alignItems:'center',justifyContent:'center'},buttonText:{color:'#FFFFFF',fontWeight:'800',fontSize:15},error:{backgroundColor:'#FEF2F2',borderColor:'#FECACA',borderWidth:1,padding:12,borderRadius:10,marginBottom:14},errorText:{color:'#991B1B',fontSize:13},notice:{backgroundColor:'#F0FDF4',borderColor:'#BBF7D0',borderWidth:1,padding:12,borderRadius:10,marginBottom:14},noticeText:{color:'#166534',fontSize:13},classBlock:{paddingTop:12,paddingBottom:8,borderBottomWidth:1,borderBottomColor:'#E2E8F0'},className:{fontSize:15,fontWeight:'800',color:'#172033',marginBottom:8},assignmentRow:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:7},assignmentText:{fontSize:12,color:'#334155',flex:1},assignmentStatus:{fontSize:11,color:'#64748B'},empty:{fontSize:13,color:'#64748B',paddingVertical:12},footer:{fontSize:12,color:'#64748B',textAlign:'center',marginTop:8}});
