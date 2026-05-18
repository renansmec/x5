
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
     safeQuery = '?id=not.is.null'; // Hack para selecionar "todos" 
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
    try { 
      const res = await supabaseFetch('stats', 'GET', null, '?select=*'); 
      if (res && Array.isArray(res)) {
        return res.map(s => ({
          id: s.id,
          playerId: s.playerId || s.playerid,
          seasonId: s.seasonId || s.seasonid,
          matches: s.matches,
          kills: s.kills,
          deaths: s.deaths,
          assists: s.assists,
          damage: s.damage,
          hsPercent: s.hsPercent !== undefined ? s.hsPercent : s.hspercent
        }));
      }
      return res;
    } catch { return null; }
  },

  async getMatches(): Promise<any[] | null> {
    try { 
      const res = await supabaseFetch('matches', 'GET', null, '?select=*'); 
      
      if (res && Array.isArray(res)) {
        // Normalizar chaves para camelCase caso o banco tenha criado em minúsculas
        const normalized = res.map(m => {
          let parsedPlayers = [];
          if (Array.isArray(m.players)) {
            parsedPlayers = m.players;
          } else if (typeof m.players === 'string') {
            try {
              parsedPlayers = JSON.parse(m.players);
            } catch(e) {
              console.error("Failed to parse players:", m.players);
              parsedPlayers = [];
            }
          } else if (m.players) {
            parsedPlayers = m.players;
          }

          return {
            id: m.id,
            seasonId: m.seasonId || m.seasonid,
            map: m.map,
            team1Name: m.team1Name || m.team1name,
            team2Name: m.team2Name || m.team2name,
            team1Score: m.team1Score !== undefined ? m.team1Score : m.team1score,
            team2Score: m.team2Score !== undefined ? m.team2Score : m.team2score,
            winningTeam: m.winningTeam || m.winningteam,
            date: m.date,
            players: parsedPlayers
          };
        });
        
        normalized.sort((a, b) => {
          const tA = a.date ? new Date(a.date).getTime() : 0;
          const tB = b.date ? new Date(b.date).getTime() : 0;
          return tB - tA;
        });
        return normalized;
      }
      return res;
    } catch (e: any) { 
      console.error('getMatches fail:', e);
      // Retornar um erro falso que a interface consiga ler
      return [{_error: true, message: e.message || String(e)}];
    }
  },

  async saveMatch(match: any): Promise<boolean> {
    if (!this.isCloudEnabled()) return false;
    try {
      await supabaseFetch('matches', 'POST', match);
      return true;
    } catch (error) {
      console.error("Erro ao salvar partida:", error);
      return false;
    }
  },

  // Método unificado para salvar tudo na ordem correta
  async syncDatabase(players: Player[], seasons: Season[], stats: PlayerStats[], matches: MatchRecord[] = []): Promise<void> {
    if (!this.isCloudEnabled()) return;

    try {
      console.log("Iniciando sincronização...");
      
      // 1. Apagar filhos primeiro (Stats dependem de Players e Seasons)
      await supabaseFetch('stats', 'DELETE');
      await supabaseFetch('matches', 'DELETE').catch(() => console.log('Tabela matches pode não existir ainda'));
      
      // 2. Apagar pais
      // Usamos Promise.all aqui pois players e seasons não dependem entre si
      await Promise.all([
        supabaseFetch('players', 'DELETE'),
        supabaseFetch('seasons', 'DELETE')
      ]);

      // 3. Criar pais
      // Normalizando chaves para evitar PGRST102 (PostgREST exige que todos os objetos do array tenham mesmas chaves)
      const normalizedPlayers = players.map(p => ({
        id: p.id || '',
        nick: p.nick || ''
      }));
      
      const normalizedSeasons = seasons.map(s => ({
        id: s.id || '',
        name: s.name || ''
      }));

      if (normalizedPlayers.length > 0) await supabaseFetch('players', 'POST', normalizedPlayers);
      if (normalizedSeasons.length > 0) await supabaseFetch('seasons', 'POST', normalizedSeasons);

      // 4. Criar filhos
      const normalizedStats = stats.map(s => ({
        id: s.id || '',
        playerId: s.playerId || '',
        seasonId: s.seasonId || '',
        matches: s.matches || 0,
        kills: s.kills || 0,
        deaths: s.deaths || 0,
        assists: s.assists || 0,
        damage: s.damage || 0,
        hsPercent: s.hsPercent || 0
      }));

      if (normalizedStats.length > 0) await supabaseFetch('stats', 'POST', normalizedStats);
      
        if (matches && matches.length > 0) {
          const normalizedMatches = matches.map(m => ({
            id: m.id || '',
            seasonId: m.seasonId || '',
            map: m.map || '',
            team1Name: m.team1Name || '',
            team2Name: m.team2Name || '',
            team1Score: m.team1Score || 0,
            team2Score: m.team2Score || 0,
            winningTeam: m.winningTeam || '',
            date: m.date || new Date().toISOString(),
            players: m.players || []
          }));
          await supabaseFetch('matches', 'POST', normalizedMatches);
        }

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
      await supabaseFetch('matches', 'DELETE');
      await supabaseFetch('players', 'DELETE');
      await supabaseFetch('seasons', 'DELETE');
    }
  }
};
