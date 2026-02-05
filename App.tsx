
import React, { useState, useEffect, useMemo } from 'react';
import { ViewType, Player, Season, PlayerStats, FullRankingEntry } from './types';
import RankingTable from './components/RankingTable';
import AdminPanel from './components/AdminPanel';
import { db } from './services/databaseService';
import { getRankingInsights } from './services/geminiService';
import { INITIAL_PLAYERS, INITIAL_SEASONS, INITIAL_STATS } from './constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const ADMIN_PASSWORD = "x5admin2024";

const App: React.FC = () => {
  const [view, setView] = useState<ViewType>('ranking');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('x5_is_admin') === 'true';
  });
  
  // Iniciamos com arrays vazios para garantir que o que aparecer seja real
  const [players, setPlayers] = useState<Player[]>(() => {
    const saved = localStorage.getItem('x5_players');
    return saved ? JSON.parse(saved) : [];
  });
  const [seasons, setSeasons] = useState<Season[]>(() => {
    const saved = localStorage.getItem('x5_seasons');
    return saved ? JSON.parse(saved) : [];
  });
  const [stats, setStats] = useState<PlayerStats[]>(() => {
    const saved = localStorage.getItem('x5_stats');
    return saved ? JSON.parse(saved) : [];
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isCloudActive, setIsCloudActive] = useState(db.isCloudEnabled());
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [aiInsight, setAiInsight] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);

  // Sincronização automática silenciosa
  const syncWithCloud = async () => {
    const cloudEnabled = db.isCloudEnabled();
    setIsCloudActive(cloudEnabled);

    try {
      const [cloudPlayers, cloudSeasons, cloudStats] = await Promise.all([
        db.getPlayers(),
        db.getSeasons(),
        db.getStats()
      ]);

      if (cloudPlayers && cloudSeasons && cloudStats) {
        setPlayers(cloudPlayers);
        setSeasons(cloudSeasons);
        setStats(cloudStats);
        
        // Persistência local silenciosa para performance em acessos futuros
        localStorage.setItem('x5_players', JSON.stringify(cloudPlayers));
        localStorage.setItem('x5_seasons', JSON.stringify(cloudSeasons));
        localStorage.setItem('x5_stats', JSON.stringify(cloudStats));

        if (cloudSeasons.length > 0 && !selectedSeasonId) {
          setSelectedSeasonId(cloudSeasons[0].id);
        }
        setIsCloudActive(true);
      } else if (!cloudEnabled && players.length === 0) {
        // Se não houver chaves E o banco local estiver vazio, mostra iniciais como demonstração
        setPlayers(INITIAL_PLAYERS);
        setSeasons(INITIAL_SEASONS);
        setStats(INITIAL_STATS);
        setSelectedSeasonId(INITIAL_SEASONS[0].id);
      }
    } catch (error) {
      console.error("Erro na sincronização:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    syncWithCloud();
  }, []);

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

  const handleResetData = async () => {
    if (window.confirm("Deseja deletar TUDO? Esta ação apagará os dados do banco de dados na nuvem.")) {
      setIsLoading(true);
      await db.clearDatabase();
      localStorage.clear();
      window.location.reload();
    }
  };

  const currentRanking: FullRankingEntry[] = useMemo(() => {
    if (!selectedSeasonId && seasons.length > 0) {
      // Fallback para a última season se nenhuma selecionada
      const fallbackId = seasons[0].id;
      return stats.filter(s => s.seasonId === fallbackId).map(s => {
        const p = players.find(player => player.id === s.playerId);
        return { ...s, nick: p?.nick || '?', kd: s.deaths === 0 ? s.kills : s.kills/s.deaths, damagePerMatch: s.matches === 0 ? 0 : s.damage/s.matches };
      }).sort((a,b) => b.kd - a.kd);
    }

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
  }, [stats, selectedSeasonId, players, seasons]);

  // Admin Actions
  const handleAddPlayer = (nick: string) => {
    setPlayers(prev => [...prev, { id: `p${Date.now()}`, nick }]);
  };

  const handleDeletePlayer = (id: string) => {
    setPlayers(prev => prev.filter(p => p.id !== id));
    setStats(prev => prev.filter(s => s.playerId !== id));
  };

  const handleAddSeason = (name: string) => {
    const id = `s${Date.now()}`;
    setSeasons(prev => [...prev, { id, name }]);
    if (!selectedSeasonId) setSelectedSeasonId(id);
  };

  const handleDeleteSeason = (id: string) => {
    setSeasons(prev => prev.filter(s => s.id !== id));
    setStats(prev => prev.filter(s => s.seasonId !== id));
  };

  const handleUpdateStats = (entry: Omit<PlayerStats, 'id'>) => {
    setStats(prev => {
      const newStats = [...prev];
      const idx = newStats.findIndex(s => s.playerId === entry.playerId && s.seasonId === entry.seasonId);
      if (idx > -1) {
        newStats[idx] = { 
          ...newStats[idx], 
          matches: newStats[idx].matches + entry.matches,
          kills: newStats[idx].kills + entry.kills,
          deaths: newStats[idx].deaths + entry.deaths,
          assists: newStats[idx].assists + entry.assists,
          damage: newStats[idx].damage + entry.damage
        };
      } else {
        newStats.push({ ...entry, id: `st${Date.now()}` });
      }
      return newStats;
    });
  };

  const handlePublishToCloud = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        db.savePlayers(players),
        db.saveSeasons(seasons),
        db.updateStats(stats)
      ]);
      alert("✅ Banco de Dados Cloud sincronizado!");
    } catch (e) {
      alert("❌ Falha ao publicar.");
    } finally {
      setIsLoading(false);
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
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => setView('ranking')}>
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center font-gaming text-2xl font-bold italic shadow-lg shadow-emerald-500/20">X5</div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-gaming font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                RANKING AMIGOS
              </h1>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                {isCloudActive ? '• Banco Sincronizado' : '• Modo Local'}
              </span>
            </div>
          </div>
          
          <nav className="flex items-center gap-2 sm:gap-4 bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button onClick={() => setView('ranking')} className={`px-4 sm:px-6 py-2 rounded-lg font-bold transition-all text-xs sm:text-sm ${view === 'ranking' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}>Ranking</button>
            <button onClick={() => setView('admin')} className={`px-4 sm:px-6 py-2 rounded-lg font-bold transition-all text-xs sm:text-sm ${view === 'admin' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}>Painel</button>
            {isAdminAuthenticated && (
              <button onClick={syncWithCloud} className={`p-2 transition-colors ${isLoading ? 'text-emerald-400 animate-spin' : 'text-slate-400 hover:text-emerald-400'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
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
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Escolher Temporada</label>
                  <select 
                    value={selectedSeasonId} 
                    onChange={(e) => setSelectedSeasonId(e.target.value)} 
                    className="w-full md:w-72 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-xl cursor-pointer"
                  >
                    {seasons.length === 0 && <option>Carregando...</option>}
                    {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <button onClick={generateAICommentary} disabled={loadingAi || currentRanking.length === 0} className="w-full md:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-blue-600 hover:scale-105 px-8 py-4 rounded-xl font-bold shadow-2xl transition-all disabled:opacity-50">
                  {loadingAi ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "✨ Analisar com Gemini"}
                </button>
             </div>

             {aiInsight && (
               <div className="bg-slate-900 border border-emerald-500/20 p-6 rounded-2xl shadow-2xl animate-in slide-in-from-top-4">
                 <h3 className="text-emerald-400 font-bold mb-2 flex items-center gap-2">✨ Análise da IA</h3>
                 <div className="text-slate-300 italic leading-relaxed whitespace-pre-wrap">{aiInsight}</div>
                 <button onClick={() => setAiInsight('')} className="mt-4 text-[10px] text-slate-500 uppercase hover:text-slate-300">Fechar</button>
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
                        <p className="text-slate-500 uppercase tracking-widest text-xs font-bold mb-1">Total Kills</p>
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
               <div className="text-center py-24 bg-slate-900/30 border border-slate-800 rounded-3xl border-dashed">
                 <p className="text-slate-500 text-lg italic">{isLoading ? 'Sincronizando banco...' : 'Nenhum dado encontrado para esta temporada.'}</p>
               </div>
             )}
          </div>
        ) : !isAdminAuthenticated ? (
          <div className="max-w-md mx-auto mt-20 p-10 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl animate-in zoom-in-95">
            <h2 className="text-2xl font-gaming font-bold text-center mb-6 text-emerald-400">Acesso Administrativo</h2>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <input 
                type="password" 
                value={adminPasswordInput} 
                onChange={(e) => {setAdminPasswordInput(e.target.value); setLoginError(false);}} 
                placeholder="Senha Master" 
                className={`w-full bg-slate-800 border ${loginError ? 'border-rose-500' : 'border-slate-700'} rounded-xl px-4 py-4 font-bold text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all`}
                autoFocus 
              />
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 py-4 rounded-xl font-bold shadow-lg transition-all">Acessar Painel</button>
            </form>
          </div>
        ) : (
          <AdminPanel 
            players={players} seasons={seasons} stats={stats}
            onAddPlayer={handleAddPlayer} onDeletePlayer={handleDeletePlayer}
            onAddSeason={handleAddSeason} onDeleteSeason={handleDeleteSeason}
            onUpdateStats={handleUpdateStats} onResetData={handleResetData} onSetView={setView}
            onEditPlayer={() => {}} onEditSeason={() => {}}
            onPublish={handlePublishToCloud}
          />
        )}
      </main>

      <footer className="fixed bottom-0 left-0 w-full bg-slate-900/80 backdrop-blur-md border-t border-slate-800/50 py-3 text-center z-40">
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
          X5 Ranking &bull; PostgreSQL Live Sync
        </p>
      </footer>
    </div>
  );
};

export default App;
