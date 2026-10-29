import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase, supabaseConfigured } from '../src/lib/supabase';

export default function Login() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signup, setSignup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'error' | 'success' | 'info'>('info');
  const [showResend, setShowResend] = useState(false);

  function showMessage(text: string, type: 'error' | 'success' | 'info' = 'info') {
    setMessage(text);
    setMessageType(type);
  }

  async function resendConfirmation() {
    setMessage('');
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      showMessage('Informe um e-mail válido para reenviar a confirmação.', 'error');
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: normalizedEmail });
      if (error) {
        const raw = error.message || 'Não foi possível solicitar o reenvio.';
        const friendly = raw.toLowerCase().includes('rate limit') || raw.toLowerCase().includes('too many requests')
          ? 'Muitos pedidos em pouco tempo. Aguarde alguns minutos antes de tentar novamente.'
          : raw.toLowerCase().includes('email address not authorized')
          ? 'O SMTP padrão do Supabase só envia para endereços autorizados. Configure um SMTP personalizado no painel do Supabase.'
          : raw;
        showMessage(friendly, 'error');
        return;
      }
      showMessage('Solicitação de reenvio aceita. Confira spam, lixo eletrônico e promoções. Se não chegar, configure um SMTP personalizado no Supabase.', 'success');
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      showMessage(`Não foi possível reenviar a confirmação. ${details}`, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setMessage('');
    const normalizedEmail = email.trim().toLowerCase();

    if (!supabaseConfigured) {
      showMessage(
        'O Supabase não está configurado. Crie um arquivo .env na pasta principal do projeto com EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, depois reinicie o Expo.',
        'error'
      );
      return;
    }
    if (signup && fullName.trim().length < 3) {
      showMessage('Informe o nome completo do professor.', 'error');
      return;
    }
    if (!normalizedEmail || !password) {
      showMessage('Informe seu e-mail e sua senha.', 'error');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      showMessage('Digite um endereço de e-mail válido.', 'error');
      return;
    }
    if (signup && password.length < 6) {
      showMessage('A senha deve ter pelo menos 6 caracteres.', 'error');
      return;
    }

    setBusy(true);
    try {
      const result = signup
        ? await supabase.auth.signUp({ email: normalizedEmail, password, options: { data: { full_name: fullName.trim(), role: 'professor' } } })
        : await supabase.auth.signInWithPassword({ email: normalizedEmail, password });

      if (result.error) {
        const raw = result.error.message || 'Erro desconhecido ao autenticar.';
        const friendly = raw.toLowerCase().includes('invalid login credentials')
          ? 'E-mail ou senha incorretos. Se ainda não tem conta, clique em “Criar uma conta”.'
          : raw.toLowerCase().includes('email not confirmed')
          ? 'Seu e-mail ainda não foi confirmado. Verifique spam ou solicite um novo e-mail de confirmação abaixo.'
          : raw.toLowerCase().includes('fetch')
          ? 'Não foi possível conectar ao Supabase. Confira a URL, a chave pública e sua conexão com a internet.'
          : raw;
        showMessage(friendly, 'error');
        if (raw.toLowerCase().includes('email not confirmed')) setShowResend(true);
        return;
      }

      if (signup && !result.data.session) {
        setShowResend(true);
        showMessage('Cadastro criado, mas a confirmação depende da entrega do e-mail. Confira spam e lixo eletrônico; se não chegar, use o botão de reenvio abaixo.', 'success');
        setSignup(false);
        return;
      }

      if (!result.data.session && !signup) {
        showMessage('A autenticação não retornou uma sessão. Confira as configurações de autenticação do Supabase.', 'error');
        return;
      }

      router.replace('/home');
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      showMessage(`Não foi possível concluir a operação. ${details}`, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.page}>
      <View style={s.card}>
        <View style={s.logoMark}><Text style={s.logoMarkText}>🎓</Text></View>
        <Text style={s.logo}>Gestão Escolar</Text>
        <Text style={s.subtitle}>Organize suas turmas, aulas e chamadas.</Text>
        <Text style={s.title}>{signup ? 'Criar conta de professor' : 'Bem-vindo de volta'}</Text>
        {signup ? <><Text style={s.label}>Nome completo do professor</Text><TextInput style={s.input} placeholder="Nome e sobrenome" placeholderTextColor="#94A3B8" autoCapitalize="words" value={fullName} onChangeText={setFullName} editable={!busy} textContentType="name" /></> : null}
        <Text style={s.label}>E-mail</Text>
        <TextInput
          style={s.input}
          placeholder="voce@escola.com"
          placeholderTextColor="#94A3B8"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          value={email}
          onChangeText={setEmail}
          editable={!busy}
          onSubmitEditing={submit}
        />
        <Text style={s.label}>Senha</Text>
        <TextInput
          style={s.input}
          placeholder="Mínimo de 6 caracteres"
          placeholderTextColor="#94A3B8"
          secureTextEntry
          autoCapitalize="none"
          textContentType={signup ? 'newPassword' : 'password'}
          value={password}
          onChangeText={setPassword}
          editable={!busy}
          onSubmitEditing={submit}
        />

        {message ? (
          <View style={[s.message, messageType === 'error' ? s.errorBox : messageType === 'success' ? s.successBox : s.infoBox]}>
            <Text accessibilityRole="alert" style={[s.messageText, messageType === 'error' ? s.errorText : messageType === 'success' ? s.successText : s.infoText]}>{message}</Text>
          </View>
        ) : null}

        <TouchableOpacity style={[s.button, busy && s.buttonDisabled]} disabled={busy} onPress={submit} accessibilityRole="button">
          {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.buttonText}>{signup ? 'Criar conta' : 'Entrar'}</Text>}
        </TouchableOpacity>
        {showResend ? (
          <TouchableOpacity disabled={busy} onPress={resendConfirmation} style={s.resendButton} accessibilityRole="button">
            <Text style={s.resendText}>{busy ? 'Enviando...' : 'Reenviar e-mail de confirmação'}</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity disabled={busy} onPress={() => { setSignup(!signup); showMessage(''); setShowResend(false); setFullName(''); }} style={s.switchButton}>
          <Text style={s.switchText}>{signup ? 'Já tenho uma conta · Entrar' : 'Primeiro acesso? Criar uma conta'}</Text>
        </TouchableOpacity>
        {!supabaseConfigured ? (
          <Text style={s.configHint}>Configuração pendente: o arquivo .env não foi detectado neste build.</Text>
        ) : null}
      </View>
      <Text style={s.footer}>Gestão Escolar · Acesso seguro</Text>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, minHeight: '100%', backgroundColor: '#EEF4F7', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 440, backgroundColor: '#FFFFFF', borderRadius: 22, padding: 28, borderWidth: 1, borderColor: '#E2E8F0', ...(Platform.OS === 'web' ? { boxShadow: '0px 12px 35px rgba(15, 23, 42, 0.08)' } as any : { elevation: 4 }) },
  logoMark: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#0F766E', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  logoMarkText: { color: '#FFFFFF', fontSize: 30, fontWeight: '900' },
  logo: { fontSize: 28, fontWeight: '900', color: '#0F766E' },
  subtitle: { color: '#64748B', fontSize: 14, marginTop: 5, marginBottom: 28 },
  title: { fontSize: 21, fontWeight: '800', color: '#172033', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 7 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, color: '#0F172A', marginBottom: 16 },
  button: { minHeight: 50, backgroundColor: '#0F766E', padding: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  buttonDisabled: { opacity: 0.65 },
  buttonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  switchButton: { paddingVertical: 17, alignItems: 'center' },
  resendButton: { minHeight: 44, borderWidth: 1, borderColor: '#0F766E', borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, marginTop: 8 },
  resendText: { color: '#0F766E', fontWeight: '800', fontSize: 14, textAlign: 'center' },
  switchText: { color: '#0F766E', fontWeight: '700', textAlign: 'center' },
  message: { borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1 },
  messageText: { fontSize: 13, lineHeight: 19 },
  errorBox: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  errorText: { color: '#991B1B' },
  successBox: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  successText: { color: '#166534' },
  infoBox: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  infoText: { color: '#1E40AF' },
  configHint: { color: '#B45309', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 4 },
  footer: { color: '#64748B', fontSize: 12, marginTop: 18 }
});
