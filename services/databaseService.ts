
import { Player, Season, PlayerStats } from '../types';

// ==================================================================================
// 🚨 ÁREA DE CONFIGURAÇÃO OBRIGATÓRIA PARA ACESSO PÚBLICO 🚨
// Para que o ranking apareça para todos SEM pedir senha, cole suas chaves abaixo.
// ==================================================================================
const HARDCODED_SUPABASE_URL = "https://seiwinqvzsfwupnvrygf.supabase.co"; 
const HARDCODED_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlaXdpbnF2enNmd3VwbnZyeWdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNTY1MDAsImV4cCI6MjA4NTgzMjUwMH0.cCqNfGnGlEjQU5D0nlD3avC5slaXsBySWwdFt-zsYQk";
// ==================================================================================

const getEnvVar = (key: string): string => {
  try {
    // Tenta pegar de variáveis de ambiente modernas (Vite)
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      return import.meta.env[`VITE_${key}`] || import.meta.env[key] || '';
    }
  } catch (e) {}

  try {
    // Tenta pegar de variáveis de ambiente legadas (Process/Node)
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key] || 
             process.env[`VITE_${key}`] || 
             process.env[`REACT_APP_${key}`] || 
             process.env[`NEXT_PUBLIC_${key}`] || '';
    }
  } catch (e) {}

  return '';
};

const getKeys = () => {
  // 1. Prioridade: Chaves coladas diretamente no código (para visitantes verem)
  if (HARDCODED_SUPABASE_URL && HARDCODED_SUPABASE_ANON_KEY) {
    return { url: HARDCODED_SUPABASE_URL, anonKey: HARDCODED_SUPABASE_ANON_KEY };
  }

  // 2. Prioridade: Variáveis de Ambiente (.env)
  const envUrl = getEnvVar('SUPABASE_URL');
  const envKey = getEnvVar('SUPABASE_ANON_KEY');
  if (envUrl && envKey) {
    return { url: envUrl, anonKey: envKey };
  }

  // 3. Prioridade: LocalStorage (Configurado via Painel Admin)
  const localUrl = localStorage.getItem('supabase_url');
  const localKey = localStorage.getItem('supabase_anon_key');
  if (localUrl && localKey) {
    return { url: localUrl, anonKey: localKey };
  }

  return { url: '', anonKey: '' };
};

async function supabaseFetch(table: string, method: 'GET' | 'POST' | 'DELETE' = 'GET', body?: any, query: string = '') {
  const { url: baseUrl, anonKey } = getKeys();
  
  if (!baseUrl || !anonKey) {
    console.warn(`[Supabase] Credenciais não encontradas para a tabela ${table}.`);
    return null;
  }

  // Remove barra final da URL se houver
  const cleanUrl = baseUrl.replace(/\/$/, "");
  
  // Para DELETE sem filtro específico (apagar tudo), precisamos garantir que a API aceite.
  // Muitas vezes o Supabase exige um filtro para DELETE. Usaremos 'id.neq.0' como "todos" se a query estiver vazia no DELETE.
  let safeQuery = query;
  if (method === 'DELETE' && (!query || query === '?select=*')) {
     safeQuery = '?id=neq.0'; // Hack para selecionar "todos" se IDs forem strings ou numeros != 0
  }

  const endpoint = `${cleanUrl}/rest/v1/${table}${safeQuery}`;

  const headers: HeadersInit = {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
    'Prefer': method === 'POST' ? 'return=representation' : '',
  };

  try {
    const response = await fetch(endpoint, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[Supabase Error] ${response.status} em ${table} (${method}):`, text);
      throw new Error(text);
    }

    if (method === 'DELETE') return true;
    
    try {
      const data = await response.json();
      return data || [];
    } catch (e) {
      return [];
    }

  } catch (err) {
    console.error(`[Network Error] Falha ao conectar em ${table}:`, err);
    throw err;
  }
}

export const db = {
  isCloudEnabled: () => {
    const { url, anonKey } = getKeys();
    return !!url && !!anonKey;
  },

  setCloudKeys: (url: string, key: string) => {
    localStorage.setItem('supabase_url', url.trim());
    localStorage.setItem('supabase_anon_key', key.trim());
  },

  clearCloudKeys: () => {
    localStorage.removeItem('supabase_url');
    localStorage.removeItem('supabase_anon_key');
  },

  async getPlayers(): Promise<Player[] | null> {
    try { return await supabaseFetch('players', 'GET', null, '?select=*'); } catch { return null; }
  },

  async getSeasons(): Promise<Season[] | null> {
    try { return await supabaseFetch('seasons', 'GET', null, '?select=*&order=id.desc'); } catch { return null; }
  },

  async getStats(): Promise<PlayerStats[] | null> {
    try { return await supabaseFetch('stats', 'GET', null, '?select=*'); } catch { return null; }
  },

  // Método unificado para salvar tudo na ordem correta
  async syncDatabase(players: Player[], seasons: Season[], stats: PlayerStats[]): Promise<void> {
    if (!this.isCloudEnabled()) return;

    try {
      console.log("Iniciando sincronização...");
      
      // 1. Apagar filhos primeiro (Stats dependem de Players e Seasons)
      await supabaseFetch('stats', 'DELETE');
      
      // 2. Apagar pais
      // Usamos Promise.all aqui pois players e seasons não dependem entre si
      await Promise.all([
        supabaseFetch('players', 'DELETE'),
        supabaseFetch('seasons', 'DELETE')
      ]);

      // 3. Criar pais
      if (players.length > 0) await supabaseFetch('players', 'POST', players);
      if (seasons.length > 0) await supabaseFetch('seasons', 'POST', seasons);

      // 4. Criar filhos
      if (stats.length > 0) await supabaseFetch('stats', 'POST', stats);

      console.log("Sincronização concluída com sucesso.");
    } catch (error) {
      console.error("Erro fatal na sincronização:", error);
      throw error; // Propaga erro para a UI avisar o usuário
    }
  },

  // Mantido apenas para limpar tudo explicitamente
  async clearDatabase(): Promise<void> {
    if (this.isCloudEnabled()) {
      await supabaseFetch('stats', 'DELETE');
      await supabaseFetch('players', 'DELETE');
      await supabaseFetch('seasons', 'DELETE');
    }
  }
};
