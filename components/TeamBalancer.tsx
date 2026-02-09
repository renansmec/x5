
import React, { useState, useMemo } from 'react';
import { Player, Season, PlayerStats, FullRankingEntry } from '../types';

interface TeamBalancerProps {
  players: Player[];
  seasons: Season[];
  stats: PlayerStats[];
}

interface BalancedTeam {
  id: number;
  name: string;
  color: string;
  borderColor: string;
  bgColor: string;
  players: FullRankingEntry[];
  avgKd: number;
  totalKd: number;
}

const TEAM_CONFIGS = [
  { name: 'TIME ALPHA', color: 'text-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-600/20' },
  { name: 'TIME OMEGA', color: 'text-rose-400', border: 'border-rose-500/30', bg: 'bg-rose-600/20' },
  { name: 'TIME GAMMA', color: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-600/20' },
  { name: 'TIME DELTA', color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-600/20' },
  { name: 'TIME EPSILON', color: 'text-purple-400', border: 'border-purple-500/30', bg: 'bg-purple-600/20' },
  { name: 'TIME ZETA', color: 'text-cyan-400', border: 'border-cyan-500/30', bg: 'bg-cyan-600/20' },
];

const TeamBalancer: React.FC<TeamBalancerProps> = ({ players, seasons, stats }) => {
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>(seasons[0]?.id || '');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [numTeams, setNumTeams] = useState<number>(2);
  const [resultTeams, setResultTeams] = useState<BalancedTeam[] | null>(null);

  const playersPerTeam = 5;
  const totalPlayersNeeded = numTeams * playersPerTeam;

  // Calcula os stats atuais baseado na temporada selecionada
  const playerPool: FullRankingEntry[] = useMemo(() => {
    if (!selectedSeasonId) return [];
    
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
      if (selectedPlayerIds.length < totalPlayersNeeded) {
        setSelectedPlayerIds(prev => [...prev, id]);
      }
    }
  };

  const handleNumTeamsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const n = parseInt(e.target.value);
    setNumTeams(n);
    setResultTeams(null);
    setSelectedPlayerIds([]); // Reseta seleção para evitar inconsistências
  };

  const generateTeams = () => {
    if (selectedPlayerIds.length !== totalPlayersNeeded) return;

    // 1. Pega os objetos completos dos jogadores selecionados
    const selectedPlayers = playerPool.filter(p => selectedPlayerIds.includes(p.playerId));

    // 2. Ordena por KD decrescente (do melhor para o pior) para o algoritmo guloso
    const sortedPlayers = [...selectedPlayers].sort((a, b) => b.kd - a.kd);

    // 3. Inicializa os times vazios
    const teams: BalancedTeam[] = Array.from({ length: numTeams }, (_, i) => ({
      id: i,
      name: TEAM_CONFIGS[i].name,
      color: TEAM_CONFIGS[i].color,
      borderColor: TEAM_CONFIGS[i].border,
      bgColor: TEAM_CONFIGS[i].bg,
      players: [],
      totalKd: 0,
      avgKd: 0
    }));

    // 4. Algoritmo de Distribuição (Snake/Greedy balanceado)
    // Para cada jogador (do mais forte ao mais fraco), coloca no time que tem a MENOR soma de KD atual.
    sortedPlayers.forEach(player => {
      // Encontra o time com a menor soma de KD no momento
      let targetTeam = teams[0];
      for (let i = 1; i < teams.length; i++) {
        if (teams[i].totalKd < targetTeam.totalKd) {
          targetTeam = teams[i];
        } else if (teams[i].totalKd === targetTeam.totalKd) {
          // Desempate: quem tem menos jogadores
          if (teams[i].players.length < targetTeam.players.length) {
            targetTeam = teams[i];
          }
        }
      }
      
      targetTeam.players.push(player);
      targetTeam.totalKd += player.kd;
    });

    // Calcula médias finais
    teams.forEach(t => {
      t.avgKd = t.totalKd / t.players.length;
    });

    setResultTeams(teams);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-gaming font-bold text-white mb-2">Sorteio equilibrado</h2>
        <p className="text-slate-400">Monte times automaticamente balanceados pelo K/D.</p>
      </div>

      {/* CONFIGURAÇÃO DO SORTEIO */}
      <div className="flex flex-col md:flex-row justify-center gap-4 mb-8">
        <div className="w-full md:w-64">
           <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Temporada base (K/D)</label>
           <select 
             value={selectedSeasonId} 
             onChange={(e) => { setSelectedSeasonId(e.target.value); setResultTeams(null); }} 
             className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 shadow-xl"
           >
             {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
           </select>
        </div>
        <div className="w-full md:w-64">
           <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Quantidade de times</label>
           <select 
             value={numTeams} 
             onChange={handleNumTeamsChange} 
             className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 shadow-xl"
           >
             <option value={2}>2 times (10 jogadores)</option>
             <option value={3}>3 times (15 jogadores)</option>
             <option value={4}>4 times (20 jogadores)</option>
             <option value={5}>5 times (25 jogadores)</option>
             <option value={6}>6 times (30 jogadores)</option>
           </select>
        </div>
      </div>

      {/* GRADE DE SELEÇÃO */}
      {!resultTeams && (
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-gaming text-xl text-blue-400 font-bold">
              Selecionar jogadores <span className={`ml-2 text-base ${selectedPlayerIds.length === totalPlayersNeeded ? 'text-emerald-500' : 'text-slate-500'}`}>({selectedPlayerIds.length}/{totalPlayersNeeded})</span>
            </h3>
            {selectedPlayerIds.length > 0 && (
              <button onClick={() => setSelectedPlayerIds([])} className="text-xs text-rose-400 hover:text-rose-300 underline">Limpar seleção</button>
            )}
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {playerPool.map(player => {
              const isSelected = selectedPlayerIds.includes(player.playerId);
              return (
                <button
                  key={player.playerId}
                  onClick={() => togglePlayer(player.playerId)}
                  disabled={!isSelected && selectedPlayerIds.length >= totalPlayersNeeded}
                  className={`
                    relative p-3 rounded-xl border text-left transition-all group
                    ${isSelected 
                      ? 'bg-emerald-600 border-emerald-500 shadow-lg shadow-emerald-900/50 scale-105 z-10' 
                      : 'bg-slate-800 border-slate-700 hover:border-slate-500 hover:bg-slate-750'}
                    ${!isSelected && selectedPlayerIds.length >= totalPlayersNeeded ? 'opacity-40 cursor-not-allowed' : ''}
                  `}
                >
                  <div className="flex justify-between items-start">
                    <span className={`font-bold truncate pr-2 ${isSelected ? 'text-white' : 'text-slate-300'}`}>{player.nick}</span>
                    <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${isSelected ? 'bg-emerald-800 text-emerald-200' : 'bg-slate-900 text-slate-500'}`}>
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
              disabled={selectedPlayerIds.length !== totalPlayersNeeded}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-10 py-4 rounded-xl font-bold text-lg shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
            >
              SORTEAR {numTeams} TIMES
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
                    <h3 className={`font-gaming text-xl font-bold ${team.color}`}>{team.name}</h3>
                    <div className="text-right">
                      <p className={`text-[10px] uppercase font-bold tracking-widest opacity-70 ${team.color}`}>Média KD</p>
                      <p className="text-xl font-mono font-bold text-white">{team.avgKd.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-800">
                    {team.players.map(p => (
                      <div key={p.playerId} className="p-4 flex justify-between items-center hover:bg-white/5 transition-colors">
                        <span className="font-bold text-slate-200">{p.nick}</span>
                        <span className="text-sm font-mono text-slate-500 bg-slate-950 px-2 py-1 rounded border border-slate-800">KD {p.kd.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
           </div>

           <div className="flex justify-center mt-8 gap-4">
             <button onClick={() => { 
                const currentSelection = [...selectedPlayerIds];
                setSelectedPlayerIds([]);
                setTimeout(() => {
                  setSelectedPlayerIds(currentSelection);
                  generateTeams(); 
                }, 10);
               }} 
               className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-6 py-3 rounded-xl font-bold border border-slate-700 transition-all"
             >
               Re-processar (Mesmos Jogadores)
             </button>
             <button onClick={() => setResultTeams(null)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all">
               Novo Sorteio
             </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default TeamBalancer;
