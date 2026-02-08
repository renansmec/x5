
import React, { useState, useMemo } from 'react';
import { Player, Season, PlayerStats, FullRankingEntry } from '../types';

interface TeamBalancerProps {
  players: Player[];
  seasons: Season[];
  stats: PlayerStats[];
}

interface TeamResult {
  teamA: FullRankingEntry[];
  teamB: FullRankingEntry[];
  avgA: number;
  avgB: number;
}

const TeamBalancer: React.FC<TeamBalancerProps> = ({ players, seasons, stats }) => {
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>(seasons[0]?.id || '');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [result, setResult] = useState<TeamResult | null>(null);

  // Calcula os stats atuais baseado na temporada selecionada (mesma lógica do Ranking)
  const playerPool: FullRankingEntry[] = useMemo(() => {
    if (!selectedSeasonId) return [];
    
    // Mapeia todos os jogadores, buscando seus stats na temporada ou zerando se não tiver
    return players.map(p => {
      const s = stats.find(st => st.playerId === p.id && st.seasonId === selectedSeasonId);
      const kills = s?.kills || 0;
      const deaths = s?.deaths || 0;
      const kd = deaths === 0 ? kills : kills / deaths;
      
      return {
        id: s?.id || `temp_${p.id}`,
        playerId: p.id,
        seasonId: selectedSeasonId,
        matches: s?.matches || 0,
        kills: kills,
        deaths: deaths,
        assists: s?.assists || 0,
        damage: s?.damage || 0,
        nick: p.nick,
        kd: kd,
        damagePerMatch: (s?.matches || 0) > 0 ? (s?.damage || 0) / (s?.matches || 1) : 0
      };
    }).sort((a, b) => a.nick.localeCompare(b.nick));
  }, [players, stats, selectedSeasonId]);

  const togglePlayer = (id: string) => {
    if (selectedPlayerIds.includes(id)) {
      setSelectedPlayerIds(prev => prev.filter(pId => pId !== id));
    } else {
      if (selectedPlayerIds.length < 10) {
        setSelectedPlayerIds(prev => [...prev, id]);
      }
    }
  };

  const generateTeams = () => {
    if (selectedPlayerIds.length !== 10) return;

    // 1. Pega os objetos completos dos jogadores selecionados
    const selectedPlayers = playerPool.filter(p => selectedPlayerIds.includes(p.playerId));

    // 2. Ordena por KD decrescente (do melhor para o pior)
    const sortedPlayers = [...selectedPlayers].sort((a, b) => b.kd - a.kd);

    const teamA: FullRankingEntry[] = [];
    const teamB: FullRankingEntry[] = [];
    let sumA = 0;
    let sumB = 0;

    // 3. Algoritmo Guloso (Greedy) para balanceamento
    // Itera do melhor para o pior, adicionando sempre ao time que tem a menor soma de KD atual
    sortedPlayers.forEach(player => {
      if (sumA <= sumB) {
        teamA.push(player);
        sumA += player.kd;
      } else {
        teamB.push(player);
        sumB += player.kd;
      }
    });

    setResult({
      teamA,
      teamB,
      avgA: sumA / 5,
      avgB: sumB / 5
    });
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-gaming font-bold text-white mb-2">Sorteio equilibrado de times</h2>
        <p className="text-slate-400">Selecione 10 jogadores para montar times balanceados pelo K/D da temporada.</p>
      </div>

      {/* SELEÇÃO DE TEMPORADA */}
      <div className="flex justify-center mb-8">
        <div className="w-full max-w-md">
           <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Temporada base (K/D)</label>
           <select 
             value={selectedSeasonId} 
             onChange={(e) => { setSelectedSeasonId(e.target.value); setResult(null); }} 
             className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 shadow-xl"
           >
             {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
           </select>
        </div>
      </div>

      {/* GRADE DE SELEÇÃO */}
      {!result && (
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-gaming text-xl text-purple-400 font-bold">
              Selecionar Jogadores <span className="text-slate-500 ml-2 text-base">({selectedPlayerIds.length}/10)</span>
            </h3>
            {selectedPlayerIds.length > 0 && (
              <button onClick={() => setSelectedPlayerIds([])} className="text-xs text-rose-400 hover:text-rose-300 underline">Limpar Seleção</button>
            )}
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {playerPool.map(player => {
              const isSelected = selectedPlayerIds.includes(player.playerId);
              return (
                <button
                  key={player.playerId}
                  onClick={() => togglePlayer(player.playerId)}
                  disabled={!isSelected && selectedPlayerIds.length >= 10}
                  className={`
                    relative p-3 rounded-xl border text-left transition-all group
                    ${isSelected 
                      ? 'bg-emerald-600 border-emerald-500 shadow-lg shadow-purple-900/50 scale-105 z-10' 
                      : 'bg-slate-800 border-slate-700 hover:border-slate-500 hover:bg-slate-750'}
                    ${!isSelected && selectedPlayerIds.length >= 10 ? 'opacity-40 cursor-not-allowed' : ''}
                  `}
                >
                  <div className="flex justify-between items-start">
                    <span className={`font-bold truncate pr-2 ${isSelected ? 'text-white' : 'text-slate-300'}`}>{player.nick}</span>
                    <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${isSelected ? 'bg-purple-800 text-purple-200' : 'bg-slate-900 text-slate-500'}`}>
                      {player.kd.toFixed(2)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex justify-center">
            <button 
              onClick={generateTeams}
              disabled={selectedPlayerIds.length !== 10}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-10 py-4 rounded-xl font-bold text-lg shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
            >
              SORTEAR TIMES EQUILIBRADOS
            </button>
          </div>
        </div>
      )}

      {/* RESULTADO DOS TIMES */}
      {result && (
        <div className="space-y-8 animate-in zoom-in-95 duration-500">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* TIME A */}
              <div className="bg-slate-900 border border-blue-500/30 rounded-3xl overflow-hidden shadow-2xl shadow-blue-900/20">
                <div className="bg-blue-600/20 p-4 border-b border-blue-500/30 flex justify-between items-center">
                  <h3 className="font-gaming text-2xl font-bold text-blue-400">TIME ALPHA</h3>
                  <div className="text-right">
                    <p className="text-[10px] uppercase text-blue-300 font-bold tracking-widest">Média KD</p>
                    <p className="text-xl font-mono font-bold text-white">{result.avgA.toFixed(2)}</p>
                  </div>
                </div>
                <div className="divide-y divide-slate-800">
                  {result.teamA.map(p => (
                    <div key={p.playerId} className="p-4 flex justify-between items-center hover:bg-blue-900/10 transition-colors">
                      <span className="font-bold text-slate-200">{p.nick}</span>
                      <span className="text-sm font-mono text-slate-500 bg-slate-950 px-2 py-1 rounded border border-slate-800">KD {p.kd.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* TIME B */}
              <div className="bg-slate-900 border border-rose-500/30 rounded-3xl overflow-hidden shadow-2xl shadow-rose-900/20">
                <div className="bg-rose-600/20 p-4 border-b border-rose-500/30 flex justify-between items-center">
                  <h3 className="font-gaming text-2xl font-bold text-rose-400">TIME OMEGA</h3>
                  <div className="text-right">
                    <p className="text-[10px] uppercase text-rose-300 font-bold tracking-widest">Média KD</p>
                    <p className="text-xl font-mono font-bold text-white">{result.avgB.toFixed(2)}</p>
                  </div>
                </div>
                <div className="divide-y divide-slate-800">
                  {result.teamB.map(p => (
                    <div key={p.playerId} className="p-4 flex justify-between items-center hover:bg-rose-900/10 transition-colors">
                      <span className="font-bold text-slate-200">{p.nick}</span>
                      <span className="text-sm font-mono text-slate-500 bg-slate-950 px-2 py-1 rounded border border-slate-800">KD {p.kd.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
           </div>

           <div className="flex justify-center mt-8 gap-4">
             <button onClick={generateTeams} className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-6 py-3 rounded-xl font-bold border border-slate-700 transition-all">
               Re-sortear (Mesmos Jogadores)
             </button>
             <button onClick={() => setResult(null)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all">
               Novo Sorteio
             </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default TeamBalancer;
