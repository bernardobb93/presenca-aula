import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { AppData, Attendance, AttendanceItem, Lesson, SchoolClass, Student } from '../types';

const KEY='@presenca_aula_v2'; const ACTIVE_SCHOOL_KEY='@presenca_aula_active_school';
type SchoolOption={id:string;name:string;role:string};
const empty:AppData={classes:[],lessons:[],attendance:[]};
type Ctx=AppData & {loading:boolean;online:boolean;schools:SchoolOption[];activeSchoolId:string|null;switchSchool:(schoolId:string)=>Promise<void>;addClass:(c:any)=>Promise<SchoolClass|null>;updateClass:(id:string,c:any)=>Promise<void>;deleteClass:(id:string)=>Promise<void>;addStudent:(classId:string,s:any)=>Promise<Student|null>;updateStudent:(id:string,s:any)=>Promise<void>;deleteStudent:(id:string)=>Promise<void>;addLesson:(l:any)=>Promise<Lesson|null>;updateLesson:(id:string,l:any)=>Promise<void>;deleteLesson:(id:string)=>Promise<void>;saveAttendance:(lessonId:string,items:AttendanceItem[])=>Promise<void>;refresh:()=>Promise<void>;};
const Context=createContext<Ctx|null>(null);
const id=()=>{const bytes=new Uint8Array(16);if(typeof crypto!=='undefined'&&crypto.getRandomValues)crypto.getRandomValues(bytes);else for(let i=0;i<16;i++)bytes[i]=Math.floor(Math.random()*256);bytes[6]=(bytes[6]&0x0f)|0x40;bytes[8]=(bytes[8]&0x3f)|0x80;const h=Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;};
function toClass(row:any, students:Student[]=[]):SchoolClass{return{id:row.id,user_id:row.user_id,name:row.name,subject:row.subject||'',teacher:row.teacher||'',students};}
function toStudent(row:any):Student{return{id:row.id,user_id:row.user_id,class_id:row.class_id,name:row.name,registration:row.registration,email:row.email,phone:row.phone,birth_date:row.birth_date};}

// Mantém class_subjects sincronizada com as disciplinas informadas no cadastro/edição da turma.
async function syncClassSubjects(schoolId:string, classId:string, rawSubject:string){
 const names=Array.from(new Set(String(rawSubject||'').split(/[,;\n]+/).map(x=>x.trim()).filter(Boolean)));
 const {data:existing,error:readError}=await supabase.from('class_subjects').select('id,name').eq('school_id',schoolId).eq('class_id',classId);
 if(readError) throw new Error(`Não foi possível carregar as disciplinas da turma: ${readError.message}. Confirme que executou as migrações de disciplinas no Supabase.`);
 const rows=existing||[];
 const normalized=new Set(names.map(n=>n.toLocaleLowerCase()));
 const toDelete=rows.filter((r:any)=>!normalized.has(String(r.name).trim().toLocaleLowerCase())).map((r:any)=>r.id);
 if(toDelete.length){const {error}=await supabase.from('class_subjects').delete().eq('school_id',schoolId).in('id',toDelete);if(error)throw new Error(`Não foi possível atualizar as disciplinas removidas: ${error.message}`);}
 const existingNames=new Set(rows.filter((r:any)=>!toDelete.includes(r.id)).map((r:any)=>String(r.name).trim().toLocaleLowerCase()));
 const toInsert=names.filter(n=>!existingNames.has(n.toLocaleLowerCase())).map(name=>({school_id:schoolId,class_id:classId,name}));
 if(toInsert.length){const {error}=await supabase.from('class_subjects').insert(toInsert);if(error)throw new Error(`A turma foi salva, mas não foi possível registrar suas disciplinas: ${error.message}. Confirme as migrações e permissões RLS de class_subjects.`);}
}

export function AppProvider({children}:{children:ReactNode}){
 const [data,setData]=useState<AppData>(empty); const [loading,setLoading]=useState(true); const [online,setOnline]=useState(false); const [schools,setSchools]=useState<SchoolOption[]>([]); const [activeSchoolId,setActiveSchoolId]=useState<string|null>(null);
 const refresh=useCallback(async()=>{
   setLoading(true);
   if(supabaseConfigured){
     const {data:{session},error:sessionError}=await supabase.auth.getSession();
     if(session?.user && !sessionError){
       const {data: memberships, error: membershipError}=await supabase.from('school_members').select('school_id,role,schools(id,name)').eq('user_id',session.user.id).order('created_at');
       if(membershipError){setData(empty);setOnline(true);setLoading(false);return;}
       const schoolOptions:SchoolOption[]=(memberships||[]).map((m:any)=>({id:m.school_id,name:m.schools?.name||'Escola',role:m.role}));
       setSchools(schoolOptions);
       const savedSchool=await AsyncStorage.getItem(ACTIVE_SCHOOL_KEY);
       const chosenSchool=schoolOptions.find(x=>x.id===savedSchool)?.id || schoolOptions[0]?.id || null;
       setActiveSchoolId(chosenSchool);
       if(!chosenSchool){setData(empty);setOnline(true);setLoading(false);return;}
       if(savedSchool!==chosenSchool) await AsyncStorage.setItem(ACTIVE_SCHOOL_KEY,chosenSchool);
       const [cr,sr,lr,ar]=await Promise.all([
         supabase.from('classes').select('*').eq('school_id',chosenSchool).order('created_at',{ascending:true}),
         supabase.from('students').select('*').eq('school_id',chosenSchool).order('name'),
         supabase.from('lessons').select('*').eq('school_id',chosenSchool).order('date',{ascending:false}),
         supabase.from('attendance').select('*').eq('school_id',chosenSchool)
       ]);
       const err=cr.error||sr.error||lr.error||ar.error;
       if(!err){
         const students=(sr.data||[]).map(toStudent);
         const classes=(cr.data||[]).map((x:any)=>toClass(x,students.filter(s=>s.class_id===x.id)));
         const lessons=(lr.data||[]).map((x:any)=>({id:x.id,user_id:x.user_id,classId:x.class_id,date:x.date,title:x.title,notes:x.notes||'',attachment_name:x.attachment_name,attachment_path:x.attachment_path||null}));
         const attendance=(ar.data||[]).map((x:any)=>({lessonId:x.lesson_id,items:x.items||[]}));
         setData({classes,lessons,attendance}); setOnline(true); setLoading(false); return;
       }
       // Never fall back to cached school data for an authenticated online user:
       // that cache can show classes after their assignment or membership was removed.
       console.warn('Falha ao atualizar dados do Supabase; limpando dados locais por segurança:', err.message);
       setData(empty); setOnline(true); setLoading(false); return;
     }
   }
   setOnline(false);
   const raw=await AsyncStorage.getItem(KEY); if(raw) try{setData(JSON.parse(raw));}catch{}
   setLoading(false);
 },[]);
 useEffect(()=>{refresh().catch(e=>{console.warn(e);setOnline(false);setLoading(false);});},[refresh]);
 useEffect(()=>{ if(!supabaseConfigured)return; const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{ if(event==='SIGNED_IN'||event==='SIGNED_OUT'||event==='TOKEN_REFRESHED'||event==='INITIAL_SESSION') refresh().catch(console.warn); }); return()=>subscription.unsubscribe();},[refresh]);
 useEffect(()=>{if(!online) AsyncStorage.setItem(KEY,JSON.stringify(data)).catch(()=>{});},[data,online]);
 const requireUser=async()=>{const {data:{user},error}=await supabase.auth.getUser();if(error||!user)throw new Error('Usuário não autenticado. Faça login novamente.');return user;};
 const api=useMemo(()=>({
  addClass:async(c:any)=>{const x={id:id(),user_id:'',name:c.name,subject:c.subject,teacher:c.teacher,students:[] as Student[]};if(online){const user=await requireUser();x.user_id=user.id;const {error}=await supabase.from('classes').insert({id:x.id,user_id:user.id,school_id:activeSchoolId,name:x.name,subject:x.subject,teacher:x.teacher});if(error)throw new Error(`Supabase ${error.code||''}: ${error.message}${error.details?`\n${error.details}`:''}${error.hint?`\n${error.hint}`:''}`);await syncClassSubjects(activeSchoolId,x.id,x.subject);await refresh();return x;}setData(d=>({...d,classes:[...d.classes,x]}));return x;},
  updateClass:async(i:string,c:any)=>{if(online){if(!activeSchoolId)throw new Error('Nenhuma escola selecionada. Selecione uma escola e tente novamente.');const {data:updated,error}=await supabase.from('classes').update({name:c.name,subject:c.subject}).eq('id',i).eq('school_id',activeSchoolId).select('id').maybeSingle();if(error)throw new Error(`Não foi possível atualizar a turma: ${error.message}${error.details?`\n${error.details}`:''}${error.hint?`\n${error.hint}`:''}`);if(!updated)throw new Error('A turma não foi atualizada. Ela pode não pertencer à escola selecionada ou você não tem permissão para editá-la. Verifique as políticas RLS do Supabase.');await syncClassSubjects(activeSchoolId,i,c.subject);await refresh();return;}setData(d=>({...d,classes:d.classes.map(x=>x.id===i?{...x,...c}:x)}));},
  deleteClass:async(i:string)=>{if(online){const user=await requireUser();const {data:lessonRows,error:lrErr}=await supabase.from('lessons').select('id').eq('class_id',i);if(lrErr)throw new Error(`Supabase ${lrErr.code||''}: ${lrErr.message}`);const lessonIds=(lessonRows||[]).map((r:any)=>r.id);if(lessonIds.length){const {error:e1}=await supabase.from('attendance').delete().in('lesson_id',lessonIds);if(e1)throw new Error(`Supabase ${e1.code||''}: ${e1.message}`);const {error:e2}=await supabase.from('lessons').delete().eq('class_id',i);if(e2)throw new Error(`Supabase ${e2.code||''}: ${e2.message}`);}const {error:e3}=await supabase.from('students').delete().eq('class_id',i);if(e3)throw new Error(`Supabase ${e3.code||''}: ${e3.message}`);const {error:e4}=await supabase.from('classes').delete().eq('id',i);if(e4)throw new Error(`Supabase ${e4.code||''}: ${e4.message}`);setData(d=>({...d,classes:d.classes.filter(x=>x.id!==i),lessons:d.lessons.filter(x=>x.classId!==i),attendance:d.attendance.filter(a=>!lessonIds.includes(a.lessonId))}));return;}setData(d=>({...d,classes:d.classes.filter(x=>x.id!==i),lessons:d.lessons.filter(x=>x.classId!==i)}));},
  addStudent:async(classId:string,s:any)=>{const x={...s,id:id(),user_id:'',class_id:classId};if(online){const user=await requireUser();x.user_id=user.id;const {error}=await supabase.from('students').insert({id:x.id,user_id:user.id,school_id:activeSchoolId,class_id:classId,name:x.name,registration:x.registration||null,email:x.email||null,phone:x.phone||null,birth_date:x.birth_date||null});if(error)throw new Error(`Supabase ${error.code||''}: ${error.message}${error.details?`\n${error.details}`:''}${error.hint?`\n${error.hint}`:''}`);setData(d=>({...d,classes:d.classes.map(c=>c.id===classId?{...c,students:[...c.students,x]}:c)}));return x;}setData(d=>({...d,classes:d.classes.map(c=>c.id===classId?{...c,students:[...c.students,x]}:c)}));return x;},
  updateStudent:async(i:string,s:any)=>{if(online){const {error}=await supabase.from('students').update({name:s.name,registration:s.registration||null,email:s.email||null,phone:s.phone||null,birth_date:s.birth_date||null}).eq('id',i);if(error)throw new Error(error.message);await refresh();return;}setData(d=>({...d,classes:d.classes.map(c=>({...c,students:c.students.map(st=>st.id===i?{...st,...s}:st)}))}));},
  deleteStudent:async(i:string)=>{if(online){const user=await requireUser();const {error}=await supabase.from('students').delete().eq('id',i);if(error)throw new Error(`Supabase ${error.code||''}: ${error.message}${error.details?`\n${error.details}`:''}${error.hint?`\n${error.hint}`:''}`);setData(d=>({...d,classes:d.classes.map(c=>({...c,students:c.students.filter(s=>s.id!==i)}))}));return;}setData(d=>({...d,classes:d.classes.map(c=>({...c,students:c.students.filter(s=>s.id!==i)}))}));},
  addLesson:async(l:any)=>{const x={...l,id:id()};if(online){const user=await requireUser();const row={id:x.id,user_id:user.id,school_id:activeSchoolId,class_id:l.classId,date:l.date,title:l.title,notes:l.notes||'',attachment_name:l.attachment_name||null,attachment_path:l.attachment_path||null};const {error}=await supabase.from('lessons').insert(row);if(error)throw new Error(`Supabase ${error.code||''}: ${error.message}${error.details?`\n${error.details}`:''}${error.hint?`\n${error.hint}`:''}`);setData(d=>({...d,lessons:[...d.lessons,x]}));return x;}setData(d=>({...d,lessons:[...d.lessons,x]}));return x;},
  updateLesson:async(i:string,l:any)=>{if(online){const {error}=await supabase.from('lessons').update({class_id:l.classId,date:l.date,title:l.title,notes:l.notes||'',attachment_name:l.attachment_name||null,attachment_path:l.attachment_path||null}).eq('id',i);if(error)throw new Error(error.message);await refresh();return;}setData(d=>({...d,lessons:d.lessons.map(x=>x.id===i?{...x,...l,id:i}:x)}));},
  deleteLesson:async(i:string)=>{if(online){const user=await requireUser();const {error:a}=await supabase.from('attendance').delete().eq('lesson_id',i);if(a)throw new Error(`Supabase ${a.code||''}: ${a.message}`);const {error}=await supabase.from('lessons').delete().eq('id',i);if(error)throw new Error(`Supabase ${error.code||''}: ${error.message}`);setData(d=>({...d,lessons:d.lessons.filter(x=>x.id!==i),attendance:d.attendance.filter(x=>x.lessonId!==i)}));return;}setData(d=>({...d,lessons:d.lessons.filter(x=>x.id!==i),attendance:d.attendance.filter(x=>x.lessonId!==i)}));},
  saveAttendance:async(lessonId:string,items:AttendanceItem[])=>{if(online){const user=await requireUser();const {error}=await supabase.from('attendance').upsert({lesson_id:lessonId,user_id:user.id,school_id:activeSchoolId,items});if(error)throw new Error(`Supabase ${error.code||''}: ${error.message}${error.details?`\n${error.details}`:''}${error.hint?`\n${error.hint}`:''}`);setData(d=>({...d,attendance:[...d.attendance.filter(a=>a.lessonId!==lessonId),{lessonId,items}]}));return;}setData(d=>({...d,attendance:[...d.attendance.filter(a=>a.lessonId!==lessonId),{lessonId,items}]}));},
  refresh
 }),[online,refresh,activeSchoolId]);
 const switchSchool=useCallback(async(schoolId:string)=>{if(!schools.some(x=>x.id===schoolId))return;await AsyncStorage.setItem(ACTIVE_SCHOOL_KEY,schoolId);setActiveSchoolId(schoolId);await refresh();},[schools,refresh]);
 return <Context.Provider value={{...data,...api,loading,online,schools,activeSchoolId,switchSchool}}>{children}</Context.Provider>;
}
export function useApp(){const c=useContext(Context);if(!c)throw new Error('useApp fora do AppProvider');return c;}
