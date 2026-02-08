
export interface Player {
  id: string;
  nick: string;
}

export interface Season {
  id: string;
  name: string;
}

export interface PlayerStats {
  id: string;
  playerId: string;
  seasonId: string;
  matches: number;
  kills: number;
  deaths: number;
  assists: number;
  damage: number;
}

export interface FullRankingEntry extends PlayerStats {
  nick: string;
  kd: number;
  damagePerMatch: number;
}

export type ViewType = 'ranking' | 'admin' | 'balancer';
