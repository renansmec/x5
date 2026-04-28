import React, { useMemo } from 'react';
import { Player, MatchRecord, FullRankingEntry } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getRankFromKD } from '../utils';

interface PlayerProfileProps {
  playerStats: FullRankingEntry | null;
  matches: MatchRecord[];
  selectedSeasonId: string;
  onClose: () => void;
}

const PlayerProfile: React.FC<PlayerProfileProps> = ({ playerStats, matches, selectedSeasonId, onClose }) => {
  const player = playerStats;
  if (!player) return null;

  const profileData = useMemo(() => {
    // View strictly based on selected season matching
    const seasonMatches = matches.filter(m => m.seasonId === selectedSeasonId);
    
    // Find all matches where player participated
    const playerParticipated = seasonMatches.filter(m => 
      m.players.some(p => p.playerId === player.playerId || p.nick === player.nick)
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
      const pRecord = m.players.find(p => p.playerId === player.playerId || p.nick === player.nick);
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
      const kd = pRecord.deaths === 0 ? pRecord.kills : Number((pRecord.kills / pRecord.deaths).toFixed(2));
      const dateStr = new Date(m.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      
      totalKills += pRecord.kills;
      totalDeaths += pRecord.deaths;
      
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
        kd: kd,
        kills: pRecord.kills,
        deaths: pRecord.deaths,
        hsPercent: pRecord.hsPercent,
        result: won ? 'Vitória' : 'Derrota',
        index: `Match ${idx + 1}`
      });
    });

    const totalMatches = player.matches;
    const winRate = (wins + losses) > 0 ? ((wins / (wins + losses)) * 100).toFixed(1) : '0.0';
    const overallKD = player.kd.toFixed(2);
    const averageHS = player.hsPercent || 0;

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
  }, [matches, player, selectedSeasonId]);

  return (
    <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
      <button 
        onClick={onClose}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
        </svg>
        Voltar para o ranking
      </button>

      <div className="bg-slate-900/80 border border-slate-700/50 rounded-3xl p-8 mb-8 overflow-hidden shadow-2xl relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-emerald-500 to-blue-500 text-transparent"></div>
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 z-10 relative">
          
          <div className="h-24 w-24 rounded-full bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center text-4xl font-gaming font-bold text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]">
            {player.nick.substring(0, 2).toUpperCase()}
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-3xl md:text-4xl font-gaming font-bold text-white mb-2">
              {player.nick}
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
                      if (name === 'kd') return [<span style={{ color: '#a855f7', fontWeight: 'bold' }}>{value}</span>, 'K/D Ratio'];
                      return [value, name];
                    }}
                    labelFormatter={(label, payload) => {
                      if (payload && payload.length > 0) {
                        const data = payload[0].payload;
                        return `${data.date} - ${data.map} (${data.result})`;
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
