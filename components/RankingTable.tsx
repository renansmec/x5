
import React, { useState, useMemo, useEffect } from 'react';
import { FullRankingEntry } from '../types';
import { getRankFromKD } from '../utils';

interface RankingTableProps {
  data: FullRankingEntry[];
  onPlayerClick?: (playerId: string) => void;
}

type SortKey = keyof FullRankingEntry;
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

const RankingTable: React.FC<RankingTableProps> = ({ data, onPlayerClick }) => {
  // Estado padrão: Ordenado por KD descendente (maior para o menor)
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'kd',
    direction: 'desc',
  });

  const [trendMap, setTrendMap] = useState<Record<string, number>>({});

  useEffect(() => {
    // Calcula o ranking atual padrão (por KD desc)
    const currentDefaultSorted = [...data].sort((a, b) => b.kd - a.kd);
    const currentRankingMap: Record<string, number> = {};
    currentDefaultSorted.forEach((p, index) => {
      currentRankingMap[p.playerId] = index + 1;
    });

    const storedDataHash = localStorage.getItem('rankingDataHash');
    const currentDataHash = JSON.stringify(data);

    let prevMap: Record<string, number> = JSON.parse(localStorage.getItem('previousRanking') || '{}');
    let currMap: Record<string, number> = JSON.parse(localStorage.getItem('currentRanking') || '{}');

    if (storedDataHash !== currentDataHash) {
      if (Object.keys(currMap).length > 0) {
        prevMap = currMap;
        localStorage.setItem('previousRanking', JSON.stringify(prevMap));
      } else {
        // Primeira vez carregando, define prevMap igual ao atual para não mostrar todos como NEW
        prevMap = currentRankingMap;
        localStorage.setItem('previousRanking', JSON.stringify(prevMap));
      }
      currMap = currentRankingMap;
      localStorage.setItem('currentRanking', JSON.stringify(currMap));
      localStorage.setItem('rankingDataHash', currentDataHash);
    } else {
      // Se não mudou, mas prevMap está vazio por algum motivo, usa o currMap
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
  }, [data]);

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
      <span className={`ml-2 inline-flex flex-col h-3 w-3 justify-center items-center transition-opacity ${isActive ? 'opacity-100' : 'opacity-20 group-hover:opacity-50'}`}>
        {/* Seta para cima */}
        <svg 
          className={`w-2 h-2 -mb-[2px] ${isActive && sortConfig.direction === 'asc' ? 'text-emerald-400' : 'text-slate-400'}`} 
          fill="currentColor" viewBox="0 0 24 24"
        >
          <path d="M12 4l-8 8h16l-8-8z" />
        </svg>
        {/* Seta para baixo */}
        <svg 
          className={`w-2 h-2 -mt-[2px] ${isActive && sortConfig.direction === 'desc' ? 'text-emerald-400' : 'text-slate-400'}`} 
          fill="currentColor" viewBox="0 0 24 24"
        >
          <path d="M12 20l8-8H4l8 8z" />
        </svg>
      </span>
    );
  };

  const renderHeader = (label: string, key: SortKey, colorClass: string = "text-slate-300", align: string = "text-left", title?: string) => (
    <th 
      className={`px-6 py-4 cursor-pointer group select-none transition-colors hover:bg-slate-800/50 ${colorClass} ${align}`}
      onClick={() => handleSort(key)}
      title={title}
    >
      <div className={`flex items-center ${align === "text-center" ? "justify-center" : "justify-start"}`}>
        {label}
        <SortIcon columnKey={key} />
      </div>
    </th>
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800/50 backdrop-blur-sm shadow-2xl">
      <table className="w-full text-left border-collapse">
        <thead className="bg-slate-900/80 font-gaming uppercase tracking-wider text-sm">
          <tr>
            <th className="px-6 py-4 text-slate-500 w-16">#</th>
            <th className="px-6 py-4 text-slate-500 text-center w-20">Trend</th>
            {renderHeader("Nick", "nick", "text-slate-300")}
            {renderHeader("Patente", "kd", "text-amber-400")}
            {renderHeader("Part.", "matches", "text-slate-300")}
            {renderHeader("Kills", "kills", "text-emerald-400")}
            {renderHeader("Deaths", "deaths", "text-rose-400")}
            {renderHeader("Assists", "assists", "text-sky-400")}
            {renderHeader("Dano", "damage", "text-orange-400")}
            {renderHeader("%HS", "hsPercent", "text-purple-400")}
            {renderHeader("K/D", "kd", "text-yellow-400", "text-left", "Cálculo: Vítimas / Mortes")}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {sortedData.length === 0 ? (
            <tr>
              <td colSpan={10} className="px-6 py-10 text-center text-slate-500 italic">
                {data.length > 0 
                  ? "Nenhum jogador elegível (mínimo 3 partidas)."
                  : "Nenhum dado encontrado para esta temporada."}
              </td>
            </tr>
          ) : (
            sortedData.map((player, index) => (
              <tr 
                key={player.id} 
                className="hover:bg-slate-700/50 transition-colors group cursor-pointer"
                onClick={() => onPlayerClick && onPlayerClick(player.playerId)}
              >
                <td className="px-6 py-4 font-gaming text-lg">
                  <span className={`
                    w-8 h-8 flex items-center justify-center rounded-full text-sm
                    ${index === 0 && sortConfig.key === 'kd' && sortConfig.direction === 'desc' ? 'bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500' : ''}
                    ${index === 1 && sortConfig.key === 'kd' && sortConfig.direction === 'desc' ? 'bg-slate-400/20 text-slate-300 ring-1 ring-slate-400' : ''}
                    ${index === 2 && sortConfig.key === 'kd' && sortConfig.direction === 'desc' ? 'bg-orange-700/20 text-orange-400 ring-1 ring-orange-700' : ''}
                    ${(index > 2 || sortConfig.key !== 'kd' || sortConfig.direction !== 'desc') ? 'text-slate-500' : ''}
                  `}>
                    {index + 1}
                  </span>
                </td>
                <td className="px-6 py-4">
                    {/* INDICADOR DE TENDÊNCIA (TREND) */}
                    <div className="w-full flex justify-center">
                        {player.trend === 999 ? (
                            <span className="text-[9px] bg-emerald-900 text-emerald-300 px-1 rounded animate-pulse">NEW</span>
                        ) : player.trend && player.trend > 0 ? (
                            <span className="text-emerald-500 text-[10px] font-bold flex flex-col items-center animate-in slide-in-from-bottom-2">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 15l7-7 7 7"></path></svg>
                                <span className="-mt-1">{player.trend}</span>
                            </span>
                        ) : player.trend && player.trend < 0 ? (
                            <span className="text-rose-500 text-[10px] font-bold flex flex-col items-center animate-in slide-in-from-top-2">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                                <span className="-mt-1">{Math.abs(player.trend)}</span>
                            </span>
                        ) : (
                            <span className="text-slate-600 text-lg leading-none">-</span>
                        )}
                    </div>
                </td>
                <td className="px-6 py-4 font-bold text-slate-100 group-hover:text-purple-400 transition-colors underline decoration-transparent group-hover:decoration-purple-400 underline-offset-4">
                  {player.nick}
                </td>
                <td className="px-6 py-4">
                  <span className="flex items-center gap-2 group/tooltip relative">
                    <img 
                      src={`/patentes/${getRankFromKD(player.kd).image}`} 
                      alt={getRankFromKD(player.kd).name} 
                      className="h-8 object-contain"
                    />
                    <span className="absolute left-10 scale-0 transition-transform bg-slate-900 border border-slate-700 text-xs text-white px-2 py-1 rounded group-hover/tooltip:scale-100 z-10 whitespace-nowrap">
                      {getRankFromKD(player.kd).name}
                    </span>
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-300">{player.matches}</td>
                <td className="px-6 py-4 text-emerald-400 font-medium">{player.kills}</td>
                <td className="px-6 py-4 text-rose-400 font-medium">{player.deaths}</td>
                <td className="px-6 py-4 text-sky-400">{player.assists}</td>
                <td className="px-6 py-4 text-orange-400 font-medium">
                  {player.damage.toLocaleString('pt-BR')}
                </td>
                <td className="px-6 py-4 text-purple-400 font-medium">
                  {player.hsPercent || 0}%
                </td>
                <td className="px-6 py-4">
                  <span className={`
                    px-2 py-1 rounded font-bold
                    ${player.kd >= 2.5 ? 'bg-emerald-500/20 text-emerald-400' : 
                      player.kd >= 1.0 ? 'bg-blue-500/20 text-blue-400' : 
                      'bg-rose-500/20 text-rose-400'}
                  `}>
                    {player.kd.toFixed(2)}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default RankingTable;
