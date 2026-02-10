import React, { useState, useMemo } from 'react';
import { FullRankingEntry } from '../types';

interface RankingTableProps {
  data: FullRankingEntry[];
}

interface RankingRow extends FullRankingEntry {
  score: number;
  rank: string;
  rankColor: string;
  rankImage: string;
}

type SortKey = keyof RankingRow;
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

/* =========================
   SCORE (KD DOMINANTE)
========================= */
const calculateScore = (player: FullRankingEntry): number => {
  if (player.matches < 3) return 0;

  const kd = player.deaths === 0 ? player.kills : player.kills / player.deaths;
  const kpm = player.kills / player.matches;
  const apm = player.assists / player.matches;

  const cappedKD = Math.min(kd, 2.5);
  const cappedKPM = Math.min(kpm, 1.5);
  const cappedAPM = Math.min(apm, 1.2);

  let score =
    (cappedKD * 700) +
    (cappedKPM * 300) +
    (cappedAPM * 100) +
    (Math.log10(player.matches) * 50);

  // Penalização KD baixo
  if (cappedKD < 0.8) score *= 0.65;
  else if (cappedKD < 1.0) score *= 0.8;
  else if (cappedKD < 1.2) score *= 0.95;

  return Math.round(score);
};

/* =========================
   RANKS (CSGO STYLE)
========================= */
const getRankInfo = (score: number, kd: number) => {
  if (score <= 300) return { label: 'Prata I', color: 'text-slate-400', img: '/ranks/prata1.png' };
  if (score <= 450) return { label: 'Prata II', color: 'text-slate-400', img: '/ranks/prata2.png' };
  if (score <= 600) return { label: 'Prata III', color: 'text-slate-300', img: '/ranks/prata3.png' };
  if (score <= 750) return { label: 'Prata IV', color: 'text-slate-300', img: '/ranks/prata4.png' };
  if (score <= 900) return { label: 'Prata Elite', color: 'text-slate-200', img: '/ranks/prata_elite.png' };
  if (score <= 1100 || kd < 0.95) return { label: 'Prata Elite Mestre', color: 'text-slate-100', img: '/ranks/prata_elite_mestre.png' };

  if (score <= 1300 && kd >= 1.0) return { label: 'Ouro I', color: 'text-yellow-500', img: '/ranks/ouro1.png' };
  if (score <= 1500 && kd >= 1.05) return { label: 'Ouro II', color: 'text-yellow-400', img: '/ranks/ouro2.png' };
  if (score <= 1700 && kd >= 1.1) return { label: 'Ouro III', color: 'text-yellow-300', img: '/ranks/ouro3.png' };
  if (score <= 1900 && kd >= 1.15) return { label: 'Ouro Mestre', color: 'text-yellow-200', img: '/ranks/ouro_mestre.png' };

  if (score <= 2150 && kd >= 1.2) return { label: 'Mestre Guardião I', color: 'text-blue-400', img: '/ranks/mg1.png' };
  if (score <= 2400 && kd >= 1.25) return { label: 'Mestre Guardião II', color: 'text-blue-500', img: '/ranks/mg2.png' };
  if (score <= 2650 && kd >= 1.3) return { label: 'Mestre Guardião Elite', color: 'text-blue-600', img: '/ranks/mg_elite.png' };
  if (score <= 2900 && kd >= 1.35) return { label: 'Distinto Mestre Guardião', color: 'text-indigo-400', img: '/ranks/dmg.png' };

  if (score <= 3200 && kd >= 1.4) return { label: 'Guardião Lendário', color: 'text-purple-400', img: '/ranks/le.png' };
  if (score <= 3500 && kd >= 1.45) return { label: 'Águia Lendária', color: 'text-purple-300', img: '/ranks/lem.png' };
  if (score <= 3800 && kd >= 1.5) return { label: 'Águia Lendária Mestre', color: 'text-purple-200', img: '/ranks/lem.png' };
  if (score <= 4200 && kd >= 1.55) return { label: 'Supremo Mestre', color: 'text-pink-400', img: '/ranks/supreme.png' };

  return { label: 'Global Elite', color: 'text-red-500 animate-pulse', img: '/ranks/global.png' };
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

  const sortedData = useMemo<RankingRow[]>(() => {
    return data
      .filter(p => p.matches >= 3)
      .map(player => {
        const score = calculateScore(player);
        const rank = getRankInfo(score, player.kd);
        return {
          ...player,
          score,
          rank: rank.label,
          rankColor: rank.color,
          rankImage: rank.img
        };
      })
      .sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
  }, [data, sortConfig]);

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800/50 shadow-2xl">
      <table className="w-full">
        <thead className="bg-slate-900 text-sm uppercase">
          <tr>
            <th className="px-6 py-4">#</th>
            <th className="px-6 py-4">Nick</th>
            <th className="px-6 py-4">Patente</th>
            <th className="px-6 py-4">KD</th>
            <th className="px-6 py-4">Partidas</th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((p, i) => (
            <tr key={p.id} className="hover:bg-slate-700/40">
              <td className="px-6 py-4">{i + 1}</td>
              <td className="px-6 py-4 font-bold">{p.nick}</td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <img src={p.rankImage} alt={p.rank} className="w-8 h-8" />
                  <span className={`font-bold ${p.rankColor}`}>{p.rank}</span>
                </div>
              </td>
              <td className="px-6 py-4">{p.kd.toFixed(2)}</td>
              <td className="px-6 py-4">{p.matches}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RankingTable;
