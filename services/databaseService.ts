
import { Player, Season, PlayerStats } from '../types';

// O desenvolvedor deve garantir que SUPABASE_URL e SUPABASE_ANON_KEY 
// estejam configurados no ambiente de deploy (Vercel, Netlify, etc.)
const getKeys = () => {
  return {
    url: process.env.SUPABASE_URL || localStorage.getItem('supabase_url') || '',
    anonKey: process.env.SUPABASE_ANON_KEY || localStorage.getItem('supabase_anon_key') || '',
  };
};

async function supabaseFetch(table: string, method: 'GET' | 'POST' | 'DELETE' = 'GET', body?: any, query: string = '') {
  const { url: baseUrl, anonKey } = getKeys();
  
  if (!baseUrl || !anonKey) {
    console.error(`Configuração do Supabase ausente para a tabela: ${table}`);
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
      const errorText = await response.text();
      console.error(`Supabase API Error [${table}]:`, errorText);
      return null;
    }

    if (method === 'DELETE') return true;
    const data = await response.json();
    return data || [];
  } catch (err) {
    console.error(`Erro crítico de rede ao acessar ${table}:`, err);
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
    return await supabaseFetch('players?select=*');
  },

  async getSeasons(): Promise<Season[] | null> {
    return await supabaseFetch('seasons?select=*');
  },

  async getStats(): Promise<PlayerStats[] | null> {
    return await supabaseFetch('stats?select=*');
  },

  async savePlayers(players: Player[]): Promise<void> {
    if (this.isCloudEnabled()) {
      await supabaseFetch('players', 'DELETE', null, '?select=*');
      if (players.length > 0) {
        await supabaseFetch('players', 'POST', players);
      }
    }
  },

  async saveSeasons(seasons: Season[]): Promise<void> {
    if (this.isCloudEnabled()) {
      await supabaseFetch('seasons', 'DELETE', null, '?select=*');
      if (seasons.length > 0) {
        await supabaseFetch('seasons', 'POST', seasons);
      }
    }
  },

  async updateStats(allStats: PlayerStats[]): Promise<void> {
    if (this.isCloudEnabled()) {
      await supabaseFetch('stats', 'DELETE', null, '?select=*');
      if (allStats.length > 0) {
        await supabaseFetch('stats', 'POST', allStats);
      }
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
