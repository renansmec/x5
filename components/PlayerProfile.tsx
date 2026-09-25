import React, { useMemo, useState } from 'react';
import { Player, MatchRecord, PlayerStats, Season } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { calculatePlayerRating, calculateMatchPlayerRating, getRankProgress } from '../utils';

interface PlayerProfileProps {
  playerId: string | null;
  players: Player[];
  seasons: Season[];
  stats: PlayerStats[];
  matches: MatchRecord[];
  initialSeasonId: string;
  onClose: () => void;
}

const PlayerProfile: React.FC<PlayerProfileProps> = ({ playerId, players, seasons, stats, matches, initialSeasonId, onClose }) => {
  const [localSeasonId, setLocalSeasonId] = useState<string>(initialSeasonId || (seasons.length > 0 ? seasons[0].id : ''));
  const [fetchedAvatar, setFetchedAvatar] = useState<string | null>(null);
  
  // Controles do Gráfico de Evolução
  const [chartMetric, setChartMetric] = useState<'both' | 'rating' | 'kd'>('both');
  const [chartScope, setChartScope] = useState<'cumulative' | 'match'>('cumulative');
  
  const player = players.find(p => p.id === playerId);
  
  React.useEffect(() => {
    setFetchedAvatar(null);
    if (player && player.steamUrl) {
      let targetUrl = player.steamUrl.trim();
      if (!targetUrl.startsWith('http')) {
        targetUrl = 'https://' + targetUrl;
      }
      
      fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.contents) {
            const html = data.contents;
            const match = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i) ||
                          html.match(/<link\s+rel="image_src"\s+href="([^"]+)"/i);
            if (match && match[1]) {
              setFetchedAvatar(match[1]);
            }
          }
        })
        .catch(err => console.error('Erro ao buscar foto da Steam:', err));
    }
  }, [player?.steamUrl, player?.id]);

  if (!player) return null;

  const displayAvatar = fetchedAvatar || player.avatarUrl;

  const profileData = useMemo(() => {
    const seasonStats = stats.find(s => s.playerId === playerId && s.seasonId === localSeasonId);
    const seasonMatches = matches.filter(m => m.seasonId === localSeasonId);
    
    // Todas as partidas em que o jogador participou
    const playerParticipated = seasonMatches.filter(m => 
      m.players.some(p => p.playerId === player.id || (p.nick && p.nick.toLowerCase() === player.nick.toLowerCase()))
    );

    // Ordena cronologicamente
    const chronologicalMatches = [...playerParticipated].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let wins = 0;
    let losses = 0;
    const historyData: any[] = [];
    
    let totalKills = 0;
    let totalDeaths = 0;
    let totalAssists = 0;
    let totalDamage = 0;
    let totalHS = 0;
    let hsMatchesCount = 0;
    
    const mapStatsMap: Record<string, { matches: number, wins: number }> = {};

    chronologicalMatches.forEach((m, idx) => {
      const pRecord = m.players.find(p => p.playerId === player.id || (p.nick && p.nick.toLowerCase() === player.nick.toLowerCase()));
      if (!pRecord) return; 

      const t1Name = (m.team1Name || 'TIME 1').trim().toUpperCase();
      const t2Name = (m.team2Name || 'TIME 2').trim().toUpperCase();
      const winTeam = (m.winningTeam || '').trim().toUpperCase();

      const t1Won = winTeam === t1Name || winTeam === 'TIME 1';
      const t2Won = winTeam === t2Name || winTeam === 'TIME 2';
      
      let won = false;
      if (pRecord.team === 'team1') {
        won = t1Won;
      } else if (pRecord.team === 'team2') {
        won = t2Won;
      }

      if (won) wins++;
      else losses++;

      totalKills += pRecord.kills;
      totalDeaths += pRecord.deaths;
      totalAssists += pRecord.assists || 0;
      totalDamage += pRecord.damage || 0;
      
      const cumulativeKD = totalDeaths === 0 ? totalKills : Number((totalKills / totalDeaths).toFixed(2));
      const matchKD = pRecord.deaths === 0 ? pRecord.kills : Number((pRecord.kills / pRecord.deaths).toFixed(2));
      const dateStr = new Date(m.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      
      if (typeof pRecord.hsPercent === 'number') {
        totalHS += pRecord.hsPercent;
        hsMatchesCount++;
      }
      
      const mapName = m.map && m.map.trim() !== '' ? m.map : 'Desconhecido';
      if (!mapStatsMap[mapName]) {
        mapStatsMap[mapName] = { matches: 0, wins: 0 };
      }
      mapStatsMap[mapName].matches++;
      if (won) {
        mapStatsMap[mapName].wins++;
      }

      // Calcula o Rating cumulativo até esta partida
      const cumulativeMatches = idx + 1;
      const cumulativeWinRate = (wins + losses) > 0 ? (wins / (wins + losses)) * 100 : 50;
      const cumulativeAvgHS = hsMatchesCount > 0 ? Math.round(totalHS / hsMatchesCount) : 0;
      const cumRatingOutput = calculatePlayerRating({
        kills: totalKills,
        deaths: totalDeaths,
        assists: totalAssists,
        damage: totalDamage,
        matches: cumulativeMatches,
        hsPercent: cumulativeAvgHS,
        wins,
        losses,
        winRate: cumulativeWinRate
      });

      // Calcula o Rating específico apenas desta partida
      const singleMatchRating = calculateMatchPlayerRating({
        kills: pRecord.kills,
        deaths: pRecord.deaths,
        assists: pRecord.assists,
        damage: pRecord.damage,
        hsPercent: pRecord.hsPercent,
        won
      });

      historyData.push({
        matchId: m.id,
        date: dateStr,
        map: m.map,
        kd: cumulativeKD,
        matchKD: matchKD,
        rating: cumRatingOutput.score,
        matchRating: singleMatchRating.score,
        kills: pRecord.kills,
        deaths: pRecord.deaths,
        assists: pRecord.assists || 0,
        damage: pRecord.damage || 0,
        hsPercent: pRecord.hsPercent || 0,
        result: won ? 'Vitória' : 'Derrota',
        index: `Match ${idx + 1}`
      });
    });

    const totalMatches = seasonStats ? seasonStats.matches : chronologicalMatches.length;
    const winRateNum = (wins + losses) > 0 ? (wins / (wins + losses)) * 100 : 0;
    const winRateStr = winRateNum.toFixed(1);
    
    const kCount = seasonStats ? seasonStats.kills : totalKills;
    const dCount = seasonStats ? seasonStats.deaths : totalDeaths;
    const aCount = seasonStats ? seasonStats.assists : totalAssists;
    const dmgCount = seasonStats ? seasonStats.damage : totalDamage;
    const hsVal = seasonStats ? (seasonStats.hsPercent || 0) : (hsMatchesCount > 0 ? Math.round(totalHS / hsMatchesCount) : 0);

    const rawOverallKD = dCount === 0 ? kCount : kCount / dCount;
    const overallKD = rawOverallKD.toFixed(2);
    const kdaVal = ((kCount + aCount * 0.35) / Math.max(1, dCount)).toFixed(2);
    const avgDamage = totalMatches > 0 ? Math.round(dmgCount / totalMatches) : 0;

    // Calcula Rating X5 equilibrado
    const ratingOutput = calculatePlayerRating({
      kills: kCount,
      deaths: dCount,
      assists: aCount,
      damage: dmgCount,
      matches: totalMatches,
      hsPercent: hsVal,
      wins,
      losses,
      winRate: (wins + losses) > 0 ? winRateNum : 50
    });

    const rankProg = getRankProgress(ratingOutput.score);

    const mapStats = Object.entries(mapStatsMap).map(([mapName, s]) => ({
      mapName,
      wins: s.wins,
      matches: s.matches,
      winRate: s.matches > 0 ? ((s.wins / s.matches) * 100).toFixed(1) : '0.0'
    })).sort((a, b) => b.matches - a.matches);

    return {
      wins,
      losses,
      totalMatches,
      winRate: winRateStr,
      historyData,
      overallKD,
      kdaVal,
      avgDamage,
      averageHS: hsVal,
      ratingOutput,
      rankProg,
      mapStats
    };
  }, [matches, player, localSeasonId, stats, playerId]);

  const { rankProg, ratingOutput } = profileData;

  // Chaves dinâmicas baseadas no escopo escolhido (acumulado ou por partida)
  const ratingDataKey = chartScope === 'cumulative' ? 'rating' : 'matchRating';
  const kdDataKey = chartScope === 'cumulative' ? 'kd' : 'matchKD';

  return (
    <div className="space-y-6 animate-in slide-in-from-right-8 duration-500 pb-12">
      {/* Top bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <button 
          onClick={onClose}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
          Voltar para o ranking
        </button>

        <div className="w-full md:w-auto">
          <select 
            value={localSeasonId} 
            onChange={(e) => setLocalSeasonId(e.target.value)} 
            className="w-full md:w-64 bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2 font-bold text-slate-200 outline-none focus:ring-2 focus:ring-purple-500 shadow-lg text-sm"
          >
            {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            {seasons.length === 0 && <option value="">Nenhuma temporada</option>}
          </select>
        </div>
      </div>

      {/* Header do Jogador com Patente Equilibrada */}
      <div className="bg-slate-900/90 border border-slate-700/70 rounded-3xl p-6 sm:p-8 overflow-hidden shadow-2xl relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-amber-500 to-emerald-500 text-transparent"></div>
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8 z-10 relative">
          
          {displayAvatar ? (
            <div className="h-24 w-24 rounded-full shadow-[0_0_25px_rgba(168,85,247,0.35)] overflow-hidden border-2 border-purple-500/60 flex-shrink-0 bg-slate-800">
              <img 
                src={displayAvatar} 
                alt={player.nick} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = `<span class="flex items-center justify-center w-full h-full bg-gradient-to-br from-purple-600 to-blue-500 text-4xl font-gaming font-bold text-white">${player.nick.substring(0, 2).toUpperCase()}</span>`;
                }}
              />
            </div>
          ) : (
            <div className="h-24 w-24 rounded-full flex-shrink-0 bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center text-4xl font-gaming font-bold text-white shadow-[0_0_25px_rgba(168,85,247,0.35)]">
              {player.nick.substring(0, 2).toUpperCase()}
            </div>
          )}
          
          <div className="flex-1 text-center md:text-left w-full">
            <h2 className="text-3xl md:text-4xl font-gaming font-bold text-white mb-2 flex flex-col md:flex-row items-center md:items-baseline gap-2 justify-center md:justify-start">
              <span>{player.nick}</span>
              {player.steamUrl && (
                <a href={player.steamUrl} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors" title="Perfil Steam">
                  <svg className="w-5 h-5 mb-1" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.979 0C5.362 0 0 5.363 0 11.979c0 4.195 2.148 7.893 5.393 10.127l3.666-5.32c-.08-.415-.125-.845-.125-1.286 0-3.376 2.736-6.113 6.113-6.113 3.377 0 6.112 2.737 6.112 6.113 0 3.377-2.735 6.113-6.112 6.113-.912 0-1.782-.2-2.583-.556l-3.328 4.87c.928.16 1.884.248 2.863.248 6.617 0 11.979-5.364 11.979-11.979C23.978 5.363 18.614 0 11.979 0zm5.184 9.475c-1.385 0-2.507 1.12-2.507 2.506 0 1.384 1.122 2.507 2.507 2.507 1.384 0 2.505-1.123 2.505-2.507 0-1.386-1.121-2.506-2.505-2.506zm-6.248 3.868l-3.344 4.868a8.318 8.318 0 01-1.026.06c-1.611 0-3.111-.475-4.385-1.288l2.973-4.32a6.075 6.075 0 005.782.68z" />
                  </svg>
                </a>
              )}
            </h2>

            {/* Badge de Patente e Barra de Progresso */}
            <div className="flex flex-col sm:flex-row items-center gap-4 my-3 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 max-w-xl">
              <div className="flex items-center gap-3 flex-shrink-0">
                <img 
                  src={`/patentes/${rankProg.currentRank.image}`} 
                  alt={rankProg.currentRank.name} 
                  className="h-12 object-contain filter drop-shadow-md"
                />
                <div className="text-left">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Patente Atual</p>
                  <p className="text-base font-gaming font-bold text-amber-300">{rankProg.currentRank.name}</p>
                </div>
              </div>

              <div className="flex-1 w-full text-left border-t sm:border-t-0 sm:border-l border-slate-800 pt-2 sm:pt-0 sm:pl-4">
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-slate-400">Progresso para <strong className="text-white">{rankProg.nextRank.name}</strong></span>
                  <span className="font-mono font-bold text-purple-400">{rankProg.progressPercent}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-emerald-400 h-full rounded-full transition-all duration-700"
                    style={{ width: `${rankProg.progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                  <span>Rating atual: {ratingOutput.score.toFixed(2)}</span>
                  <span>Alvo: {rankProg.nextMinScore.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Cards de Métricas Principais */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 mt-4">
              <div className="bg-gradient-to-br from-purple-900/50 to-slate-800/80 rounded-xl px-4 py-2 border border-purple-500/40 flex flex-col items-center shadow-lg">
                <span className="text-[10px] uppercase tracking-widest text-purple-300 font-bold">Rating X5</span>
                <span className="text-xl font-gaming font-bold text-purple-200">⭐ {ratingOutput.score.toFixed(2)}</span>
              </div>
              <div className="bg-slate-800/80 rounded-xl px-4 py-2 border border-slate-700/60 flex flex-col items-center">
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">K/D Média</span>
                <span className="text-xl font-gaming font-bold text-yellow-400">{profileData.overallKD}</span>
              </div>
              <div className="bg-slate-800/80 rounded-xl px-4 py-2 border border-slate-700/60 flex flex-col items-center">
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">KDA</span>
                <span className="text-xl font-gaming font-bold text-sky-400">{profileData.kdaVal}</span>
              </div>
              <div className="bg-slate-800/80 rounded-xl px-4 py-2 border border-slate-700/60 flex flex-col items-center">
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">% HS Média</span>
                <span className="text-xl font-gaming font-bold text-teal-400">{profileData.averageHS}%</span>
              </div>
              <div className="bg-slate-800/80 rounded-xl px-4 py-2 border border-slate-700/60 flex flex-col items-center">
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Dano M./Part.</span>
                <span className="text-xl font-gaming font-bold text-orange-400">{profileData.avgDamage}</span>
              </div>
              <div className="bg-slate-800/80 rounded-xl px-4 py-2 border border-slate-700/60 flex flex-col items-center">
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Partidas</span>
                <span className="text-xl font-gaming font-bold text-blue-400">{profileData.totalMatches}</span>
              </div>
              <div className="bg-emerald-900/30 rounded-xl px-4 py-2 border border-emerald-700/40 flex flex-col items-center">
                <span className="text-[10px] uppercase tracking-widest text-emerald-400/80 font-bold">Vitórias</span>
                <span className="text-xl font-gaming font-bold text-emerald-400">{profileData.wins}</span>
              </div>
              <div className="bg-rose-900/30 rounded-xl px-4 py-2 border border-rose-700/40 flex flex-col items-center">
                <span className="text-[10px] uppercase tracking-widest text-rose-400/80 font-bold">Derrotas</span>
                <span className="text-xl font-gaming font-bold text-rose-400">{profileData.losses}</span>
              </div>
              <div className="bg-slate-800/80 rounded-xl px-4 py-2 border border-slate-700/60 flex flex-col items-center">
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Taxa Vitória</span>
                <span className="text-xl font-gaming font-bold text-amber-400">{profileData.winRate}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Seção Explicativa dos Pilares da Pontuação do Jogador */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <h3 className="text-base font-gaming font-bold text-slate-200 mb-3 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-purple-500 rounded-full"></span>
          Pilares do Rating X5 Deste Jogador
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Pilar 1: KDA */}
          <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/60 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-yellow-400">KDA (35% peso)</span>
                <span className="text-[11px] font-mono font-bold text-yellow-300">{ratingOutput.details.kda} KDA</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2">Score impacto de frags e assists</p>
            </div>
            <div className="flex items-center justify-between text-xs font-mono text-slate-300 bg-slate-900/60 px-2 py-1 rounded">
              <span>Fator normalizado:</span>
              <span className="font-bold text-yellow-400">{ratingOutput.details.kdaScore}</span>
            </div>
          </div>

          {/* Pilar 2: Dano Médio */}
          <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/60 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-orange-400">Dano Médio (25% peso)</span>
                <span className="text-[11px] font-mono font-bold text-orange-300">{ratingOutput.details.damagePerMatch} dmg</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2">Impacto por round / ADR médio</p>
            </div>
            <div className="flex items-center justify-between text-xs font-mono text-slate-300 bg-slate-900/60 px-2 py-1 rounded">
              <span>Fator normalizado:</span>
              <span className="font-bold text-orange-400">{ratingOutput.details.damageScore}</span>
            </div>
          </div>

          {/* Pilar 3: Taxa de Vitória */}
          <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/60 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-emerald-400">Vitórias (25% peso)</span>
                <span className="text-[11px] font-mono font-bold text-emerald-300">{ratingOutput.details.winRate}% win</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2">Vitória dos jogos do time</p>
            </div>
            <div className="flex items-center justify-between text-xs font-mono text-slate-300 bg-slate-900/60 px-2 py-1 rounded">
              <span>Fator normalizado:</span>
              <span className="font-bold text-emerald-400">{ratingOutput.details.winRateScore}</span>
            </div>
          </div>

          {/* Pilar 4: Headshot */}
          <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/60 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-purple-400">Precisão %HS (15% peso)</span>
                <span className="text-[11px] font-mono font-bold text-purple-300">{ratingOutput.details.hsPercent}% HS</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2">Mecânica e precisão de headshots</p>
            </div>
            <div className="flex items-center justify-between text-xs font-mono text-slate-300 bg-slate-900/60 px-2 py-1 rounded">
              <span>Fator normalizado:</span>
              <span className="font-bold text-purple-400">{ratingOutput.details.hsScore}</span>
            </div>
          </div>
        </div>

        {ratingOutput.details.confidenceFactor < 1.0 && (
          <div className="mt-3 text-[11px] text-blue-300/80 bg-blue-950/30 border border-blue-800/40 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span>🛡️ Calibração de Partidas:</span>
            <span>Ajuste de {(ratingOutput.details.confidenceFactor * 100).toFixed(0)}% aplicado por ter {profileData.totalMatches} partidas (se estabiliza 100% com 5 partidas).</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 mt-8">
        {/* Gráfico de Evolução (com Rating X5 e K/D) */}
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h3 className="text-xl font-gaming font-bold text-slate-200 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-purple-500 rounded-full"></span>
              Evolução de Desempenho por Partida
            </h3>

            {/* Controles do Gráfico */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              {/* Seletor Acumulado vs Por Partida */}
              <div className="flex bg-slate-950/80 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setChartScope('cumulative')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    chartScope === 'cumulative' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Evolução acumulada ao longo da temporada"
                >
                  Geral Acumulado
                </button>
                <button
                  type="button"
                  onClick={() => setChartScope('match')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    chartScope === 'match' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Desempenho isolado de cada partida"
                >
                  Por Partida
                </button>
              </div>

              {/* Seletor Métrica: Ambos, Rating X5, K/D */}
              <div className="flex bg-slate-950/80 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setChartMetric('both')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                    chartMetric === 'both' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>Comparar Ambos</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric('rating')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                    chartMetric === 'rating' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="text-purple-300">⭐</span> Rating X5
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric('kd')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                    chartMetric === 'kd' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="text-yellow-400">🎯</span> K/D
                </button>
              </div>
            </div>
          </div>
          
          {profileData.historyData.length > 0 ? (
            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={profileData.historyData} margin={{ top: 20, right: 30, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis 
                    dataKey="index" 
                    stroke="#64748b" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    domain={[0, 'dataMax + 0.5']}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }} 
                    itemStyle={{ color: '#d6d6d6' }}
                    labelStyle={{ color: '#94a3b8', marginBottom: '8px', fontWeight: 'bold' }}
                    formatter={(value: any, name: any) => {
                      if (name === 'Rating X5' || name === 'rating' || name === 'matchRating') {
                        return [
                          <span style={{ color: '#a855f7', fontWeight: 'bold' }}>⭐ {value}</span>, 
                          chartScope === 'cumulative' ? 'Rating X5 Geral' : 'Rating da Partida'
                        ];
                      }
                      if (name === 'K/D' || name === 'kd' || name === 'matchKD') {
                        return [
                          <span style={{ color: '#eab308', fontWeight: 'bold' }}>🎯 {value}</span>, 
                          chartScope === 'cumulative' ? 'K/D Geral' : 'K/D da Partida'
                        ];
                      }
                      return [value, name];
                    }}
                    labelFormatter={(label, payload) => {
                      if (payload && payload.length > 0) {
                        const d = payload[0].payload;
                        return (
                          <div>
                            <div style={{ marginBottom: '4px', fontWeight: 'bold', color: '#f8fafc' }}>
                              {d.date} - {d.map} ({d.result})
                            </div>
                            <div style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'normal' }}>
                              Partida: {d.kills}K / {d.deaths}D / {d.assists}A | Dano: {d.damage} | HS: {d.hsPercent}%
                            </div>
                          </div>
                        );
                      }
                      return label;
                    }}
                  />
                  <Legend 
                    verticalAlign="top" 
                    align="right"
                    wrapperStyle={{ paddingBottom: '16px', fontSize: '12px' }}
                  />

                  {/* Linha do Rating X5 */}
                  {(chartMetric === 'both' || chartMetric === 'rating') && (
                    <Line 
                      type="monotone" 
                      dataKey={ratingDataKey}
                      name="Rating X5" 
                      stroke="#a855f7" 
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2, fill: '#0f172a', stroke: '#a855f7' }}
                      activeDot={{ r: 6, strokeWidth: 0, fill: '#a855f7' }}
                      animationDuration={1000}
                    />
                  )}

                  {/* Linha do K/D */}
                  {(chartMetric === 'both' || chartMetric === 'kd') && (
                    <Line 
                      type="monotone" 
                      dataKey={kdDataKey}
                      name="K/D" 
                      stroke="#eab308" 
                      strokeWidth={2.5}
                      strokeDasharray={chartMetric === 'both' ? '4 4' : undefined}
                      dot={{ r: 3, strokeWidth: 2, fill: '#0f172a', stroke: '#eab308' }}
                      activeDot={{ r: 5, strokeWidth: 0, fill: '#eab308' }}
                      animationDuration={1000}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-slate-500 font-semibold italic border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/30">
              Não há dados suficientes para gerar o gráfico.
            </div>
          )}
        </div>

        {/* Estatísticas por Mapa */}
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
          <h3 className="text-xl font-gaming font-bold text-slate-200 mb-6 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-teal-500 rounded-full"></span>
            Estatísticas por Mapa
          </h3>
          
          {profileData.mapStats.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {profileData.mapStats.map(stat => (
                <div key={stat.mapName} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-lg text-slate-200">{stat.mapName}</span>
                    <span className="text-teal-400 font-gaming font-bold text-lg">{stat.winRate}%</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-400">
                    <span>Partidas: <span className="text-slate-300 font-semibold">{stat.matches}</span></span>
                    <span>Vitórias: <span className="text-slate-300 font-semibold">{stat.wins}</span></span>
                  </div>
                  <div className="w-full bg-slate-900 h-1.5 mt-3 rounded-full overflow-hidden border border-slate-700/50">
                    <div className="bg-teal-500 h-full rounded-full" style={{ width: `${stat.winRate}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <div className="h-[100px] flex items-center justify-center text-slate-500 font-semibold italic border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/30">
              Nenhuma partida registrada em mapas.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerProfile;
