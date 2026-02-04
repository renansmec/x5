
import { Player, Season, PlayerStats } from './types';

export const INITIAL_PLAYERS: Player[] = [
  { id: 'p1', nick: 'Ghost' },
  { id: 'p2', nick: 'Shadow' },
  { id: 'p3', nick: 'Viper' },
  { id: 'p4', nick: 'Blaze' },
  { id: 'p5', nick: 'Cypher' }
];

export const INITIAL_SEASONS: Season[] = [
  { id: 's1', name: 'Temporada 1 - Verão 2024' },
  { id: 's2', name: 'Temporada 2 - Outono 2024' }
];

export const INITIAL_STATS: PlayerStats[] = [
  { id: 'st1', playerId: 'p1', seasonId: 's1', matches: 10, kills: 150, deaths: 80, assists: 45, damage: 25000 },
  { id: 'st2', playerId: 'p2', seasonId: 's1', matches: 10, kills: 120, deaths: 100, assists: 60, damage: 22000 },
  { id: 'st3', playerId: 'p3', seasonId: 's1', matches: 10, kills: 90, deaths: 110, assists: 80, damage: 18000 },
  { id: 'st4', playerId: 'p4', seasonId: 's1', matches: 10, kills: 140, deaths: 95, assists: 30, damage: 23500 },
  { id: 'st5', playerId: 'p5', seasonId: 's1', matches: 10, kills: 110, deaths: 105, assists: 55, damage: 21000 }
];
