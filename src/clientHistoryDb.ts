import { getSupabaseClient } from './supabaseClient';
import { Appointment, ClientProfile, ClienteAtendimento } from './types';

export const CLIENT_HISTORY_SQL_SCRIPT = `-- ==============================================================================
-- TABELAS DE CLIENTES E HISTÓRICO DE ATENDIMENTOS NO SUPABASE
-- Gabriela Santos - Nail Designer
-- ==============================================================================
-- INSTRUÇÕES:
-- 1. No painel do Supabase (supabase.com), abra seu projeto.
-- 2. No menu lateral, clique em "SQL Editor" -> "+ New Query".
-- 3. Cole o código abaixo e clique em "Run" (ou Ctrl+Enter).
-- ==============================================================================

-- 1. Tabela de Perfil e Ficha Técnica da Cliente
CREATE TABLE IF NOT EXISTS public.clients (
  id text PRIMARY KEY,
  name text NOT NULL,
  phone text NOT NULL UNIQUE,
  avatar_url text,          -- URL ou base64 da foto da cliente
  client_since date DEFAULT CURRENT_DATE,
  nail_shape text,          -- Formato favorito: Amendoada, Quadrada, Bailarina, Stiletto, Oval
  preferences text,         -- Preferências: Estilo, cores favoritas, esmaltação
  allergies text,           -- Sensibilidades / Alergias a produtos ou cabine
  notes text,               -- Anotações gerais da profissional
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Tabela de Histórico de Atendimentos / Procedimentos
CREATE TABLE IF NOT EXISTS public.client_history (
  id text PRIMARY KEY,
  client_phone text NOT NULL,
  client_name text NOT NULL,
  date date NOT NULL,
  start_time text,
  service_name text NOT NULL,
  price numeric(10, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'completed', -- 'completed', 'confirmed', 'pending', 'cancelled'
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Índices para buscas ultrarrápidas por telefone e data
CREATE INDEX IF NOT EXISTS idx_client_history_phone ON public.client_history(client_phone);
CREATE INDEX IF NOT EXISTS idx_client_history_date ON public.client_history(date DESC);

-- 3. Habilitação de Segurança em Nível de Linha (RLS)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_history ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso total para o aplicativo
DROP POLICY IF EXISTS "Acesso total clients" ON public.clients;
CREATE POLICY "Acesso total clients" ON public.clients 
FOR ALL TO anon, authenticated, service_role 
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total client_history" ON public.client_history;
CREATE POLICY "Acesso total client_history" ON public.client_history 
FOR ALL TO anon, authenticated, service_role 
USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.clients TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.client_history TO anon, authenticated, service_role;

-- 4. View Consolidada com Métricas de Fidelidade e Status
CREATE OR REPLACE VIEW public.vw_client_history_summary AS
SELECT 
  c.phone AS client_phone,
  c.name AS client_name,
  c.client_since,
  c.nail_shape,
  c.preferences,
  c.allergies,
  COUNT(h.id) AS total_visits,
  COALESCE(SUM(CASE WHEN h.status != 'cancelled' THEN h.price ELSE 0 END), 0) AS total_spent,
  COALESCE(AVG(CASE WHEN h.status != 'cancelled' THEN h.price ELSE NULL END), 0) AS average_ticket,
  MAX(h.date) AS last_visit_date,
  CASE 
    WHEN MAX(h.date) >= CURRENT_DATE - INTERVAL '45 days' THEN 'ativa'
    WHEN MAX(h.date) < CURRENT_DATE - INTERVAL '90 days' THEN 'sumida'
    ELSE 'risco'
  END AS status
FROM public.clients c
LEFT JOIN public.client_history h ON h.client_phone = c.phone
GROUP BY c.phone, c.name, c.client_since, c.nail_shape, c.preferences, c.allergies;
`;

/**
 * Salva ou atualiza a ficha técnica da cliente no Supabase
 */
export async function syncClientProfileToSupabase(profile: ClientProfile): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, message: 'Supabase não configurado' };

  try {
    const payload: Record<string, any> = {
      id: profile.phone,
      name: profile.name,
      phone: profile.phone,
      avatar_url: profile.avatarUrl || null,
      nail_shape: profile.nailShape || null,
      preferences: profile.preferences || null,
      allergies: profile.allergies || null,
      notes: profile.notes || null,
      updated_at: new Date().toISOString()
    };

    const { error } = await client.from('clients').upsert(payload, { onConflict: 'id' });
    if (error) {
      // Se tabela não existe ainda, silenciosamente falha no relacional (já gravado em app_state)
      return { success: false, message: error.message };
    }
    return { success: true, message: 'Perfil salvo na tabela "clients" do Supabase' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Erro' };
  }
}

/**
 * Salva ou atualiza um registro no histórico relacional do Supabase
 */
export async function syncHistoryRecordToSupabase(record: {
  id: string;
  clientPhone: string;
  clientName: string;
  date: string;
  startTime?: string;
  serviceName: string;
  price: number;
  status?: string;
  notes?: string;
}): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, message: 'Supabase não configurado' };

  try {
    const payload = {
      id: record.id,
      client_phone: record.clientPhone,
      client_name: record.clientName,
      date: record.date,
      start_time: record.startTime || '09:00',
      service_name: record.serviceName,
      price: record.price,
      status: record.status || 'completed',
      notes: record.notes || ''
    };

    // Tenta salvar em client_history
    const { error: histError } = await client.from('client_history').upsert(payload, { onConflict: 'id' });
    
    // Tenta salvar também em appointments para garantir paridade
    try {
      const appPayload = {
        id: record.id,
        service_id: 'custom',
        date: record.date,
        start_time: record.startTime || '09:00',
        end_time: '10:00',
        client_name: record.clientName,
        client_phone: record.clientPhone,
        status: record.status || 'completed',
        price: record.price,
        notes: record.notes || ''
      };
      await client.from('appointments').upsert(appPayload, { onConflict: 'id' });
    } catch {
      // Ignora se tabela appointments ainda não existir
    }

    if (histError) {
      return { success: false, message: histError.message };
    }
    return { success: true, message: 'Registro gravado no histórico do Supabase' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Erro' };
  }
}

/**
 * Remove um registro de atendimento do Supabase
 */
export async function deleteHistoryRecordFromSupabase(id: string): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, message: 'Supabase não configurado' };

  try {
    await client.from('client_history').delete().eq('id', id);
    await client.from('appointments').delete().eq('id', id);
    return { success: true, message: 'Registro excluído do Supabase' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Erro ao excluir' };
  }
}

/**
 * Remove uma cliente por completo do Supabase (tabela clients e seus atendimentos)
 */
export async function deleteClientFromSupabase(phoneOrId: string, clientName?: string): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, message: 'Supabase não configurado' };

  const cleanPhone = phoneOrId.replace(/\D/g, '');

  try {
    const promises: PromiseLike<any>[] = [
      client.from('clients').delete().eq('phone', phoneOrId),
      client.from('clients').delete().eq('id', phoneOrId),
      client.from('client_history').delete().eq('client_phone', phoneOrId),
      client.from('appointments').delete().eq('client_phone', phoneOrId)
    ];

    if (cleanPhone && cleanPhone !== phoneOrId) {
      promises.push(
        client.from('clients').delete().eq('phone', cleanPhone),
        client.from('clients').delete().eq('id', cleanPhone),
        client.from('client_history').delete().eq('client_phone', cleanPhone),
        client.from('appointments').delete().eq('client_phone', cleanPhone)
      );
    }

    if (cleanPhone.length >= 8) {
      const last8 = cleanPhone.slice(-8);
      promises.push(
        client.from('clients').delete().ilike('phone', `%${last8}%`),
        client.from('client_history').delete().ilike('client_phone', `%${last8}%`),
        client.from('appointments').delete().ilike('client_phone', `%${last8}%`)
      );
    }

    if (clientName && clientName.trim()) {
      promises.push(
        client.from('clients').delete().ilike('name', clientName.trim()),
        client.from('client_history').delete().ilike('client_name', clientName.trim()),
        client.from('appointments').delete().ilike('client_name', clientName.trim())
      );
    }

    await Promise.all(promises);
    return { success: true, message: 'Cliente removida do Supabase' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Erro ao remover cliente' };
  }
}

/**
 * Verifica se a tabela client_history existe no Supabase
 */
export async function checkClientHistoryTables(): Promise<{
  hasClientsTable: boolean;
  hasHistoryTable: boolean;
  connected: boolean;
}> {
  const client = getSupabaseClient();
  if (!client) return { hasClientsTable: false, hasHistoryTable: false, connected: false };

  try {
    const [clientsRes, historyRes] = await Promise.all([
      client.from('clients').select('id').limit(1),
      client.from('client_history').select('id').limit(1)
    ]);

    const hasClientsTable = !clientsRes.error || clientsRes.error.code === 'PGRST116';
    const hasHistoryTable = !historyRes.error || historyRes.error.code === 'PGRST116';

    return {
      hasClientsTable,
      hasHistoryTable,
      connected: true
    };
  } catch (err) {
    return { hasClientsTable: false, hasHistoryTable: false, connected: false };
  }
}
