
import React, { useState, useMemo } from 'react';
import { FullRankingEntry } from '../types';

interface RankingTableProps {
  data: FullRankingEntry[];
}

// Estende a interface original para incluir os campos calculados localmente
interface RankingRow extends FullRankingEntry {
  score: number;
  patent: string;
  patentColor: string;
}

type SortKey = keyof RankingRow;
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

// Função para obter a Patente baseada no Score
const getPatentInfo = (score: number): { label: string; color: string } => {
  if (score <= 300) return { label: 'Prata I', color: 'text-slate-400', image: 'https://images.steamusercontent.com/ugc/271719542637737111/E5D752FC990F3BA8C61B4DAD36DAD3AD3C2880FB/' };
  if (score <= 450) return { label: 'Prata II', color: 'text-slate-400' };
  if (score <= 600) return { label: 'Prata III', color: 'text-slate-300' };
  if (score <= 750) return { label: 'Prata IV', color: 'text-slate-300' };
  if (score <= 900) return { label: 'Prata Elite', color: 'text-slate-200' };
  if (score <= 1100) return { label: 'Prata Elite Mestre', color: 'text-slate-100' };
  
  if (score <= 1300) return { label: 'Ouro I', color: 'text-yellow-600', image: 'https://images.steamusercontent.com/ugc/271719542637749917/D48D04EF6C33A5AB14DBC7CFFE6A33E1C0B16990/' };
  if (score <= 1500) return { label: 'Ouro II', color: 'text-yellow-500' };
  if (score <= 1700) return { label: 'Ouro III', color: 'text-yellow-400' };
  if (score <= 1900) return { label: 'Ouro Mestre', color: 'text-yellow-300' };
  
  if (score <= 2150) return { label: 'Mestre Guardião I', color: 'text-blue-400' }; // AK I
  if (score <= 2400) return { label: 'Mestre Guardião II', color: 'text-blue-500' }; // AK II
  if (score <= 2650) return { label: 'Mestre Guardião Elite', color: 'text-blue-600' }; // AK Elite
  if (score <= 2900) return { label: 'Distinto Mestre Guardião', color: 'text-indigo-400' }; // AK Cruzada
  
  if (score <= 3200) return { label: 'Guardião Lendário', color: 'text-purple-400' }; // Xerife
  if (score <= 3500) return { label: 'Águia Lendária', color: 'text-purple-300' };
  if (score <= 3800) return { label: 'Águia Lendária Mestre', color: 'text-purple-200' };
  if (score <= 4200) return { label: 'Supremo Mestre', color: 'text-pink-400' };
  
  return { label: 'Global Elite', color: 'text-red-500 animate-pulse' };
};

const calculateScore = (player: FullRankingEntry): number => {
  if (player.matches === 0) return 0;

  // 1. Calcular métricas brutas
  const rawKD = player.deaths === 0 ? player.kills : player.kills / player.deaths;
  const rawKPM = player.kills / player.matches;
  const rawAPM = player.assists / player.matches;

  // 2. Aplicar limites máximos (Caps)
  const cappedKD = Math.min(rawKD, 2.5);
  const cappedKPM = Math.min(rawKPM, 1.5);
  const cappedAPM = Math.min(rawAPM, 1.2);

  // 3. Fórmula do score
  // Score = (KD * 400) + (KPM * 250) + (APM * 150) + (log10(partidas) * 100)
  const score = 
    (cappedKD * 400) + 
    (cappedKPM * 250) + 
    (cappedAPM * 150) + 
    (Math.log10(player.matches) * 100);

  return Math.round(score);
};

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
    // 1. Enriquecer os dados com Score e Patente
    const processedData: RankingRow[] = data.map(player => {
      const score = calculateScore(player);
      const { label, color } = getPatentInfo(score);
      return {
        ...player,
        score,
        patent: label,
        patentColor: color
      };
    });

    // 2. Filtra jogadores com menos de 3 partidas
    const filtered = processedData.filter(player => player.matches >= 3);
    
    // 3. Ordena
    return filtered.sort((a, b) => {
      // Tratamento especial para patente (ordenar por score quando clicar em patente)
      const key = sortConfig.key === 'patent' ? 'score' : sortConfig.key;
      
      const aValue = a[key];
      const bValue = b[key];

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
            {renderHeader("Patente", "patent", "text-purple-400", "text-left", "Baseado em Score (K/D, KPM, APM e Partidas)")}
            {renderHeader("Score", "score", "text-slate-500", "text-right", "Pontuação Calculada")}
            {renderHeader("Partidas", "matches", "text-slate-300", "text-center")}
            {renderHeader("K/D", "kd", "text-yellow-400", "text-center")}
            {renderHeader("Kills", "kills", "text-emerald-400", "text-center")}
            {renderHeader("Assists", "assists", "text-sky-400", "text-center")}
            {renderHeader("Dano", "damage", "text-orange-400", "text-right")}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {sortedData.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-6 py-10 text-center text-slate-500 italic">
                {data.length > 0 
                  ? "Nenhum jogador elegível (mínimo 3 partidas)."
                  : "Nenhum dado encontrado para esta temporada."}
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
                <td className={`px-6 py-4 font-gaming font-bold tracking-wide ${player.patentColor}`}>
                  {player.patent}
                </td>
                <td className="px-6 py-4 text-slate-500 font-mono text-xs text-right">
                  {player.score}
                </td>
                <td className="px-6 py-4 text-slate-300 text-center">{player.matches}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`
                    px-2 py-1 rounded font-bold
                    ${player.kd >= 1.5 ? 'bg-emerald-500/20 text-emerald-400' : 
                      player.kd >= 1.0 ? 'bg-blue-500/20 text-blue-400' : 
                      'bg-rose-500/20 text-rose-400'}
                  `}>
                    {player.kd.toFixed(2)}
                  </span>
                </td>
                <td className="px-6 py-4 text-emerald-400 font-medium text-center">{player.kills}</td>
                <td className="px-6 py-4 text-sky-400 text-center">{player.assists}</td>
                <td className="px-6 py-4 text-orange-400 font-medium text-right">
                  {player.damage.toLocaleString('pt-BR')}
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
