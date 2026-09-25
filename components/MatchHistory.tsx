import React, { useState, useEffect, useMemo } from 'react';
import { MatchRecord, Player, Season } from '../types';
import { calculateMatchPlayerRating, getMatchMVP } from '../utils';

interface MatchHistoryProps {
  matches: MatchRecord[];
  players: Player[];
  seasons: Season[];
  selectedSeasonId: string;
}

const MatchHistory: React.FC<MatchHistoryProps> = ({ matches, players, seasons, selectedSeasonId }) => {
  const [selectedMatch, setSelectedMatch] = useState<MatchRecord | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showFormulaInfo, setShowFormulaInfo] = useState(false);
  const matchesPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSeasonId]);

  const filteredMatches = useMemo(() => {
    return matches
      .filter(m => m.seasonId === selectedSeasonId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [matches, selectedSeasonId]);

  const totalPages = Math.ceil(filteredMatches.length / matchesPerPage);
  const paginatedMatches = filteredMatches.slice(
    (currentPage - 1) * matchesPerPage,
    currentPage * matchesPerPage
  );

  // Helper para buscar avatar do jogador
  const getPlayerAvatar = (playerId?: string, nick?: string) => {
    const p = players.find(pl => 
      (playerId && pl.id === playerId) || 
      (nick && pl.nick.toLowerCase() === nick.toLowerCase())
    );
    return p?.avatarUrl;
  };

  if (selectedMatch) {
    const t1Name = (selectedMatch.team1Name || 'TIME 1').trim();
    const t2Name = (selectedMatch.team2Name || 'TIME 2').trim();
    const winTeam = (selectedMatch.winningTeam || '').trim().toUpperCase();

    const isT1Winner = winTeam === t1Name.toUpperCase() || winTeam === 'TIME 1';
    const isT2Winner = winTeam === t2Name.toUpperCase() || winTeam === 'TIME 2';

    const t1Score = selectedMatch.team1Score !== undefined ? selectedMatch.team1Score : (isT1Winner ? 13 : 10);
    const t2Score = selectedMatch.team2Score !== undefined ? selectedMatch.team2Score : (isT2Winner ? 13 : 10);

    // Calcula o MVP oficial da partida com a regra equilibrada (Rating X5)
    const matchMvp = getMatchMVP(selectedMatch);
    const mvpAvatar = matchMvp ? getPlayerAvatar(matchMvp.playerId, matchMvp.nick) : null;

    // Processa os jogadores de cada time com o Match Rating X5
    const team1Players = selectedMatch.players
      .filter(p => p.team === 'team1' || !p.team)
      .map(p => {
        const { score, kda } = calculateMatchPlayerRating({
          kills: p.kills,
          deaths: p.deaths,
          assists: p.assists,
          damage: p.damage,
          hsPercent: p.hsPercent,
          won: isT1Winner
        });
        const kd = p.deaths === 0 ? p.kills : Number((p.kills / p.deaths).toFixed(2));
        const isMVP = matchMvp?.nick.toLowerCase() === p.nick.toLowerCase();
        return { ...p, score, kda, kd, isMVP };
      })
      .sort((a, b) => b.score - a.score);

    const team2Players = selectedMatch.players
      .filter(p => p.team === 'team2')
      .map(p => {
        const { score, kda } = calculateMatchPlayerRating({
          kills: p.kills,
          deaths: p.deaths,
          assists: p.assists,
          damage: p.damage,
          hsPercent: p.hsPercent,
          won: isT2Winner
        });
        const kd = p.deaths === 0 ? p.kills : Number((p.kills / p.deaths).toFixed(2));
        const isMVP = matchMvp?.nick.toLowerCase() === p.nick.toLowerCase();
        return { ...p, score, kda, kd, isMVP };
      })
      .sort((a, b) => b.score - a.score);

    return (
      <div className="space-y-6 animate-in slide-in-from-right-8 duration-500 pb-10">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setSelectedMatch(null)}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-semibold text-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            Voltar para o histórico
          </button>

          <button
            onClick={() => setShowFormulaInfo(!showFormulaInfo)}
            className="text-xs font-bold text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-lg border border-amber-500/30 transition-all flex items-center gap-1.5"
          >
            <span>⚖️</span> Regra do MVP Equilibrado
          </button>
        </div>

        {/* Modal/Banner de explicação da Regra do MVP */}
        {showFormulaInfo && (
          <div className="p-4 bg-slate-900 border border-amber-500/40 rounded-2xl shadow-xl space-y-2 animate-in fade-in duration-200 text-xs text-slate-300">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                👑 Como é escolhido o MVP da Partida?
              </span>
              <button onClick={() => setShowFormulaInfo(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <p>
              O MVP não é mais decidido por quem apenas pegou kills fáceis ou ficou salvando arma para inflar K/D. 
              Agora o MVP é o jogador com <strong>maior Rating X5 do time vencedor</strong>, combinando:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
              <span className="bg-slate-800 p-2 rounded border border-slate-700 text-yellow-300">🎯 KDA Efetivo (35%)</span>
              <span className="bg-slate-800 p-2 rounded border border-slate-700 text-orange-300">💥 Dano Real (25%)</span>
              <span className="bg-slate-800 p-2 rounded border border-slate-700 text-emerald-300">🏆 Vitória do Jogo (25%)</span>
              <span className="bg-slate-800 p-2 rounded border border-slate-700 text-purple-300">🎯 Precisão %HS (15%)</span>
            </div>
          </div>
        )}

        {/* PLACAR E CABEÇALHO */}
        <div className="relative bg-slate-900/90 border border-slate-700/60 rounded-3xl p-6 sm:p-8 overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-amber-500 to-emerald-500"></div>
          
          <div className="flex flex-col items-center justify-center gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <span className="px-4 py-1.5 bg-slate-800 border border-slate-700 rounded-full text-xs sm:text-sm font-bold text-slate-200 uppercase tracking-widest shadow-inner">
                🗺️ {selectedMatch.map}
              </span>
              <span className="text-slate-400 text-xs sm:text-sm font-medium">
                {new Date(selectedMatch.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="flex items-center justify-center gap-4 md:gap-8 w-full max-w-4xl">
              <div className="flex-1 text-right">
                <h3 className={isT1Winner ? "text-2xl md:text-4xl font-gaming font-bold truncate text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.25)]" : "text-2xl md:text-4xl font-gaming font-bold truncate text-slate-400"}>
                  {t1Name}
                </h3>
              </div>
              
              <div className="flex flex-col items-center justify-center">
                <div className="flex items-center gap-4 bg-slate-950/90 px-6 py-3 rounded-2xl border border-slate-800 shadow-2xl">
                  <span className={isT1Winner ? "text-4xl md:text-5xl font-gaming text-emerald-400 font-bold" : "text-4xl md:text-5xl font-gaming text-rose-400 font-bold"}>
                    {t1Score}
                  </span>
                  <span className="text-slate-600 font-bold text-xl">X</span>
                  <span className={isT2Winner ? "text-4xl md:text-5xl font-gaming text-emerald-400 font-bold" : "text-4xl md:text-5xl font-gaming text-rose-400 font-bold"}>
                    {t2Score}
                  </span>
                </div>
              </div>
              
              <div className="flex-1 text-left">
                <h3 className={isT2Winner ? "text-2xl md:text-4xl font-gaming font-bold truncate text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.25)]" : "text-2xl md:text-4xl font-gaming font-bold truncate text-slate-400"}>
                  {t2Name}
                </h3>
              </div>
            </div>
            
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-950/80 px-4 py-1.5 rounded-full border border-slate-800">
                Vencedor: <strong className="text-emerald-400">{selectedMatch.winningTeam}</strong>
              </span>
            </div>

            {/* CARD DESTAQUE DO MVP DA PARTIDA */}
            {matchMvp && (
              <div className="w-full max-w-2xl bg-gradient-to-r from-amber-500/15 via-purple-500/20 to-amber-500/15 border-2 border-amber-500/50 rounded-2xl p-4 sm:p-5 shadow-[0_0_30px_rgba(245,158,11,0.2)] flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
                <div className="flex items-center gap-3.5">
                  <div className="relative">
                    {mvpAvatar ? (
                      <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-amber-400 shadow-md bg-slate-800 flex-shrink-0">
                        <img src={mvpAvatar} alt={matchMvp.nick} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-purple-600 flex items-center justify-center font-bold text-white text-lg border-2 border-amber-400 shadow-md">
                        {matchMvp.nick.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className="absolute -top-2 -right-1 text-lg" title="MVP da Partida">
                      👑
                    </span>
                  </div>

                  <div className="text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                        MVP DA PARTIDA
                      </span>
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-mono font-bold">
                        ⭐ {matchMvp.score.toFixed(2)} Rating X5
                      </span>
                    </div>
                    <p className="text-2xl font-gaming font-bold text-white tracking-wide">{matchMvp.nick}</p>
                    <p className="text-[11px] text-slate-400">Melhor desempenho pelo time vencedor</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 font-mono text-center">
                  <div className="bg-slate-900/90 px-2.5 py-1.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-sans block">K/D</span>
                    <span className="text-yellow-400 font-bold text-xs">{matchMvp.kd.toFixed(2)}</span>
                  </div>
                  <div className="bg-slate-900/90 px-2.5 py-1.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-sans block">Frags</span>
                    <span className="text-emerald-400 font-bold text-xs">{matchMvp.kills}K-{matchMvp.deaths}D</span>
                  </div>
                  <div className="bg-slate-900/90 px-2.5 py-1.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-sans block">Dano</span>
                    <span className="text-orange-400 font-bold text-xs">{matchMvp.damage}</span>
                  </div>
                  <div className="bg-slate-900/90 px-2.5 py-1.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-sans block">%HS</span>
                    <span className="text-purple-400 font-bold text-xs">{matchMvp.hsPercent}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* TABELAS DOS DOIS TIMES */}
        <div className="flex flex-col gap-8">
          {/* TABELA TIME 1 */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-700/60 overflow-hidden shadow-xl">
            <div className={`p-4 border-b border-slate-700/60 flex justify-between items-center ${isT1Winner ? 'bg-emerald-950/30' : 'bg-slate-800/40'}`}>
              <h3 className="text-xl font-bold text-slate-200 flex items-center gap-3">
                <span className={isT1Winner ? "text-2xl font-gaming text-emerald-400 font-bold" : "text-2xl font-gaming text-rose-400 font-bold"}>
                  {t1Score}
                </span>
                <span>{t1Name}</span>
                {isT1Winner && (
                  <span className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    Vencedor
                  </span>
                )}
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                Ordenado por Rating X5
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-700/60 text-[10px] uppercase tracking-widest text-slate-400 bg-slate-950/60">
                    <th className="p-3.5 pl-6 font-bold">Jogador</th>
                    <th className="p-3.5 font-bold text-center w-24 text-purple-300">Rating X5</th>
                    <th className="p-3.5 font-bold text-center w-16 text-emerald-400">K</th>
                    <th className="p-3.5 font-bold text-center w-16 text-rose-400">D</th>
                    <th className="p-3.5 font-bold text-center w-16 text-sky-400">A</th>
                    <th className="p-3.5 font-bold text-center w-20 text-orange-400">Dano</th>
                    <th className="p-3.5 font-bold text-center w-16 text-purple-400">%HS</th>
                    <th className="p-3.5 font-bold text-center w-16 text-yellow-400 pr-6">K/D</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {team1Players.map((p, i) => {
                    const avatar = getPlayerAvatar(p.playerId, p.nick);
                    return (
                      <tr 
                        key={i} 
                        className={`transition-colors ${p.isMVP ? 'bg-amber-500/10 hover:bg-amber-500/15' : 'hover:bg-slate-800/40'}`}
                      >
                        <td className="p-3 pl-6 font-bold font-sans text-slate-200">
                          <div className="flex items-center gap-2.5">
                            {avatar ? (
                              <img 
                                src={avatar} 
                                alt={p.nick} 
                                className="w-6 h-6 rounded-full object-cover border border-slate-700" 
                                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                              />
                            ) : null}
                            <span>{p.nick}</span>

                            {p.isMVP && (
                              <span className="flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                👑 MVP
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="p-3 text-center">
                          <span className={`
                            px-2 py-0.5 rounded font-bold text-xs
                            ${p.score >= 1.60 ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40' :
                              p.score >= 1.20 ? 'bg-purple-500/20 text-purple-300' :
                              'bg-slate-800 text-slate-300'}
                          `}>
                            ⭐ {p.score.toFixed(2)}
                          </span>
                        </td>

                        <td className="p-3 text-center text-emerald-400 font-bold">{p.kills}</td>
                        <td className="p-3 text-center text-rose-400">{p.deaths}</td>
                        <td className="p-3 text-center text-sky-400">{p.assists}</td>
                        <td className="p-3 text-center text-orange-400 font-medium">{p.damage}</td>
                        <td className="p-3 text-center text-purple-400">{p.hsPercent || 0}%</td>
                        <td className="p-3 text-center text-yellow-400 font-bold pr-6">{p.kd.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* VS DIVIDER */}
          {team2Players.length > 0 && (
            <div className="flex justify-center -my-4 relative z-10">
              <div className="bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold px-5 py-1.5 rounded-full uppercase tracking-widest shadow-xl">
                VS
              </div>
            </div>
          )}

          {/* TABELA TIME 2 */}
          {team2Players.length > 0 && (
            <div className="bg-slate-900/90 rounded-2xl border border-slate-700/60 overflow-hidden shadow-xl">
              <div className={`p-4 border-b border-slate-700/60 flex justify-between items-center ${isT2Winner ? 'bg-emerald-950/30' : 'bg-slate-800/40'}`}>
                <h3 className="text-xl font-bold text-slate-200 flex items-center gap-3">
                  <span className={isT2Winner ? "text-2xl font-gaming text-emerald-400 font-bold" : "text-2xl font-gaming text-rose-400 font-bold"}>
                    {t2Score}
                  </span>
                  <span>{t2Name}</span>
                  {isT2Winner && (
                    <span className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      Vencedor
                    </span>
                  )}
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  Ordenado por Rating X5
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/60 text-[10px] uppercase tracking-widest text-slate-400 bg-slate-950/60">
                      <th className="p-3.5 pl-6 font-bold">Jogador</th>
                      <th className="p-3.5 font-bold text-center w-24 text-purple-300">Rating X5</th>
                      <th className="p-3.5 font-bold text-center w-16 text-emerald-400">K</th>
                      <th className="p-3.5 font-bold text-center w-16 text-rose-400">D</th>
                      <th className="p-3.5 font-bold text-center w-16 text-sky-400">A</th>
                      <th className="p-3.5 font-bold text-center w-20 text-orange-400">Dano</th>
                      <th className="p-3.5 font-bold text-center w-16 text-purple-400">%HS</th>
                      <th className="p-3.5 font-bold text-center w-16 text-yellow-400 pr-6">K/D</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {team2Players.map((p, i) => {
                      const avatar = getPlayerAvatar(p.playerId, p.nick);
                      return (
                        <tr 
                          key={i} 
                          className={`transition-colors ${p.isMVP ? 'bg-amber-500/10 hover:bg-amber-500/15' : 'hover:bg-slate-800/40'}`}
                        >
                          <td className="p-3 pl-6 font-bold font-sans text-slate-200">
                            <div className="flex items-center gap-2.5">
                              {avatar ? (
                                <img 
                                  src={avatar} 
                                  alt={p.nick} 
                                  className="w-6 h-6 rounded-full object-cover border border-slate-700" 
                                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                />
                              ) : null}
                              <span>{p.nick}</span>

                              {p.isMVP && (
                                <span className="flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                  👑 MVP
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="p-3 text-center">
                            <span className={`
                              px-2 py-0.5 rounded font-bold text-xs
                              ${p.score >= 1.60 ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40' :
                                p.score >= 1.20 ? 'bg-purple-500/20 text-purple-300' :
                                'bg-slate-800 text-slate-300'}
                            `}>
                              ⭐ {p.score.toFixed(2)}
                            </span>
                          </td>

                          <td className="p-3 text-center text-emerald-400 font-bold">{p.kills}</td>
                          <td className="p-3 text-center text-rose-400">{p.deaths}</td>
                          <td className="p-3 text-center text-sky-400">{p.assists}</td>
                          <td className="p-3 text-center text-orange-400 font-medium">{p.damage}</td>
                          <td className="p-3 text-center text-purple-400">{p.hsPercent || 0}%</td>
                          <td className="p-3 text-center text-yellow-400 font-bold pr-6">{p.kd.toFixed(2)}</td>
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
    <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500 pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-3xl font-gaming font-bold text-white flex items-center gap-3">
            <span className="w-2 h-8 bg-purple-500 rounded-full"></span>
            Histórico de Partidas
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Partidas registradas com MVP oficial definido pelo <strong className="text-amber-400">Rating X5 Equilibrado</strong>
          </p>
        </div>
      </div>

      {filteredMatches.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-3xl p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-emerald-500 to-rose-500"></div>
          <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
          <h3 className="text-xl font-bold text-slate-300 mb-2">Nenhuma partida registrada</h3>
          <p className="text-slate-500 max-w-md mx-auto mb-4 text-sm">
            Nenhuma partida encontrada para a temporada selecionada.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {paginatedMatches.map((match) => {
            const t1Name = match.team1Name || 'TIME 1';
            const t2Name = match.team2Name || 'TIME 2';
            const winTeam = (match.winningTeam || '').trim().toUpperCase();
            const t1Won = winTeam === t1Name.toUpperCase() || winTeam === 'TIME 1';
            const t2Won = winTeam === t2Name.toUpperCase() || winTeam === 'TIME 2';
            const t1Score = match.team1Score !== undefined ? match.team1Score : (t1Won ? 13 : 10);
            const t2Score = match.team2Score !== undefined ? match.team2Score : (t2Won ? 13 : 10);

            // Calcula o MVP desta partida na listagem
            const mvp = getMatchMVP(match);
            const mvpAvatar = mvp ? getPlayerAvatar(mvp.playerId, mvp.nick) : null;

            return (
              <div 
                key={match.id} 
                onClick={() => setSelectedMatch(match)}
                className="relative overflow-hidden bg-slate-900/85 border border-slate-700/60 rounded-2xl p-0 hover:border-purple-500/60 transition-all cursor-pointer group shadow-lg hover:shadow-purple-500/15"
              >
                {/* Top gradient bar */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-amber-500 to-emerald-500"></div>

                <div className="relative p-5 flex flex-col md:flex-row items-center justify-between gap-5">
                  {/* Data & Mapa */}
                  <div className="flex flex-col items-center md:items-start w-full md:w-1/4">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">
                      {new Date(match.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-md text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-wider">
                      🗺️ {match.map}
                    </span>
                  </div>

                  {/* Placar Central */}
                  <div className="flex items-center justify-center gap-3 sm:gap-4 w-full md:w-2/5">
                    <div className={t1Won ? "text-right flex-1 font-bold truncate text-base sm:text-lg text-emerald-400" : "text-right flex-1 font-bold truncate text-base sm:text-lg text-slate-400"}>
                      {t1Name}
                    </div>
                    
                    <div className="flex items-center gap-2.5 sm:gap-3 bg-slate-950/80 px-4 py-1.5 rounded-xl border border-slate-800 shadow-inner">
                      <span className={t1Won ? "text-2xl sm:text-3xl font-gaming text-emerald-400 font-bold" : "text-2xl sm:text-3xl font-gaming text-rose-400 font-bold"}>
                        {t1Score}
                      </span>
                      <span className="text-slate-600 font-bold text-xs">VS</span>
                      <span className={t2Won ? "text-2xl sm:text-3xl font-gaming text-emerald-400 font-bold" : "text-2xl sm:text-3xl font-gaming text-rose-400 font-bold"}>
                        {t2Score}
                      </span>
                    </div>

                    <div className={t2Won ? "text-left flex-1 font-bold truncate text-base sm:text-lg text-emerald-400" : "text-left flex-1 font-bold truncate text-base sm:text-lg text-slate-400"}>
                      {t2Name}
                    </div>
                  </div>

                  {/* Badge do MVP e Botão de Detalhes */}
                  <div className="w-full md:w-1/3 flex items-center justify-between md:justify-end gap-3">
                    {mvp && (
                      <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl">
                        {mvpAvatar ? (
                          <img src={mvpAvatar} alt={mvp.nick} className="w-5 h-5 rounded-full object-cover border border-amber-400/60" />
                        ) : (
                          <span className="text-xs">👑</span>
                        )}
                        <div className="flex flex-col text-left">
                          <span className="text-[9px] text-amber-400/90 font-bold uppercase tracking-wider">MVP</span>
                          <span className="text-xs font-bold text-white truncate max-w-[100px] leading-tight">{mvp.nick}</span>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-amber-300 ml-1">
                          ⭐ {mvp.score.toFixed(2)}
                        </span>
                      </div>
                    )}

                    <span className="text-xs font-bold text-purple-400 uppercase tracking-wider group-hover:text-purple-300 flex items-center gap-1 transition-colors whitespace-nowrap">
                      Detalhes
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
            className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-50 hover:bg-slate-700 transition font-bold cursor-pointer text-xs"
          >
            Anterior
          </button>
          <div className="flex items-center flex-wrap justify-center gap-2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs transition cursor-pointer ${
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
            className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-50 hover:bg-slate-700 transition font-bold cursor-pointer text-xs"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
};

export default MatchHistory;
