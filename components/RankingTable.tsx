
import React, { useState, useMemo } from 'react';
import { FullRankingEntry } from '../types';

interface RankingTableProps {
  data: FullRankingEntry[];
}

type SortKey = keyof FullRankingEntry;
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

const RankingTable: React.FC<RankingTableProps> = ({ data }) => {
  // Estado padrão: Ordenado por KD descendente (maior para o menor)
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'kd',
    direction: 'desc',
  });

  const handleSort = (key: SortKey) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const sortedData = useMemo(() => {
    const sorted = [...data];
    return sorted.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

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
            {renderHeader("Nick", "nick", "text-slate-300")}
            {renderHeader("Partidas", "matches", "text-slate-300")}
            {renderHeader("Vítimas", "kills", "text-emerald-400")}
            {renderHeader("Mortes", "deaths", "text-rose-400")}
            {renderHeader("Assists", "assists", "text-sky-400")}
            {renderHeader("Dano", "damage", "text-orange-400")}
            {renderHeader("K/D", "kd", "text-yellow-400", "text-left", "Cálculo: Vítimas / Mortes")}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {sortedData.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-6 py-10 text-center text-slate-500 italic">
                Nenhum dado encontrado para esta temporada.
              </td>
            </tr>
          ) : (
            sortedData.map((player, index) => (
              <tr 
                key={player.id} 
                className="hover:bg-slate-700/50 transition-colors group cursor-default"
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
                <td className="px-6 py-4 font-bold text-slate-100 group-hover:text-blue-400 transition-colors">
                  {player.nick}
                </td>
                <td className="px-6 py-4 text-slate-300">{player.matches}</td>
                <td className="px-6 py-4 text-emerald-400 font-medium">{player.kills}</td>
                <td className="px-6 py-4 text-rose-400 font-medium">{player.deaths}</td>
                <td className="px-6 py-4 text-sky-400">{player.assists}</td>
                <td className="px-6 py-4 text-orange-400 font-medium">
                  {player.damage.toLocaleString('pt-BR')}
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
