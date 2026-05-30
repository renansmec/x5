import React, { useMemo, useState } from 'react';
import { Player, MatchRecord, PlayerStats, Season } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getRankFromKD } from '../utils';

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
    // View strictly based on selected season matching
    const seasonMatches = matches.filter(m => m.seasonId === localSeasonId);
    
    // Find all matches where player participated
    const playerParticipated = seasonMatches.filter(m => 
      m.players.some(p => p.playerId === player.id || p.nick === player.nick)
    );

    // Sort ascending by date to show history from left to right
    const chronologicalMatches = [...playerParticipated].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let wins = 0;
    let losses = 0;
    const historyData: any[] = [];
    
    let totalKills = 0;
    let totalDeaths = 0;
    let totalHS = 0;
    let hsMatchesCount = 0;
    
    const mapStatsMap: Record<string, { matches: number, wins: number }> = {};

    chronologicalMatches.forEach((m, idx) => {
      const pRecord = m.players.find(p => p.playerId === player.id || p.nick === player.nick);
      if (!pRecord) return; 

      const t1Name = m.team1Name || 'TIME 1';
      const t2Name = m.team2Name || 'TIME 2';
      const t1Won = m.winningTeam.toUpperCase() === t1Name.toUpperCase() || m.winningTeam.toUpperCase() === 'TIME 1';
      const t2Won = m.winningTeam.toUpperCase() === t2Name.toUpperCase() || m.winningTeam.toUpperCase() === 'TIME 2';
      
      let won = false;
      if (pRecord.team === 'team1') {
        won = t1Won;
      } else if (pRecord.team === 'team2') {
        won = t2Won;
      }

      if (won) wins++;
      else losses++;

      // K/D logic
      totalKills += pRecord.kills;
      totalDeaths += pRecord.deaths;
      
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

      historyData.push({
        matchId: m.id,
        date: dateStr,
        map: m.map,
        kd: cumulativeKD,
        matchKD: matchKD,
        kills: pRecord.kills,
        deaths: pRecord.deaths,
        hsPercent: pRecord.hsPercent,
        result: won ? 'Vitória' : 'Derrota',
        index: `Match ${idx + 1}`
      });
    });

    const totalMatches = seasonStats ? seasonStats.matches : 0;
    const winRate = (wins + losses) > 0 ? ((wins / (wins + losses)) * 100).toFixed(1) : '0.0';
    
    let rawOverallKD = 0;
    if (seasonStats) {
      rawOverallKD = seasonStats.deaths === 0 ? seasonStats.kills : seasonStats.kills / seasonStats.deaths;
    }
    const overallKD = rawOverallKD.toFixed(2);
    
    const averageHS = seasonStats ? (seasonStats.hsPercent || 0) : 0;

    const mapStats = Object.entries(mapStatsMap).map(([mapName, stats]) => ({
      mapName,
      wins: stats.wins,
      matches: stats.matches,
      winRate: stats.matches > 0 ? ((stats.wins / stats.matches) * 100).toFixed(1) : '0.0'
    })).sort((a, b) => b.matches - a.matches);

    return {
      wins,
      losses,
      totalMatches,
      winRate,
      historyData,
      overallKD: overallKD.toString(),
      averageHS,
      mapStats
    };
  }, [matches, player, localSeasonId, stats, playerId]);

  return (
    <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <button 
          onClick={onClose}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
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
            className="w-full md:w-64 bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-2 font-bold text-slate-200 outline-none focus:ring-2 focus:ring-purple-500 shadow-lg text-sm"
          >
            {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            {seasons.length === 0 && <option value="">Nenhuma temporada</option>}
          </select>
        </div>
      </div>

      <div className="bg-slate-900/80 border border-slate-700/50 rounded-3xl p-8 mb-8 overflow-hidden shadow-2xl relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-emerald-500 to-blue-500 text-transparent"></div>
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 z-10 relative">
          
          {displayAvatar ? (
            <div className="h-24 w-24 rounded-full shadow-[0_0_20px_rgba(168,85,247,0.4)] overflow-hidden border-2 border-purple-500/50 flex-shrink-0 bg-slate-800">
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
            <div className="h-24 w-24 rounded-full flex-shrink-0 bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center text-4xl font-gaming font-bold text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]">
              {player.nick.substring(0, 2).toUpperCase()}
            </div>
          )}
          
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-3xl md:text-4xl font-gaming font-bold text-white mb-2 flex flex-col md:flex-row items-center md:items-baseline gap-2 justify-center md:justify-start">
              {player.nick}
              {player.steamUrl && (
                <a href={player.steamUrl} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors" title="Perfil Steam">
                  <svg className="w-5 h-5 mb-1" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.979 0C5.362 0 0 5.363 0 11.979c0 4.195 2.148 7.893 5.393 10.127l3.666-5.32c-.08-.415-.125-.845-.125-1.286 0-3.376 2.736-6.113 6.113-6.113 3.377 0 6.112 2.737 6.112 6.113 0 3.377-2.735 6.113-6.112 6.113-.912 0-1.782-.2-2.583-.556l-3.328 4.87c.928.16 1.884.248 2.863.248 6.617 0 11.979-5.364 11.979-11.979C23.978 5.363 18.614 0 11.979 0zm5.184 9.475c-1.385 0-2.507 1.12-2.507 2.506 0 1.384 1.122 2.507 2.507 2.507 1.384 0 2.505-1.123 2.505-2.507 0-1.386-1.121-2.506-2.505-2.506zm-6.248 3.868l-3.344 4.868a8.318 8.318 0 01-1.026.06c-1.611 0-3.111-.475-4.385-1.288l2.973-4.32a6.075 6.075 0 005.782.68z" />
                  </svg>
                </a>
              )}
            </h2>
            <div className="inline-block mt-1 mb-2 group/tooltip relative">
              <img 
                src={`/patentes/${getRankFromKD(parseFloat(profileData.overallKD)).image}`} 
                alt={getRankFromKD(parseFloat(profileData.overallKD)).name} 
                className="h-12 object-contain filter drop-shadow-md"
              />
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 scale-0 transition-transform bg-slate-900 border border-slate-700 text-xs text-white px-2 py-1 rounded group-hover/tooltip:scale-100 z-10 whitespace-nowrap">
                {getRankFromKD(parseFloat(profileData.overallKD)).name}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-4">
              <div className="bg-slate-800/80 rounded-xl px-4 py-2 border border-slate-700/50 flex flex-col items-center">
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">K/D Média</span>
                <span className="text-xl font-gaming font-bold text-purple-400">{profileData.overallKD}</span>
              </div>
              <div className="bg-slate-800/80 rounded-xl px-4 py-2 border border-slate-700/50 flex flex-col items-center">
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">% HS Média</span>
                <span className="text-xl font-gaming font-bold text-teal-400">{profileData.averageHS}%</span>
              </div>
              <div className="bg-slate-800/80 rounded-xl px-4 py-2 border border-slate-700/50 flex flex-col items-center">
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Partidas</span>
                <span className="text-xl font-gaming font-bold text-blue-400">{profileData.totalMatches}</span>
              </div>
              <div className="bg-emerald-900/40 rounded-xl px-4 py-2 border border-emerald-700/50 flex flex-col items-center">
                <span className="text-[10px] uppercase tracking-widest text-emerald-500/70 font-bold">Vitórias</span>
                <span className="text-xl font-gaming font-bold text-emerald-400">{profileData.wins}</span>
              </div>
              <div className="bg-rose-900/40 rounded-xl px-4 py-2 border border-rose-700/50 flex flex-col items-center">
                <span className="text-[10px] uppercase tracking-widest text-rose-500/70 font-bold">Derrotas</span>
                <span className="text-xl font-gaming font-bold text-rose-400">{profileData.losses}</span>
              </div>
              <div className="bg-slate-800/80 rounded-xl px-4 py-2 border border-slate-700/50 flex flex-col items-center">
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Taxa Vitória</span>
                <span className="text-xl font-gaming font-bold text-amber-400">{profileData.winRate}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 mt-8">
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
          <h3 className="text-xl font-gaming font-bold text-slate-200 mb-6 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-purple-500 rounded-full"></span>
            Evolução de K/D
          </h3>
          
          {profileData.historyData.length > 0 ? (
            <div className="h-[350px] w-full">
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
                    formatter={(value: any, name: any, props: any) => {
                      if (name === 'kd') return [<span style={{ color: '#a855f7', fontWeight: 'bold' }}>{value}</span>, 'K/D Acumulado'];
                      return [value, name];
                    }}
                    labelFormatter={(label, payload) => {
                      if (payload && payload.length > 0) {
                        const data = payload[0].payload;
                        return (
                          <div>
                            <div style={{ marginBottom: '4px' }}>{data.date} - {data.map} ({data.result})</div>
                            <div style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'normal' }}>
                              K/D da Partida: {data.matchKD} ({data.kills}/{data.deaths})
                            </div>
                          </div>
                        );
                      }
                      return label;
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="kd" 
                    stroke="#a855f7" 
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, fill: '#0f172a', stroke: '#a855f7' }}
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#a855f7' }}
                    animationDuration={1000}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-500 font-semibold italic border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/30">
              Não há dados suficientes para gerar o gráfico.
            </div>
          )}
        </div>

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
