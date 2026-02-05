
import { Player, Season, PlayerStats } from '../types';
import { INITIAL_PLAYERS, INITIAL_SEASONS, INITIAL_STATS } from '../constants';

/**
 * CONFIGURAÇÃO MONGODB ATLAS DATA API
 * No Vercel, adicione estas variáveis de ambiente:
 * MONGODB_DATA_API_KEY, MONGODB_APP_ID, MONGODB_CLUSTER, MONGODB_DATABASE
 */

const CONFIG = {
  apiKey: process.env.MONGODB_DATA_API_KEY || '',
  baseUrl: `https://data.mongodb-api.com/app/${process.env.MONGODB_APP_ID || ''}/endpoint/data/v1`,
  cluster: process.env.MONGODB_CLUSTER || 'Cluster0',
  database: process.env.MONGODB_DATABASE || 'x5_friends_ranking',
  dataSource: process.env.MONGODB_CLUSTER || 'Cluster0',
};

// Helper para chamadas à API do MongoDB
async function mongoFetch(action: string, collection: string, body: any) {
  // Fallback para LocalStorage se não houver configuração de API Key
  if (!CONFIG.apiKey) {
    console.warn("MongoDB API Key não configurada. Usando LocalStorage.");
    return null;
  }

  const response = await fetch(`${CONFIG.baseUrl}/action/${action}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': CONFIG.apiKey,
    },
    body: JSON.stringify({
      dataSource: CONFIG.dataSource,
      database: CONFIG.database,
      collection: collection,
      ...body,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`MongoDB API Error: ${error.error || response.statusText}`);
  }

  return response.json();
}

export const db = {
  // Busca Jogadores
  async getPlayers(): Promise<Player[]> {
    const result = await mongoFetch('find', 'players', {});
    if (!result) {
      const saved = localStorage.getItem('x5_players');
      return saved ? JSON.parse(saved) : INITIAL_PLAYERS;
    }
    return result.documents.length > 0 ? result.documents : INITIAL_PLAYERS;
  },

  // Busca Temporadas
  async getSeasons(): Promise<Season[]> {
    const result = await mongoFetch('find', 'seasons', {});
    if (!result) {
      const saved = localStorage.getItem('x5_seasons');
      return saved ? JSON.parse(saved) : INITIAL_SEASONS;
    }
    return result.documents.length > 0 ? result.documents : INITIAL_SEASONS;
  },

  // Busca Estatísticas
  async getStats(): Promise<PlayerStats[]> {
    const result = await mongoFetch('find', 'stats', {});
    if (!result) {
      const saved = localStorage.getItem('x5_stats');
      return saved ? JSON.parse(saved) : INITIAL_STATS;
    }
    return result.documents.length > 0 ? result.documents : INITIAL_STATS;
  },

  // Salva Jogadores (Sincronização em Lote)
  async savePlayers(players: Player[]): Promise<void> {
    if (!CONFIG.apiKey) {
      localStorage.setItem('x5_players', JSON.stringify(players));
      return;
    }
    // No MongoDB Data API, poderíamos usar insertMany, mas para simplicidade em lote:
    await mongoFetch('deleteMany', 'players', { filter: {} });
    if (players.length > 0) {
      await mongoFetch('insertMany', 'players', { documents: players });
    }
  },

  // Salva Temporadas
  async saveSeasons(seasons: Season[]): Promise<void> {
    if (!CONFIG.apiKey) {
      localStorage.setItem('x5_seasons', JSON.stringify(seasons));
      return;
    }
    await mongoFetch('deleteMany', 'seasons', { filter: {} });
    if (seasons.length > 0) {
      await mongoFetch('insertMany', 'seasons', { documents: seasons });
    }
  },

  // Atualiza ou Insere Estatística (Lógica Acumulativa)
  async updateStats(allStats: PlayerStats[]): Promise<void> {
    if (!CONFIG.apiKey) {
      localStorage.setItem('x5_stats', JSON.stringify(allStats));
      return;
    }
    
    // Sincroniza o estado completo para garantir consistência
    await mongoFetch('deleteMany', 'stats', { filter: {} });
    if (allStats.length > 0) {
      await mongoFetch('insertMany', 'stats', { documents: allStats });
    }
  },

  // Limpa o Banco
  async clearDatabase(): Promise<void> {
    if (CONFIG.apiKey) {
      await Promise.all([
        mongoFetch('deleteMany', 'players', { filter: {} }),
        mongoFetch('deleteMany', 'seasons', { filter: {} }),
        mongoFetch('deleteMany', 'stats', { filter: {} })
      ]);
    }
    localStorage.clear();
  }
};
