import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useState } from 'react';
import { useApp } from '../src/context/AppContext';
import { supabase } from '../src/lib/supabase';

function message(title:string, body:string, onOk?:()=>void) {
  if (Platform.OS === 'web') { window.alert(`${title}\n\n${body}`); onOk?.(); }
  else Alert.alert(title, body, [{text:'OK',onPress:onOk}]);
}
function safeFileName(name:string) { return name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]/g,'_').slice(-120) || 'anexo'; }

export default function Lesson() {
  const { classes, lessons, addLesson, updateLesson, deleteLesson, online } = useApp();
  const { lessonId } = useLocalSearchParams<{lessonId?:string}>();
  const existing=lessons.find(l=>l.id===lessonId);
  const [classId,setClassId]=useState(existing?.classId||classes[0]?.id||'');
  const [title,setTitle]=useState(existing?.title||'');
  const [content,setContent]=useState(existing?.notes?.replace(/^Objetivos:\s*/, '').split(/\n\nConteúdo:/)[1]?.split(/\n\nAnexo:/)[0]?.trim()||'');
  const [objective,setObjective]=useState(existing?.notes?.split(/\n\nConteúdo:/)[0]?.replace(/^Objetivos:\s*/, '').trim()||'');
  const [attachment,setAttachment]=useState<any>(null);
  const [saving,setSaving]=useState(false);
  const attachmentName=attachment?.name || existing?.attachment_name || null;

  async function pick() {
    try {
      const r=await DocumentPicker.getDocumentAsync({copyToCacheDirectory:true,multiple:false});
      if (!r.canceled) setAttachment(r.assets[0]);
    } catch(e:any) { message('Não foi possível anexar',e.message||String(e)); }
  }
  async function save() {
    if (!classId || !title.trim()) { message('Atenção','Escolha uma turma e informe o título.'); return; }
    if (attachment && !online) { message('Conexão necessária','Conecte-se ao Supabase para enviar anexos. O plano ainda não foi salvo.'); return; }
    setSaving(true);
    try {
      const lessonKey=existing?.id || `lesson-${Date.now()}`;
      const payload:any={classId,date:existing?.date||new Date().toISOString(),title:title.trim(),notes:`Objetivos: ${objective}\n\nConteúdo: ${content}\n\nAnexo: ${attachmentName||'nenhum'}`,attachment_name:attachmentName,attachment_path:existing?.attachment_path||null};
      let saved:any;
      if (existing) { await updateLesson(existing.id,payload); saved=existing; }
      else { saved=await addLesson(payload); }
      if (attachment && online) {
        const {data:{user},error:userError}=await supabase.auth.getUser();
        if (userError || !user) throw new Error('Sessão expirada. Entre novamente e tente enviar o anexo.');
        const path=`${saved.id}/${Date.now()}_${safeFileName(attachment.name)}`;
        const response=await fetch(attachment.uri);
        if (!response.ok) throw new Error('Não foi possível ler o arquivo selecionado.');
        const fileBuffer=await response.arrayBuffer();
        const {error:uploadError}=await supabase.storage.from('lesson-attachments').upload(path,fileBuffer,{contentType:attachment.mimeType||'application/octet-stream',upsert:false});
        if (uploadError) throw new Error(`Falha ao enviar anexo: ${uploadError.message}`);
        await updateLesson(saved.id,{...payload,attachment_name:attachment.name,attachment_path:path});
      }
      message('Plano salvo','O plano de aula foi salvo com sucesso.',()=>router.replace('/lessons'));
    } catch(e:any) { message('Erro ao salvar plano',e.message||String(e)); }
    finally { setSaving(false); }
  }
  return <ScrollView style={s.container} contentContainerStyle={{paddingBottom:40}}>
    <View style={s.head}><Text style={s.title}>{existing?'Editar plano':'Plano de aula'}</Text><TouchableOpacity onPress={()=>router.back()}><Text style={s.back}>Voltar</Text></TouchableOpacity></View>
    <Text style={s.label}>Turma</Text>
    <ScrollView horizontal>{classes.map(c=><TouchableOpacity key={c.id} style={[s.chip,classId===c.id&&s.on]} onPress={()=>setClassId(c.id)}><Text style={classId===c.id?s.onText:{}}>{c.name}</Text></TouchableOpacity>)}</ScrollView>
    <TextInput style={s.input} placeholder="Título / tema da aula" value={title} onChangeText={setTitle}/>
    <TextInput style={[s.input,s.area]} placeholder="Objetivos" multiline value={objective} onChangeText={setObjective}/>
    <TextInput style={[s.input,s.area]} placeholder="Conteúdo, metodologia, atividades e avaliação" multiline value={content} onChangeText={setContent}/>
    <TouchableOpacity style={s.attach} onPress={pick}><Text style={s.attachText}>📎 Selecionar anexo para enviar</Text></TouchableOpacity>
    {attachmentName&&<Text style={s.file}>Anexo: {attachmentName}{attachment?' (novo arquivo selecionado)':''}</Text>}
    {existing?.attachment_path&&!attachment&&<Text style={s.hint}>O anexo atual está salvo e poderá ser baixado na lista de planos.</Text>}
    <TouchableOpacity style={[s.button,saving&&{opacity:0.6}]} disabled={saving} onPress={save}><Text style={s.bt}>{saving?'Salvando...':existing?'Salvar alterações':'Salvar plano'}</Text></TouchableOpacity>
    {existing&&<TouchableOpacity style={s.delete} onPress={async()=>{const ok=Platform.OS==='web'?window.confirm(`Excluir o plano "${existing.title}"?`):await new Promise<boolean>(resolve=>Alert.alert('Excluir plano?',existing.title,[{text:'Cancelar',onPress:()=>resolve(false)},{text:'Excluir',style:'destructive',onPress:()=>resolve(true)}]));if(!ok)return;try{await deleteLesson(existing.id);router.replace('/lessons')}catch(e:any){message('Erro',e.message||String(e))}}}><Text style={s.deleteText}>Excluir plano</Text></TouchableOpacity>}
  </ScrollView>
}
const s=StyleSheet.create({container:{flex:1,backgroundColor:'#F8FAFC',padding:20,paddingTop:55},head:{flexDirection:'row',justifyContent:'space-between',marginBottom:20},title:{fontSize:27,fontWeight:'800',color:'#0F172A'},back:{color:'#0F766E',fontWeight:'700'},label:{fontWeight:'800',color:'#475569',marginBottom:8},chip:{padding:10,paddingHorizontal:15,backgroundColor:'#fff',borderRadius:20,marginRight:8,borderWidth:1,borderColor:'#CBD5E1'},on:{backgroundColor:'#0F766E',borderColor:'#0F766E'},onText:{color:'#fff',fontWeight:'800'},input:{backgroundColor:'#fff',borderWidth:1,borderColor:'#CBD5E1',borderRadius:12,padding:14,fontSize:16,marginTop:12},area:{minHeight:110,textAlignVertical:'top'},attach:{backgroundColor:'#E2E8F0',padding:15,borderRadius:12,marginTop:12,alignItems:'center'},attachText:{fontWeight:'800',color:'#334155'},file:{color:'#0F766E',marginTop:8},hint:{color:'#64748B',marginTop:6},button:{backgroundColor:'#0F766E',padding:16,borderRadius:13,alignItems:'center',marginTop:15},bt:{color:'#fff',fontWeight:'800',fontSize:16},delete:{padding:14,alignItems:'center',marginTop:8},deleteText:{color:'#B91C1C',fontWeight:'800'}});
