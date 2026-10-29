import { router } from "expo-router";
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "../src/context/AppContext";
import { supabase } from "../src/lib/supabase";

type Status = "present" | "absent" | "justified";
const pad=(n:number)=>String(n).padStart(2,"0");
const localDate=(d=new Date())=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const displayDate=(iso:string)=>{const [y,m,d]=iso.split("-");return `${d}-${m}-${y}`};
const shift=(iso:string,days:number)=>{const [y,m,d]=iso.split("-").map(Number);const x=new Date(y,m-1,d);x.setDate(x.getDate()+days);return localDate(x)};

export default function Attendance(){
 const {classes,lessons,attendance,addLesson,updateLesson,saveAttendance,schools,activeSchoolId,online}=useApp();
 const [assignedByClass,setAssignedByClass]=useState<Record<string,string[]>>({});
 const [assignmentReady,setAssignmentReady]=useState(false);
 const role=schools.find(x=>x.id===activeSchoolId)?.role||"";
 const isTeacher=role==="professor";
 useEffect(()=>{let live=true;(async()=>{setAssignmentReady(false);if(!online||!isTeacher){setAssignedByClass({});setAssignmentReady(true);return;}const {data:{user},error:userError}=await supabase.auth.getUser();if(userError||!user){if(live)setAssignmentReady(true);return;}const {data,error}=await supabase.from("class_subject_teachers").select("class_subject_id,class_subjects(id,class_id,name)").eq("school_id",activeSchoolId).eq("user_id",user.id);if(live){if(error){console.warn("Falha ao carregar disciplinas atribuídas",error.message);setAssignedByClass({});}else{const map:Record<string,string[]>={};for(const row of (data||[]) as any[]){const cs=Array.isArray(row.class_subjects)?row.class_subjects[0]:row.class_subjects;if(cs?.class_id&&cs?.name)(map[cs.class_id] ||= []).push(cs.name);}Object.keys(map).forEach(k=>map[k]=Array.from(new Set(map[k])));setAssignedByClass(map);}setAssignmentReady(true);}})();return()=>{live=false;}},[online,isTeacher,activeSchoolId]);
 const visibleClasses=useMemo(()=>isTeacher?classes.filter(c=>(assignedByClass[c.id]||[]).length>0):classes,[classes,isTeacher,assignedByClass]);
 const [selected,setSelected]=useState(classes[0]?.id||"");
 useEffect(()=>{if(!visibleClasses.some(c=>c.id===selected))setSelected(visibleClasses[0]?.id||"");},[visibleClasses,selected]);
 const [date,setDate]=useState(localDate());
 const [subject,setSubject]=useState("");
 const [lessonNumber,setLessonNumber]=useState(1);
 const [status,setStatus]=useState<Record<string,Status>>({});
 const turma=useMemo(()=>classes.find(c=>c.id===selected),[classes,selected]);
 const subjects=useMemo(()=>isTeacher?(assignedByClass[selected]||[]):Array.from(new Set((turma?.subject||"").split(/[;,\n]/).map(x=>x.trim()).filter(Boolean))),[turma,isTeacher,assignedByClass,selected]);
 useEffect(()=>{setSubject(subjects[0]||"");},[selected,subjects.join("|")]);
 const alunosOrdenados=useMemo(()=>[...(turma?.students||[])].sort((a,b)=>a.name.localeCompare(b.name,"pt-BR",{sensitivity:"base"})),[turma]);
 const lessonTitle=`Aula ${lessonNumber} de ${subject || turma?.subject || "Disciplina"}`;
 const legacyLessonTitle=`Aula de ${subject || turma?.subject || "Disciplina"}`;
 const existing=useMemo(()=>lessons.find(l=>l.classId===selected && localDate(new Date(l.date))===date && (l.title===lessonTitle || (lessonNumber===1 && l.title===legacyLessonTitle))),[lessons,selected,date,lessonTitle,lessonNumber,legacyLessonTitle]);
 const existingAttendance=useMemo(()=>existing?attendance.find(a=>a.lessonId===existing.id):undefined,[attendance,existing]);

 useEffect(()=>{
   if(!turma)return;
   const next:Record<string,Status>={};
   alunosOrdenados.forEach(st=>next[st.id]="present");
   existingAttendance?.items.forEach(item=>next[item.studentId]=item.status as Status);
   setStatus(next);
 },[selected,date,turma,alunosOrdenados,existingAttendance]);

 async function finish(){
   if(!turma)return Alert.alert("Atenção","Cadastre uma turma primeiro.");
   if(!subject.trim())return Alert.alert("Atenção","Informe a disciplina no cadastro da turma (separe várias por vírgula). ");
   try{
     const lesson=existing || await addLesson({classId:turma.id,date:`${date}T12:00:00`,title:lessonTitle,notes:""});
     if(!lesson)throw new Error("Não foi possível criar a aula.");
     if(existing) await updateLesson(existing.id,{classId:turma.id,date:existing.date,title:existing.title,notes:existing.notes||""});
     await saveAttendance(lesson.id,alunosOrdenados.map(st=>({studentId:st.id,status:status[st.id]||"present"})));
     if(Platform.OS==='web') window.alert(`Chamada de ${subject} em ${displayDate(date)} salva com sucesso.`); else Alert.alert("Chamada salva",`Disciplina: ${subject}. Presença registrada para ${displayDate(date)}.`);
   }catch(e:any){if(Platform.OS==='web')window.alert(e?.message||String(e));else Alert.alert("Erro ao salvar",e?.message||String(e));}
 }
 if(!assignmentReady)return <View style={s.empty}><Text style={s.title}>Carregando permissões...</Text></View>;
 if(isTeacher && visibleClasses.length===0)return <View style={s.empty}><Text style={s.title}>Nenhuma disciplina atribuída</Text><Text style={s.text}>Peça ao administrador da escola para atribuir você a uma disciplina na Gestão da escola.</Text></View>;
 if(!visibleClasses.length)return <View style={s.empty}><Text style={s.title}>Nenhuma turma</Text><Text style={s.text}>Crie uma turma antes de registrar presença.</Text><TouchableOpacity style={s.button} onPress={()=>router.push("/classes")}><Text style={s.bt}>Criar turma</Text></TouchableOpacity></View>;
 const present=alunosOrdenados.filter(st=>status[st.id]==="present").length||0;
 const absent=alunosOrdenados.filter(st=>status[st.id]==="absent").length||0;
 const justified=alunosOrdenados.filter(st=>status[st.id]==="justified").length||0;
 return <ScrollView style={s.container} contentContainerStyle={{paddingBottom:40}}>
   <View style={s.head}><Text style={s.title}>Registro de presença</Text><TouchableOpacity onPress={()=>router.back()}><Text style={s.back}>Voltar</Text></TouchableOpacity></View>
   <Text style={s.label}>Turma</Text>
   <ScrollView horizontal showsHorizontalScrollIndicator={false}>{visibleClasses.map(c=><TouchableOpacity key={c.id} style={[s.chip,selected===c.id&&s.chipOn]} onPress={()=>setSelected(c.id)}><Text style={[s.chipText,selected===c.id&&s.chipTextOn]}>{c.name}</Text></TouchableOpacity>)}</ScrollView>
   {subjects.length>0&&<><Text style={s.label}>Disciplina</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}>{subjects.map(sub=><TouchableOpacity key={sub} style={[s.chip,subject===sub&&s.chipOn]} onPress={()=>setSubject(sub)}><Text style={[s.chipText,subject===sub&&s.chipTextOn]}>{sub}</Text></TouchableOpacity>)}</ScrollView></>}
   {isTeacher&&subjects.length===0&&<Text style={s.text}>Nenhuma disciplina atribuída nesta turma.</Text>}
   <View style={s.dateBox}><TouchableOpacity onPress={()=>setDate(shift(date,-1))}><Text style={s.arrow}>‹</Text></TouchableOpacity><View><Text style={s.dateLabel}>Data da chamada</Text><Text style={s.date}>{displayDate(date)}</Text></View><TouchableOpacity onPress={()=>setDate(shift(date,1))}><Text style={s.arrow}>›</Text></TouchableOpacity></View>
   <TouchableOpacity style={s.today} onPress={()=>setDate(localDate())}><Text style={s.todayText}>Hoje</Text></TouchableOpacity>
   <Text style={s.label}>Aula desta disciplina neste dia</Text>
   <View style={s.lessonNumberBox}><TouchableOpacity accessibilityLabel="Aula anterior" style={s.lessonNumberButton} onPress={()=>setLessonNumber(n=>Math.max(1,n-1))}><Text style={s.lessonNumberButtonText}>−</Text></TouchableOpacity><View style={{alignItems:"center",flex:1}}><Text style={s.lessonNumberValue}>Aula {lessonNumber}</Text><Text style={s.lessonNumberHint}>Registre cada aula separadamente</Text></View><TouchableOpacity accessibilityLabel="Próxima aula" style={s.lessonNumberButton} onPress={()=>setLessonNumber(n=>Math.min(20,n+1))}><Text style={s.lessonNumberButtonText}>+</Text></TouchableOpacity></View>
   <View style={s.summary}><View><Text style={s.sumValue}>{alunosOrdenados.length}</Text><Text style={s.sumLabel}>Alunos</Text></View><View><Text style={s.sumValue}>{present}</Text><Text style={s.sumLabel}>Presentes</Text></View><View><Text style={s.sumValue}>{absent}</Text><Text style={s.sumLabel}>Faltas</Text></View><View><Text style={s.sumValue}>{justified}</Text><Text style={s.sumLabel}>Just.</Text></View></View>
   {existing&&<Text style={s.saved}>✓ Aula {lessonNumber} já registrada nesta data e disciplina. Você pode alterar e salvar novamente.</Text>}
   <Text style={s.label}>Alunos</Text>
   {!alunosOrdenados.length&&<Text style={s.text}>A turma ainda não possui alunos cadastrados.</Text>}
   {alunosOrdenados.map(st=><View style={s.student} key={st.id}><Text style={s.studentName}>{st.name}</Text><View style={s.statusRow}>{(["present","absent","justified"] as Status[]).map(x=><TouchableOpacity key={x} style={[s.status,x==="present"?s.green:x==="absent"?s.red:s.yellow,status[st.id]===x&&s.selected]} onPress={()=>setStatus({...status,[st.id]:x})}><Text>{x==="present"?"P":x==="absent"?"F":"J"}</Text></TouchableOpacity>)}</View></View>)}
   <TouchableOpacity disabled={isTeacher&&subjects.length===0} style={[s.button,isTeacher&&subjects.length===0&&{opacity:0.45}]} onPress={finish}><Text style={s.bt}>{existing?"Atualizar presença da aula":"Salvar presença da aula"}</Text></TouchableOpacity>
   <TouchableOpacity style={s.secondary} onPress={()=>router.push({pathname:"/history",params:{classId:selected}})}><Text style={s.secondaryText}>Ver histórico de frequência</Text></TouchableOpacity>
 </ScrollView>
}
const s=StyleSheet.create({container:{flex:1,backgroundColor:"#F8FAFC",padding:20,paddingTop:55},head:{flexDirection:"row",justifyContent:"space-between",marginBottom:20},title:{fontSize:27,fontWeight:"800",color:"#0F172A"},back:{color:"#0F766E",fontWeight:"700"},label:{fontSize:14,fontWeight:"800",color:"#475569",marginTop:8,marginBottom:10},chip:{paddingVertical:10,paddingHorizontal:15,backgroundColor:"#fff",borderRadius:20,marginRight:8,borderWidth:1,borderColor:"#CBD5E1"},chipOn:{backgroundColor:"#0F766E",borderColor:"#0F766E"},chipText:{color:"#334155"},chipTextOn:{color:"#fff",fontWeight:"800"},lessonNumberBox:{backgroundColor:"#fff",borderRadius:14,padding:10,flexDirection:"row",alignItems:"center",borderWidth:1,borderColor:"#E2E8F0"},lessonNumberButton:{width:42,height:42,borderRadius:12,backgroundColor:"#CCFBF1",alignItems:"center",justifyContent:"center"},lessonNumberButtonText:{fontSize:27,fontWeight:"800",color:"#0F766E"},lessonNumberValue:{fontSize:18,fontWeight:"800",color:"#0F172A"},lessonNumberHint:{fontSize:12,color:"#64748B",marginTop:3},dateBox:{marginTop:18,backgroundColor:"#fff",borderRadius:16,padding:14,flexDirection:"row",alignItems:"center",justifyContent:"space-between",borderWidth:1,borderColor:"#E2E8F0"},dateLabel:{textAlign:"center",fontSize:12,color:"#64748B"},date:{textAlign:"center",fontSize:22,fontWeight:"800",color:"#0F172A",marginTop:2},arrow:{fontSize:38,color:"#0F766E",paddingHorizontal:12},today:{alignSelf:"center",padding:8},todayText:{color:"#0F766E",fontWeight:"800"},summary:{flexDirection:"row",backgroundColor:"#fff",borderRadius:14,padding:13,marginBottom:12,justifyContent:"space-around",borderWidth:1,borderColor:"#E2E8F0"},sumValue:{textAlign:"center",fontSize:21,fontWeight:"800"},sumLabel:{fontSize:11,color:"#64748B",textAlign:"center"},saved:{backgroundColor:"#DCFCE7",color:"#166534",padding:10,borderRadius:10,marginBottom:8},student:{backgroundColor:"#fff",padding:15,borderRadius:13,marginBottom:8,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},studentName:{fontSize:16,fontWeight:"700",flex:1},statusRow:{flexDirection:"row",gap:7},status:{width:38,height:38,borderRadius:19,alignItems:"center",justifyContent:"center",borderWidth:1},green:{backgroundColor:"#DCFCE7",borderColor:"#86EFAC"},red:{backgroundColor:"#FEE2E2",borderColor:"#FCA5A5"},yellow:{backgroundColor:"#FEF3C7",borderColor:"#FCD34D"},selected:{borderWidth:3,borderColor:"#0F172A"},button:{backgroundColor:"#0F766E",padding:16,borderRadius:13,alignItems:"center",marginTop:15},bt:{color:"#fff",fontWeight:"800",fontSize:16},secondary:{padding:14,alignItems:"center"},secondaryText:{color:"#0F766E",fontWeight:"800"},text:{color:"#64748B",lineHeight:21},empty:{flex:1,backgroundColor:"#F8FAFC",padding:30,justifyContent:"center"}});
