import React, { useState, useMemo, useEffect } from 'react';
import { FullRankingEntry } from '../types';
import { getRankFromScore } from '../utils';

interface RankingTableProps {
  data: FullRankingEntry[];
  onPlayerClick?: (playerId: string) => void;
  seasonId?: string;
}

type SortKey = keyof FullRankingEntry;
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

const RankingTable: React.FC<RankingTableProps> = ({ data, onPlayerClick, seasonId = "default" }) => {
  // Estado padrão: Ordenado por Rating X5 descendente (maior para o menor)
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'score',
    direction: 'desc',
  });

  const [trendMap, setTrendMap] = useState<Record<string, number>>({});
  const [showFormulaModal, setShowFormulaModal] = useState(false);

  useEffect(() => {
    // Calcula o ranking atual padrão (por score/Rating X5 desc)
    const currentDefaultSorted = [...data].sort((a, b) => (b.score ?? b.kd) - (a.score ?? a.kd));
    const currentRankingMap: Record<string, number> = {};
    currentDefaultSorted.forEach((p, index) => {
      currentRankingMap[p.playerId] = index + 1;
    });

    const storedDataHash = localStorage.getItem(`rankingDataHash_${seasonId}`);
    const currentDataHash = JSON.stringify(data.map(d => ({ id: d.playerId, score: d.score, kd: d.kd, matches: d.matches })));

    let prevMap: Record<string, number> = JSON.parse(localStorage.getItem(`previousRanking_${seasonId}`) || '{}');
    let currMap: Record<string, number> = JSON.parse(localStorage.getItem(`currentRanking_${seasonId}`) || '{}');

    if (storedDataHash !== currentDataHash) {
      if (Object.keys(currMap).length > 0) {
        prevMap = currMap;
        localStorage.setItem(`previousRanking_${seasonId}`, JSON.stringify(prevMap));
      } else {
        prevMap = currentRankingMap;
        localStorage.setItem(`previousRanking_${seasonId}`, JSON.stringify(prevMap));
      }
      currMap = currentRankingMap;
      localStorage.setItem(`currentRanking_${seasonId}`, JSON.stringify(currMap));
      localStorage.setItem(`rankingDataHash_${seasonId}`, currentDataHash);
    } else {
      if (Object.keys(prevMap).length === 0 && Object.keys(currMap).length > 0) {
        prevMap = currMap;
      }
    }

    const newTrendMap: Record<string, number> = {};
    Object.keys(currentRankingMap).forEach(playerId => {
      if (prevMap[playerId] !== undefined) {
        newTrendMap[playerId] = prevMap[playerId] - currentRankingMap[playerId];
      } else {
        newTrendMap[playerId] = 999; // NEW
      }
    });

    setTrendMap(newTrendMap);
  }, [data, seasonId]);

  const handleSort = (key: SortKey) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const sortedData = useMemo(() => {
    const sorted = [...data].map(player => ({
      ...player,
      trend: trendMap[player.playerId] || 0
    }));
    
    return sorted.sort((a, b) => {
      const aValue = a[sortConfig.key] ?? 0;
      const bValue = b[sortConfig.key] ?? 0;

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig, trendMap]);

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    const isActive = sortConfig.key === columnKey;
    
    return (
      <span className={`ml-1.5 inline-flex flex-col h-3 w-3 justify-center items-center transition-opacity ${isActive ? 'opacity-100' : 'opacity-20 group-hover:opacity-60'}`}>
        <svg 
          className={`w-2 h-2 -mb-[2px] ${isActive && sortConfig.direction === 'asc' ? 'text-purple-400' : 'text-slate-400'}`} 
          fill="currentColor" viewBox="0 0 24 24"
        >
          <path d="M12 4l-8 8h16l-8-8z" />
        </svg>
        <svg 
          className={`w-2 h-2 -mt-[2px] ${isActive && sortConfig.direction === 'desc' ? 'text-purple-400' : 'text-slate-400'}`} 
          fill="currentColor" viewBox="0 0 24 24"
        >
          <path d="M12 20l8-8H4l8 8z" />
        </svg>
      </span>
    );
  };

  const renderHeader = (label: string, key: SortKey, colorClass: string = "text-slate-300", align: string = "text-left", title?: string) => (
    <th 
      className={`px-4 py-4 cursor-pointer group select-none transition-colors hover:bg-slate-800/60 ${colorClass} ${align}`}
      onClick={() => handleSort(key)}
      title={title}
    >
      <div className={`flex items-center ${align === "text-center" ? "justify-center" : align === "text-right" ? "justify-end" : "justify-start"}`}>
        <span>{label}</span>
        <SortIcon columnKey={key} />
      </div>
    </th>
  );

  return (
    <div className="space-y-3">
      {/* Barra de explicação e botão do modal de regras */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-purple-900/30 via-slate-900/50 to-blue-900/30 p-3.5 rounded-xl border border-purple-500/20">
        <div className="flex items-center gap-2.5">
          <span className="p-1.5 bg-purple-500/20 text-purple-300 rounded-lg text-sm">⚖️</span>
          <div>
            <p className="text-xs font-bold text-white tracking-wide">
              Sistema de Patentes Equilibrado (Rating X5)
            </p>
            <p className="text-[11px] text-slate-400">
              Combina KDA (35%), Dano Médio (25%), Vitórias (25%) e %HS (15%) com calibração por partidas.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowFormulaModal(true)}
          className="text-xs font-bold text-purple-300 hover:text-purple-200 bg-purple-600/20 hover:bg-purple-600/30 px-3 py-1.5 rounded-lg border border-purple-500/30 transition-all flex items-center gap-1.5 whitespace-nowrap self-end sm:self-auto"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Ver Fórmula Detalhada
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800/50 backdrop-blur-sm shadow-2xl">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead className="bg-slate-900/90 font-gaming uppercase tracking-wider text-xs">
            <tr>
              <th className="px-4 py-4 text-slate-500 w-12 text-center">#</th>
              <th className="px-3 py-4 text-slate-500 text-center w-16">Tend.</th>
              {renderHeader("Nick", "nick", "text-slate-200")}
              {renderHeader("Patente", "score", "text-amber-400", "text-center", "Patente definida pelo Rating X5 equilibrado")}
              {renderHeader("Rating", "score", "text-purple-300", "text-left", "Pontuação equilibrada de desempenho")}
              {renderHeader("Part.", "matches", "text-slate-400", "text-center")}
              {renderHeader("V / D (% Win)", "winRate", "text-emerald-400", "text-left", "Vitórias, Derrotas e Taxa de Vitória")}
              {renderHeader("K/D", "kd", "text-yellow-400", "text-left", "Vítimas / Mortes")}
              {renderHeader("Kills", "kills", "text-emerald-400")}
              {renderHeader("Deaths", "deaths", "text-rose-400")}
              {renderHeader("Assists", "assists", "text-sky-400")}
              {renderHeader("D.M.", "damagePerMatch", "text-orange-400", "text-left", "Dano médio por partida")}
              {renderHeader("%HS", "hsPercent", "text-purple-400")}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/60 font-mono">
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={13} className="px-6 py-10 text-center text-slate-500 italic font-sans">
                  {data.length > 0 
                    ? "Nenhum jogador elegível."
                    : "Nenhum dado encontrado para esta temporada."}
                </td>
              </tr>
            ) : (
              sortedData.map((player, index) => {
                const patentInfo = player.patent || getRankFromScore(player.score ?? player.kd);
                const scoreValue = player.score ?? player.kd;
                const isDefaultSort = sortConfig.key === 'score' && sortConfig.direction === 'desc';

                return (
                  <tr 
                    key={player.id} 
                    className="hover:bg-slate-700/40 transition-colors group cursor-pointer"
                    onClick={() => onPlayerClick && onPlayerClick(player.playerId)}
                  >
                    <td className="px-4 py-3.5 font-gaming text-center">
                      <span className={`
                        w-7 h-7 mx-auto flex items-center justify-center rounded-full text-xs font-bold
                        ${index === 0 && isDefaultSort ? 'bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500' : ''}
                        ${index === 1 && isDefaultSort ? 'bg-slate-400/20 text-slate-300 ring-1 ring-slate-400' : ''}
                        ${index === 2 && isDefaultSort ? 'bg-orange-700/20 text-orange-400 ring-1 ring-orange-700' : ''}
                        ${(index > 2 || !isDefaultSort) ? 'text-slate-500' : ''}
                      `}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="w-full flex justify-center">
                        {player.trend === 999 ? (
                          <span className="text-[9px] bg-emerald-900 text-emerald-300 px-1 rounded animate-pulse font-sans">NEW</span>
                        ) : player.trend && player.trend > 0 ? (
                          <span className="text-emerald-500 text-[10px] font-bold flex flex-col items-center">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 15l7-7 7 7"></path></svg>
                            <span className="-mt-1">{player.trend}</span>
                          </span>
                        ) : player.trend && player.trend < 0 ? (
                          <span className="text-rose-500 text-[10px] font-bold flex flex-col items-center">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                            <span className="-mt-1">{Math.abs(player.trend)}</span>
                          </span>
                        ) : (
                          <span className="text-slate-600 text-sm leading-none">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-bold font-sans text-slate-100 group-hover:text-purple-400 transition-colors">
                      <div className="flex items-center gap-2.5">
                        {player.avatarUrl ? (
                          <div className="h-7 w-7 rounded-full overflow-hidden border border-slate-700 bg-slate-800 flex-shrink-0">
                            <img 
                              src={player.avatarUrl} 
                              alt={player.nick} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                e.currentTarget.parentElement!.innerHTML = `<span class="flex items-center justify-center w-full h-full bg-gradient-to-br from-purple-600 to-blue-500 text-[10px] font-gaming font-bold text-white">${player.nick.substring(0, 2).toUpperCase()}</span>`;
                              }}
                            />
                          </div>
                        ) : (
                          <div className="h-7 w-7 rounded-full flex-shrink-0 bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center text-[10px] font-gaming font-bold text-white border border-slate-700">
                            {player.nick.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="truncate max-w-[130px] sm:max-w-none">{player.nick}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center group/tooltip relative">
                        <img 
                          src={`/patentes/${patentInfo.image}`} 
                          alt={patentInfo.name} 
                          title={patentInfo.name}
                          className="h-8 max-w-[56px] object-contain drop-shadow transition-transform group-hover:scale-110"
                        />
                        <span className="absolute left-1/2 -translate-x-1/2 -top-8 scale-0 transition-transform bg-slate-900 border border-slate-700 text-xs text-white px-2.5 py-1 rounded-lg group-hover/tooltip:scale-100 z-30 whitespace-nowrap shadow-xl pointer-events-none">
                          {patentInfo.name} &bull; Rating {scoreValue.toFixed(2)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`
                          px-2 py-0.5 rounded-md font-bold text-xs
                          ${scoreValue >= 1.80 ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40' :
                            scoreValue >= 1.40 ? 'bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/40' :
                            scoreValue >= 1.05 ? 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/40' :
                            'bg-slate-700/40 text-slate-400'}
                        `}>
                          ⭐ {scoreValue.toFixed(2)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center text-slate-300 font-sans">{player.matches}</td>
                    <td className="px-4 py-3.5 text-slate-300">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-200">
                          <span className="text-emerald-400">{player.wins ?? 0}V</span> - <span className="text-rose-400">{player.losses ?? 0}D</span>
                        </span>
                        <span className={`text-[11px] font-sans ${(player.winRate ?? 0) >= 60 ? 'text-emerald-400 font-bold' : (player.winRate ?? 0) >= 40 ? 'text-slate-400' : 'text-rose-400'}`}>
                          {player.winRate ?? 0}% win
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`
                        px-2 py-0.5 rounded font-bold
                        ${player.kd >= 2.0 ? 'bg-emerald-500/20 text-emerald-400' : 
                          player.kd >= 1.0 ? 'bg-blue-500/20 text-blue-400' : 
                          'bg-rose-500/20 text-rose-400'}
                      `}>
                        {player.kd.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-emerald-400 font-medium">{player.kills}</td>
                    <td className="px-4 py-3.5 text-rose-400 font-medium">{player.deaths}</td>
                    <td className="px-4 py-3.5 text-sky-400">{player.assists}</td>
                    <td className="px-4 py-3.5 text-orange-400 font-medium">
                      <div className="flex flex-col">
                        <span>{player.damagePerMatch.toLocaleString('pt-BR')}</span>
                        <span className="text-[10px] text-slate-500 font-sans">tot: {player.damage.toLocaleString('pt-BR')}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-purple-400 font-medium">
                      {player.hsPercent || 0}%
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal explicativo do Sistema Equilibrado */}
      {showFormulaModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 max-w-2xl w-full rounded-2xl p-6 shadow-2xl relative space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚖️</span>
                <div>
                  <h3 className="font-gaming text-xl font-bold text-white">Como Funciona o Novo Rank Equilibrado?</h3>
                  <p className="text-xs text-slate-400">Por que o K/D puro gerava distorções e como o Rating X5 resolve isso</p>
                </div>
              </div>
              <button 
                onClick={() => setShowFormulaModal(false)}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-slate-300">
              <div className="p-3 bg-rose-950/30 border border-rose-800/40 rounded-xl text-rose-300">
                <p className="font-bold mb-1">❌ O problema do K/D tradicional:</p>
                <p className="text-xs text-rose-200/80">
                  Um jogador que joga 1 única partida e mata 10 morrendo 2 vezes ficava com K/D 5.0 e virava Global instantaneamente.
                  Além disso, o K/D ignorava se o time venceu, o dano real causado (ADR), as assistências e a taxa de headshots.
                </p>
              </div>

              <div className="space-y-2.5">
                <p className="font-bold text-slate-100 uppercase tracking-wider text-xs font-gaming">
                  Composição dos Pesos no Rating X5:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-yellow-400">1. KDA Efetivo</span>
                      <span className="text-xs font-mono bg-yellow-900/50 text-yellow-300 px-2 py-0.5 rounded">Peso 35%</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Calcula <code>(Kills + 0.35 &times; Assists) / Mortes</code>. Recompensa quem participa dos rounds e dá suporte ao time.
                    </p>
                  </div>

                  <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-orange-400">2. Dano Médio / ADR</span>
                      <span className="text-xs font-mono bg-orange-900/50 text-orange-300 px-2 py-0.5 rounded">Peso 25%</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Mede o impacto real nos rounds (normalizado pela média de ~1.800 de dano por partida de 24 rounds).
                    </p>
                  </div>

                  <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-emerald-400">3. Taxa de Vitória</span>
                      <span className="text-xs font-mono bg-emerald-900/50 text-emerald-300 px-2 py-0.5 rounded">Peso 25%</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      O objetivo principal do jogo é vencer! Jogadores decisivos que ganham partidas sobem de patente mais rápido.
                    </p>
                  </div>

                  <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-purple-400">4. Precisão (%HS)</span>
                      <span className="text-xs font-mono bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded">Peso 15%</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Premia mecânica apurada de mira na cabeça (normalizado com base na média de 35%-40% de HS).
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-950/30 p-3 rounded-xl border border-blue-800/40 text-xs text-blue-200">
                <span className="font-bold text-blue-300">🛡️ Fator de Calibração:</span>
                <p className="mt-0.5 text-blue-200/80">
                  Jogadores com poucas partidas (menos de 5) têm um ajuste gradual de estabilidade para evitar que partidas isoladas de sorte ou azar distorçam o topo do ranking.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowFormulaModal(false)}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-5 py-2 rounded-xl text-xs transition-all"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RankingTable;
