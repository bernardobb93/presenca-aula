import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase, supabaseConfigured } from '../src/lib/supabase';

export default function RedefinirSenha() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [validLink, setValidLink] = useState(false);
  const [message, setMessage] = useState('Validando o link de recuperação...');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let alive = true;
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!alive) return;
      if (error || !data.session) {
        setValidLink(false);
        setMessage('Este link é inválido ou expirou. Volte ao login e solicite uma nova recuperação de senha.');
      } else { setValidLink(true); setMessage('Digite sua nova senha.'); }
      setChecking(false);
    };
    checkSession();
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive) return;
      if (event === 'PASSWORD_RECOVERY' && session) { setValidLink(true); setMessage('Digite sua nova senha.'); setChecking(false); }
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);

  async function savePassword() {
    setMessage('');
    if (password.length < 6) { setMessage('A nova senha deve ter pelo menos 6 caracteres.'); return; }
    if (password !== confirmPassword) { setMessage('As senhas não coincidem.'); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) { setMessage(error.message || 'Não foi possível atualizar a senha.'); return; }
      setSuccess(true); setMessage('Senha alterada com sucesso. Você já pode entrar com sua nova senha.');
      await supabase.auth.signOut();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Ocorreu um erro ao alterar a senha.'); }
    finally { setBusy(false); }
  }

  return <View style={s.page}><View style={s.card}>
    <View style={s.logoMark}><Text style={s.logoMarkText}>🎓</Text></View>
    <Text style={s.logo}>Gestão Escolar</Text><Text style={s.title}>Criar nova senha</Text>
    {checking ? <ActivityIndicator color="#0F766E" /> : success ? null : validLink ? <>
      <Text style={s.label}>Nova senha</Text><TextInput style={s.input} placeholder="Mínimo de 6 caracteres" placeholderTextColor="#94A3B8" secureTextEntry value={password} onChangeText={setPassword} editable={!busy} textContentType="newPassword" />
      <Text style={s.label}>Confirmar nova senha</Text><TextInput style={s.input} placeholder="Digite novamente a senha" placeholderTextColor="#94A3B8" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} editable={!busy} textContentType="newPassword" onSubmitEditing={savePassword} />
    </> : null}
    {!!message && <View style={[s.message, success ? s.successBox : validLink ? s.infoBox : s.errorBox]}><Text style={[s.messageText, success ? s.successText : validLink ? s.infoText : s.errorText]}>{message}</Text></View>}
    {validLink && !success ? <TouchableOpacity style={[s.button, busy && { opacity: .65 }]} onPress={savePassword} disabled={busy || checking}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Salvar nova senha</Text>}</TouchableOpacity> : null}
    <TouchableOpacity style={s.link} onPress={() => router.replace('/login')}><Text style={s.linkText}>{success ? 'Ir para o login' : 'Voltar para o login'}</Text></TouchableOpacity>
    {!supabaseConfigured ? <Text style={s.errorText}>Supabase não configurado neste ambiente.</Text> : null}
  </View><Text style={s.footer}>Gestão Escolar · Acesso seguro</Text></View>;
}
const s = StyleSheet.create({
  page: { flex: 1, minHeight: '100%', backgroundColor: '#EEF4F7', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 440, backgroundColor: '#fff', borderRadius: 22, padding: 28, borderWidth: 1, borderColor: '#E2E8F0', ...(Platform.OS === 'web' ? { boxShadow: '0px 12px 35px rgba(15, 23, 42, 0.08)' } as any : { elevation: 4 }) },
  logoMark: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#0F766E', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }, logoMarkText: { fontSize: 30 }, logo: { fontSize: 28, fontWeight: '900', color: '#0F766E' },
  title: { fontSize: 21, fontWeight: '800', color: '#172033', marginTop: 24, marginBottom: 20 }, label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 7 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, color: '#0F172A', marginBottom: 16 },
  button: { minHeight: 50, backgroundColor: '#0F766E', padding: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4 }, buttonText: { color: '#fff', fontWeight: '800', fontSize: 16 }, link: { paddingVertical: 17, alignItems: 'center' }, linkText: { color: '#0F766E', fontWeight: '700' },
  message: { borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1 }, messageText: { fontSize: 13, lineHeight: 19 }, successBox: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }, successText: { color: '#166534' }, infoBox: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }, infoText: { color: '#1E40AF' }, errorBox: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }, errorText: { color: '#991B1B' }, footer: { color: '#64748B', fontSize: 12, marginTop: 18 },
});
