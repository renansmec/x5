
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
        console.error("Falha ao carregar dados do Supabase:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      const sync = async () => {
        try {
          await Promise.all([
            db.savePlayers(players),
            db.saveSeasons(seasons),
            db.updateStats(stats)
          ]);
        } catch (e) {
          console.error("Erro na sincronização Supabase:", e);
        }
      };
      sync();
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
    }
  };

  const handleLogout = () => {
    setIsAdminAuthenticated(false);
    sessionStorage.removeItem('x5_is_admin');
    setView('ranking');
  };

  const handleResetData = async () => {
    if (window.confirm("Deseja deletar permanentemente todos os registros da nuvem?")) {
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

  const handleDeletePlayer = (id: string) => {
    setPlayers(prev => prev.filter(p => p.id !== id));
    setStats(prev => prev.filter(s => s.playerId !== id));
  };

  const handleAddSeason = (name: string) => {
    const newSeason = { id: `s${Date.now()}`, name };
    setSeasons(prev => [...prev, newSeason]);
    if (!selectedSeasonId) setSelectedSeasonId(newSeason.id);
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
        <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xl animate-pulse tracking-widest uppercase">Conectando Supabase...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-4 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center font-gaming text-2xl font-bold italic shadow-lg shadow-emerald-500/20">X5</div>
            <h1 className="text-2xl font-gaming font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
              RANKING SUPABASE
            </h1>
          </div>
          
          <nav className="flex items-center gap-4 bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button onClick={() => setView('ranking')} className={`px-6 py-2 rounded-lg font-bold transition-all ${view === 'ranking' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}>Ranking</button>
            <button onClick={() => setView('admin')} className={`px-6 py-2 rounded-lg font-bold transition-all ${view === 'admin' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}>Painel</button>
            {isAdminAuthenticated && (
              <button onClick={handleLogout} className="px-3 py-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-8">
        {view === 'ranking' ? (
          <div className="space-y-8 animate-in fade-in duration-500">
             <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="w-full md:w-auto">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Temporada Ativa</label>
                  <select value={selectedSeasonId} onChange={(e) => setSelectedSeasonId(e.target.value)} className="w-full md:w-72 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-xl cursor-pointer">
                    {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <button onClick={generateAICommentary} disabled={loadingAi || currentRanking.length === 0} className="w-full md:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-blue-600 hover:scale-105 px-8 py-4 rounded-xl font-bold shadow-2xl transition-all disabled:opacity-50">
                  {loadingAi ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "✨ Analisar com Gemini"}
                </button>
             </div>

             {aiInsight && (
               <div className="bg-slate-900 border border-emerald-500/20 p-6 rounded-2xl shadow-2xl animate-in slide-in-from-top-4">
                 <h3 className="text-emerald-400 font-bold mb-2 flex items-center gap-2">
                   ✨ Insights da Cloud IA
                 </h3>
                 <p className="text-slate-300 italic leading-relaxed">{aiInsight}</p>
               </div>
             )}

             {currentRanking.length > 0 ? (
               <div className="space-y-10">
                 <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                   <div className="lg:col-span-3 bg-slate-900/50 p-6 rounded-2xl border border-slate-800 h-[350px] shadow-inner">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={currentRanking}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis dataKey="nick" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip cursor={{fill: '#1e293b', opacity: 0.4}} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }} />
                          <Bar dataKey="kd" radius={[6, 6, 0, 0]} barSize={40}>
                             {currentRanking.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.kd >= 1.5 ? '#10b981' : entry.kd >= 1.0 ? '#3b82f6' : '#f43f5e'} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                   </div>
                   <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl flex flex-col justify-center items-center text-center shadow-xl">
                      <div className="mb-6">
                        <p className="text-slate-500 uppercase tracking-widest text-xs font-bold mb-1">Total Kills Cloud</p>
                        <p className="text-5xl font-gaming font-bold text-emerald-400">
                          {currentRanking.reduce((acc, curr) => acc + curr.kills, 0)}
                        </p>
                      </div>
                      <div className="w-full h-px bg-slate-800 my-4"></div>
                      <div>
                        <p className="text-slate-500 uppercase tracking-widest text-xs font-bold mb-1">Dano Total</p>
                        <p className="text-3xl font-gaming font-bold text-orange-400">
                          {(currentRanking.reduce((acc, curr) => acc + curr.damage, 0)).toLocaleString('pt-BR')}
                        </p>
                      </div>
                   </div>
                 </div>
                 <RankingTable data={currentRanking} />
               </div>
             ) : (
               <div className="text-center py-20 bg-slate-900/30 border border-slate-800 rounded-3xl border-dashed">
                 <p className="text-slate-500 text-lg italic">Nenhum dado encontrado no Supabase para esta temporada.</p>
               </div>
             )}
          </div>
        ) : !isAdminAuthenticated ? (
          <div className="max-w-md mx-auto mt-20 p-10 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-gaming font-bold text-center mb-6 text-emerald-400">Acesso Restrito</h2>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <input 
                type="password" 
                value={adminPasswordInput} 
                onChange={(e) => {setAdminPasswordInput(e.target.value); setLoginError(false);}} 
                placeholder="Senha de Administrador" 
                className={`w-full bg-slate-800 border ${loginError ? 'border-rose-500' : 'border-slate-700'} rounded-xl px-4 py-4 font-bold text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all`}
                autoFocus 
              />
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 py-4 rounded-xl font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">Acessar Banco Postgres</button>
            </form>
          </div>
        ) : (
          <AdminPanel 
            players={players} seasons={seasons} stats={stats}
            onAddPlayer={handleAddPlayer} onDeletePlayer={handleDeletePlayer}
            onAddSeason={handleAddSeason} onDeleteSeason={handleDeleteSeason}
            onUpdateStats={handleUpdateStats} onResetData={handleResetData} onSetView={setView}
            onEditPlayer={() => {}} onEditSeason={() => {}}
          />
        )}
      </main>

      <footer className="fixed bottom-0 left-0 w-full bg-slate-900/80 backdrop-blur-md border-t border-slate-800/50 py-3 text-center z-40">
        <div className="flex items-center justify-center gap-4 text-[10px] font-bold uppercase tracking-widest">
           <div className="flex items-center gap-1.5">
             <div className={`w-2 h-2 rounded-full ${db.isCloudEnabled() ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-600'}`}></div>
             <span className={db.isCloudEnabled() ? 'text-emerald-400' : 'text-slate-500'}>Supabase Postgres</span>
           </div>
           <div className="w-px h-3 bg-slate-700"></div>
           <div className="flex items-center gap-1.5">
             <div className="w-2 h-2 rounded-full bg-blue-500"></div>
             <span className="text-blue-400">Local Cache Active</span>
           </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
