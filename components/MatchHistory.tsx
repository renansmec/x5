import React, { useState, useEffect } from 'react';
import { MatchRecord, Player, Season } from '../types';

interface MatchHistoryProps {
  matches: MatchRecord[];
  players: Player[];
  seasons: Season[];
  selectedSeasonId: string;
}

const MatchHistory: React.FC<MatchHistoryProps> = ({ matches, players, seasons, selectedSeasonId }) => {
  const [selectedMatch, setSelectedMatch] = useState<MatchRecord | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const matchesPerPage = 10;

  const getPlayerAvatar = (nick: string, playerId?: string) => {
    const p = players.find(player => player.id === playerId || player.nick === nick);
    return p?.avatarUrl;
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSeasonId]);

  const filteredMatches = matches
    .filter(m => m.seasonId === selectedSeasonId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalPages = Math.ceil(filteredMatches.length / matchesPerPage);
  const paginatedMatches = filteredMatches.slice(
    (currentPage - 1) * matchesPerPage,
    currentPage * matchesPerPage
  );

  if (selectedMatch) {
    const season = seasons.find(s => s.id === selectedMatch.seasonId);
    
    return (
      <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
        <button 
          onClick={() => setSelectedMatch(null)}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Voltar para o histórico
        </button>

        <div className="relative bg-slate-900/80 border border-slate-700/50 rounded-3xl p-8 mb-8 overflow-hidden shadow-2xl">
          {/* Background effects */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-emerald-500 to-rose-500"></div>
          
          <div className="flex flex-col items-center justify-center gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <span className="px-4 py-1.5 bg-slate-800 border border-slate-700 rounded-full text-sm font-bold text-slate-300 uppercase tracking-widest shadow-inner">
                {selectedMatch.map}
              </span>
              <span className="text-slate-500 text-sm font-medium">
                {new Date(selectedMatch.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
            </div>

            <div className="flex items-center justify-center gap-4 md:gap-8 w-full max-w-4xl">
              <div className="flex-1 text-right">
                <h3 className={selectedMatch.winningTeam.toUpperCase() === (selectedMatch.team1Name || 'TIME 1').toUpperCase() ? "text-2xl md:text-4xl font-gaming font-bold truncate text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.2)]" : "text-2xl md:text-4xl font-gaming font-bold truncate text-slate-300"}>
                  {selectedMatch.team1Name || 'Time 1'}
                </h3>
              </div>
              
              <div className="flex flex-col items-center justify-center">
                <div className="flex items-center gap-4 bg-slate-950/80 px-6 py-3 rounded-2xl border border-slate-800 shadow-xl">
                  <span className={selectedMatch.winningTeam.toUpperCase() === (selectedMatch.team1Name || 'TIME 1').toUpperCase() ? "text-4xl md:text-5xl font-gaming text-emerald-500" : "text-4xl md:text-5xl font-gaming text-rose-500"}>
                    {selectedMatch.team1Score !== undefined ? selectedMatch.team1Score : (selectedMatch.winningTeam.toUpperCase() === 'TIME 1' ? '13' : '10')}
                  </span>
                  <span className="text-slate-600 font-bold text-xl">X</span>
                  <span className={selectedMatch.winningTeam.toUpperCase() === (selectedMatch.team2Name || 'TIME 2').toUpperCase() ? "text-4xl md:text-5xl font-gaming text-emerald-500" : "text-4xl md:text-5xl font-gaming text-rose-500"}>
                    {selectedMatch.team2Score !== undefined ? selectedMatch.team2Score : (selectedMatch.winningTeam.toUpperCase() === 'TIME 2' ? '13' : '10')}
                  </span>
                </div>
              </div>
              
              <div className="flex-1 text-left">
                <h3 className={selectedMatch.winningTeam.toUpperCase() === (selectedMatch.team2Name || 'TIME 2').toUpperCase() ? "text-2xl md:text-4xl font-gaming font-bold truncate text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.2)]" : "text-2xl md:text-4xl font-gaming font-bold truncate text-slate-300"}>
                  {selectedMatch.team2Name || 'Time 2'}
                </h3>
              </div>
            </div>
            
            <div className="mt-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Vencedor: <span className="text-emerald-400">{selectedMatch.winningTeam}</span>
              </span>
            </div>
          </div>
        </div>

          <div className="flex flex-col gap-8">
            {/* Team 1 Table */}
            <div className="bg-slate-900/80 rounded-xl border border-slate-700/50 overflow-hidden">
              <div className="p-4 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/50">
                <h3 className="text-xl font-bold text-slate-200 flex items-center gap-3">
                  <span className={selectedMatch.winningTeam.toUpperCase() === (selectedMatch.team1Name || 'TIME 1').toUpperCase() ? "text-2xl font-gaming text-emerald-500" : "text-2xl font-gaming text-rose-500"}>
                    {selectedMatch.team1Score !== undefined ? selectedMatch.team1Score : (selectedMatch.winningTeam.toUpperCase() === 'TIME 1' ? '13' : '10')}
                  </span>
                  {selectedMatch.team1Name || 'Time 1'}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-700/50 text-[10px] uppercase tracking-widest text-slate-500 bg-slate-900/50">
                      <th className="p-3 font-bold pl-6">Jogador</th>
                      <th className="p-3 font-bold text-center w-16">K</th>
                      <th className="p-3 font-bold text-center w-16">D</th>
                      <th className="p-3 font-bold text-center w-16">A</th>
                      <th className="p-3 font-bold text-center w-20">Dano</th>
                      <th className="p-3 font-bold text-center w-16">%HS</th>
                      <th className="p-3 font-bold text-center w-16 pr-6">K/D</th>
                    </tr>
                  </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {selectedMatch.players.filter(p => p.team === 'team1' || !p.team).sort((a, b) => b.kills - a.kills).map((p, i) => {
                        const kd = p.deaths === 0 ? p.kills : (p.kills / p.deaths).toFixed(2);
                        const isMVP = i === 0 && selectedMatch.winningTeam.toUpperCase() === (selectedMatch.team1Name || 'TIME 1').toUpperCase();
                        return (
                          <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-3 pl-6 font-bold text-slate-200 flex items-center gap-3">
                              {/* @ts-ignore */}
                              {getPlayerAvatar(p.nick, p.playerId) ? <img src={getPlayerAvatar(p.nick, p.playerId)} alt={p.nick} className="w-6 h-6 rounded-full object-cover shrink-0" /> : <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[8px] font-bold text-slate-400 shrink-0">{p.nick.slice(0, 2).toUpperCase()}</div>}
                              {p.nick}
                              {isMVP && (
                                <div className="relative group flex items-center">
                                  <svg className="w-4 h-4 text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.5)] cursor-help" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
                                  </svg>
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-amber-500 text-slate-900 text-[10px] font-black rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg">
                                    MVP
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-amber-500"></div>
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-center text-slate-300 font-mono">{p.kills}</td>
                            <td className="p-3 text-center text-slate-300 font-mono">{p.deaths}</td>
                            <td className="p-3 text-center text-slate-300 font-mono">{p.assists}</td>
                            <td className="p-3 text-center text-slate-300 font-mono">{p.damage}</td>
                            <td className="p-3 text-center text-slate-300 font-mono">{p.hsPercent || 0}%</td>
                            <td className="p-3 text-center text-slate-300 font-mono font-bold pr-6">{kd}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                </table>
              </div>
            </div>

            {/* VS Divider */}
            {selectedMatch.players.some(p => p.team === 'team2') && (
              <div className="flex justify-center -my-4 relative z-10">
                <div className="bg-slate-800 border border-slate-700 text-slate-400 text-xs font-bold px-4 py-2 rounded-full uppercase tracking-widest shadow-lg">
                  VS
                </div>
              </div>
            )}

            {/* Team 2 Table */}
            {selectedMatch.players.some(p => p.team === 'team2') && (
              <div className="bg-slate-900/80 rounded-xl border border-slate-700/50 overflow-hidden">
                <div className="p-4 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/50">
                  <h3 className="text-xl font-bold text-slate-200 flex items-center gap-3">
                    <span className={selectedMatch.winningTeam.toUpperCase() === (selectedMatch.team2Name || 'TIME 2').toUpperCase() ? "text-2xl font-gaming text-emerald-500" : "text-2xl font-gaming text-rose-500"}>
                      {selectedMatch.team2Score !== undefined ? selectedMatch.team2Score : (selectedMatch.winningTeam.toUpperCase() === 'TIME 2' ? '13' : '10')}
                    </span>
                    {selectedMatch.team2Name || 'Time 2'}
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-700/50 text-[10px] uppercase tracking-widest text-slate-500 bg-slate-900/50">
                        <th className="p-3 font-bold pl-6">Jogador</th>
                        <th className="p-3 font-bold text-center w-16">K</th>
                        <th className="p-3 font-bold text-center w-16">D</th>
                        <th className="p-3 font-bold text-center w-16">A</th>
                        <th className="p-3 font-bold text-center w-20">Dano</th>
                        <th className="p-3 font-bold text-center w-16">%HS</th>
                        <th className="p-3 font-bold text-center w-16 pr-6">K/D</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {selectedMatch.players.filter(p => p.team === 'team2').sort((a, b) => b.kills - a.kills).map((p, i) => {
                        const kd = p.deaths === 0 ? p.kills : (p.kills / p.deaths).toFixed(2);
                        const isMVP = i === 0 && selectedMatch.winningTeam.toUpperCase() === (selectedMatch.team2Name || 'TIME 2').toUpperCase();
                        return (
                          <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-3 pl-6 font-bold text-slate-200 flex items-center gap-3">
                              {/* @ts-ignore */}
                              {getPlayerAvatar(p.nick, p.playerId) ? <img src={getPlayerAvatar(p.nick, p.playerId)} alt={p.nick} className="w-6 h-6 rounded-full object-cover shrink-0" /> : <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[8px] font-bold text-slate-400 shrink-0">{p.nick.slice(0, 2).toUpperCase()}</div>}
                              {p.nick}
                              {isMVP && (
                                <div className="relative group flex items-center">
                                  <svg className="w-4 h-4 text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.5)] cursor-help" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
                                  </svg>
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-amber-500 text-slate-900 text-[10px] font-black rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg">
                                    MVP
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-amber-500"></div>
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-center text-slate-300 font-mono">{p.kills}</td>
                            <td className="p-3 text-center text-slate-300 font-mono">{p.deaths}</td>
                            <td className="p-3 text-center text-slate-300 font-mono">{p.assists}</td>
                            <td className="p-3 text-center text-slate-300 font-mono">{p.damage}</td>
                            <td className="p-3 text-center text-slate-300 font-mono">{p.hsPercent || 0}%</td>
                            <td className="p-3 text-center text-slate-300 font-mono font-bold pr-6">{kd}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
    );
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-gaming font-bold text-white flex items-center gap-3">
          <span className="w-2 h-8 bg-purple-500 rounded-full"></span>
          Histórico de Partidas
        </h2>
      </div>

      {filteredMatches.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-3xl p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-emerald-500 to-rose-500"></div>
          <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
          <h3 className="text-xl font-bold text-slate-300 mb-2">Nenhuma partida registrada</h3>
          <p className="text-slate-500 max-w-md mx-auto mb-4">
            Nenhuma partida encontrada para a temporada selecionada.
          </p>
          {matches.length > 0 && (
            <div className="text-xs text-left bg-slate-900 p-4 rounded text-rose-400 overflow-auto mb-4">
              <strong>DEBUG INFO (Mande print disso para a IA):</strong><br/>
              Temporada Selecionada ID: {selectedSeasonId}<br/>
              Total de partidas no banco: {matches.length}<br/>
              Primeira partida: SeasonID={matches[0]?.seasonId} | Date={matches[0]?.date}<br/>
            </div>
          )}
          {matches.length === 0 && (
            <div className="text-xs text-left bg-rose-500/10 border border-rose-500/50 p-4 rounded text-rose-400 overflow-auto">
              <strong>⚠️ ATENÇÃO: POSSÍVEL ERRO DE RLS NO SUPABASE! ⚠️</strong><br/><br/>
              Se você salvou partidas e elas desapareceram, o Supabase está bloqueando a leitura! Você precisa ir no painel do Supabase, clicar no SQL Editor e rodar:<br/><br/>
              <code className="bg-slate-950 p-2 block mt-2 rounded">
                ALTER TABLE matches DISABLE ROW LEVEL SECURITY;<br/>
                GRANT ALL ON TABLE matches TO anon;<br/>
                GRANT ALL ON TABLE matches TO authenticated;
              </code>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {paginatedMatches.map((match) => {
            const t1Name = match.team1Name || 'TIME 1';
            const t2Name = match.team2Name || 'TIME 2';
            const t1Score = match.team1Score !== undefined ? match.team1Score : (match.winningTeam.toUpperCase() === 'TIME 1' ? 13 : 10);
            const t2Score = match.team2Score !== undefined ? match.team2Score : (match.winningTeam.toUpperCase() === 'TIME 2' ? 13 : 10);
            const t1Won = match.winningTeam.toUpperCase() === t1Name.toUpperCase();
            const t2Won = match.winningTeam.toUpperCase() === t2Name.toUpperCase();

            return (
              <div 
                key={match.id} 
                onClick={() => setSelectedMatch(match)}
                className="relative overflow-hidden bg-slate-900/80 border border-slate-700/50 rounded-2xl p-0 hover:border-purple-500/50 transition-all cursor-pointer group shadow-lg hover:shadow-purple-500/10"
              >
                {/* Top gradient bar */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-emerald-500 to-rose-500"></div>

                {/* Subtle background gradient based on winner */}
                <div className="absolute inset-0 bg-gradient-to-r from-slate-800/50 via-transparent to-slate-800/50 opacity-50"></div>
                
                <div className="relative p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                  {/* Date & Map */}
                  <div className="flex flex-col items-center md:items-start w-full md:w-1/4">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                      {new Date(match.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-md text-sm font-bold text-slate-300 uppercase tracking-wider">
                      {match.map}
                    </span>
                  </div>

                  {/* Scoreboard */}
                  <div className="flex items-center justify-center gap-4 w-full md:w-2/4">
                    <div className={t1Won ? "text-right flex-1 font-bold truncate text-xl text-emerald-400" : "text-right flex-1 font-bold truncate text-xl text-slate-400"}>
                      {t1Name}
                    </div>
                    
                    <div className="flex items-center gap-3 bg-slate-950/50 px-4 py-2 rounded-xl border border-slate-800 shadow-inner">
                      <span className={t1Won ? "text-3xl font-gaming text-emerald-500" : "text-3xl font-gaming text-rose-500"}>
                        {t1Score}
                      </span>
                      <span className="text-slate-600 font-bold text-sm">VS</span>
                      <span className={t2Won ? "text-3xl font-gaming text-emerald-500" : "text-3xl font-gaming text-rose-500"}>
                        {t2Score}
                      </span>
                    </div>

                    <div className={t2Won ? "text-left flex-1 font-bold truncate text-xl text-emerald-400" : "text-left flex-1 font-bold truncate text-xl text-slate-400"}>
                      {t2Name}
                    </div>
                  </div>

                  {/* View Details Button */}
                  <div className="w-full md:w-1/4 flex justify-center md:justify-end">
                    <span className="text-xs font-bold text-purple-400 uppercase tracking-wider group-hover:text-purple-300 flex items-center gap-1 transition-colors">
                      Ver Detalhes
                      <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {totalPages > 1 && !selectedMatch && filteredMatches.length > 0 && (
        <div className="flex justify-center items-center gap-2 mt-8 mb-4">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-50 hover:bg-slate-700 transition font-bold cursor-pointer"
          >
            Anterior
          </button>
          <div className="flex items-center flex-wrap justify-center gap-2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm transition cursor-pointer ${
                  currentPage === i + 1 
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' 
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-50 hover:bg-slate-700 transition font-bold cursor-pointer"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
};

export default MatchHistory;
