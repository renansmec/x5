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

/* =========================
   CÁLCULO DE RANK (AJUSTADO)
   KD dominante + estabilidade
========================= */
const getRankByKD = (kd: number, matches: number) => {
  if (matches < 5) {
    return { label: 'Sem Rank', img: '/ranks/unranked.png' };
  }

  const stability =
    matches >= 100 ? 0.08 :
    matches >= 50  ? 0.05 :
    matches >= 20  ? 0.03 : 0;

  const effectiveKD = kd + stability;

  if (effectiveKD < 0.65) return { label: 'Prata I', img: '/ranks/prata1.png' };
  if (effectiveKD < 0.75) return { label: 'Prata II', img: '/ranks/prata2.png' };
  if (effectiveKD < 0.85) return { label: 'Prata III', img: '/ranks/prata3.png' };
  if (effectiveKD < 0.95) return { label: 'Prata IV', img: '/ranks/prata4.png' };
  if (effectiveKD < 1.05) return { label: 'Prata Elite', img: '/ranks/prata_elite.png' };
  if (effectiveKD < 1.15) return { label: 'Prata Elite Mestre', img: '/ranks/prata_elite_mestre.png' };

  if (effectiveKD < 1.22) return { label: 'Ouro I', img: '/ranks/ouro1.png' };
  if (effectiveKD < 1.28) return { label: 'Ouro II', img: '/ranks/ouro2.png' };
  if (effectiveKD < 1.34) return { label: 'Ouro III', img: '/ranks/ouro3.png' };
  if (effectiveKD < 1.40) return { label: 'Ouro Mestre', img: '/ranks/ouro_mestre.png' };

  if (effectiveKD < 1.46) return { label: 'Mestre Guardião I', img: '/ranks/mg1.png' };
  if (effectiveKD < 1.52) return { label: 'Mestre Guardião II', img: '/ranks/mg2.png' };
  if (effectiveKD < 1.58) return { label: 'Mestre Guardião Elite', img: '/ranks/mg_elite.png' };
  if (effectiveKD < 1.64) return { label: 'Distinto Mestre Guardião', img: '/ranks/dmg.png' };

  if (effectiveKD < 1.70) return { label: 'Guardião Lendário', img: '/ranks/le.png' };
  if (effectiveKD < 1.78) return { label: 'Águia Lendária', img: '/ranks/lem.png' };
  if (effectiveKD < 1.86) return { label: 'Águia Lendária Mestre', img: '/ranks/lem.png' };

  if (effectiveKD < 1.95) return { label: 'Supremo Mestre', img: '/ranks/supreme.png' };

  return { label: 'Global Elite', img: '/ranks/global.png' };
};

const RankingTable: React.FC<RankingTableProps> = ({ data }) => {
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
    const filtered = data.filter(player => player.matches >= 3);
    const sorted = [...filtered];

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
        <svg
          className={`w-2 h-2 -mb-[2px] ${isActive && sortConfig.direction === 'asc' ? 'text-emerald-400' : 'text-slate-400'}`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 4l-8 8h16l-8-8z" />
        </svg>
        <svg
          className={`w-2 h-2 -mt-[2px] ${isActive && sortConfig.direction === 'desc' ? 'text-emerald-400' : 'text-slate-400'}`}
          fill="currentColor"
          viewBox="0 0 24 24"
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
            {renderHeader("Nick", "nick")}
            {renderHeader("Partidas", "matches")}
            {renderHeader("Vítimas", "kills")}
            {renderHeader("Mortes", "deaths")}
            {renderHeader("Assists", "assists")}
            {renderHeader("Dano", "damage")}
            <th className="px-6 py-4 text-purple-400">Rank</th>
            {renderHeader("K/D", "kd")}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {sortedData.map((player, index) => {
            const rank = getRankByKD(player.kd, player.matches);

            return (
              <tr key={player.id} className="hover:bg-slate-700/50 transition-colors">
                <td className="px-6 py-4">{index + 1}</td>
                <td className="px-6 py-4 font-bold">{player.nick}</td>
                <td className="px-6 py-4">{player.matches}</td>
                <td className="px-6 py-4 text-emerald-400">{player.kills}</td>
                <td className="px-6 py-4 text-rose-400">{player.deaths}</td>
                <td className="px-6 py-4 text-sky-400">{player.assists}</td>
                <td className="px-6 py-4 text-orange-400">{player.damage.toLocaleString('pt-BR')}</td>

                {/* COLUNA NOVA: RANK */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <img src={rank.img} alt={rank.label} className="w-6 h-6 object-contain" />
                    <span className="text-slate-300 text-sm font-medium">{rank.label}</span>
                  </div>
                </td>

                {/* K/D ORIGINAL (INALTERADO) */}
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default RankingTable;
