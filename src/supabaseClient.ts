import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const getSupabaseConfig = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  let url = envUrl.trim();
  if (url) {
    url = url.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  }
  const anonKey = envKey.trim();
  const source: 'env' | 'none' = envUrl ? 'env' : 'none';

  return { url, anonKey, source };
};

let cachedClient: SupabaseClient | null = null;
let lastClientKey = '';

export const getSupabaseClient = (): SupabaseClient | null => {
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) return null;

  const currentKey = `${url}___${anonKey}`;
  if (cachedClient && lastClientKey === currentKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    lastClientKey = currentKey;
    return cachedClient;
  } catch (err) {
    console.warn('Falha ao inicializar cliente Supabase:', err);
    return null;
  }
};

// Legacy export for backwards compatibility
export const supabase = getSupabaseClient();

export const saveSupabaseCredentials = (_url: string, _anonKey: string) => {};

export const clearSupabaseCredentials = () => {};

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  hasTable: boolean;
  status: 'connected' | 'table_missing' | 'error' | 'not_configured';
}

/**
 * Normaliza e traduz mensagens e códigos de erro do Supabase de forma legível e segura.
 * Trata erros de servidor fora do ar (Cloudflare 521), Failed to fetch e respostas HTML.
 */
export const formatSupabaseErrorMessage = (error: any): string => {
  if (!error) return 'Erro desconhecido';
  const rawMsg = typeof error === 'string' ? error : (error.message || '');
  const details = typeof error === 'object' ? (error.details || '') : '';
  const combined = `${rawMsg} ${details}`.toLowerCase();

  if (
    combined.includes('failed to fetch') ||
    combined.includes('networkerror') ||
    combined.includes('521') ||
    combined.includes('web server is down') ||
    combined.includes('<!doctype')
  ) {
    return 'Servidor do Supabase temporariamente indisponível ou projeto pausado (Erro 521 / Failed to fetch). Operando em modo resiliente local/servidor.';
  }
  if (
    error.code === '42501' ||
    combined.includes('permission denied') ||
    combined.includes('row-level security')
  ) {
    return 'Permissão negada no banco de dados (RLS): apenas administradores autenticados podem realizar esta alteração.';
  }
  if (error.code === '42P01' || error.code === 'PGRST125' || combined.includes('does not exist')) {
    return 'Tabela "app_state" não encontrada no Supabase. Execute o script SQL no painel do Supabase.';
  }
  if (
    error.code === 'PGRST301' || 
    combined.includes('jwt') || 
    combined.includes('invalid api key') || 
    error.code === 'UNAUTHORIZED_INVALID_API_KEY_TYPE'
  ) {
    return 'Chave Anon ou URL do Supabase inválida. Verifique suas credenciais no painel do Supabase.';
  }
  if (combined.includes('<html') || combined.includes('<!doctype')) {
    return 'Servidor do Supabase retornou resposta HTTP inesperada (HTTP 5xx).';
  }
  return error.code ? `${rawMsg} (Código: ${error.code})` : (rawMsg || 'Falha de comunicação com o Supabase');
};

export const testSupabaseConnection = async (): Promise<ConnectionTestResult> => {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'URL e Chave Anon do Supabase não configuradas.',
      hasTable: false,
      status: 'not_configured',
    };
  }

  try {
    const { data, error } = await client.from('app_state').select('id').limit(1);

    if (error) {
      if (error.code === 'PGRST116') {
        // Tabela existe mas está vazia
        return {
          success: true,
          message: 'Conectado com sucesso! (Tabela app_state pronta para receber dados)',
          hasTable: true,
          status: 'connected',
        };
      }
      if (error.code === '42P01' || error.code === 'PGRST125' || error.message?.includes('does not exist')) {
        return {
          success: false,
          message: 'Conexão estabelecida, mas a tabela "app_state" ainda não foi criada. Execute o script SQL no SQL Editor do Supabase.',
          hasTable: false,
          status: 'table_missing',
        };
      }
      return {
        success: false,
        message: `Falha na consulta: ${formatSupabaseErrorMessage(error)}`,
        hasTable: false,
        status: 'error',
      };
    }

    return {
      success: true,
      message: 'Conexão e tabela "app_state" verificadas com sucesso! Agendamentos salvos em nuvem.',
      hasTable: true,
      status: 'connected',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Falha na conexão: ${formatSupabaseErrorMessage(err)}`,
      hasTable: false,
      status: 'error',
    };
  }
};

