import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../src/context/AppContext';
import { supabase, supabaseConfigured } from '../src/lib/supabase';

type Entry = { id: string; date: string; objective: string };
type SavedExtras = { id?: string; class_id: string; school_id: string; education_level: string; school_year: string; shift: string; period_start: string; period_end: string; hours: string; entries: Entry[]; signature_date: string };
const makeEntry = (): Entry => ({ id: `${Date.now()}-${Math.random()}`, date: '', objective: '' });
const blankEntries = () => Array.from({ length: 24 }, makeEntry);
const notify = (title: string, message: string) => Platform.OS === 'web' && typeof window !== 'undefined' ? window.alert(`${title}\n\n${message}`) : Alert.alert(title, message);
export default function Extras() {
  const { classes, schools, activeSchoolId, online } = useApp();
  const [classId, setClassId] = useState('');
  const turma = useMemo(() => classes.find(c => c.id === classId), [classes, classId]);
  const schoolName = schools.find(s => s.id === activeSchoolId)?.name || '';
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [period, setPeriod] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [shift, setShift] = useState('');
  const [grade, setGrade] = useState('3º Ano');
  const [educationLevel, setEducationLevel] = useState('Ensino Fundamental');
  const [hours, setHours] = useState('');
  const [entries, setEntries] = useState<Entry[]>(blankEntries);
  const [signatureDate, setSignatureDate] = useState('');
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingRecord, setLoadingRecord] = useState(false);

  // Disciplina e professor são sempre derivados da turma cadastrada.
  const discipline = turma?.subject || '';
  const teacher = turma?.teacher || '';
  const updateEntry = (id: string, field: 'date' | 'objective', value: string) => setEntries(old => old.map(e => e.id === id ? { ...e, [field]: value } : e));

  useEffect(() => {
    let alive = true;
    async function loadForClass() {
      setSavedId(null); setStart(''); setEnd(''); setShift(''); setGrade('3º Ano'); setEducationLevel('Ensino Fundamental'); setHours(''); setSignatureDate(''); setEntries(blankEntries());
      if (!classId || !online || !supabaseConfigured || !activeSchoolId) return;
      setLoadingRecord(true);
      try {
        const { data, error } = await supabase.from('class_extras').select('*').eq('school_id', activeSchoolId).eq('class_id', classId).maybeSingle();
        if (error) throw error;
        if (data && alive) {
          setSavedId(data.id); setYear(data.school_year || String(new Date().getFullYear())); setEducationLevel(data.education_level || 'Ensino Fundamental');
          setStart(data.period_start || ''); setEnd(data.period_end || ''); setShift(data.shift || ''); setGrade(data.grade || ''); setHours(data.hours || ''); setSignatureDate(data.signature_date || '');
          const rows = Array.isArray(data.entries) ? data.entries : [];
          setEntries(rows.length ? rows.map((e: any) => ({ id: e.id || `${Date.now()}-${Math.random()}`, date: e.date || '', objective: e.objective || '' })) : blankEntries());
        } else if (alive) setYear(String(new Date().getFullYear()));
      } catch (e: any) { if (alive) notify('Não foi possível carregar Extras', e.message || String(e)); }
      finally { if (alive) setLoadingRecord(false); }
    }
    loadForClass();
    return () => { alive = false; };
  }, [classId, online, activeSchoolId]);

  const saveForClass = async () => {
    if (!classId || !turma) return notify('Selecione uma turma', 'Escolha a turma onde este registro de Extras ficará salvo.');
    if (!activeSchoolId) return notify('Escola não selecionada', 'Selecione uma escola antes de salvar.');
    if (!online || !supabaseConfigured) return notify('Conexão necessária', 'Para salvar os Extras permanentemente na turma, conecte-se ao Supabase.');
    setSaving(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Sessão não encontrada. Entre novamente no sistema.');
      const payload: any = { school_id: activeSchoolId, class_id: classId, created_by: user.id, education_level: educationLevel, school_year: year, grade, shift, period_start: start, period_end: end, hours, entries, signature_date: signatureDate, updated_at: new Date().toISOString() };
      const result = savedId
        ? await supabase.from('class_extras').update(payload).eq('id', savedId).eq('school_id', activeSchoolId).select('id').single()
        : await supabase.from('class_extras').upsert(payload, { onConflict: 'school_id,class_id' }).select('id').single();
      if (result.error) throw result.error;
      if (result.data?.id) setSavedId(result.data.id);
      notify('Salvo com sucesso', `O registro de Extras foi salvo na turma ${turma.name}.`);
    } catch (e: any) { notify('Erro ao salvar', e.message || String(e)); }
    finally { setSaving(false); }
  };

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const id = 'extras-print-styles';
    let tag = document.getElementById(id) as HTMLStyleElement | null;
    if (!tag) { tag = document.createElement('style'); tag.id = id; document.head.appendChild(tag); }
    tag.textContent = `
      @page { size: A4 landscape; margin: 10mm 9mm 12mm; }
      @media print {
        html, body, #root { background: #fff !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
        body * { visibility: hidden !important; }
        #extras-print, #extras-print * { visibility: visible !important; }
        #extras-print { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; border: 0 !important; box-shadow: none !important; background: #fff !important; color: #111827 !important; font-family: Arial, Helvetica, sans-serif !important; }
        #extras-print input, #extras-print textarea { color: #111827 !important; background: transparent !important; box-shadow: none !important; }
        #extras-print [data-testid="schoolHeader"] { display: flex !important; flex-wrap: nowrap !important; gap: 8px !important; padding-bottom: 8px !important; }
        #extras-print .schoolBlock, #extras-print .metaBlock, #extras-print .rightBlock { min-width: 0 !important; }
        #extras-print .schoolTitle { font-size: 15px !important; font-weight: 800 !important; }
        #extras-print [data-testid="classPicker"], #extras-print [data-testid="addRow"], #extras-print [data-testid="loading"], #extras-print [data-testid="saved"], #extras-print [data-testid="hint"], #extras-print [data-testid="actions"] { display: none !important; }
        #extras-print [data-testid="table"] { width: 100% !important; overflow: visible !important; }
        #extras-print [data-testid="tableHead"], #extras-print [data-testid="tableRow"] { break-inside: avoid !important; page-break-inside: avoid !important; }
        #extras-print [data-testid="tableHead"] { background: #e9eef4 !important; }
        #extras-print [data-testid="tableRow"] { min-height: 21px !important; }
        #extras-print [data-testid="dateCell"], #extras-print [data-testid="objectiveCell"] { font-size: 9pt !important; padding: 2px 4px !important; }
        #extras-print [data-testid="dateCell"] { width: 25mm !important; }
        #extras-print [data-testid="footer"] { break-inside: avoid !important; page-break-inside: avoid !important; margin-top: 14mm !important; }
        #extras-print .line { background: #334155 !important; }
        #extras-print .levelChip { background: #fff !important; }
      }
    `;
    return () => { tag?.remove(); };
  }, []);

  const printForm = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const previousTitle = document.title;
      const safeClass = (turma?.name || 'turma').replace(/[^a-z0-9_-]+/gi, '_');
      document.title = `Registro_de_Objetivos_${safeClass}_${year}`;
      const restore = () => { document.title = previousTitle; window.removeEventListener('afterprint', restore); };
      window.addEventListener('afterprint', restore);
      window.print();
      window.setTimeout(restore, 1500);
    } else Alert.alert('Impressão', 'Abra esta tela pelo navegador para imprimir ou salvar como PDF.');
  };
  return <ScrollView style={s.page} contentContainerStyle={s.content}>
    <View testID="actions" style={s.actions}>
      <TouchableOpacity style={s.backBtn} onPress={() => router.back()}><Ionicons name="arrow-back" size={18} color="#0F766E"/><Text style={s.backText}>Voltar</Text></TouchableOpacity>
      <View style={s.actionRight}><TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} disabled={saving || loadingRecord} onPress={saveForClass}><Ionicons name="save-outline" size={18} color="#FFF"/><Text style={s.printText}>{saving ? 'Salvando...' : savedId ? 'Atualizar na turma' : 'Salvar na turma'}</Text></TouchableOpacity><TouchableOpacity style={s.printBtn} onPress={printForm}><Ionicons name="print-outline" size={18} color="#FFF"/><Text style={s.printText}>Imprimir / Salvar PDF</Text></TouchableOpacity></View>
    </View>
    <View nativeID="extras-print" style={s.paper}>
      <View testID="schoolHeader" style={s.schoolHeader}>
        <View style={s.schoolBlock}><TextInput value={schoolName} editable={false} style={s.schoolTitle} placeholder="NOME DA ESCOLA"/><Text style={s.address}>Registro de objetivos desenvolvidos</Text></View>
        <View style={s.metaBlock}>
          <View style={s.inline}><Text style={s.metaLabel}>Ano:</Text><TextInput value={year} onChangeText={setYear} style={s.metaInput}/><Text style={s.metaLabel}>Ano escolar:</Text><TextInput value={grade} onChangeText={setGrade} style={s.metaInput} placeholder="3º Ano"/></View>
          <View style={s.inline}><Text style={s.metaLabel}>Turno:</Text><TextInput value={shift} onChangeText={setShift} style={s.metaInput} placeholder="Tarde"/><Text style={s.metaLabel}>Turma:</Text><Text style={s.metaInput}>{turma?.name || 'Selecione abaixo'}</Text></View>
          <View style={s.inline}><Text style={s.metaLabel}>Período de</Text><TextInput value={start} onChangeText={setStart} style={s.dateInput} placeholder="dd/mm/aaaa"/><Text> a </Text><TextInput value={end} onChangeText={setEnd} style={s.dateInput} placeholder="dd/mm/aaaa"/></View>
        </View>
        <View style={s.rightBlock}><Text style={s.fieldLabel}>Etapa de ensino</Text><View style={s.levelOptions}>{['Ensino Fundamental','Ensino Médio'].map(level=><TouchableOpacity key={level} onPress={()=>setEducationLevel(level)} style={[s.levelChip,educationLevel===level&&s.levelChipActive]}><Text style={[s.levelText,educationLevel===level&&s.levelTextActive]}>{level}</Text></TouchableOpacity>)}</View><Text style={s.infoInput}>Disciplina: {discipline || '—'}</Text><TextInput value={hours} onChangeText={setHours} style={s.infoInput} placeholder="Horas aula: ______"/><Text style={s.infoInput}>Professor: {teacher || '—'}</Text></View>
      </View>
      <View testID="classPicker" style={s.classPicker}><Text style={s.fieldLabel}>Turma vinculada (os dados de disciplina e professor vêm do cadastro da turma)</Text><View style={s.classOptions}>{classes.map(c=><TouchableOpacity key={c.id} onPress={()=>setClassId(c.id)} style={[s.classChip,classId===c.id&&s.classChipActive]}><Text style={[s.classChipText,classId===c.id&&s.classChipTextActive]}>{c.name}</Text></TouchableOpacity>)}</View>{loadingRecord&&<Text testID="loading" style={s.loading}>Carregando registro salvo...</Text>}{savedId&&<Text testID="saved" style={s.saved}>Já existe um registro salvo para esta turma. Salvar atualizará esse registro.</Text>}</View>
      <View testID="table" style={s.table}><View testID="tableHead" style={s.tableHead}><Text style={[s.dateCol,s.headText]}>Data</Text><Text style={[s.objectiveCol,s.headText]}>Objetivos Desenvolvidos</Text></View>
        {entries.map((entry,index)=><View key={entry.id} testID="tableRow" style={[s.tableRow,index%2===1&&s.altRow]}><TextInput testID="dateCell" value={entry.date} onChangeText={v=>updateEntry(entry.id,'date',v)} placeholder="DD-MM-AAAA" style={s.dateCell}/><TextInput testID="objectiveCell" value={entry.objective} onChangeText={v=>updateEntry(entry.id,'objective',v)} style={s.objectiveCell} multiline/></View>)}
      </View>
      <TouchableOpacity testID="addRow" style={s.addRow} onPress={()=>setEntries(old=>[...old,makeEntry()])}><Ionicons name="add-circle-outline" size={18} color="#0F766E"/><Text style={s.addRowText}>Adicionar linha</Text></TouchableOpacity>
      <View testID="footer" style={s.footer}><TextInput value={signatureDate} onChangeText={setSignatureDate} style={s.footerDate} placeholder="DATA: ____/____/________"/><View style={s.signature}><Text>Assinatura Professor(a): {teacher}</Text><View style={s.line}/></View><View style={s.signature}><Text>Visto Coordenador(a) Pedagógico(a):</Text><View style={s.line}/></View></View>
    </View>
    <Text testID="hint" style={s.hint}>Selecione a turma e preencha os campos. Disciplina e professor são puxados do cadastro da turma. Use “Salvar na turma” para guardar o formulário e recuperá-lo depois. Também é possível imprimir ou salvar como PDF.</Text>
  </ScrollView>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#EEF2F6'},content:{padding:18,paddingBottom:40,maxWidth:1400,width:'100%',alignSelf:'center'},actions:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10,marginBottom:14,flexWrap:'wrap'},actionRight:{flexDirection:'row',gap:8,flexWrap:'wrap'},backBtn:{flexDirection:'row',gap:6,alignItems:'center',padding:10},backText:{color:'#0F766E',fontWeight:'800'},printBtn:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'#334155',paddingVertical:10,paddingHorizontal:14,borderRadius:9},saveBtn:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'#0F766E',paddingVertical:10,paddingHorizontal:14,borderRadius:9},printText:{color:'#FFF',fontWeight:'800'},paper:{backgroundColor:'#FFF',padding:22,borderWidth:1,borderColor:'#CBD5E1',minWidth:0},schoolHeader:{flexDirection:'row',gap:12,justifyContent:'space-between',paddingBottom:12,borderBottomWidth:1,borderColor:'#94A3B8',flexWrap:'wrap'},schoolBlock:{flex:1.1,minWidth:160},metaBlock:{flex:1.1,minWidth:230,gap:5},rightBlock:{flex:1,minWidth:190},schoolTitle:{fontWeight:'800',fontSize:12,color:'#1E293B',paddingVertical:2},address:{fontSize:11,paddingVertical:2,color:'#475569'},inline:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:3},metaLabel:{fontSize:11,color:'#334155'},metaInput:{minWidth:45,maxWidth:110,fontSize:11,padding:2,borderBottomWidth:0.5,borderColor:'#CBD5E1',color:'#0F172A'},dateInput:{width:76,fontSize:10,padding:2,borderBottomWidth:0.5,borderColor:'#CBD5E1'},fieldLabel:{fontSize:11,fontWeight:'800',color:'#475569',marginBottom:5},levelOptions:{flexDirection:'row',flexWrap:'wrap',gap:4,marginBottom:6},levelChip:{borderWidth:1,borderColor:'#CBD5E1',borderRadius:5,paddingVertical:4,paddingHorizontal:6,backgroundColor:'#F8FAFC'},levelChipActive:{borderColor:'#0F766E',backgroundColor:'#D1FAE5'},levelText:{fontSize:10,color:'#334155'},levelTextActive:{fontWeight:'800',color:'#065F46'},infoInput:{fontSize:11,paddingVertical:4,borderBottomWidth:0.5,borderColor:'#CBD5E1',color:'#0F172A'},classPicker:{paddingVertical:10},classOptions:{flexDirection:'row',flexWrap:'wrap',gap:5},classChip:{paddingVertical:5,paddingHorizontal:9,borderRadius:6,backgroundColor:'#F1F5F9',borderWidth:1,borderColor:'#CBD5E1'},classChipActive:{backgroundColor:'#D1FAE5',borderColor:'#0F766E'},classChipText:{fontSize:11,color:'#334155'},classChipTextActive:{fontWeight:'800',color:'#065F46'},loading:{fontSize:11,color:'#64748B',marginTop:6},saved:{fontSize:11,color:'#047857',marginTop:6},table:{borderTopWidth:1,borderLeftWidth:1,borderColor:'#64748B'},tableHead:{flexDirection:'row',minHeight:27,borderBottomWidth:1,borderColor:'#64748B',backgroundColor:'#F8FAFC'},dateCol:{width:75,borderRightWidth:1,borderColor:'#64748B',textAlign:'center'},objectiveCol:{flex:1,textAlign:'center'},headText:{fontSize:11,fontWeight:'700',color:'#334155',paddingVertical:6},tableRow:{flexDirection:'row',minHeight:27,borderBottomWidth:1,borderColor:'#94A3B8'},altRow:{backgroundColor:'#FCFDFE'},dateCell:{width:75,borderRightWidth:1,borderColor:'#64748B',fontSize:10,paddingHorizontal:4,paddingVertical:2},objectiveCell:{flex:1,fontSize:11,paddingHorizontal:6,paddingVertical:2,minHeight:26,textAlignVertical:'center'},addRow:{flexDirection:'row',alignItems:'center',gap:5,alignSelf:'flex-start',paddingVertical:10},addRowText:{color:'#0F766E',fontWeight:'800',fontSize:12},footer:{flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',gap:16,marginTop:22,flexWrap:'wrap'},footerDate:{fontSize:11,minWidth:180},signature:{flex:1,minWidth:180,gap:12},line:{height:1,backgroundColor:'#475569'},hint:{fontSize:12,color:'#64748B',marginTop:12,lineHeight:18}});
