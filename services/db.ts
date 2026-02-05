
import { createClient } from '@supabase/supabase-js';
import { Player, Season, MatchStats, PlayerRankingRow } from '../types';

// As chaves são injetadas via variáveis de ambiente. 
// O Supabase não exigirá login manual se as políticas de RLS estiverem como 'public' ou se houver políticas de leitura para a anon key.
const supabaseUrl = (process.env as any).SUPABASE_URL || '';
const supabaseAnonKey = (process.env as any).SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase URL ou Anon Key não configurados. Verifique as variáveis de ambiente.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const db = {
  getPlayers: async (): Promise<Player[]> => {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('nick', { ascending: true });
    
    if (error) {
      console.error("Error fetching players:", error);
      return [];
    }
    return data || [];
  },

  addPlayer: async (nick: string): Promise<Player | null> => {
    const { data, error } = await supabase
      .from('players')
      .insert([{ nick }])
      .select()
      .single();

    if (error) {
      console.error("Error adding player:", error);
      return null;
    }
    return data;
  },

  getSeasons: async (): Promise<Season[]> => {
    const { data, error } = await supabase
      .from('seasons')
      .select('*')
      .order('created_at', { ascending: false }); // Garante que a mais nova venha primeiro

    if (error) {
      console.error("Error fetching seasons:", error);
      return [];
    }
    return data || [];
  },

  saveMatchStats: async (stats: Omit<MatchStats, 'id' | 'created_at'>): Promise<void> => {
    const { error } = await supabase
      .from('match_stats')
      .insert([stats]);

    if (error) {
      console.error("Error saving match stats:", error);
      throw error;
    }
  },

  getRanking: async (seasonId: string): Promise<PlayerRankingRow[]> => {
    const { data: stats, error: statsError } = await supabase
      .from('match_stats')
      .select(`
        player_id,
        kills,
        deaths,
        assists,
        damage,
        match_count,
        players (nick)
      `)
      .eq('season_id', seasonId);

    if (statsError) {
      console.error("Error fetching ranking stats:", statsError);
      return [];
    }

    const rankingMap = new Map<string, PlayerRankingRow>();

    stats?.forEach((stat: any) => {
      const pid = stat.player_id;
      if (!rankingMap.has(pid)) {
        rankingMap.set(pid, {
          player_id: pid,
          nick: stat.players?.nick || 'Desconhecido',
          matches: 0,
          kills: 0,
          deaths: 0,
          assists: 0,
          damage: 0,
          kd: 0,
          avg_damage: 0
        });
      }

      const row = rankingMap.get(pid)!;
      row.matches += stat.match_count;
      row.kills += stat.kills;
      row.deaths += stat.deaths;
      row.assists += stat.assists;
      row.damage += stat.damage;
    });

    return Array.from(rankingMap.values())
      .map(row => ({
        ...row,
        kd: row.deaths === 0 ? row.kills : parseFloat((row.kills / row.deaths).toFixed(2)),
        avg_damage: row.matches === 0 ? 0 : Math.round(row.damage / row.matches)
      }))
      .sort((a, b) => b.kd - a.kd || b.kills - a.kills);
  }
};
