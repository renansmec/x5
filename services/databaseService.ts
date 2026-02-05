
import { Player, Season, PlayerStats } from '../types';
import { INITIAL_PLAYERS, INITIAL_SEASONS, INITIAL_STATS } from '../constants';

/**
 * CONFIGURAÇÃO SUPABASE (POSTGRES)
 * Adicione estas variáveis no Vercel:
 * SUPABASE_URL: Ex: https://xyz.supabase.co
 * SUPABASE_ANON_KEY: Sua chave anon/public
 */

const CONFIG = {
  url: process.env.SUPABASE_URL || '',
  anonKey: process.env.SUPABASE_ANON_KEY || '',
};

async function supabaseFetch(table: string, method: 'GET' | 'POST' | 'DELETE' = 'GET', body?: any, query: string = '') {
  if (!CONFIG.url || !CONFIG.anonKey) return null;

  const url = `${CONFIG.url}/rest/v1/${table}${query}`;
  const headers: HeadersInit = {
    'apikey': CONFIG.anonKey,
    'Authorization': `Bearer ${CONFIG.anonKey}`,
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
      console.error(`Supabase Error [${table}]:`, await response.text());
      return null;
    }

    if (method === 'DELETE') return true;
    return await response.json();
  } catch (err) {
    console.warn(`Supabase falhou em ${table}. Usando fallback local.`);
    return null;
  }
}

export const db = {
  isCloudEnabled: () => !!CONFIG.url && !!CONFIG.anonKey,

  async getPlayers(): Promise<Player[]> {
    const data = await supabaseFetch('players');
    if (!data) {
      const saved = localStorage.getItem('x5_players');
      return saved ? JSON.parse(saved) : INITIAL_PLAYERS;
    }
    return data.length > 0 ? data : INITIAL_PLAYERS;
  },

  async getSeasons(): Promise<Season[]> {
    const data = await supabaseFetch('seasons');
    if (!data) {
      const saved = localStorage.getItem('x5_seasons');
      return saved ? JSON.parse(saved) : INITIAL_SEASONS;
    }
    return data.length > 0 ? data : INITIAL_SEASONS;
  },

  async getStats(): Promise<PlayerStats[]> {
    const data = await supabaseFetch('stats');
    if (!data) {
      const saved = localStorage.getItem('x5_stats');
      return saved ? JSON.parse(saved) : INITIAL_STATS;
    }
    return data.length > 0 ? data : INITIAL_STATS;
  },

  async savePlayers(players: Player[]): Promise<void> {
    localStorage.setItem('x5_players', JSON.stringify(players));
    if (this.isCloudEnabled()) {
      await supabaseFetch('players', 'DELETE', null, '?select=*');
      if (players.length > 0) {
        await supabaseFetch('players', 'POST', players);
      }
    }
  },

  async saveSeasons(seasons: Season[]): Promise<void> {
    localStorage.setItem('x5_seasons', JSON.stringify(seasons));
    if (this.isCloudEnabled()) {
      await supabaseFetch('seasons', 'DELETE', null, '?select=*');
      if (seasons.length > 0) {
        await supabaseFetch('seasons', 'POST', seasons);
      }
    }
  },

  async updateStats(allStats: PlayerStats[]): Promise<void> {
    localStorage.setItem('x5_stats', JSON.stringify(allStats));
    if (this.isCloudEnabled()) {
      await supabaseFetch('stats', 'DELETE', null, '?select=*');
      if (allStats.length > 0) {
        await supabaseFetch('stats', 'POST', allStats);
      }
    }
  },

  async clearDatabase(): Promise<void> {
    localStorage.clear();
    if (this.isCloudEnabled()) {
      await Promise.all([
        supabaseFetch('players', 'DELETE', null, '?select=*'),
        supabaseFetch('seasons', 'DELETE', null, '?select=*'),
        supabaseFetch('stats', 'DELETE', null, '?select=*')
      ]);
    }
  }
};
