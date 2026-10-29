import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { supabase, supabaseConfigured } from '../src/lib/supabase';

export default function Index() {
  const [path, setPath] = useState<'/home' | '/login' | null>(null);

  useEffect(() => {
    let alive = true;
    let finished = false;

    // Não bloqueie a abertura do app se o Supabase ainda não estiver configurado.
    if (!supabaseConfigured) {
      setPath('/login');
      return () => { alive = false; };
    }

    // Fallback para evitar tela branca se a leitura da sessão falhar ou ficar pendurada.
    const fallback = setTimeout(() => {
      if (alive && !finished) {
        finished = true;
        setPath('/login');
      }
    }, 4000);

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!alive || finished) return;
        finished = true;
        clearTimeout(fallback);
        setPath(!error && data.session ? '/home' : '/login');
      })
      .catch(() => {
        if (!alive || finished) return;
        finished = true;
        clearTimeout(fallback);
        setPath('/login');
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      setPath(session ? '/home' : '/login');
    });

    return () => {
      alive = false;
      clearTimeout(fallback);
      subscription.unsubscribe();
    };
  }, []);

  if (path) return <Redirect href={path as any} />;

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF4F7' }}>
      <ActivityIndicator size="large" color="#0F766E" />
      <Text style={{ marginTop: 12, color: '#334155' }}>Abrindo Presença & Aula...</Text>
    </View>
  );
}
