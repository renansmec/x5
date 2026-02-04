
import React from 'react';
import { FullRankingEntry } from '../types';

interface RankingTableProps {
  data: FullRankingEntry[];
}

const RankingTable: React.FC<RankingTableProps> = ({ data }) => {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800/50 backdrop-blur-sm shadow-2xl">
      <table className="w-full text-left border-collapse">
        <thead className="bg-slate-900/80 text-slate-300 font-gaming uppercase tracking-wider text-sm">
          <tr>
            <th className="px-6 py-4">#</th>
            <th className="px-6 py-4">Nick</th>
            <th className="px-6 py-4">Partidas</th>
            <th className="px-6 py-4 text-emerald-400">Vítimas</th>
            <th className="px-6 py-4 text-rose-400">Mortes</th>
            <th className="px-6 py-4 text-sky-400">Assists</th>
            <th className="px-6 py-4 text-orange-400">Dano</th>
            <th className="px-6 py-4 text-yellow-400" title="Cálculo: Vítimas / Mortes">K/D</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {data.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-6 py-10 text-center text-slate-500 italic">
                Nenhum dado encontrado para esta temporada.
              </td>
            </tr>
          ) : (
            data.map((player, index) => (
              <tr 
                key={player.id} 
                className="hover:bg-slate-700/50 transition-colors group cursor-default"
              >
                <td className="px-6 py-4 font-gaming text-lg">
                  <span className={`
                    w-8 h-8 flex items-center justify-center rounded-full
                    ${index === 0 ? 'bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500' : ''}
                    ${index === 1 ? 'bg-slate-400/20 text-slate-300 ring-1 ring-slate-400' : ''}
                    ${index === 2 ? 'bg-orange-700/20 text-orange-400 ring-1 ring-orange-700' : ''}
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
                    ${player.kd >= 1.5 ? 'bg-emerald-500/20 text-emerald-400' : 
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
