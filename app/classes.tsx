import { router } from 'expo-router';
import { Alert, FlatList, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase, supabaseConfigured } from '../src/lib/supabase';
import { useApp } from '../src/context/AppContext';
export default function Classes(){const {classes,addClass,updateClass,deleteClass,online}=useApp();const [role,setRole]=useState<string|null>(null);const [roleLoading,setRoleLoading]=useState(true);const [name,setName]=useState('');const [subject,setSubject]=useState('');const [editing,setEditing]=useState<string|null>(null);
 useEffect(()=>{let active=true;(async()=>{try{if(!supabaseConfigured||!online){if(active)setRole(null);return;}const {data:{user}}=await supabase.auth.getUser();if(!user)return;const {data,error}=await supabase.from('school_members').select('role').eq('user_id',user.id).order('created_at').limit(1).maybeSingle();if(error)throw error;if(active)setRole(data?.role||null);}catch(e){console.warn('Não foi possível verificar o perfil:',e);}finally{if(active)setRoleLoading(false);}})();return()=>{active=false;};},[online]);
 const isAdmin=role==='administrador';
 async function save(){if(!isAdmin)return Alert.alert('Acesso restrito','Somente administradores podem criar ou alterar turmas.');if(!name.trim()||!subject.trim())return Alert.alert('Atenção','Informe turma e disciplina.');try{if(editing)await updateClass(editing,{name:name.trim(),subject:subject.trim(),teacher:''});else await addClass({name:name.trim(),subject:subject.trim(),teacher:''});setName('');setSubject('');setEditing(null);}catch(e:any){Alert.alert('Erro',e.message||String(e));}}
 function edit(c:any){if(!isAdmin)return Alert.alert('Acesso restrito','Somente administradores podem alterar turmas.');setEditing(c.id);setName(c.name);setSubject(c.subject);}
 async function remove(c:any){if(!isAdmin)return Alert.alert('Acesso restrito','Somente administradores podem excluir turmas.');const ok=Platform.OS==='web'?window.confirm(`Excluir a turma \"${c.name}\"?\n\nIsso removerá a turma e seus alunos.`):await new Promise<boolean>(resolve=>Alert.alert('Excluir turma?',`Isso removerá ${c.name} e seus alunos.`,[{text:'Cancelar',onPress:()=>resolve(false)},{text:'Excluir',style:'destructive',onPress:()=>resolve(true)}]));if(!ok)return;try{await deleteClass(c.id)}catch(e:any){if(Platform.OS==='web')window.alert(e.message||String(e));else Alert.alert('Erro',e.message||String(e))}}
return (
  <View style={s.container}>
    <View style={s.head}>
      <Text style={s.title}>Minhas turmas</Text>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={s.back}>Voltar</Text>
      </TouchableOpacity>
    </View>

    {roleLoading ? <Text style={s.empty}>Verificando permissões…</Text> : !isAdmin ? <View style={s.notice}><Text style={s.noticeText}>Somente administradores podem criar, editar ou excluir turmas. Você pode consultar as turmas e abrir os alunos conforme suas permissões.</Text></View> : <><TextInput style={s.input} placeholder="Nome da turma" value={name} onChangeText={setName} />
    <TextInput style={s.input} placeholder="Disciplina(s) — separe por vírgula" value={subject} onChangeText={setSubject} />
    <Text style={s.meta}>Para cadastrar várias disciplinas, separe os nomes por vírgula. A atribuição dos professores é feita em Gestão da escola.</Text>

    <TouchableOpacity style={s.button} onPress={save}>
      <Text style={s.buttonText}>{editing ? 'Salvar alterações' : '+ Criar turma'}</Text>
    </TouchableOpacity>

    {editing && (
      <TouchableOpacity onPress={() => { setEditing(null); setName(''); setSubject('');  }}>
        <Text style={s.cancel}>Cancelar edição</Text>
      </TouchableOpacity>
    )}</>}

    <FlatList 
      data={classes} 
      keyExtractor={x => x.id} 
      ListEmptyComponent={<Text style={s.empty}>Nenhuma turma cadastrada.</Text>} 
      renderItem={({ item }) => (
        <View style={s.card}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push({ pathname: '/students', params: { classId: item.id } })}>
            <Text style={s.cardTitle}>{item.name}</Text>
            <Text style={s.meta}>{item.subject} · {item.students.length} aluno(s)</Text>
            <Text style={s.open}>Abrir alunos →</Text>
          </TouchableOpacity>
          {isAdmin && <View style={s.actions}>
            <TouchableOpacity onPress={() => edit(item)}><Text>✏️</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => remove(item)}><Text>🗑️ </Text></TouchableOpacity>
          </View>}
        </View>
      )}
    />
  </View>
);}
const s=StyleSheet.create({container:{flex:1,backgroundColor:'#F8FAFC',padding:20,paddingTop:55},head:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:18},title:{fontSize:27,fontWeight:'800',color:'#0F172A'},back:{color:'#0F766E',fontWeight:'700'},input:{backgroundColor:'#fff',borderWidth:1,borderColor:'#CBD5E1',borderRadius:12,padding:14,marginBottom:10,fontSize:16},button:{backgroundColor:'#0F766E',padding:15,borderRadius:12,alignItems:'center',marginBottom:8},buttonText:{color:'#fff',fontWeight:'800',fontSize:16},cancel:{textAlign:'center',color:'#64748B',marginBottom:10},card:{backgroundColor:'#fff',padding:17,borderRadius:14,borderWidth:1,borderColor:'#E2E8F0',marginBottom:10,flexDirection:'row'},cardTitle:{fontWeight:'800',fontSize:17},meta:{color:'#64748B',marginTop:5},open:{color:'#0F766E',fontWeight:'700',marginTop:8},actions:{gap:16,justifyContent:'center',paddingLeft:12},notice:{backgroundColor:'#FFF7ED',borderColor:'#FED7AA',borderWidth:1,borderRadius:12,padding:13,marginBottom:12},noticeText:{color:'#9A3412',fontSize:13,lineHeight:19},empty:{textAlign:'center',color:'#64748B',marginTop:30}});
