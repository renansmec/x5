
export interface Player {
  id: string;
  nick: string;
  created_at: string;
}

export interface MatchStats {
  id: string;
  player_id: string;
  season_id: string;
  kills: number;
  deaths: number;
  assists: number;
  damage: number;
  match_count: number;
  created_at: string;
}

export interface Season {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
}

export interface PlayerRankingRow {
  player_id: string;
  nick: string;
  matches: number;
  kills: number;
  deaths: number;
  assists: number;
  damage: number;
  kd: number;
  avg_damage: number;
}

export enum ViewMode {
  RANKING = 'RANKING',
  REGISTER = 'REGISTER',
  INSIGHTS = 'INSIGHTS'
}
