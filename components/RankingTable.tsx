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

  if (effectiveKD < 0.65) return { label: '', img: 'https://images.steamusercontent.com/ugc/271719542637737111/E5D752FC990F3BA8C61B4DAD36DAD3AD3C2880FB/' };
  if (effectiveKD < 0.75) return { label: '', img: 'https://images.steamusercontent.com/ugc/271719542637737502/DA712FD82350136686876E99319FA4F3013670FE/' };
  if (effectiveKD < 0.85) return { label: '', img: 'https://images.steamusercontent.com/ugc/271719542637737895/5A95E18A1DFDBFFDE14B755DA2292BD066DC1A2A/' };
  if (effectiveKD < 0.95) return { label: '', img: 'https://images.steamusercontent.com/ugc/271719542637738317/A51B1B1A10DFB1A7C15EC7408A69CE122FD1B813/' };
  if (effectiveKD < 1.05) return { label: '', img: 'https://images.steamusercontent.com/ugc/271719542637748144/BA9D7AF20B38560497BE4AA1E162CEAFAB1D875B/' };
  if (effectiveKD < 1.15) return { label: '', img: 'https://images.steamusercontent.com/ugc/271719542637749101/60A2DCC2B8ED2966CC7B356BFC83EBFE015B48A5/' };

  if (effectiveKD < 1.22) return { label: '', img: 'https://images.steamusercontent.com/ugc/271719542637749917/D48D04EF6C33A5AB14DBC7CFFE6A33E1C0B16990/' };
  if (effectiveKD < 1.28) return { label: '', img: 'https://images.steamusercontent.com/ugc/271719542637750154/4A7542CEC239EB63BA73443E79F2583257C2661E/' };
  if (effectiveKD < 1.34) return { label: '', img: 'https://images.steamusercontent.com/ugc/271719542637750367/5CE20907BD84F5AF8C1201D3395F324C46E61C33/' };
  if (effectiveKD < 1.40) return { label: '', img: 'https://images.steamusercontent.com/ugc/271719542637750595/9CE0E1BACB20382FD7F39936C0430FE33EBD8D40/' };

  if (effectiveKD < 1.46) return { label: '', img: 'https://images.steamusercontent.com/ugc/271719542637750828/F1ED0112981F38EF7C4A06751C616E4336EC313A/' };
  if (effectiveKD < 1.52) return { label: '', img: 'https://images.steamusercontent.com/ugc/271719542637751051/92BED3494C63F3B87A8DF44BECC2929BD80C0BD1/' };
  if (effectiveKD < 1.58) return { label: '', img: 'https://images.steamusercontent.com/ugc/271719542637751306/4C585D32170F83C489CC3CA06FDF977C951E9CCB/' };
  if (effectiveKD < 1.64) return { label: '', img: 'https://images.steamusercontent.com/ugc/271719542637751587/2272F38DA9B1A3A3894EEA08E8E864306E070601/' };

  // if (effectiveKD < 1.70) return { label: 'Guardião Lendário', img: '/ranks/le.png' };
  if (effectiveKD < 1.78) return { label: '', img: 'https://images.steamusercontent.com/ugc/271719542637751832/8FE33BB2E3C2DA906C3D2BED5306B130B3F21935/' };
  if (effectiveKD < 1.86) return { label: '', img: 'https://images.steamusercontent.com/ugc/271719542637752050/FFAB325D97A712B4C587788494391D05B9C1E1CE/' };

  if (effectiveKD < 1.95) return { label: '', img: 'https://images.steamusercontent.com/ugc/271719542637752364/9239E876A15EA2E3153D708529C6C4FB102B5D43/' };

  return { label: '', img: 'https://images.steamusercontent.com/ugc/271719542637752589/1362813B1F6CBE2C8DF3FA19EB629EA13E14CC0A/' };
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
