import React, { useState, useMemo } from 'react';
import { Player, Season, PlayerStats, FullRankingEntry, MatchRecord } from '../types';
import { getRankFromScore, calculatePlayerRating, getPlayerMatchRecord } from '../utils';

interface TeamBalancerProps {
  players: Player[];
  seasons: Season[];
  stats: PlayerStats[];
  matches?: MatchRecord[];
}

interface BalancedTeam {
  id: number;
  name: string;
  color: string;
  borderColor: string;
  bgColor: string;
  players: FullRankingEntry[];
  avgScore: number;
  totalScore: number;
  avgKd: number;
  totalKd: number;
}

const TEAM_CONFIGS = [
  { name: 'TIME 1', color: 'text-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-600/20' },
  { name: 'TIME 2', color: 'text-rose-400', border: 'border-rose-500/30', bg: 'bg-rose-600/20' },
  { name: 'TIME 3', color: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-600/20' },
  { name: 'TIME 4', color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-600/20' },
  { name: 'TIME 5', color: 'text-purple-400', border: 'border-purple-500/30', bg: 'bg-purple-600/20' },
  { name: 'TIME 6', color: 'text-cyan-400', border: 'border-cyan-500/30', bg: 'bg-cyan-600/20' },
];

const TeamBalancer: React.FC<TeamBalancerProps> = ({ players, seasons, stats, matches = [] }) => {
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>(seasons[0]?.id || '');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [numTeams, setNumTeams] = useState<number>(2);
  const [balanceMetric, setBalanceMetric] = useState<'score' | 'kd'>('score');
  const [resultTeams, setResultTeams] = useState<BalancedTeam[] | null>(null);

  const playersPerTeam = 5;
  const totalPlayersNeeded = numTeams * playersPerTeam;

  // Pool de jogadores com o Rating X5 equilibrado calculado
  const playerPool: FullRankingEntry[] = useMemo(() => {
    if (!selectedSeasonId) return [];
    
    return players.map(p => {
      const s = stats.find(st => st.playerId === p.id && st.seasonId === selectedSeasonId);
      const kills = s?.kills || 0;
      const deaths = s?.deaths || 0;
      const assists = s?.assists || 0;
      const damage = s?.damage || 0;
      const matchCount = s?.matches || 0;
      const hsPercent = s?.hsPercent || 0;
      const kd = deaths === 0 ? kills : kills / deaths;
      const damagePerMatch = matchCount > 0 ? damage / matchCount : 0;
      
      const { wins, losses, winRate, total } = getPlayerMatchRecord(p.id, p.nick, selectedSeasonId, matches);
      const effectiveWinRate = total > 0 ? winRate : 50;

      const { score } = calculatePlayerRating({
        kills,
        deaths,
        assists,
        damage,
        matches: matchCount,
        hsPercent,
        wins,
        losses,
        winRate: effectiveWinRate
      });

      const patent = getRankFromScore(score);

      return {
        id: s?.id || `temp_${p.id}`,
        playerId: p.id,
        seasonId: selectedSeasonId,
        matches: matchCount,
        kills,
        deaths,
        assists,
        damage,
        nick: p.nick,
        avatarUrl: p.avatarUrl,
        steamUrl: p.steamUrl,
        kd: Number(kd.toFixed(2)),
        kda: Number(((kills + assists * 0.35) / Math.max(1, deaths)).toFixed(2)),
        damagePerMatch: Math.round(damagePerMatch),
        hsPercent,
        wins,
        losses,
        winRate: total > 0 ? winRate : 0,
        score,
        patent
      };
    }).sort((a, b) => b.score - a.score);
  }, [players, stats, selectedSeasonId, matches]);

  const togglePlayer = (id: string) => {
    if (selectedPlayerIds.includes(id)) {
      setSelectedPlayerIds(prev => prev.filter(pId => pId !== id));
    } else {
      if (selectedPlayerIds.length < totalPlayersNeeded) {
        setSelectedPlayerIds(prev => [...prev, id]);
      }
    }
  };

  const handleNumTeamsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const n = parseInt(e.target.value);
    setNumTeams(n);
    setResultTeams(null);
    setSelectedPlayerIds([]);
  };

  const generateTeams = () => {
    if (selectedPlayerIds.length !== totalPlayersNeeded) return;

    // 1. Jogadores selecionados
    const selectedPlayers = playerPool.filter(p => selectedPlayerIds.includes(p.playerId));

    // 2. Ordena pela métrica escolhida (Rating X5 por padrão ou KD) decrescente
    const sortedPlayers = [...selectedPlayers].sort((a, b) => {
      const valA = balanceMetric === 'score' ? a.score : a.kd;
      const valB = balanceMetric === 'score' ? b.score : b.kd;
      return valB - valA;
    });

    // 3. Inicializa os times
    const teams: BalancedTeam[] = Array.from({ length: numTeams }, (_, i) => ({
      id: i,
      name: TEAM_CONFIGS[i].name,
      color: TEAM_CONFIGS[i].color,
      borderColor: TEAM_CONFIGS[i].border,
      bgColor: TEAM_CONFIGS[i].bg,
      players: [],
      totalScore: 0,
      avgScore: 0,
      totalKd: 0,
      avgKd: 0
    }));

    const maxPlayersPerTeam = totalPlayersNeeded / numTeams;
    
    // 4. Algoritmo Guloso Balanceado
    sortedPlayers.forEach(player => {
      const availableTeams = teams.filter(t => t.players.length < maxPlayersPerTeam);
      
      let targetTeam = availableTeams[0];
      for (let i = 1; i < availableTeams.length; i++) {
        const teamTotalVal = balanceMetric === 'score' ? availableTeams[i].totalScore : availableTeams[i].totalKd;
        const targetTotalVal = balanceMetric === 'score' ? targetTeam.totalScore : targetTeam.totalKd;

        if (teamTotalVal < targetTotalVal) {
          targetTeam = availableTeams[i];
        } else if (teamTotalVal === targetTotalVal) {
          if (availableTeams[i].players.length < targetTeam.players.length) {
            targetTeam = availableTeams[i];
          }
        }
      }
      
      targetTeam.players.push(player);
      targetTeam.totalScore += player.score;
      targetTeam.totalKd += player.kd;
    });

    // Médias finais
    teams.forEach(t => {
      t.avgScore = t.totalScore / t.players.length;
      t.avgKd = t.totalKd / t.players.length;
    });

    setResultTeams(teams);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-gaming font-bold text-white mb-2">Sorteio Equilibrado de Times</h2>
        <p className="text-slate-400 text-sm max-w-xl mx-auto">
          Crie times balanceados utilizando o <strong className="text-purple-400">Rating X5</strong> (que considera vitórias, KDA, dano médio e HS) para partidas muito mais competitivas.
        </p>
      </div>

      {/* CONFIGURAÇÃO DO SORTEIO */}
      <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
        <div className="w-full sm:w-60">
           <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Temporada base</label>
           <select 
             value={selectedSeasonId} 
             onChange={(e) => { setSelectedSeasonId(e.target.value); setResultTeams(null); }} 
             className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 font-bold text-slate-200 outline-none focus:ring-2 focus:ring-purple-500 shadow-xl text-sm"
           >
             {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
           </select>
        </div>

        <div className="w-full sm:w-60">
           <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Quantidade de times</label>
           <select 
             value={numTeams} 
             onChange={handleNumTeamsChange} 
             className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 font-bold text-slate-200 outline-none focus:ring-2 focus:ring-purple-500 shadow-xl text-sm"
           >
             <option value={2}>2 times (10 jogadores)</option>
             <option value={3}>3 times (15 jogadores)</option>
             <option value={4}>4 times (20 jogadores)</option>
             <option value={5}>5 times (25 jogadores)</option>
             <option value={6}>6 times (30 jogadores)</option>
           </select>
        </div>

        <div className="w-full sm:w-60">
           <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Critério de Equilíbrio</label>
           <div className="flex bg-slate-900 border border-slate-700 rounded-xl p-1">
             <button
               type="button"
               onClick={() => { setBalanceMetric('score'); setResultTeams(null); }}
               className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${balanceMetric === 'score' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
             >
               ⭐ Rating X5
             </button>
             <button
               type="button"
               onClick={() => { setBalanceMetric('kd'); setResultTeams(null); }}
               className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${balanceMetric === 'kd' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
             >
               🎯 K/D
             </button>
           </div>
        </div>
      </div>

      {/* GRADE DE SELEÇÃO */}
      {!resultTeams && (
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
            <h3 className="font-gaming text-xl text-purple-400 font-bold">
              Selecionar jogadores 
              <span className={`ml-2 text-base ${selectedPlayerIds.length === totalPlayersNeeded ? 'text-emerald-400 font-mono' : 'text-slate-500 font-mono'}`}>
                ({selectedPlayerIds.length}/{totalPlayersNeeded})
              </span>
            </h3>
            {selectedPlayerIds.length > 0 && (
              <button onClick={() => setSelectedPlayerIds([])} className="text-xs text-rose-400 hover:text-rose-300 underline">
                Limpar seleção
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {playerPool.map(player => {
              const isSelected = selectedPlayerIds.includes(player.playerId);
              const patentInfo = player.patent || getRankFromScore(player.score);

              return (
                <button
                  key={player.playerId}
                  onClick={() => togglePlayer(player.playerId)}
                  disabled={!isSelected && selectedPlayerIds.length >= totalPlayersNeeded}
                  className={`
                    relative p-3 rounded-xl border text-left transition-all group
                    ${isSelected 
                      ? 'bg-purple-600/90 border-purple-400 shadow-lg shadow-purple-900/40 scale-102 z-10' 
                      : 'bg-slate-800/80 border-slate-700 hover:border-slate-500 hover:bg-slate-750'}
                    ${!isSelected && selectedPlayerIds.length >= totalPlayersNeeded ? 'opacity-35 cursor-not-allowed' : ''}
                  `}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <span className={`font-bold text-sm truncate pr-1 ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                      {player.nick}
                    </span>
                    <img 
                      src={`/patentes/${patentInfo.image}`} 
                      alt={patentInfo.name} 
                      className="h-4 object-contain flex-shrink-0" 
                      title={patentInfo.name} 
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className={`px-1.5 py-0.5 rounded ${isSelected ? 'bg-purple-800 text-purple-200 font-bold' : 'bg-slate-900 text-purple-300'}`}>
                      ⭐ {player.score.toFixed(2)}
                    </span>
                    <span className={`text-[10px] ${isSelected ? 'text-purple-200' : 'text-slate-400'}`}>
                      KD {player.kd.toFixed(2)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex justify-center">
            <button 
              onClick={generateTeams}
              disabled={selectedPlayerIds.length !== totalPlayersNeeded}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-10 py-3.5 rounded-xl font-bold text-base shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95 flex items-center gap-2"
            >
              <span>SORTEAR {numTeams} TIMES</span>
              <span className="text-xs bg-black/20 px-2 py-0.5 rounded uppercase">
                Por {balanceMetric === 'score' ? 'Rating X5' : 'K/D'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* RESULTADO DOS TIMES */}
      {resultTeams && (
        <div className="space-y-8 animate-in zoom-in-95 duration-500">
           <div className={`grid grid-cols-1 ${numTeams === 2 ? 'md:grid-cols-2' : numTeams === 3 ? 'lg:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-3'} gap-6`}>
              {resultTeams.map((team) => (
                <div key={team.id} className={`bg-slate-900 border ${team.borderColor} rounded-3xl overflow-hidden shadow-2xl`}>
                  <div className={`${team.bgColor} p-4 border-b ${team.borderColor} flex justify-between items-center`}>
                    <div>
                      <h3 className={`font-gaming text-xl font-bold ${team.color}`}>{team.name}</h3>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">Média KD: {team.avgKd.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-[10px] uppercase font-bold tracking-widest opacity-80 ${team.color}`}>Rating X5 Médio</p>
                      <p className="text-2xl font-mono font-bold text-white">⭐ {team.avgScore.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-800">
                    {team.players.map(p => {
                      const patentInfo = p.patent || getRankFromScore(p.score);
                      return (
                        <div key={p.playerId} className="p-3.5 flex justify-between items-center hover:bg-white/5 transition-colors">
                          <div className="flex items-center gap-2.5">
                            <img 
                              src={`/patentes/${patentInfo.image}`} 
                              alt={patentInfo.name} 
                              className="h-6 object-contain" 
                              title={patentInfo.name} 
                            />
                            <span className="font-bold text-sm text-slate-200">{p.nick}</span>
                          </div>

                          <div className="flex items-center gap-2 font-mono text-xs">
                            <span className="bg-purple-900/40 text-purple-300 border border-purple-800/50 px-2 py-0.5 rounded font-bold">
                              ⭐ {p.score.toFixed(2)}
                            </span>
                            <span className="text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                              KD {p.kd.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
           </div>

           <div className="flex justify-center mt-8 gap-4">
             <button 
               onClick={() => setResultTeams(null)} 
               className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg transition-all"
             >
               Novo Sorteio
             </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default TeamBalancer;
