import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
  if (req.method !== 'POST') return json(405, { error: 'Método não permitido.' });

  const authorization = req.headers.get('Authorization');
  if (!authorization) return json(401, { error: 'Sessão não informada.' });
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) return json(500, { error: 'Configure SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY nos secrets da função.' });

  const authClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) return json(401, { error: 'Sessão inválida. Entre novamente.' });

  let body: { school_id?: string; user_id?: string; action?: string };
  try { body = await req.json(); } catch { return json(400, { error: 'Corpo da solicitação inválido.' }); }
  const { school_id, user_id, action } = body;
  if (!school_id || !user_id || !['remove_from_school', 'delete_account'].includes(action || '')) {
    return json(400, { error: 'Informe escola, usuário e uma ação válida.' });
  }
  if (user.id === user_id) return json(400, { error: 'Você não pode remover ou excluir sua própria conta por esta tela.' });

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: callerMembership, error: callerError } = await admin.from('school_members')
    .select('role').eq('school_id', school_id).eq('user_id', user.id).maybeSingle();
  if (callerError) return json(500, { error: callerError.message });
  if (callerMembership?.role !== 'administrador') return json(403, { error: 'Somente o administrador da escola pode realizar esta ação.' });

  const { data: targetMembership, error: targetError } = await admin.from('school_members')
    .select('user_id').eq('school_id', school_id).eq('user_id', user_id).maybeSingle();
  if (targetError) return json(500, { error: targetError.message });
  if (!targetMembership) return json(404, { error: 'Esse usuário não é membro desta escola.' });

  const { data: school, error: schoolError } = await admin.from('schools')
    .select('created_by').eq('id', school_id).maybeSingle();
  if (schoolError) return json(500, { error: schoolError.message });
  if (school?.created_by === user_id) return json(400, { error: 'O responsável que criou a escola não pode ser removido por esta tela. Transfira a responsabilidade primeiro.' });

  if (action === 'remove_from_school') {
    const { error: assignmentError } = await admin.from('class_teachers').delete().eq('school_id', school_id).eq('user_id', user_id);
    if (assignmentError) return json(500, { error: assignmentError.message });
    const { error: membershipDeleteError } = await admin.from('school_members').delete().eq('school_id', school_id).eq('user_id', user_id);
    if (membershipDeleteError) return json(500, { error: membershipDeleteError.message });
    return json(200, { message: 'Usuário removido da escola. A conta continua ativa.' });
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user_id);
  if (deleteError) return json(500, { error: deleteError.message });
  return json(200, { message: 'Conta excluída do Supabase Auth.' });
});
