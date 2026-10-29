import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '../src/context/AppContext';
import { supabase, supabaseConfigured } from '../src/lib/supabase';
import { formatDateDMY, normalizeDateDMY, isValidISODate } from '../src/lib/dateFormat';

type EventType = 'avaliacao' | 'data_importante' | 'evento';
type CalendarEvent = { id:string; title:string; event_date:string; event_type:EventType; description:string; class_id:string|null; subject:string|null; school_id?:string; created_by?:string };
const LOCAL_KEY = 'gestao_escolar_calendar_events_v1';
const TYPES: {value:EventType;label:string;color:string;bg:string}[] = [
  { value:'avaliacao', label:'Avaliação', color:'#7C3AED', bg:'#F0E9FF' },
  { value:'data_importante', label:'Data importante', color:'#B45309', bg:'#FFF1D6' },
  { value:'evento', label:'Evento escolar', color:'#087EBA', bg:'#E1F3FF' },
];
const isoToday = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const isoToLocal = (iso:string) => { const m=iso.match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? new Date(Number(m[1]),Number(m[2])-1,Number(m[3])) : new Date(); };
const dateToIso = (d:Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const monthLabel = (d:Date) => d.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2,10)}`;

export default function CalendarScreen() {
  const { classes, online, activeSchoolId } = useApp();
  const [events,setEvents]=useState<CalendarEvent[]>([]);
  const [month,setMonth]=useState(()=>isoToLocal(isoToday()));
  const [selectedDate,setSelectedDate]=useState(isoToday());
  const [modalVisible,setModalVisible]=useState(false);
  const [saving,setSaving]=useState(false);
  const [editingId,setEditingId]=useState<string|null>(null);
  const [title,setTitle]=useState('');
  const [dateText,setDateText]=useState(formatDateDMY(isoToday()));
  const [eventType,setEventType]=useState<EventType>('avaliacao');
  const [description,setDescription]=useState('');
  const [classId,setClassId]=useState('');
  const [subject,setSubject]=useState('');

  const loadEvents=useCallback(async()=>{
    if(supabaseConfigured && online && activeSchoolId){
      const {data,error}=await supabase.from('calendar_events').select('*').eq('school_id',activeSchoolId).order('event_date');
      if(!error){setEvents((data||[]).map((r:any)=>({...r,description:r.description||'',class_id:r.class_id||null,subject:r.subject||null})));return;}
      console.warn('Calendário: não foi possível carregar eventos do Supabase.',error.message);
    }
    try {
      const raw=await AsyncStorage.getItem(LOCAL_KEY);
      const all:CalendarEvent[]=raw?JSON.parse(raw):[];
      setEvents(all.filter(e=>!e.school_id||!activeSchoolId||e.school_id===activeSchoolId));
    } catch { setEvents([]); }
  },[online,activeSchoolId]);
  useEffect(()=>{loadEvents();},[loadEvents]);

  const days=useMemo(()=>{
    const year=month.getFullYear(), mon=month.getMonth();
    const first=new Date(year,mon,1);
    const offset=(first.getDay()+6)%7;
    const count=new Date(year,mon+1,0).getDate();
    const cells:(number|null)[]=Array(offset).fill(null);
    for(let day=1;day<=count;day++) cells.push(day);
    while(cells.length%7) cells.push(null);
    return cells;
  },[month]);
  const eventMap=useMemo(()=>{
    const map:Record<string,CalendarEvent[]>={};
    events.forEach(e=>{(map[e.event_date] ||= []).push(e);});
    return map;
  },[events]);
  const selectedEvents=eventMap[selectedDate]||[];

  const openNew=(date=selectedDate)=>{
    setEditingId(null);setTitle('');setDateText(formatDateDMY(date));setEventType('avaliacao');setDescription('');setClassId('');setSubject('');setModalVisible(true);
  };
  const openEdit=(event:CalendarEvent)=>{
    setEditingId(event.id);setTitle(event.title);setDateText(formatDateDMY(event.event_date));setEventType(event.event_type);setDescription(event.description||'');setClassId(event.class_id||'');setSubject(event.subject||'');setModalVisible(true);
  };
  const saveEvent=async()=>{
    const cleanTitle=title.trim();
    const isoDate=normalizeDateDMY(dateText);
    if(!cleanTitle){Alert.alert('Campo obrigatório','Informe o título do compromisso.');return;}
    if(!isValidISODate(isoDate)){Alert.alert('Data inválida','Use o formato DD-MM-AAAA, por exemplo 05-11-2026.');return;}
    setSaving(true);
    try{
      let userId:string|undefined;
      if(supabaseConfigured && online){
        const {data:{user},error:userError}=await supabase.auth.getUser();
        if(userError||!user) throw new Error('Sua sessão expirou. Entre novamente.');
        userId=user.id;
        if(!activeSchoolId) throw new Error('Selecione uma escola antes de salvar.');
        const payload={title:cleanTitle,event_date:isoDate,event_type:eventType,description:description.trim(),class_id:classId||null,subject:subject.trim()||null,school_id:activeSchoolId,created_by:userId};
        if(editingId){
          const {data,error}=await supabase.from('calendar_events').update(payload).eq('id',editingId).eq('school_id',activeSchoolId).select('*').single();
          if(error) throw new Error(error.message);
          setEvents(old=>old.map(e=>e.id===editingId?({...data,description:data.description||''} as CalendarEvent):e));
        }else{
          const {data,error}=await supabase.from('calendar_events').insert(payload).select('*').single();
          if(error) throw new Error(error.message);
          setEvents(old=>[...old,{...data,description:data.description||''} as CalendarEvent]);
        }
      }else{
        const next:CalendarEvent={id:editingId||makeId(),title:cleanTitle,event_date:isoDate,event_type:eventType,description:description.trim(),class_id:classId||null,subject:subject.trim()||null,school_id:activeSchoolId||undefined};
        const updated=editingId?events.map(e=>e.id===editingId?next:e):[...events,next];
        setEvents(updated);await AsyncStorage.setItem(LOCAL_KEY,JSON.stringify(updated));
      }
      setSelectedDate(isoDate);setMonth(isoToLocal(isoDate));setModalVisible(false);
    }catch(e){Alert.alert('Não foi possível salvar',e instanceof Error?e.message:'Tente novamente.');}
    finally{setSaving(false);}
  };
  const deleteEvent=(event:CalendarEvent)=>{
    const remove=async()=>{
      try{
        if(supabaseConfigured&&online&&activeSchoolId){
          const {error}=await supabase.from('calendar_events').delete().eq('id',event.id).eq('school_id',activeSchoolId);
          if(error) throw new Error(error.message);
        }else{
          const updated=events.filter(e=>e.id!==event.id);await AsyncStorage.setItem(LOCAL_KEY,JSON.stringify(updated));
        }
        setEvents(old=>old.filter(e=>e.id!==event.id));
      }catch(e){Alert.alert('Não foi possível excluir',e instanceof Error?e.message:'Tente novamente.');}
    };
    if(Platform.OS==='web'&&typeof window!=='undefined'){
      if(window.confirm(`Excluir "${event.title}" do calendário?`)) void remove();
    }else Alert.alert('Excluir compromisso',`Deseja excluir "${event.title}"?`,[{text:'Cancelar',style:'cancel'},{text:'Excluir',style:'destructive',onPress:()=>void remove()}]);
  };
  const shiftMonth=(delta:number)=>{
    const next=new Date(month.getFullYear(),month.getMonth()+delta,1);setMonth(next);
    setSelectedDate(dateToIso(next));
  };
  const className=(id:string|null)=>classes.find(c=>c.id===id)?.name||'Todas as turmas';

  return <ScrollView style={s.page} contentContainerStyle={s.content}>
    <View style={s.header}>
      <TouchableOpacity style={s.back} onPress={()=>router.replace('/home')}><Ionicons name="arrow-back" size={20} color="#0F3C56"/><Text style={s.backText}>Painel</Text></TouchableOpacity>
      <View style={s.headerRow}><View style={s.iconBox}><Ionicons name="calendar" size={27} color="#FFFFFF"/></View><View style={{flex:1}}><Text style={s.title}>Calendário escolar</Text><Text style={s.subtitle}>Organize avaliações, datas importantes e eventos da escola.</Text></View><TouchableOpacity style={s.addButton} onPress={()=>openNew()}><Ionicons name="add" size={19} color="#FFFFFF"/><Text style={s.addButtonText}>Novo</Text></TouchableOpacity></View>
    </View>
    <View style={s.layout}>
      <View style={s.calendarCard}>
        <View style={s.monthNav}><TouchableOpacity style={s.navButton} onPress={()=>shiftMonth(-1)}><Ionicons name="chevron-back" size={20} color="#334155"/></TouchableOpacity><Text style={s.monthTitle}>{monthLabel(month)}</Text><TouchableOpacity style={s.navButton} onPress={()=>shiftMonth(1)}><Ionicons name="chevron-forward" size={20} color="#334155"/></TouchableOpacity></View>
        <View style={s.weekRow}>{['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(d=><Text key={d} style={s.weekDay}>{d}</Text>)}</View>
        <View style={s.grid}>{days.map((day,i)=>{
          const iso=day?dateToIso(new Date(month.getFullYear(),month.getMonth(),day)):null;
          const dayEvents=iso?eventMap[iso]||[]:[];
          const active=iso===selectedDate, today=iso===isoToday();
          return <TouchableOpacity key={`${i}-${day||'blank'}`} disabled={!day} onPress={()=>iso&&setSelectedDate(iso)} style={[s.dayCell,active&&s.dayActive,today&&!active&&s.dayToday]}>
            <Text style={[s.dayText,active&&s.dayTextActive,!day&&{color:'transparent'}]}>{day||' '}</Text>
            <View style={s.dots}>{dayEvents.slice(0,3).map((e,j)=>{const t=TYPES.find(x=>x.value===e.event_type)||TYPES[2];return <View key={`${e.id}-${j}`} style={[s.dot,{backgroundColor:t.color}]}/>})}</View>
          </TouchableOpacity>;
        })}</View>
        <View style={s.legend}>{TYPES.map(t=><View key={t.value} style={s.legendItem}><View style={[s.legendDot,{backgroundColor:t.color}]}/><Text style={s.legendText}>{t.label}</Text></View>)}</View>
      </View>
      <View style={s.eventsCard}>
        <View style={s.eventsHeading}><View style={{flex:1}}><Text style={s.eventsTitle}>Compromissos do dia</Text><Text style={s.eventsDate}>{formatDateDMY(selectedDate)}</Text></View><TouchableOpacity style={s.smallAdd} onPress={()=>openNew(selectedDate)}><Ionicons name="add" size={17} color="#087EBA"/><Text style={s.smallAddText}>Adicionar</Text></TouchableOpacity></View>
        {selectedEvents.length===0?<View style={s.empty}><Ionicons name="calendar-outline" size={34} color="#9AA9B8"/><Text style={s.emptyTitle}>Nenhum compromisso</Text><Text style={s.emptyText}>Adicione uma avaliação ou data importante para este dia.</Text></View>:selectedEvents.map(event=>{
          const t=TYPES.find(x=>x.value===event.event_type)||TYPES[2];
          return <View key={event.id} style={s.eventItem}><View style={[s.eventStripe,{backgroundColor:t.color}]}/><View style={{flex:1}}><View style={[s.typePill,{backgroundColor:t.bg}]}><Text style={[s.typeText,{color:t.color}]}>{t.label}</Text></View><Text style={s.eventTitle}>{event.title}</Text>{event.class_id||event.subject?<Text style={s.eventMeta}>{[className(event.class_id),event.subject].filter(Boolean).join(' · ')}</Text>:null}{event.description?<Text style={s.eventDescription}>{event.description}</Text>:null}<View style={s.eventActions}><TouchableOpacity onPress={()=>openEdit(event)} style={s.action}><Ionicons name="create-outline" size={16} color="#087EBA"/><Text style={s.actionText}>Editar</Text></TouchableOpacity><TouchableOpacity onPress={()=>deleteEvent(event)} style={s.action}><Ionicons name="trash-outline" size={16} color="#B42318"/><Text style={[s.actionText,{color:'#B42318'}]}>Excluir</Text></TouchableOpacity></View></View></View>;
        })}
      </View>
    </View>
    <View style={s.tip}><Ionicons name="information-circle-outline" size={20} color="#087EBA"/><Text style={s.tipText}>Os eventos são salvos na escola selecionada. Em modo local, ficam salvos neste dispositivo até conectar o sistema ao Supabase.</Text></View>

    <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={()=>setModalVisible(false)}>
      <View style={s.modalBackdrop}><View style={s.modalCard}><ScrollView keyboardShouldPersistTaps="handled">
        <View style={s.modalHeading}><Text style={s.modalTitle}>{editingId?'Editar compromisso':'Novo compromisso'}</Text><TouchableOpacity onPress={()=>setModalVisible(false)}><Ionicons name="close" size={24} color="#64748B"/></TouchableOpacity></View>
        <Text style={s.label}>Tipo</Text><View style={s.typeOptions}>{TYPES.map(t=><TouchableOpacity key={t.value} onPress={()=>setEventType(t.value)} style={[s.typeOption,{backgroundColor:eventType===t.value?t.bg:'#F8FAFC',borderColor:eventType===t.value?t.color:'#DCE5EF'}]}><Text style={[s.typeOptionText,{color:eventType===t.value?t.color:'#475569'}]}>{t.label}</Text></TouchableOpacity>)}</View>
        <Text style={s.label}>Título *</Text><TextInput value={title} onChangeText={setTitle} placeholder={eventType==='avaliacao'?'Ex.: Avaliação de Matemática':'Ex.: Reunião de pais'} style={s.input}/>
        <Text style={s.label}>Data (DD-MM-AAAA) *</Text><TextInput value={dateText} onChangeText={setDateText} placeholder="29-10-2026" keyboardType="numbers-and-punctuation" style={s.input}/>
        <Text style={s.label}>Turma (opcional)</Text><View style={s.classOptions}><TouchableOpacity onPress={()=>setClassId('')} style={[s.classOption,!classId&&s.classOptionActive]}><Text style={[s.classOptionText,!classId&&s.classOptionTextActive]}>Todas</Text></TouchableOpacity>{classes.map(c=><TouchableOpacity key={c.id} onPress={()=>setClassId(c.id)} style={[s.classOption,classId===c.id&&s.classOptionActive]}><Text style={[s.classOptionText,classId===c.id&&s.classOptionTextActive]}>{c.name}</Text></TouchableOpacity>)}</View>
        <Text style={s.label}>Disciplina (opcional)</Text><TextInput value={subject} onChangeText={setSubject} placeholder="Ex.: Ciências" style={s.input}/>
        <Text style={s.label}>Observações (opcional)</Text><TextInput value={description} onChangeText={setDescription} placeholder="Detalhes, conteúdos ou lembretes..." multiline numberOfLines={4} style={[s.input,s.textarea]}/>
        <View style={s.modalActions}><TouchableOpacity style={s.cancelButton} onPress={()=>setModalVisible(false)}><Text style={s.cancelText}>Cancelar</Text></TouchableOpacity><TouchableOpacity disabled={saving} style={[s.saveButton,saving&&{opacity:.6}]} onPress={saveEvent}><Text style={s.saveText}>{saving?'Salvando...':'Salvar compromisso'}</Text></TouchableOpacity></View>
      </ScrollView></View></View>
    </Modal>
  </ScrollView>;
}

const s=StyleSheet.create({
 page:{flex:1,backgroundColor:'#F3F6FA'},content:{padding:22,paddingTop:24,paddingBottom:40,maxWidth:1300,width:'100%',alignSelf:'center'},
 header:{marginBottom:20},back:{flexDirection:'row',alignItems:'center',gap:6,marginBottom:18,alignSelf:'flex-start'},backText:{fontSize:13,fontWeight:'700',color:'#0F3C56'},
 headerRow:{backgroundColor:'#087EBA',borderRadius:18,padding:18,flexDirection:'row',alignItems:'center',gap:13},iconBox:{width:48,height:48,borderRadius:14,backgroundColor:'#FFFFFF2A',alignItems:'center',justifyContent:'center'},title:{fontSize:25,fontWeight:'900',color:'#FFFFFF'},subtitle:{fontSize:13,color:'#E2F3FF',marginTop:4},addButton:{backgroundColor:'#075985',borderRadius:10,paddingVertical:10,paddingHorizontal:13,flexDirection:'row',alignItems:'center',gap:5},addButtonText:{fontWeight:'800',color:'#FFFFFF',fontSize:13},
 layout:{flexDirection:'row',flexWrap:'wrap',alignItems:'flex-start',gap:18},calendarCard:{flexGrow:1,flexBasis:450,backgroundColor:'#FFFFFF',borderRadius:16,borderWidth:1,borderColor:'#E0E7EF',padding:16},monthNav:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:18},navButton:{width:36,height:36,borderRadius:10,backgroundColor:'#F1F5F9',alignItems:'center',justifyContent:'center'},monthTitle:{fontSize:19,fontWeight:'900',color:'#172033',textTransform:'capitalize'},weekRow:{flexDirection:'row',marginBottom:5},weekDay:{width:'14.2857%',textAlign:'center',fontSize:11,fontWeight:'800',color:'#64748B',paddingVertical:8},grid:{flexDirection:'row',flexWrap:'wrap'},dayCell:{width:'14.2857%',minHeight:58,borderRadius:10,alignItems:'center',paddingTop:8,marginBottom:3,borderWidth:1,borderColor:'transparent'},dayActive:{backgroundColor:'#087EBA',borderColor:'#087EBA'},dayToday:{borderColor:'#087EBA'},dayText:{fontSize:14,fontWeight:'700',color:'#27364B'},dayTextActive:{color:'#FFFFFF'},dots:{flexDirection:'row',gap:3,marginTop:6,minHeight:6},dot:{width:5,height:5,borderRadius:3},legend:{flexDirection:'row',flexWrap:'wrap',gap:12,marginTop:13,paddingTop:13,borderTopWidth:1,borderTopColor:'#EDF1F5'},legendItem:{flexDirection:'row',alignItems:'center',gap:5},legendDot:{width:8,height:8,borderRadius:4},legendText:{fontSize:11,color:'#64748B'},
 eventsCard:{flexGrow:1,flexBasis:330,backgroundColor:'#FFFFFF',borderRadius:16,borderWidth:1,borderColor:'#E0E7EF',padding:17,minHeight:310},eventsHeading:{flexDirection:'row',alignItems:'center',gap:10,paddingBottom:14,borderBottomWidth:1,borderBottomColor:'#E9EEF3',marginBottom:8},eventsTitle:{fontSize:17,fontWeight:'900',color:'#172033'},eventsDate:{fontSize:13,color:'#64748B',marginTop:4},smallAdd:{flexDirection:'row',alignItems:'center',gap:3,padding:8,borderRadius:9,backgroundColor:'#E6F5FC'},smallAddText:{fontSize:12,fontWeight:'800',color:'#087EBA'},empty:{alignItems:'center',padding:28,gap:8},emptyTitle:{fontSize:15,fontWeight:'800',color:'#334155'},emptyText:{fontSize:12,color:'#64748B',textAlign:'center',lineHeight:18},eventItem:{flexDirection:'row',gap:11,paddingVertical:14,borderBottomWidth:1,borderBottomColor:'#EDF1F5'},eventStripe:{width:4,borderRadius:4},typePill:{alignSelf:'flex-start',paddingHorizontal:8,paddingVertical:4,borderRadius:7,marginBottom:6},typeText:{fontSize:10,fontWeight:'900'},eventTitle:{fontSize:15,fontWeight:'800',color:'#172033'},eventMeta:{fontSize:11,color:'#64748B',marginTop:4},eventDescription:{fontSize:12,color:'#475569',marginTop:7,lineHeight:18},eventActions:{flexDirection:'row',gap:15,marginTop:10},action:{flexDirection:'row',alignItems:'center',gap:4},actionText:{fontSize:12,fontWeight:'700',color:'#087EBA'},
 tip:{flexDirection:'row',gap:9,alignItems:'flex-start',backgroundColor:'#E5F4FC',borderRadius:12,padding:13,marginTop:18},tipText:{flex:1,fontSize:12,color:'#28536B',lineHeight:18},
 modalBackdrop:{flex:1,backgroundColor:'#0F172A88',justifyContent:'center',alignItems:'center',padding:18},modalCard:{width:'100%',maxWidth:650,maxHeight:'92%',backgroundColor:'#FFFFFF',borderRadius:18,padding:20},modalHeading:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:18},modalTitle:{fontSize:21,fontWeight:'900',color:'#172033'},label:{fontSize:12,fontWeight:'800',color:'#334155',marginBottom:7,marginTop:12},typeOptions:{flexDirection:'row',flexWrap:'wrap',gap:8},typeOption:{paddingVertical:9,paddingHorizontal:11,borderRadius:9,borderWidth:1},typeOptionText:{fontSize:12,fontWeight:'800'},input:{borderWidth:1,borderColor:'#CBD5E1',borderRadius:10,paddingHorizontal:12,paddingVertical:11,fontSize:14,color:'#172033',backgroundColor:'#FFFFFF',outlineStyle:'none' as any},textarea:{minHeight:88,textAlignVertical:'top'},classOptions:{flexDirection:'row',flexWrap:'wrap',gap:7},classOption:{borderWidth:1,borderColor:'#CBD5E1',borderRadius:8,paddingVertical:7,paddingHorizontal:10,backgroundColor:'#F8FAFC'},classOptionActive:{backgroundColor:'#087EBA',borderColor:'#087EBA'},classOptionText:{fontSize:12,color:'#334155',fontWeight:'700'},classOptionTextActive:{color:'#FFFFFF'},modalActions:{flexDirection:'row',justifyContent:'flex-end',gap:9,marginTop:22},cancelButton:{paddingVertical:11,paddingHorizontal:15,borderRadius:10,backgroundColor:'#F1F5F9'},cancelText:{fontWeight:'800',color:'#475569'},saveButton:{paddingVertical:11,paddingHorizontal:16,borderRadius:10,backgroundColor:'#087EBA'},saveText:{fontWeight:'900',color:'#FFFFFF'}
});
