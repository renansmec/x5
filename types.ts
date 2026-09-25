
export interface Player {
  id: string;
  nick: string;
  steamUrl?: string;
  avatarUrl?: string;
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
  hsPercent?: number;
}

export interface FullRankingEntry extends PlayerStats {
  nick: string;
  avatarUrl?: string;
  steamUrl?: string;
  kd: number;
  kda: number;
  damagePerMatch: number;
  wins: number;
  losses: number;
  winRate: number;
  score: number;
  patent: { name: string; index: number; image: string };
  trend?: number;
}

export type ViewType = 'ranking' | 'admin' | 'balancer' | 'skins' | 'history' | 'profile';

export type UserRole = 'master' | 'editor' | null;

export interface ExtractedMatchData {
  map: string;
  team1Name: string;
  team2Name: string;
  team1Score: number;
  team2Score: number;
  winningTeam: string;
  players: {
    nick: string;
    team: 'team1' | 'team2';
    kills: number;
    deaths: number;
    assists: number;
    damage: number;
    hsPercent: number;
  }[];
}

export interface MatchRecord {
  id: string;
  seasonId: string;
  map: string;
  team1Name: string;
  team2Name: string;
  team1Score: number;
  team2Score: number;
  winningTeam: string;
  date: string;
  players: {
    playerId: string;
    nick: string;
    team?: 'team1' | 'team2';
    kills: number;
    deaths: number;
    assists: number;
    damage: number;
    hsPercent: number;
  }[];
}
