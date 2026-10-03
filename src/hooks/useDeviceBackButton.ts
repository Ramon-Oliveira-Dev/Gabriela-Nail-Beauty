import { useEffect, useRef } from 'react';

type BackHandler = () => void;

interface StackItem {
  id: number;
  handler: BackHandler;
}

// Pilha única e global de manipuladores ativos do botão Voltar
const stack: StackItem[] = [];
let nextId = 1;
let isGuardInHistory = false;
let isSilentHistoryPop = false;
let isExecutingHandler = false;
let listenerAttached = false;
let cleanupTimer: ReturnType<typeof setTimeout> | null = null;

function ensureListener() {
  if (listenerAttached || typeof window === 'undefined') return;

  window.addEventListener('popstate', () => {
    // Se foi um popstate interno de limpeza silenciosa, ignore completamente
    if (isSilentHistoryPop) {
      isSilentHistoryPop = false;
      isGuardInHistory = false;
      return;
    }

    // O navegador acabou de voltar 1 posição no histórico, portanto a guarda foi consumida
    isGuardInHistory = false;

    if (stack.length > 0) {
      // Pega o manipulador do topo da pilha
      const topItem = stack[stack.length - 1];

      isExecutingHandler = true;
      try {
        topItem.handler();
      } catch (err) {
        console.error('Erro ao executar handler de voltar do dispositivo:', err);
      } finally {
        isExecutingHandler = false;
      }

      // Após a execução do handler, verifica se ainda restam camadas abertas
      // Aguarda um pequeno tick para o React processar os unmounts/atualizações de estado
      setTimeout(() => {
        if (stack.length > 0 && !isGuardInHistory && typeof window !== 'undefined') {
          // Ainda há camadas ativas (ex: desceu do Passo 3 para o Passo 2, ou fechou modal sobre agendamento)
          // Re-arma a guarda para o próximo toque no botão Voltar
          window.history.pushState({ __app_back_guard: true }, '');
          isGuardInHistory = true;
        }
      }, 30);
    }
  });

  listenerAttached = true;
}

function syncGuard() {
  if (typeof window === 'undefined') return;

  // Cancela qualquer limpeza silenciosa pendente pois a pilha foi atualizada
  if (cleanupTimer) {
    clearTimeout(cleanupTimer);
    cleanupTimer = null;
  }

  // 1. Se há camadas abertas e ainda não temos uma guarda no histórico, adiciona uma
  if (stack.length > 0 && !isGuardInHistory) {
    window.history.pushState({ __app_back_guard: true }, '');
    isGuardInHistory = true;
  }
  // 2. Se a pilha ficou vazia (usuário fechou tudo pelos botões da interface)
  // e ainda há uma guarda no histórico, agenda uma remoção silenciosa
  else if (stack.length === 0 && isGuardInHistory && !isExecutingHandler) {
    cleanupTimer = setTimeout(() => {
      // Verifica novamente se a pilha continua vazia após transições rápidas entre componentes
      if (stack.length === 0 && isGuardInHistory && !isExecutingHandler) {
        isSilentHistoryPop = true;
        window.history.back();
      }
      cleanupTimer = null;
    }, 150);
  }
}

/**
 * Hook para registrar uma ação quando o usuário pressiona o botão Voltar
 * do dispositivo (Android back button, gestos de voltar, botão de voltar do navegador ou Alt+Left).
 * 
 * Utiliza referências estáveis para evitar reinicializações e conflitos com o histórico do navegador.
 * 
 * @param isActive Se o manipulador deve estar ativo no momento (ex: modal aberto, step > 0)
 * @param onBack Callback disparado para fechar a camada ou retornar à etapa anterior
 */
export function useDeviceBackButton(isActive: boolean, onBack: () => void) {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    if (!isActive || typeof window === 'undefined') return;

    ensureListener();

    const id = nextId++;
    const item: StackItem = {
      id,
      handler: () => onBackRef.current()
    };

    stack.push(item);
    syncGuard();

    return () => {
      const idx = stack.findIndex(i => i.id === id);
      if (idx !== -1) {
        stack.splice(idx, 1);
      }
      syncGuard();
    };
  }, [isActive]);
}
