export const PATENTES = [
  { name: "Prata 1", image: "prata-1.png" },
  { name: "Prata 2", image: "prata-2.png" },
  { name: "Prata 3", image: "prata-3.png" },
  { name: "Prata 4", image: "prata-4.png" },
  { name: "Prata de Elite", image: "prata-de-elite.png" },
  { name: "Prata de Elite Mestre", image: "prata-de-elite-mestre.png" },
  { name: "Ouro 1", image: "ouro-1.png" },
  { name: "Ouro 2", image: "ouro-2.png" },
  { name: "Ouro 3", image: "ouro-3.png" },
  { name: "Ouro Mestre", image: "ouro-mestre.png" },
  { name: "AK 1", image: "ak-1.png" },
  { name: "AK 2", image: "ak-2.png" },
  { name: "AK Cruzada", image: "ak-cruzada.png" },
  { name: "Xerife", image: "xerife.png" },
  { name: "Águia 1", image: "aguia-1.png" },
  { name: "Águia 2", image: "aguia-2.png" },
  { name: "Supremo", image: "supremo.png" },
  { name: "Global", image: "global.png" }
];

export const RANK_THRESHOLDS = [
  { minScore: 0.00, rankIndex: 0 },  // Prata 1
  { minScore: 0.65, rankIndex: 1 },  // Prata 2
  { minScore: 0.72, rankIndex: 2 },  // Prata 3
  { minScore: 0.79, rankIndex: 3 },  // Prata 4
  { minScore: 0.86, rankIndex: 4 },  // Prata de Elite
  { minScore: 0.93, rankIndex: 5 },  // Prata de Elite Mestre
  { minScore: 1.00, rankIndex: 6 },  // Ouro 1 (Média)
  { minScore: 1.07, rankIndex: 7 },  // Ouro 2
  { minScore: 1.14, rankIndex: 8 },  // Ouro 3
  { minScore: 1.21, rankIndex: 9 },  // Ouro Mestre
  { minScore: 1.29, rankIndex: 10 }, // AK 1
  { minScore: 1.38, rankIndex: 11 }, // AK 2
  { minScore: 1.47, rankIndex: 12 }, // AK Cruzada
  { minScore: 1.57, rankIndex: 13 }, // Xerife
  { minScore: 1.68, rankIndex: 14 }, // Águia 1
  { minScore: 1.80, rankIndex: 15 }, // Águia 2
  { minScore: 1.93, rankIndex: 16 }, // Supremo
  { minScore: 2.08, rankIndex: 17 }, // Global
];

export interface RatingDetails {
  kda: number;
  kdaScore: number;
  damagePerMatch: number;
  damageScore: number;
  winRate: number;
  winRateScore: number;
  hsPercent: number;
  hsScore: number;
  confidenceFactor: number;
  rawScore: number;
  finalScore: number;
}

/**
 * Calcula a pontuação equilibrada (Rating X5) baseada em:
 * 1. KDA (Vítimas + 0.35 * Assists / Mortes) - Peso 35%
 * 2. Dano Médio por Partida (Impacto Real) - Peso 25%
 * 3. Taxa de Vitória (Trabalho em Equipe e Vitória do Jogo) - Peso 25%
 * 4. % Headshot (Precisão Mecânica) - Peso 15%
 * 5. Fator de Calibração (evita inflação por poucas partidas)
 */
export function calculatePlayerRating(params: {
  kills: number;
  deaths: number;
  assists: number;
  damage: number;
  matches: number;
  hsPercent?: number;
  wins?: number;
  losses?: number;
  winRate?: number;
}): { score: number; details: RatingDetails } {
  const { kills, deaths, assists, damage, matches, hsPercent = 0, wins = 0, losses = 0 } = params;

  // 1. KDA (Vítimas e Assists têm valor)
  const kda = deaths === 0 ? kills + assists * 0.35 : (kills + assists * 0.35) / Math.max(1, deaths);
  const kdaScore = Math.max(0.2, Math.min(2.6, kda));

  // 2. Dano Médio por Partida (Normalizado com base de 1800 de dano por partida)
  const damagePerMatch = matches > 0 ? damage / matches : 0;
  const damageScore = matches > 0
    ? Math.max(0.3, Math.min(2.3, damagePerMatch / 1800))
    : 1.0;

  // 3. Taxa de Vitória (% Win Rate)
  let winRate = 50;
  if (params.winRate !== undefined) {
    winRate = params.winRate;
  } else if (wins + losses > 0) {
    winRate = (wins / (wins + losses)) * 100;
  }
  // 50% de winrate = multiplicador neutro 1.0; 75% = 1.3; 25% = 0.7
  const winRateScore = Math.max(0.35, Math.min(1.85, 0.4 + (winRate / 100) * 1.2));

  // 4. Precisão (% Headshot)
  // Base média no CS é ~35%-40%
  const hsPercentVal = Math.max(0, Math.min(100, hsPercent));
  const hsScore = Math.max(0.5, Math.min(1.6, 0.65 + (hsPercentVal / 100) * 1.0));

  // Média ponderada dos fatores (Soma dos pesos = 1.00)
  const rawScore = (0.35 * kdaScore) + (0.25 * damageScore) + (0.25 * winRateScore) + (0.15 * hsScore);

  // 5. Fator de Calibração (Amostragem de partidas)
  // Jogadores com 1 ou 2 partidas não devem receber patente máxima instantaneamente
  let confidenceFactor = 1.0;
  if (matches <= 0) {
    confidenceFactor = 0.75;
  } else if (matches === 1) {
    confidenceFactor = 0.80;
  } else if (matches === 2) {
    confidenceFactor = 0.86;
  } else if (matches === 3) {
    confidenceFactor = 0.92;
  } else if (matches === 4) {
    confidenceFactor = 0.96;
  } else {
    confidenceFactor = 1.00;
  }

  const finalScore = Number((rawScore * confidenceFactor).toFixed(2));

  return {
    score: finalScore,
    details: {
      kda: Number(kda.toFixed(2)),
      kdaScore: Number(kdaScore.toFixed(2)),
      damagePerMatch: Math.round(damagePerMatch),
      damageScore: Number(damageScore.toFixed(2)),
      winRate: Math.round(winRate),
      winRateScore: Number(winRateScore.toFixed(2)),
      hsPercent: Math.round(hsPercentVal),
      hsScore: Number(hsScore.toFixed(2)),
      confidenceFactor,
      rawScore: Number(rawScore.toFixed(2)),
      finalScore
    }
  };
}

/**
 * Converte a pontuação equilibrada (Rating X5) na respectiva Patente
 */
export function getRankFromScore(score: number): { name: string; index: number; image: string } {
  let matchedIndex = 0;
  for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (score >= RANK_THRESHOLDS[i].minScore) {
      matchedIndex = RANK_THRESHOLDS[i].rankIndex;
      break;
    }
  }

  const safeIndex = Math.min(PATENTES.length - 1, Math.max(0, matchedIndex));
  return { ...PATENTES[safeIndex], index: safeIndex };
}

/**
 * Compatibilidade legada para onde ainda se passa getRankFromKD
 */
export function getRankFromKD(kd: number): { name: string; index: number; image: string } {
  return getRankFromScore(kd);
}

/**
 * Calcula o progresso para a próxima patente
 */
export function getRankProgress(score: number) {
  const currentRank = getRankFromScore(score);
  const currentIndex = currentRank.index;
  const isMaxRank = currentIndex >= PATENTES.length - 1;

  if (isMaxRank) {
    return {
      currentRank,
      nextRank: currentRank,
      progressPercent: 100,
      currentMinScore: RANK_THRESHOLDS[currentIndex].minScore,
      nextMinScore: RANK_THRESHOLDS[currentIndex].minScore
    };
  }

  const currentMin = RANK_THRESHOLDS[currentIndex].minScore;
  const nextMin = RANK_THRESHOLDS[currentIndex + 1].minScore;
  const progress = Math.min(100, Math.max(0, Math.round(((score - currentMin) / (nextMin - currentMin)) * 100)));

  return {
    currentRank,
    nextRank: PATENTES[currentIndex + 1],
    progressPercent: progress,
    currentMinScore: currentMin,
    nextMinScore: nextMin
  };
}

/**
 * Auxiliar para calcular Vitórias, Derrotas e Taxa de Vitória de um jogador no histórico de partidas
 */
export function getPlayerMatchRecord(
  playerId: string,
  playerNick: string,
  seasonId: string,
  matches: Array<{
    seasonId: string;
    team1Name?: string;
    team2Name?: string;
    winningTeam: string;
    players: Array<{ playerId?: string; nick?: string; team?: 'team1' | 'team2' }>;
  }>
) {
  const seasonMatches = matches.filter(m => m.seasonId === seasonId);
  let wins = 0;
  let losses = 0;

  seasonMatches.forEach(m => {
    const pRecord = m.players?.find(p => 
      (p.playerId && p.playerId === playerId) || 
      (playerNick && p.nick && p.nick.toLowerCase() === playerNick.toLowerCase())
    );

    if (!pRecord || !pRecord.team) return;

    const t1Name = (m.team1Name || 'TIME 1').trim().toUpperCase();
    const t2Name = (m.team2Name || 'TIME 2').trim().toUpperCase();
    const winTeam = (m.winningTeam || '').trim().toUpperCase();

    const t1Won = winTeam === t1Name || winTeam === 'TIME 1';
    const t2Won = winTeam === t2Name || winTeam === 'TIME 2';

    if ((pRecord.team === 'team1' && t1Won) || (pRecord.team === 'team2' && t2Won)) {
      wins++;
    } else {
      losses++;
    }
  });

  const total = wins + losses;
  const winRate = total > 0 ? (wins / total) * 100 : 50;

  return { wins, losses, total, winRate: Math.round(winRate) };
}

/**
 * Calcula a pontuação individual de uma partida (Match Rating X5)
 * Utiliza a mesma distribuição de pesos da regra equilibrada de patentes:
 * 1. KDA Efetivo (Kills + 0.35 * Assists / Mortes) - Peso 35%
 * 2. Dano Causado (Normalizado para ~1800 de dano por partida) - Peso 25%
 * 3. Vitória da Partida (Bônus de time vencedor) - Peso 25% (1.60 vitória / 0.65 derrota)
 * 4. % Headshot (Precisão mecânica) - Peso 15% (0.65 + hs% * 1.0)
 */
export function calculateMatchPlayerRating(params: {
  kills: number;
  deaths: number;
  assists?: number;
  damage?: number;
  hsPercent?: number;
  won: boolean;
}): { score: number; kda: number } {
  const { kills, deaths, assists = 0, damage = 0, hsPercent = 0, won } = params;

  // 1. KDA Efetivo
  const kda = deaths === 0 ? kills + assists * 0.35 : (kills + assists * 0.35) / Math.max(1, deaths);
  const kdaScore = Math.max(0.2, Math.min(2.6, kda));

  // 2. Dano (Normalizado com base de 1800 de dano por partida de 24 rounds)
  const damageScore = Math.max(0.3, Math.min(2.3, damage / 1800));

  // 3. Resultado da Partida (Vitória tem bônus de 25% de peso)
  const winRateScore = won ? 1.60 : 0.65;

  // 4. Precisão (% Headshot)
  const hsVal = Math.max(0, Math.min(100, hsPercent));
  const hsScore = Math.max(0.5, Math.min(1.6, 0.65 + (hsVal / 100) * 1.0));

  // Média ponderada dos fatores (Soma dos pesos = 1.00)
  const score = Number(((0.35 * kdaScore) + (0.25 * damageScore) + (0.25 * winRateScore) + (0.15 * hsScore)).toFixed(2));

  return {
    score,
    kda: Number(kda.toFixed(2))
  };
}

/**
 * Retorna o MVP de uma partida (jogador com maior Match Rating X5 do time vencedor)
 */
export function getMatchMVP(match: {
  team1Name?: string;
  team2Name?: string;
  winningTeam: string;
  players: Array<{
    playerId?: string;
    nick: string;
    team?: 'team1' | 'team2';
    kills: number;
    deaths: number;
    assists?: number;
    damage?: number;
    hsPercent?: number;
  }>;
}) {
  const t1Name = (match.team1Name || 'TIME 1').trim().toUpperCase();
  const t2Name = (match.team2Name || 'TIME 2').trim().toUpperCase();
  const winTeam = (match.winningTeam || '').trim().toUpperCase();

  const isT1Winner = winTeam === t1Name || winTeam === 'TIME 1';
  const isT2Winner = winTeam === t2Name || winTeam === 'TIME 2';

  let topMvp: {
    nick: string;
    playerId?: string;
    score: number;
    kills: number;
    deaths: number;
    assists: number;
    damage: number;
    hsPercent: number;
    team: 'team1' | 'team2';
    kd: number;
  } | null = null;

  match.players.forEach(p => {
    const isPlayerWinningTeam = (p.team === 'team1' && isT1Winner) || (p.team === 'team2' && isT2Winner) || (!p.team && isT1Winner);
    const { score } = calculateMatchPlayerRating({
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      damage: p.damage,
      hsPercent: p.hsPercent,
      won: isPlayerWinningTeam
    });

    const kd = p.deaths === 0 ? p.kills : Number((p.kills / p.deaths).toFixed(2));

    // O MVP oficial da partida é o maior Rating do time vencedor
    if (isPlayerWinningTeam) {
      if (!topMvp || score > topMvp.score) {
        topMvp = {
          nick: p.nick,
          playerId: p.playerId,
          score,
          kills: p.kills,
          deaths: p.deaths,
          assists: p.assists || 0,
          damage: p.damage || 0,
          hsPercent: p.hsPercent || 0,
          team: p.team || 'team1',
          kd
        };
      }
    }
  });

  return topMvp;
}

