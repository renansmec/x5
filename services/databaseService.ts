
import { Player, Season, PlayerStats } from '../types';

// ==================================================================================
// CONFIGURAÇÃO AUTOMÁTICA DE CONEXÃO
// Se você não usa variáveis de ambiente (.env), cole suas chaves do Supabase abaixo.
// Isso garantirá que o ranking apareça automaticamente para todos os visitantes.
// ==================================================================================
const HARDCODED_SUPABASE_URL = ""; 
const HARDCODED_SUPABASE_ANON_KEY = "";
// ==================================================================================

const getSafeEnv = (key: string): string => {
  try {
    // Verifica prefixos comuns de bundlers (Vite, CRA, Next.js)
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key] || 
             process.env[`VITE_${key}`] || 
             process.env[`REACT_APP_${key}`] || 
             process.env[`NEXT_PUBLIC_${key}`] || '';
    }
  } catch (e) {
    // Ignora erro se process não existir
  }
  return '';
};

const getKeys = () => {
  // Prioridade: Hardcoded > Ambiente > LocalStorage
  const url = HARDCODED_SUPABASE_URL || getSafeEnv('https://seiwinqvzsfwupnvrygf.supabase.co') || localStorage.getItem('supabase_url') || '';
  const anonKey = HARDCODED_SUPABASE_ANON_KEY || getSafeEnv('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlaXdpbnF2enNmd3VwbnZyeWdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNTY1MDAsImV4cCI6MjA4NTgzMjUwMH0.cCqNfGnGlEjQU5D0nlD3avC5slaXsBySWwdFt-zsYQk') || localStorage.getItem('supabase_anon_key') || '';
  return { url, anonKey };
};

async function supabaseFetch(table: string, method: 'GET' | 'POST' | 'DELETE' = 'GET', body?: any, query: string = '') {
  const { url: baseUrl, anonKey } = getKeys();
  
  if (!baseUrl || !anonKey) {
    console.warn(`Supabase credentials missing for ${table}. Configure HARDCODED constants in databaseService.ts or .env files.`);
    return null;
  }

  const url = `${baseUrl}/rest/v1/${table}${query}`;
  const headers: HeadersInit = {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
    'Prefer': method === 'POST' ? 'return=representation' : '',
  };

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      console.error(`Supabase Error (${response.status}):`, await response.text());
      return null;
    }

    if (method === 'DELETE') return true;
    const data = await response.json();
    return data || [];
  } catch (err) {
    console.error("Network Error:", err);
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
