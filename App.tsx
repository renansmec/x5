
import React, { useState, useEffect, useMemo } from 'react';
import { ViewType, Player, Season, PlayerStats, FullRankingEntry } from './types';
import RankingTable from './components/RankingTable';
import AdminPanel from './components/AdminPanel';
import { db } from './services/databaseService';
import { getRankingInsights } from './services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const ADMIN_PASSWORD = "x5admin2024";

const App: React.FC = () => {
  const [view, setView] = useState<ViewType>('ranking');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('x5_is_admin') === 'true';
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [stats, setStats] = useState<PlayerStats[]>([]);
  
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [aiInsight, setAiInsight] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);

  // Carregamento Inicial do Banco de Dados
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [p, s, st] = await Promise.all([
          db.getPlayers(),
          db.getSeasons(),
          db.getStats()
        ]);
        setPlayers(p);
        setSeasons(s);
        setStats(st);
        if (s.length > 0) setSelectedSeasonId(s[0].id);
      } catch (error) {
        console.error("Erro ao conectar ao banco:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Persistência Automática ao Banco
  useEffect(() => {
    if (!isLoading) {
      db.savePlayers(players);
      db.saveSeasons(seasons);
      db.updateStats(stats);
    }
  }, [players, seasons, stats, isLoading]);

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

  const handleResetData = async () => {
    if (window.confirm("Deseja deletar permanentemente todos os registros do banco de dados?")) {
      setIsLoading(true);
      await db.clearDatabase();
      window.location.reload();
    }
  };

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
    const newPlayer = { id: `p${Date.now()}`, nick };
    setPlayers(prev => [...prev, newPlayer]);
  };

  const handleEditPlayer = (id: string, newNick: string) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, nick: newNick } : p));
  };

  const handleDeletePlayer = (id: string) => {
    setPlayers(prev => prev.filter(p => p.id !== id));
    setStats(prev => prev.filter(s => s.playerId !== id));
  };

  const handleAddSeason = (name: string) => {
    const newSeason = { id: `s${Date.now()}`, name };
    setSeasons(prev => [...prev, newSeason]);
  };

  const handleEditSeason = (id: string, newName: string) => {
    setSeasons(prev => prev.map(s => s.id === id ? { ...s, name: newName } : s));
  };

  const handleDeleteSeason = (id: string) => {
    const updated = seasons.filter(s => s.id !== id);
    setSeasons(updated);
    setStats(prev => prev.filter(s => s.seasonId !== id));
    if (selectedSeasonId === id) {
      setSelectedSeasonId(updated.length > 0 ? updated[0].id : '');
    }
  };

  const handleUpdateStats = (entry: Omit<PlayerStats, 'id'>) => {
    setStats(prev => {
      const existingIndex = prev.findIndex(s => s.playerId === entry.playerId && s.seasonId === entry.seasonId);
      if (existingIndex > -1) {
        const updated = [...prev];
        const current = updated[existingIndex];
        updated[existingIndex] = {
          ...current,
          matches: current.matches + entry.matches,
          kills: current.kills + entry.kills,
          deaths: current.deaths + entry.deaths,
          assists: current.assists + entry.assists,
          damage: current.damage + entry.damage,
        };
        return updated;
      }
      return [...prev, { ...entry, id: `st${Date.now()}` }];
    });
  };

  const generateAICommentary = async () => {
    if (currentRanking.length === 0) return;
    setLoadingAi(true);
    const seasonName = seasons.find(s => s.id === selectedSeasonId)?.name || 'Temporada';
    const insight = await getRankingInsights(currentRanking, seasonName);
    setAiInsight(insight);
    setLoadingAi(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 font-gaming">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xl animate-pulse tracking-widest uppercase">Conectando ao MongoDB...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-4 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-gaming text-2xl font-bold italic">X5</div>
            <h1 className="text-2xl font-gaming font-bold tracking-tight bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              FRIENDS RANKING
            </h1>
          </div>
          
          <nav className="flex items-center gap-4 bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button onClick={() => setView('ranking')} className={`px-6 py-2 rounded-md font-bold transition-all ${view === 'ranking' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}>Ranking</button>
            <button onClick={() => setView('admin')} className={`px-6 py-2 rounded-md font-bold transition-all ${view === 'admin' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}>Painel</button>
            {isAdminAuthenticated && (
              <button onClick={handleLogout} className="px-3 py-2 text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors">
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
             {/* Conteúdo do Ranking - Omitido por brevidade mas mantém a lógica original */}
             <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="w-full md:w-auto">
                  <label className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2 block">Selecionar Temporada</label>
                  <select value={selectedSeasonId} onChange={(e) => setSelectedSeasonId(e.target.value)} className="w-full md:w-72 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 shadow-lg">
                    {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <button onClick={generateAICommentary} disabled={loadingAi || currentRanking.length === 0} className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-3 rounded-xl font-bold shadow-lg transition-transform active:scale-95 disabled:opacity-50">
                  {loadingAi ? "Analisando..." : "✨ Análise por IA"}
                </button>
             </div>
             {aiInsight && <div className="bg-slate-800/80 border border-purple-500/30 p-6 rounded-2xl relative overflow-hidden"><p className="text-slate-300 leading-relaxed italic">{aiInsight}</p></div>}
             {currentRanking.length > 0 ? (
               <div className="space-y-8">
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                   <div className="lg:col-span-2 bg-slate-900/50 p-6 rounded-2xl border border-slate-800 h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={currentRanking}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="nick" stroke="#94a3b8" />
                          <YAxis stroke="#94a3b8" />
                          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                          <Bar dataKey="kd" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                             {currentRanking.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.kd >= 1.5 ? '#10b981' : entry.kd >= 1.0 ? '#3b82f6' : '#f43f5e'} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                   </div>
                   <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 flex flex-col justify-center text-center">
                      <p className="text-slate-400 uppercase tracking-widest text-sm mb-1">Vítimas Totais</p>
                      <p className="text-5xl font-gaming font-bold text-emerald-400">{currentRanking.reduce((acc, curr) => acc + curr.kills, 0)}</p>
                   </div>
                 </div>
                 <RankingTable data={currentRanking} />
               </div>
             ) : <div className="text-center py-20 bg-slate-900/30 border border-slate-800 rounded-2xl border-dashed"><p className="text-slate-500">Nenhum dado encontrado para esta temporada.</p></div>}
          </div>
        ) : !isAdminAuthenticated ? (
          <div className="max-w-md mx-auto mt-20 p-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
            <h2 className="text-2xl font-gaming font-bold text-center mb-6">Acesso ao Banco de Dados</h2>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <input type="password" value={adminPasswordInput} onChange={(e) => setAdminPasswordInput(e.target.value)} placeholder="Senha Administrativa" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-200 outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-xl font-bold">Acessar Painel</button>
            </form>
          </div>
        ) : (
          <AdminPanel 
            players={players} seasons={seasons} stats={stats}
            onAddPlayer={handleAddPlayer} onEditPlayer={handleEditPlayer} onDeletePlayer={handleDeletePlayer}
            onAddSeason={handleAddSeason} onEditSeason={handleEditSeason} onDeleteSeason={handleDeleteSeason}
            onUpdateStats={handleUpdateStats} onResetData={handleResetData} onSetView={setView}
          />
        )}
      </main>
    </div>
  );
};

export default App;
