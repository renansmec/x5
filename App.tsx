
import React, { useState, useEffect, useMemo } from 'react';
import { ViewType, Player, Season, PlayerStats, FullRankingEntry } from './types';
import { INITIAL_PLAYERS, INITIAL_SEASONS, INITIAL_STATS } from './constants';
import RankingTable from './components/RankingTable';
import AdminPanel from './components/AdminPanel';
import { getRankingInsights } from './services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// Senha mestra para demonstração - em produção isso viria de um backend
const ADMIN_PASSWORD = "x5admin2024";

const App: React.FC = () => {
  const [view, setView] = useState<ViewType>('ranking');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('x5_is_admin') === 'true';
  });
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);

  const [players, setPlayers] = useState<Player[]>(() => {
    const saved = localStorage.getItem('x5_players');
    return saved ? JSON.parse(saved) : INITIAL_PLAYERS;
  });
  const [seasons, setSeasons] = useState<Season[]>(() => {
    const saved = localStorage.getItem('x5_seasons');
    return saved ? JSON.parse(saved) : INITIAL_SEASONS;
  });
  const [stats, setStats] = useState<PlayerStats[]>(() => {
    const saved = localStorage.getItem('x5_stats');
    return saved ? JSON.parse(saved) : INITIAL_STATS;
  });
  const [selectedSeasonId, setSelectedSeasonId] = useState(seasons.length > 0 ? seasons[0].id : '');
  const [aiInsight, setAiInsight] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);

  // Persistência
  useEffect(() => {
    localStorage.setItem('x5_players', JSON.stringify(players));
    localStorage.setItem('x5_seasons', JSON.stringify(seasons));
    localStorage.setItem('x5_stats', JSON.stringify(stats));
  }, [players, seasons, stats]);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPasswordInput === ADMIN_PASSWORD) {
      setIsAdminAuthenticated(true);
      sessionStorage.setItem('x5_is_admin', 'true');
      setLoginError(false);
      setAdminPasswordInput('');
    } else {
      setLoginError(true);
      setAdminPasswordInput('');
    }
  };

  const handleLogout = () => {
    setIsAdminAuthenticated(false);
    sessionStorage.removeItem('x5_is_admin');
    setView('ranking');
  };

  // Cálculo do Ranking Filtrado
  const currentRanking: FullRankingEntry[] = useMemo(() => {
    return stats
      .filter(s => s.seasonId === selectedSeasonId)
      .map(s => {
        const player = players.find(p => p.id === s.playerId);
        const kdValue = s.deaths === 0 ? s.kills : s.kills / s.deaths;
        return {
          ...s,
          nick: player?.nick || 'Desconhecido',
          kd: kdValue,
          damagePerMatch: s.matches === 0 ? 0 : s.damage / s.matches
        };
      })
      .sort((a, b) => b.kd - a.kd);
  }, [stats, selectedSeasonId, players]);

  const handleAddPlayer = (nick: string) => {
    if (!isAdminAuthenticated || !nick) return;
    const newPlayer = { id: `p${Date.now()}`, nick };
    setPlayers([...players, newPlayer]);
  };

  const handleEditPlayer = (id: string, newNick: string) => {
    if (!isAdminAuthenticated || !newNick) return;
    setPlayers(players.map(p => p.id === id ? { ...p, nick: newNick } : p));
  };

  const handleDeletePlayer = (id: string) => {
    if (!isAdminAuthenticated) return;
    setPlayers(players.filter(p => p.id !== id));
    setStats(stats.filter(s => s.playerId !== id));
  };

  const handleAddSeason = (name: string) => {
    if (!isAdminAuthenticated || !name) return;
    const newSeason = { id: `s${Date.now()}`, name };
    setSeasons([...seasons, newSeason]);
    if (!selectedSeasonId) setSelectedSeasonId(newSeason.id);
  };

  const handleEditSeason = (id: string, newName: string) => {
    if (!isAdminAuthenticated || !newName) return;
    setSeasons(seasons.map(s => s.id === id ? { ...s, name: newName } : s));
  };

  const handleDeleteSeason = (id: string) => {
    if (!isAdminAuthenticated) return;
    const updatedSeasons = seasons.filter(s => s.id !== id);
    setSeasons(updatedSeasons);
    setStats(stats.filter(s => s.seasonId !== id));
    if (selectedSeasonId === id) {
      setSelectedSeasonId(updatedSeasons.length > 0 ? updatedSeasons[0].id : '');
    }
  };

  const handleUpdateStats = (entry: Omit<PlayerStats, 'id'>) => {
    if (!isAdminAuthenticated) return;
    const existingIndex = stats.findIndex(
      s => s.playerId === entry.playerId && s.seasonId === entry.seasonId
    );
    
    if (existingIndex > -1) {
      // Lógica ACUMULATIVA: Soma os novos valores aos existentes
      const newStats = [...stats];
      const current = newStats[existingIndex];
      newStats[existingIndex] = {
        ...current,
        matches: current.matches + entry.matches,
        kills: current.kills + entry.kills,
        deaths: current.deaths + entry.deaths,
        assists: current.assists + entry.assists,
        damage: current.damage + entry.damage,
      };
      setStats(newStats);
    } else {
      // Cria nova entrada se não existir
      setStats([...stats, { ...entry, id: `st${Date.now()}` }]);
    }
  };

  const generateAICommentary = async () => {
    if (currentRanking.length === 0) return;
    setLoadingAi(true);
    const seasonName = seasons.find(s => s.id === selectedSeasonId)?.name || 'Temporada';
    const insight = await getRankingInsights(currentRanking, seasonName);
    setAiInsight(insight);
    setLoadingAi(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-4 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-gaming text-2xl font-bold italic">X5</div>
            <h1 className="text-2xl font-gaming font-bold tracking-tight bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              DOS AMIGOS
            </h1>
          </div>
          
          <nav className="flex items-center gap-4 bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button 
              onClick={() => setView('ranking')}
              className={`px-6 py-2 rounded-md font-bold transition-all ${view === 'ranking' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Ranking
            </button>
            <button 
              onClick={() => setView('admin')}
              className={`px-6 py-2 rounded-md font-bold transition-all ${view === 'admin' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Gerenciar
            </button>
            {isAdminAuthenticated && (
              <button 
                onClick={handleLogout}
                className="px-3 py-2 text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors"
                title="Sair do Modo Admin"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-8">
        {view === 'ranking' ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="w-full md:w-auto">
                <label className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2 block">Selecionar Temporada</label>
                <select 
                  value={selectedSeasonId}
                  onChange={(e) => { setSelectedSeasonId(e.target.value); setAiInsight(''); }}
                  className="w-full md:w-72 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 shadow-lg"
                >
                  {seasons.length === 0 && <option value="">Nenhuma temporada criada</option>}
                  {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

            

            {aiInsight && (
              <div className="bg-slate-800/80 border border-purple-500/30 p-6 rounded-2xl relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>
                </div>
                <h4 className="text-purple-400 font-bold mb-2 flex items-center gap-2">
                  <span className="animate-pulse">✨</span> Comentário do Analista
                </h4>
                <p className="text-slate-300 leading-relaxed italic">{aiInsight}</p>
              </div>
            )}

            {currentRanking.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                    <h3 className="text-xl font-gaming font-bold mb-6 flex items-center gap-2">
                      <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
                      Performance Comparada (K/D)
                    </h3>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={currentRanking}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="nick" stroke="#94a3b8" />
                          <YAxis stroke="#94a3b8" />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                            itemStyle={{ color: '#fff' }}
                          />
                          <Bar dataKey="kd" radius={[4, 4, 0, 0]}>
                            {currentRanking.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.kd >= 1.5 ? '#10b981' : entry.kd >= 1.0 ? '#3b82f6' : '#f43f5e'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 flex flex-col justify-center text-center">
                    <div className="mb-4">
                      <p className="text-slate-400 uppercase tracking-widest text-sm mb-1">Total de Vítimas na Temp</p>
                      <p className="text-5xl font-gaming font-bold text-emerald-400">
                        {currentRanking.reduce((acc, curr) => acc + curr.kills, 0)}
                      </p>
                    </div>
                    <div className="h-px bg-slate-800 my-6"></div>
                    <div>
                      <p className="text-slate-400 uppercase tracking-widest text-sm mb-1">Média de Dano</p>
                      <p className="text-4xl font-gaming font-bold text-orange-400">
                        {(currentRanking.reduce((acc, curr) => acc + curr.damage, 0) / (currentRanking.length || 1)).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                </div>
              </div>
            ) : (
               <div className="text-center py-20 bg-slate-900/30 border border-slate-800 rounded-2xl border-dashed">
                 <p className="text-slate-500 text-lg">Sem dados de ranking para exibir. Comece cadastrando estatísticas no painel de gerenciamento.</p>
               </div>
            )}

            {currentRanking.length > 0 && <RankingTable data={currentRanking} />}
          </div>
        ) : !isAdminAuthenticated ? (
          <div className="max-w-md mx-auto mt-20 p-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-gaming font-bold text-center mb-2">Acesso Restrito</h2>
            <p className="text-slate-400 text-center mb-8">Digite a chave de administrador para gerenciar jogadores e temporadas.</p>
            
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <input 
                  type="password" 
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  placeholder="Senha Administrativa"
                  className={`w-full bg-slate-800 border ${loginError ? 'border-rose-500 ring-rose-500' : 'border-slate-700'} rounded-xl px-4 py-3 font-bold text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                  autoFocus
                />
                {loginError && <p className="text-rose-500 text-xs mt-2 font-bold animate-bounce">Chave de acesso incorreta.</p>}
              </div>
              <button 
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
              >
                Entrar no Painel
              </button>
            </form>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-gaming font-bold">Administração do Painel</h2>
              <div className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                MODO ADMINISTRADOR ATIVO
              </div>
            </div>
            <AdminPanel 
              players={players} 
              seasons={seasons} 
              stats={stats}
              onAddPlayer={handleAddPlayer}
              onEditPlayer={handleEditPlayer}
              onDeletePlayer={handleDeletePlayer}
              onAddSeason={handleAddSeason}
              onEditSeason={handleEditSeason}
              onDeleteSeason={handleDeleteSeason}
              onUpdateStats={handleUpdateStats}
            />
          </div>
        )}
      </main>

      <footer className="mt-20 border-t border-slate-800 py-10 text-center text-slate-500 text-sm">
        <p>© 2024 X5 dos Amigos </p>
      </footer>
    </div>
  );
};

export default App;
