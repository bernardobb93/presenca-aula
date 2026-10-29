import { router, useLocalSearchParams } from 'expo-router';
import { Alert, FlatList, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useMemo, useState } from 'react';
import { useApp } from '../src/context/AppContext';
import { formatDateDMY } from '../src/lib/dateFormat';
export default function Students(){const {classId}=useLocalSearchParams<{classId:string}>();const {classes,addStudent,updateStudent,deleteStudent}=useApp();const turma=classes.find(c=>c.id===classId);const alunosOrdenados=useMemo(()=>[...(turma?.students||[])].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR',{sensitivity:'base'})),[turma]);const [name,setName]=useState('');const [registration,setRegistration]=useState('');const [email,setEmail]=useState('');const [phone,setPhone]=useState('');const [birth,setBirth]=useState('');const [editing,setEditing]=useState<string|null>(null);
 if(!turma)return <View style={s.empty}><Text>Turma não encontrada.</Text><TouchableOpacity onPress={()=>router.back()}><Text style={s.link}>Voltar</Text></TouchableOpacity></View>;
 function clear(){setName('');setRegistration('');setEmail('');setPhone('');setBirth('');setEditing(null)}
 function normalizeBirth(value:string){const v=value.trim();if(!v)return null;if(/^\d{4}-\d{2}-\d{2}$/.test(v))return v;const m=v.match(/^(\d{2})-(\d{2})-(\d{4})$/);if(m){const [,dd,mm,yyyy]=m;const d=new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`);if(d.getUTCFullYear()===Number(yyyy)&&d.getUTCMonth()+1===Number(mm)&&d.getUTCDate()===Number(dd))return `${yyyy}-${mm}-${dd}`;}throw new Error('Data de nascimento inválida. Use DD-MM-AAAA.');}
 async function save(){if(!name.trim())return Alert.alert('Atenção','Informe o nome do aluno.');try{const payload={name:name.trim(),registration:registration.trim()||null,email:email.trim()||null,phone:phone.trim()||null,birth_date:normalizeBirth(birth)};if(editing)await updateStudent(editing,payload);else await addStudent(String(classId),payload);clear();}catch(e:any){Alert.alert('Erro ao salvar aluno',e.message||String(e));}}
 function edit(st:any){setEditing(st.id);setName(st.name);setRegistration(st.registration||'');setEmail(st.email||'');setPhone(st.phone||'');setBirth(formatDateDMY(st.birth_date||''))}
 async function remove(st:any){const ok=Platform.OS==='web'?window.confirm(`Excluir o aluno \"${st.name}\"?`):await new Promise<boolean>(resolve=>Alert.alert('Excluir aluno?',st.name,[{text:'Cancelar',onPress:()=>resolve(false)},{text:'Excluir',style:'destructive',onPress:()=>resolve(true)}]));if(!ok)return;try{await deleteStudent(st.id)}catch(e:any){if(Platform.OS==='web')window.alert(e.message||String(e));else Alert.alert('Erro ao excluir aluno',e.message||String(e))}}
  return (
    <View style={s.container}>
      <View style={s.head}>
        <View>
          <Text style={s.title}>Alunos</Text>
          <Text style={s.subtitle}>{turma.name} · {turma.subject}</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.link}>Voltar</Text>
        </TouchableOpacity>
      </View>

      <TextInput style={s.input} placeholder="Nome completo *" value={name} onChangeText={setName} />
      <TextInput style={s.input} placeholder="Matrícula" value={registration} onChangeText={setRegistration} />
      <TextInput style={s.input} placeholder="E-mail" value={email} onChangeText={setEmail} />
      <TextInput style={s.input} placeholder="Telefone" value={phone} onChangeText={setPhone} />
      <TextInput style={s.input} placeholder="Data de nascimento (DD-MM-AAAA)" value={birth} onChangeText={setBirth} />

      <TouchableOpacity style={s.button} onPress={save}>
        <Text style={s.bt}>{editing ? 'Salvar aluno' : '+ Adicionar aluno'}</Text>
      </TouchableOpacity>

      {editing && (
        <TouchableOpacity onPress={clear}>
          <Text style={s.cancel}>Cancelar edição</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={alunosOrdenados}
        keyExtractor={(x) => x.id}
        ListEmptyComponent={<Text style={s.emptyText}>Nenhum aluno cadastrado.</Text>}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{item.name}</Text>
              <Text style={s.meta}>
                {item.registration || 'Sem matrícula'}
                {item.email ? ' · ' + item.email : ''}
              </Text>
            </View>
            <View style={s.actions}>
              <TouchableOpacity onPress={() => edit(item)}>
                <Text>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => remove(item)}>
                <Text>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 20, paddingTop: 55 },
  head: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 27, fontWeight: '800', color: '#0F172A' },
  subtitle: { color: '#64748B', marginTop: 3 },
  link: { color: '#0F766E', fontWeight: '700' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 13, marginBottom: 9, fontSize: 16 },
  button: { backgroundColor: '#0F766E', padding: 15, borderRadius: 12, alignItems: 'center', marginBottom: 8 },
  bt: { color: '#fff', fontWeight: '800' },
  cancel: { textAlign: 'center', color: '#64748B', marginBottom: 10 },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 13, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '800' },
  meta: { color: '#64748B', marginTop: 4 },
  actions: { flexDirection: 'row', gap: 15 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { textAlign: 'center', color: '#64748B', marginTop: 20 }
});