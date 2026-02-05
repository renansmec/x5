
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
  const endpoint = `${cleanUrl}/rest/v1/${table}${query}`;

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
      console.error(`[Supabase Error] ${response.status} em ${table}:`, text);
      return null;
    }

    if (method === 'DELETE') return true;
    
    // Tenta fazer parse do JSON com segurança
    try {
      const data = await response.json();
      return data || [];
    } catch (e) {
      // Se não tiver corpo de resposta (ex: 204 No Content), retorna sucesso vazio
      return [];
    }

  } catch (err) {
    console.error(`[Network Error] Falha ao conectar em ${table}:`, err);
    return null;
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
    return await supabaseFetch('players', 'GET', null, '?select=*');
  },

  async getSeasons(): Promise<Season[] | null> {
    return await supabaseFetch('seasons', 'GET', null, '?select=*&order=id.desc');
  },

  async getStats(): Promise<PlayerStats[] | null> {
    return await supabaseFetch('stats', 'GET', null, '?select=*');
  },

  async savePlayers(players: Player[]): Promise<void> {
    if (this.isCloudEnabled()) {
      await supabaseFetch('players', 'DELETE', null, '?select=*');
      if (players.length > 0) await supabaseFetch('players', 'POST', players);
    }
  },

  async saveSeasons(seasons: Season[]): Promise<void> {
    if (this.isCloudEnabled()) {
      await supabaseFetch('seasons', 'DELETE', null, '?select=*');
      if (seasons.length > 0) await supabaseFetch('seasons', 'POST', seasons);
    }
  },

  async updateStats(allStats: PlayerStats[]): Promise<void> {
    if (this.isCloudEnabled()) {
      await supabaseFetch('stats', 'DELETE', null, '?select=*');
      if (allStats.length > 0) await supabaseFetch('stats', 'POST', allStats);
    }
  },

  async clearDatabase(): Promise<void> {
    if (this.isCloudEnabled()) {
      await Promise.all([
        supabaseFetch('players', 'DELETE', null, '?select=*'),
        supabaseFetch('seasons', 'DELETE', null, '?select=*'),
        supabaseFetch('stats', 'DELETE', null, '?select=*')
      ]);
    }
  }
};
