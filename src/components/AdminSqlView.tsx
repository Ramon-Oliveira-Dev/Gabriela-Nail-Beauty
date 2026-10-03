import React, { useState } from 'react';
import { 
  Code, Copy, Check, Terminal, Database, CheckCircle2, 
  ExternalLink, Download, Sparkles, Layers, ShieldCheck 
} from 'lucide-react';
import { useStore } from '../StoreContext';

const FULL_SQL_SCRIPT = `-- ==============================================================================
-- SCRIPT SQL COMPLETO PARA O SUPABASE - GABRIELA SANTOS NAIL DESIGNER
-- ==============================================================================
-- INSTRUÇÕES DE EXECUÇÃO:
-- 1. Acesse o painel do seu projeto no Supabase: https://supabase.com/dashboard
-- 2. No menu lateral esquerdo, clique no ícone "SQL Editor" (ícone de terminal)
-- 3. Clique em "+ New query" (Nova consulta)
-- 4. Cole todo o conteúdo deste arquivo e clique no botão verde "Run" (ou Ctrl+Enter)
-- 5. Pronto! O banco de dados estará 100% configurado com tabelas, permissões e dados iniciais.
-- ==============================================================================

-- 1. Extensões úteis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela principal de sincronização de estado (app_state)
CREATE TABLE IF NOT EXISTS public.app_state (
  id integer PRIMARY KEY DEFAULT 1,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

-- Garante que as colunas existem mesmo se a tabela já existia de uma versão anterior
ALTER TABLE public.app_state ADD COLUMN IF NOT EXISTS data jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.app_state ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 3. Inserção do registro inicial com os dados da Gabriela Santos
INSERT INTO public.app_state (id, data)
VALUES (
  1, 
  '{
    "services": [
      {
        "id": "1",
        "name": "Alongamento em Gel",
        "durationMinutes": 90,
        "price": 150,
        "description": "Alongamento com gel para unhas naturais mais longas, resistentes e elegantes.",
        "imageUrl": "/gallery/nail_almond.jpg",
        "category": "aplicacao"
      },
      {
        "id": "2",
        "name": "Manutenção de Alongamento",
        "durationMinutes": 75,
        "price": 100,
        "description": "Nivelamento, reforço do ponto de tensão e acabamento impecável.",
        "imageUrl": "/gallery/nail_salon.jpg",
        "category": "manutencao"
      },
      {
        "id": "3",
        "name": "Esmaltação em Gel",
        "durationMinutes": 60,
        "price": 80,
        "description": "Mais durabilidade, brilho intenso e secagem imediata por até 20 dias.",
        "imageUrl": "/gallery/nail_care.jpg",
        "category": "outros"
      },
      {
        "id": "4",
        "name": "Manicure Tradicional",
        "durationMinutes": 45,
        "price": 60,
        "description": "Cuidados essenciais, cutilagem alinhada e esmaltação perfeita.",
        "imageUrl": "/gallery/nail_french.jpg",
        "category": "outros"
      },
      {
        "id": "5",
        "name": "Nail Art Personalizada",
        "durationMinutes": 30,
        "price": 25,
        "description": "Design exclusivo, traços finos e detalhes para unhas especiais.",
        "imageUrl": "/gallery/nail_art_1.jpg",
        "category": "outros"
      }
    ],
    "appointments": [],
    "blocks": [],
    "config": {
      "address": "R. Bico-de-Lacre, 32 - Porto Canoa, Serra - ES, 29168-330",
      "whatsapp": "27996040206",
      "instagram": "gabrielanail.beauty",
      "workingHours": [
        { "dayOfWeek": 0, "isOpen": false, "openTime": "09:00", "closeTime": "18:00" },
        { "dayOfWeek": 1, "isOpen": true, "openTime": "09:00", "closeTime": "18:00" },
        { "dayOfWeek": 2, "isOpen": true, "openTime": "09:00", "closeTime": "18:00" },
        { "dayOfWeek": 3, "isOpen": true, "openTime": "09:00", "closeTime": "18:00" },
        { "dayOfWeek": 4, "isOpen": true, "openTime": "09:00", "closeTime": "18:00" },
        { "dayOfWeek": 5, "isOpen": true, "openTime": "09:00", "closeTime": "18:00" },
        { "dayOfWeek": 6, "isOpen": true, "openTime": "09:00", "closeTime": "14:00" }
      ]
    }
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- 4. Função e trigger para atualização automática da coluna updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_app_state_updated ON public.app_state;
CREATE TRIGGER on_app_state_updated
  BEFORE UPDATE ON public.app_state
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 5. Habilitação de Segurança em Nível de Linha (RLS) e Políticas
ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir acesso total app_state" ON public.app_state;
CREATE POLICY "Permitir acesso total app_state" 
ON public.app_state 
FOR ALL 
TO anon, authenticated, service_role
USING (true) 
WITH CHECK (true);

-- 6. Concessão de permissões explícitas no schema e tabela
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.app_state TO anon, authenticated, service_role;

-- ==============================================================================
-- 7. TABELAS ESTRUTURADAS RELACIONAIS (CONSULTAS DIRETAS E RELATÓRIOS)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.services (
  id text PRIMARY KEY,
  name text NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  price numeric(10, 2) NOT NULL DEFAULT 0,
  description text,
  image_url text,
  category text DEFAULT 'outros',
  complements jsonb DEFAULT '[]'::jsonb,
  images jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Garante colunas de complementos e imagens caso a tabela já existisse
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS complements jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS images jsonb DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.appointments (
  id text PRIMARY KEY,
  service_id text,
  date date NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  client_name text NOT NULL,
  client_phone text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  price numeric(10, 2) NOT NULL DEFAULT 0,
  reminder_sent boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.schedule_blocks (
  id text PRIMARY KEY,
  date date NOT NULL,
  is_full_day boolean DEFAULT false,
  start_time text,
  end_time text,
  reason text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.app_config (
  id integer PRIMARY KEY DEFAULT 1,
  whatsapp text DEFAULT '27996040206',
  instagram text DEFAULT 'gabrielanail.beauty',
  address text DEFAULT 'R. Bico-de-Lacre, 32 - Porto Canoa, Serra - ES, 29168-330',
  working_hours jsonb DEFAULT '[]'::jsonb,
  updated_at timestamptz DEFAULT now()
);

-- Habilitação de RLS nas tabelas relacionais
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso total services" ON public.services;
CREATE POLICY "Acesso total services" ON public.services FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total appointments" ON public.appointments;
CREATE POLICY "Acesso total appointments" ON public.appointments FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total schedule_blocks" ON public.schedule_blocks;
CREATE POLICY "Acesso total schedule_blocks" ON public.schedule_blocks FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total app_config" ON public.app_config;
CREATE POLICY "Acesso total app_config" ON public.app_config FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.services TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.appointments TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.schedule_blocks TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.app_config TO anon, authenticated, service_role;

-- Habilitação do Supabase Realtime para sincronização imediata
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.app_state;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.services;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Carga inicial de serviços no catálogo
INSERT INTO public.services (id, name, duration_minutes, price, description, image_url, category)
VALUES
  ('1', 'Alongamento em Gel', 90, 150.00, 'Alongamento com gel para unhas naturais mais longas, resistentes e elegantes.', '/gallery/nail_almond.jpg', 'aplicacao'),
  ('2', 'Manutenção de Alongamento', 75, 100.00, 'Nivelamento, reforço do ponto de tensão e acabamento impecável.', '/gallery/nail_salon.jpg', 'manutencao'),
  ('3', 'Esmaltação em Gel', 60, 80.00, 'Mais durabilidade, brilho intenso e secagem imediata por até 20 dias.', '/gallery/nail_care.jpg', 'outros'),
  ('4', 'Manicure Tradicional', 45, 60.00, 'Cuidados essenciais, cutilagem alinhada e esmaltação perfeita.', '/gallery/nail_french.jpg', 'outros'),
  ('5', 'Nail Art Personalizada', 30, 25.00, 'Design exclusivo, traços finos e detalhes para unhas especiais.', '/gallery/nail_art_1.jpg', 'outros')
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 8. TABELAS DE CLIENTES E HISTÓRICO DE PROCEDIMENTOS (CRM & ANAMNESE)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.clients (
  id text PRIMARY KEY,
  name text NOT NULL,
  phone text NOT NULL UNIQUE,
  client_since date DEFAULT CURRENT_DATE,
  nail_shape text,          -- Formato: Amendoada, Quadrada, Bailarina, Stiletto, Oval
  preferences text,         -- Cores, acabamentos e preferências
  allergies text,           -- Sensibilidades / Alergias
  notes text,               -- Anotações gerais da profissional
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_history (
  id text PRIMARY KEY,
  client_phone text NOT NULL,
  client_name text NOT NULL,
  date date NOT NULL,
  start_time text,
  service_name text NOT NULL,
  price numeric(10, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'completed',
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_history_phone ON public.client_history(client_phone);
CREATE INDEX IF NOT EXISTS idx_client_history_date ON public.client_history(date DESC);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso total clients" ON public.clients;
CREATE POLICY "Acesso total clients" ON public.clients FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total client_history" ON public.client_history;
CREATE POLICY "Acesso total client_history" ON public.client_history FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.clients TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.client_history TO anon, authenticated, service_role;

-- View consolidada com estatísticas das clientes
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

-- ==============================================================================
-- 9. TABELA DE ADMINISTRADORES E AUTORIZAÇÃO (SUPABASE AUTH)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'admin',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura de admins" ON public.admins;
CREATE POLICY "Permitir leitura de admins"
ON public.admins
FOR SELECT
TO authenticated, anon, service_role
USING (true);

GRANT ALL ON TABLE public.admins TO anon, authenticated, service_role;

-- Função auxiliar is_admin() para verificação via RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admins
    WHERE user_id = auth.uid() OR lower(email) = lower(auth.jwt() ->> 'email')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Registro do administrador oficial Gabriela Santos
INSERT INTO public.admins (email, role)
VALUES ('gabriela.nail.beauty@gmail.com', 'admin')
ON CONFLICT (email) DO NOTHING;`;

export const AdminSqlView: React.FC = () => {
  const { isSupabaseConnected, supabaseStatus } = useStore();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(FULL_SQL_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDownload = () => {
    const blob = new Blob([FULL_SQL_SCRIPT], { type: 'text/sql;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'supabase-schema.sql';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Topo com Título e Ações */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#201510] text-[#C5A88E] flex items-center justify-center shrink-0">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-2xl font-bold text-stone-800">
                Códigos SQL para o Supabase
              </h3>
              <p className="text-xs text-stone-500">
                Execute este script no painel do Supabase para deixar o banco de dados 100% configurado e funcional
              </p>
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleDownload}
            className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 bg-white hover:bg-stone-50 text-xs font-semibold flex items-center gap-2 transition-colors shadow-2xs"
            title="Baixar arquivo supabase-schema.sql"
          >
            <Download className="w-3.5 h-3.5 text-stone-500" />
            <span>Baixar .sql</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-xs ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-[#201510] text-white hover:bg-[#38261E]'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-200" />
                <span>SQL Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-[#C5A88E]" />
                <span>Copiar Código SQL</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Como Executar - 4 Passos Rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-2xs space-y-2">
          <div className="w-7 h-7 rounded-xl bg-[#201510] text-[#C5A88E] text-xs font-bold flex items-center justify-center">
            1
          </div>
          <h4 className="font-semibold text-xs text-stone-800">Acesse o Supabase</h4>
          <p className="text-[11px] text-stone-500 leading-relaxed">
            Entre na sua conta em <strong>supabase.com</strong> e abra o projeto do aplicativo.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-2xs space-y-2">
          <div className="w-7 h-7 rounded-xl bg-[#201510] text-[#C5A88E] text-xs font-bold flex items-center justify-center">
            2
          </div>
          <h4 className="font-semibold text-xs text-stone-800">Abra o SQL Editor</h4>
          <p className="text-[11px] text-stone-500 leading-relaxed">
            No menu lateral esquerdo, clique no ícone do terminal <strong>SQL Editor</strong> e depois em <strong>New query</strong>.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-2xs space-y-2">
          <div className="w-7 h-7 rounded-xl bg-[#201510] text-[#C5A88E] text-xs font-bold flex items-center justify-center">
            3
          </div>
          <h4 className="font-semibold text-xs text-stone-800">Cole e Execute</h4>
          <p className="text-[11px] text-stone-500 leading-relaxed">
            Cole o script completo no campo de texto e clique no botão verde <strong>Run</strong> (ou <kbd className="font-mono bg-stone-100 px-1 py-0.5 rounded text-[10px]">Ctrl+Enter</kbd>).
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-2xs space-y-2">
          <div className="w-7 h-7 rounded-xl bg-emerald-700 text-white text-xs font-bold flex items-center justify-center">
            4
          </div>
          <h4 className="font-semibold text-xs text-stone-800">100% Funcional!</h4>
          <p className="text-[11px] text-stone-500 leading-relaxed">
            Tabelas criadas, permissões liberadas e dados iniciais de serviços carregados automaticamente.
          </p>
        </div>
      </div>

      {/* Destaques das Tabelas Criadas */}
      <div className="bg-[#FAF6F2] p-5 rounded-2xl border border-[#EADDCF] flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 text-stone-800 font-medium">
          <Database className="w-4 h-4 text-[#8C6B4F]" />
          <span>Estruturas incluídas no script:</span>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="bg-white px-2.5 py-1 rounded-lg border border-[#E0D1C1] text-stone-700 font-mono font-semibold">
            public.app_state
          </span>
          <span className="bg-white px-2.5 py-1 rounded-lg border border-[#E0D1C1] text-stone-700 font-mono font-semibold">
            public.services
          </span>
          <span className="bg-white px-2.5 py-1 rounded-lg border border-[#E0D1C1] text-stone-700 font-mono font-semibold">
            public.appointments
          </span>
          <span className="bg-white px-2.5 py-1 rounded-lg border border-[#E0D1C1] text-stone-700 font-mono font-semibold">
            public.schedule_blocks
          </span>
          <span className="bg-white px-2.5 py-1 rounded-lg border border-[#E0D1C1] text-stone-700 font-mono font-semibold">
            public.app_config
          </span>
          <span className="bg-white px-2.5 py-1 rounded-lg border border-[#D5C2B0] text-[#201510] font-mono font-bold">
            public.clients
          </span>
          <span className="bg-white px-2.5 py-1 rounded-lg border border-[#D5C2B0] text-[#201510] font-mono font-bold">
            public.client_history
          </span>
          <span className="bg-white px-2.5 py-1 rounded-lg border border-[#D5C2B0] text-[#201510] font-mono font-bold">
            public.vw_client_history_summary
          </span>
          <span className="bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-lg border border-emerald-300 font-medium">
            RLS & Permissões Liberadas
          </span>
        </div>
      </div>

      {/* Bloco de Código com Syntax Highlighting e Rolagem */}
      <div className="bg-[#1A1412] rounded-3xl border border-stone-800 overflow-hidden shadow-lg">
        <div className="bg-[#241C19] px-6 py-3.5 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-stone-300 font-mono">
            <Terminal className="w-4 h-4 text-[#C5A88E]" />
            <span>supabase-schema.sql</span>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="text-xs text-[#C5A88E] hover:text-white flex items-center gap-1.5 font-medium transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar SQL</span>
              </>
            )}
          </button>
        </div>

        <pre className="p-6 text-xs font-mono leading-relaxed text-stone-200 overflow-x-auto max-h-[540px] scrollbar-thin">
          <code>{FULL_SQL_SCRIPT}</code>
        </pre>
      </div>

    </div>
  );
};
