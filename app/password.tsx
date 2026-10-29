import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase, supabaseConfigured } from '../src/lib/supabase';

export default function ChangePassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  async function save() {
    setMessage('');
    if (!supabaseConfigured) { setIsError(true); setMessage('Supabase não está configurado.'); return; }
    if (password.length < 6) { setIsError(true); setMessage('A nova senha deve ter pelo menos 6 caracteres.'); return; }
    if (password !== confirm) { setIsError(true); setMessage('As senhas não coincidem.'); return; }
    setBusy(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw userError || new Error('Entre na sua conta novamente para alterar a senha.');
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword(''); setConfirm(''); setIsError(false); setMessage('Senha alterada com sucesso.');
    } catch (e) { setIsError(true); setMessage(e instanceof Error ? e.message : 'Não foi possível alterar a senha.'); }
    finally { setBusy(false); }
  }
  return <ScrollView style={s.page} contentContainerStyle={s.content}>
    <TouchableOpacity style={s.back} onPress={() => router.back()}><Ionicons name="arrow-back" size={20} color="#0F766E"/><Text style={s.backText}>Voltar ao painel</Text></TouchableOpacity>
    <View style={s.card}><View style={s.icon}><Ionicons name="key" size={28} color="#FFFFFF"/></View><Text style={s.title}>Alterar senha</Text><Text style={s.subtitle}>Escolha uma senha nova para sua conta do Presença & Aula.</Text>
      <Text style={s.label}>Nova senha</Text><TextInput style={s.input} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" placeholder="Mínimo de 6 caracteres" placeholderTextColor="#94A3B8" textContentType="newPassword" editable={!busy}/>
      <Text style={s.label}>Confirmar nova senha</Text><TextInput style={s.input} value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" placeholder="Digite novamente" placeholderTextColor="#94A3B8" textContentType="newPassword" editable={!busy}/>
      {message ? <View style={[s.message, isError ? s.error : s.success]}><Text style={{color:isError?'#991B1B':'#166534'}}>{message}</Text></View> : null}
      <TouchableOpacity style={[s.button,busy&&{opacity:.6}]} disabled={busy} onPress={save}>{busy?<ActivityIndicator color="#fff"/>:<Text style={s.buttonText}>Salvar nova senha</Text>}</TouchableOpacity>
    </View>
  </ScrollView>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#F3F6FA'},content:{padding:22,paddingTop:24,width:'100%',maxWidth:650,alignSelf:'center'},back:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:20},backText:{color:'#0F766E',fontWeight:'700'},card:{backgroundColor:'#fff',borderRadius:18,padding:24,borderWidth:1,borderColor:'#E2E8F0'},icon:{width:52,height:52,borderRadius:15,backgroundColor:'#0F766E',alignItems:'center',justifyContent:'center',marginBottom:16},title:{fontSize:25,fontWeight:'900',color:'#172033'},subtitle:{fontSize:14,lineHeight:21,color:'#64748B',marginTop:8,marginBottom:22},label:{fontSize:13,fontWeight:'700',color:'#334155',marginBottom:7},input:{backgroundColor:'#F8FAFC',borderWidth:1,borderColor:'#CBD5E1',borderRadius:11,padding:13,fontSize:15,color:'#172033',marginBottom:16},button:{backgroundColor:'#0F766E',borderRadius:11,padding:14,alignItems:'center',minHeight:48,justifyContent:'center'},buttonText:{color:'#fff',fontWeight:'800'},message:{padding:12,borderRadius:10,marginBottom:14},error:{backgroundColor:'#FEF2F2',borderWidth:1,borderColor:'#FECACA'},success:{backgroundColor:'#F0FDF4',borderWidth:1,borderColor:'#BBF7D0'}});
