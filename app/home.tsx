import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useApp } from '../src/context/AppContext';
import { supabase, supabaseConfigured } from '../src/lib/supabase';

const tiles = [
  { icon: 'calendar' as const, title: 'Chamada', detail: 'Registrar presença', color: '#F4C987', ink: '#70451D', route: '/attendance' as const },
  { icon: 'people' as const, title: 'Turmas e alunos', detail: 'Cadastros e matrículas', color: '#9BCB7A', ink: '#28542A', route: '/classes' as const },
  { icon: 'book' as const, title: 'Planos de aula', detail: 'Conteúdos e anexos', color: '#F2A16D', ink: '#713B20', route: '/lessons' as const },
  { icon: 'document-text' as const, title: 'Histórico', detail: 'Consultar frequência', color: '#65B5E8', ink: '#174B75', route: '/history' as const },
  { icon: 'clipboard' as const, title: 'Avaliações', detail: 'Notas e médias dos alunos', color: '#C7B7F2', ink: '#49317A', route: '/evaluations' as const },
  { icon: 'school' as const, title: 'Boletim', detail: 'Resumo de notas e frequência', color: '#A7DCCB', ink: '#17664F', route: '/boletim' as const },
  { icon: 'document-text' as const, title: 'Extras', detail: 'Registro de objetivos desenvolvidos', color: '#F6D8A8', ink: '#7A4A12', route: '/extras' as const },
  { icon: 'business' as const, title: 'Minha escola', detail: 'Professores e permissões', color: '#DCEBFF', ink: '#244F9E', route: '/school' as const },
  { icon: 'key' as const, title: 'Alterar senha', detail: 'Atualize sua senha de acesso', color: '#D7F3E8', ink: '#17664F', route: '/password' as const },
];

export default function Home() {
  const { classes, lessons, attendance, online, loading, schools, activeSchoolId, switchSchool } = useApp();
  const [signingOut, setSigningOut] = React.useState(false);
  const { width } = useWindowDimensions();
  const columns = width >= 1050 ? 4 : width >= 650 ? 3 : 2;
  const pending = classes.length ? Math.max(0, lessons.length - new Set(attendance.map(a => a.lessonId)).size) : 0;
  const tileWidth = `${100 / columns - 2}%` as `${number}%`;

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      if (supabaseConfigured) {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      }
      router.replace('/login');
    } catch (error) {
      Alert.alert('Não foi possível sair', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.topbar}>
        <View style={s.brandMark}><Ionicons name="school" size={27} color="#FFFFFF" /></View>
        <View style={s.brandText}>
          <Text style={s.title}>Gestão Escolar</Text>
          <Text style={s.subtitle}>Organize suas turmas em um só lugar</Text>
        </View>
        <View style={s.headerActions}>
          <View style={[s.connection, online ? s.online : s.offline]}>
            <View style={[s.dot, online ? s.dotOnline : s.dotOffline]} />
            <Text style={s.connectionText}>{loading ? 'Carregando' : online ? 'Sincronizado' : 'Modo local'}</Text>
          </View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Sair da conta" disabled={signingOut} activeOpacity={0.8} style={[s.logoutButton, signingOut && { opacity: 0.65 }]} onPress={signOut}>
            <Ionicons name="log-out-outline" size={19} color="#FFFFFF" />
            <Text style={s.logoutText}>{signingOut ? 'Saindo...' : 'Sair'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.welcome}>
        <Text style={s.welcomeTitle}>Painel escolar</Text>
        <Text style={s.welcomeText}>Gerencie turmas, professores e registros da sua escola.</Text>
      </View>
      {schools.length > 1 ? <View style={s.schoolSwitcher}><Text style={s.schoolSwitcherLabel}>ESCOLA ATUAL</Text><View style={s.schoolOptions}>{schools.map(school => <TouchableOpacity key={school.id} style={[s.schoolOption, activeSchoolId===school.id && s.schoolOptionActive]} onPress={() => switchSchool(school.id)}><Text style={[s.schoolOptionText, activeSchoolId===school.id && s.schoolOptionTextActive]}>{school.name}</Text></TouchableOpacity>)}</View><Text style={s.schoolSwitcherHint}>Escolha a escola para ver somente os dados dela.</Text></View> : null}

      <View style={s.stats}>
        <Stat icon="people" label="Turmas" value={classes.length} color="#3B6F9C" />
        <Stat icon="book" label="Aulas / planos" value={lessons.length} color="#B66A35" />
        <Stat icon="alert-circle" label="Chamadas pendentes" value={pending} color="#9B5DB5" />
      </View>

      <Text style={s.sectionTitle}>Acesso rápido</Text>
      <View style={s.tiles}>
        {tiles.map((tile) => (
          <TouchableOpacity key={tile.title} activeOpacity={0.82} style={[s.tile, { backgroundColor: tile.color, width: tileWidth }]} onPress={() => router.push(tile.route)}>
            <View style={s.tileIcon}><Ionicons name={tile.icon} size={30} color={tile.ink} /></View>
            <Text style={[s.tileTitle, { color: tile.ink }]}>{tile.title}</Text>
            <Text style={[s.tileDetail, { color: tile.ink }]}>{tile.detail}</Text>
            <View style={[s.tileArrow, { borderColor: `${tile.ink}55` }]}><Ionicons name="arrow-forward" size={15} color={tile.ink} /></View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.tip}>
        <Ionicons name="information-circle-outline" size={22} color="#087EBA" />
        <View style={{ flex: 1 }}>
          <Text style={s.tipTitle}>Comece pela sua escola</Text>
          <Text style={s.tipText}>Configure sua escola em “Minha escola”, compartilhe o código de convite com a equipe e depois cadastre turmas, alunos, planos de aula e chamadas.</Text>
        </View>
      </View>
    </ScrollView>
  );
}

function Stat({ icon, label, value, color }: any) {
  return <View style={s.stat}><Ionicons name={icon} size={23} color={color} /><Text style={s.statValue}>{value}</Text><Text style={s.statLabel}>{label}</Text></View>;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F6FA' },
  content: { padding: 22, paddingTop: 28, paddingBottom: 40, maxWidth: 1240, width: '100%', alignSelf: 'center' },
  topbar: { backgroundColor: '#087EBA', borderRadius: 18, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 24, shadowColor: '#0F172A', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  brandMark: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#FFFFFF2A', alignItems: 'center', justifyContent: 'center' },
  brandText: { flex: 1 }, title: { fontSize: 25, fontWeight: '900', color: '#FFFFFF' }, subtitle: { fontSize: 13, color: '#E2F3FF', marginTop: 3 },
  headerActions: { alignItems: 'flex-end', gap: 8 }, logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#075985', borderWidth: 1, borderColor: '#FFFFFF55' }, logoutText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  connection: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 20 }, online: { backgroundColor: '#D8F7E7' }, offline: { backgroundColor: '#FFF0D7' }, dot: { width: 8, height: 8, borderRadius: 4 }, dotOnline: { backgroundColor: '#15803D' }, dotOffline: { backgroundColor: '#B7791F' }, connectionText: { fontSize: 12, fontWeight: '700', color: '#243447' },
  welcome: { marginBottom: 18 }, welcomeTitle: { fontSize: 23, fontWeight: '800', color: '#182536' }, welcomeText: { color: '#64748B', fontSize: 14, marginTop: 5 },
  schoolSwitcher:{backgroundColor:'#FFFFFF',borderRadius:14,padding:14,marginBottom:18,borderWidth:1,borderColor:'#DCE5EF'},schoolSwitcherLabel:{fontSize:11,fontWeight:'900',letterSpacing:1,color:'#64748B',marginBottom:9},schoolOptions:{flexDirection:'row',flexWrap:'wrap',gap:8},schoolOption:{paddingVertical:8,paddingHorizontal:12,borderRadius:10,backgroundColor:'#F1F5F9',borderWidth:1,borderColor:'#CBD5E1'},schoolOptionActive:{backgroundColor:'#0F766E',borderColor:'#0F766E'},schoolOptionText:{fontSize:13,fontWeight:'700',color:'#334155'},schoolOptionTextActive:{color:'#FFFFFF'},schoolSwitcherHint:{fontSize:11,color:'#64748B',marginTop:8},
  stats: { flexDirection: 'row', gap: 12, marginBottom: 27 }, stat: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 15, paddingVertical: 17, paddingHorizontal: 10, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' }, statValue: { fontSize: 25, fontWeight: '900', color: '#172033', marginTop: 7 }, statLabel: { fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#243447', marginBottom: 13 }, tiles: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', gap: 12 }, tile: { minHeight: 155, borderRadius: 17, padding: 16, marginBottom: 2, borderWidth: 1, borderColor: '#FFFFFFAA' }, tileIcon: { width: 46, height: 46, borderRadius: 13, backgroundColor: '#FFFFFF70', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }, tileTitle: { fontSize: 16, fontWeight: '900' }, tileDetail: { fontSize: 12, marginTop: 4, opacity: 0.88 }, tileArrow: { position: 'absolute', right: 12, top: 12, width: 27, height: 27, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tip: { marginTop: 24, padding: 16, borderRadius: 15, backgroundColor: '#E5F3FB', borderWidth: 1, borderColor: '#C5E6F7', flexDirection: 'row', gap: 12, alignItems: 'flex-start' }, tipTitle: { color: '#155B82', fontSize: 14, fontWeight: '800', marginBottom: 4 }, tipText: { color: '#31576D', fontSize: 13, lineHeight: 19 },
});
