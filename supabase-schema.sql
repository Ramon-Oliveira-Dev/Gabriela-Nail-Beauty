-- ==============================================================================
-- SCRIPT SQL COMPLETO E CORRIGIDO PARA O SUPABASE - GABRIELA SANTOS
-- ==============================================================================
-- INSTRUÇÕES:
-- 1. Acesse https://supabase.com/dashboard e abra o seu projeto.
-- 2. No menu lateral esquerdo, clique no ícone "SQL Editor" (ícone do terminal).
-- 3. Clique em "+ New query".
-- 4. Cole este script completo e clique no botão verde "Run" (ou Ctrl + Enter).
-- ==============================================================================

-- 1. Extensões
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

-- 3. Inserção do registro inicial com os procedimentos da Gabriela Santos
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
        "imageUrl": "/service_alongamento.jpg",
        "category": "aplicacao"
      },
      {
        "id": "2",
        "name": "Manutenção de Alongamento",
        "durationMinutes": 75,
        "price": 100,
        "description": "Nivelamento, reforço do ponto de tensão e acabamento impecável.",
        "imageUrl": "/service_alongamento.jpg",
        "category": "manutencao"
      },
      {
        "id": "3",
        "name": "Esmaltação em Gel",
        "durationMinutes": 60,
        "price": 80,
        "description": "Mais durabilidade, brilho intenso e secagem imediata por até 20 dias.",
        "imageUrl": "/service_gel.jpg",
        "category": "outros"
      },
      {
        "id": "4",
        "name": "Manicure Tradicional",
        "durationMinutes": 45,
        "price": 60,
        "description": "Cuidados essenciais, cutilagem alinhada e esmaltação perfeita.",
        "imageUrl": "/service_manicure.jpg",
        "category": "outros"
      },
      {
        "id": "5",
        "name": "Nail Art Personalizada",
        "durationMinutes": 30,
        "price": 25,
        "description": "Design exclusivo, traços finos e detalhes para unhas especiais.",
        "imageUrl": "/service_nailart.jpg",
        "category": "outros"
      }
    ],
    "appointments": [],
    "blocks": [],
    "config": {
      "address": "Rua das Flores, 123 - Centro",
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

-- 4. Função e trigger para atualização automática de timestamp
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

-- 5. Habilitação de RLS e Políticas de Acesso
ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir acesso total app_state" ON public.app_state;
DROP POLICY IF EXISTS "Allow public read" ON public.app_state;
DROP POLICY IF EXISTS "Allow public update" ON public.app_state;
DROP POLICY IF EXISTS "Permitir leitura pública" ON public.app_state;
DROP POLICY IF EXISTS "Permitir inserção pública" ON public.app_state;
DROP POLICY IF EXISTS "Permitir atualização pública" ON public.app_state;

CREATE POLICY "Permitir acesso total app_state" 
ON public.app_state 
FOR ALL 
TO anon, authenticated, service_role
USING (true) 
WITH CHECK (true);

-- 6. Concessão de permissões
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.app_state TO anon, authenticated, service_role;

-- ==============================================================================
-- 7. TABELAS ESTRUTURADAS RELACIONAIS (SERVIÇOS, AGENDAMENTOS, BLOQUEIOS, CONFIG)
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
  address text DEFAULT 'Rua das Flores, 123 - Centro',
  working_hours jsonb DEFAULT '[]'::jsonb,
  updated_at timestamptz DEFAULT now()
);

-- RLS nas tabelas relacionais
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

-- Carga inicial de serviços no catálogo relacional
INSERT INTO public.services (id, name, duration_minutes, price, description, image_url, category)
VALUES
  ('1', 'Alongamento em Gel', 90, 150.00, 'Alongamento com gel para unhas naturais mais longas, resistentes e elegantes.', '/service_alongamento.jpg', 'aplicacao'),
  ('2', 'Manutenção de Alongamento', 75, 100.00, 'Nivelamento, reforço do ponto de tensão e acabamento impecável.', '/service_alongamento.jpg', 'manutencao'),
  ('3', 'Esmaltação em Gel', 60, 80.00, 'Mais durabilidade, brilho intenso e secagem imediata por até 20 dias.', '/service_gel.jpg', 'outros'),
  ('4', 'Manicure Tradicional', 45, 60.00, 'Cuidados essenciais, cutilagem alinhada e esmaltação perfeita.', '/service_manicure.jpg', 'outros'),
  ('5', 'Nail Art Personalizada', 30, 25.00, 'Design exclusivo, traços finos e detalhes para unhas especiais.', '/service_nailart.jpg', 'outros')
ON CONFLICT (id) DO NOTHING;
