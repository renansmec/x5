
import React, { useState, useEffect, useMemo } from 'react';
import { ViewType, Player, Season, PlayerStats, FullRankingEntry } from './types';
import RankingTable from './components/RankingTable';
import AdminPanel from './components/AdminPanel';
import TeamBalancer from './components/TeamBalancer';
import { db } from './services/databaseService';
import { getRankingInsights } from './services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const ADMIN_PASSWORD = "x5admin2024";

const App: React.FC = () => {
  const [view, setView] = useState<ViewType>('ranking');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('x5_is_admin') === 'true';
  });
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [stats, setStats] = useState<PlayerStats[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [aiInsight, setAiInsight] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);

  // Busca dados automaticamente ao carregar
  const fetchData = async () => {
    setIsLoading(true);

    try {
      const [cloudPlayers, cloudSeasons, cloudStats] = await Promise.all([
        db.getPlayers(),
        db.getSeasons(),
        db.getStats()
      ]);

      if (cloudPlayers && cloudSeasons && cloudStats) {
        setPlayers(cloudPlayers || []);
        setSeasons(cloudSeasons || []);
        setStats(cloudStats || []);

        // Seleciona automaticamente a última temporada alimentada
        if (cloudSeasons && cloudSeasons.length > 0 && !selectedSeasonId) {
          setSelectedSeasonId(cloudSeasons[0].id);
        }
      }
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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
    if (window.confirm("ATENÇÃO: Isso apagará TODOS os dados do banco de dados na nuvem. Continuar?")) {
      setIsLoading(true);
      await db.clearDatabase();
      window.location.reload();
    }
  };

  const currentRanking: FullRankingEntry[] = useMemo(() => {
    if (!selectedSeasonId) return [];
    
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

  // Admin Actions Handlers
  const handleAddPlayer = (nick: string) => setPlayers(prev => [...prev, { id: `p${Date.now()}`, nick }]);
  
  const handleDeletePlayer = (id: string) => {
    setPlayers(prev => prev.filter(p => p.id !== id));
    setStats(prev => prev.filter(s => s.playerId !== id));
  };
  
  const handleAddSeason = (name: string) => {
    const id = `s${Date.now()}`;
    setSeasons(prev => [{ id, name }, ...prev]); 
    if (!selectedSeasonId) setSelectedSeasonId(id);
  };
  
  const handleDeleteSeason = (id: string) => {
    setSeasons(prev => prev.filter(s => s.id !== id));
    setStats(prev => prev.filter(s => s.seasonId !== id));
    if(selectedSeasonId === id && seasons.length > 1) setSelectedSeasonId(seasons[1].id);
    else if(selectedSeasonId === id) setSelectedSeasonId('');
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
      // Usa o novo método sincronizado que evita erros de Foreign Key
      await db.syncDatabase(players, seasons, stats);
      alert("✅ Dados sincronizados com sucesso!");
    } catch (e: any) {
      console.error(e);
      alert(`❌ Falha ao publicar: ${e.message || "Erro desconhecido"}`);
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

  if (isLoading && view === 'ranking' && players.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 font-gaming">
        <div className="w-12 h-12 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm tracking-widest uppercase opacity-50">Carregando X5 Ranking...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-4 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => { setView('ranking'); fetchData(); }}>
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center font-gaming text-2xl font-bold italic shadow-lg shadow-emerald-500/20">X5</div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-gaming font-bold tracking-tight bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                DOS AMIGOS
              </h1>
              
            </div>
          </div>
          
          <nav className="flex items-center gap-2 bg-slate-800 p-1 rounded-xl border border-slate-700 overflow-x-auto">
            <button onClick={() => setView('ranking')} className={`px-4 sm:px-6 py-2 rounded-lg font-bold transition-all text-xs sm:text-sm whitespace-nowrap ${view === 'ranking' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}>Ranking</button>
            <button onClick={() => setView('balancer')} className={`px-4 sm:px-6 py-2 rounded-lg font-bold transition-all text-xs sm:text-sm whitespace-nowrap ${view === 'balancer' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}>Sortear times</button>
            <button onClick={() => setView('admin')} className={`px-4 sm:px-6 py-2 rounded-lg font-bold transition-all text-xs sm:text-sm whitespace-nowrap ${view === 'admin' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}>Admin</button>

          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-8">
        {view === 'ranking' ? (
          <div className="space-y-8 animate-in fade-in duration-500">
             <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="w-full md:w-auto">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Selecione a temporada</label>
                  <select 
                    value={selectedSeasonId} 
                    onChange={(e) => setSelectedSeasonId(e.target.value)} 
                    className="w-full md:w-72 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 shadow-xl"
                  >
                    {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    {seasons.length === 0 && <option value="">Nenhuma temporada encontrada</option>}
                  </select>
                </div>
                <button onClick={generateAICommentary} disabled={loadingAi || currentRanking.length === 0} className="w-full md:w-auto flex items-center justify-center gap-2 bg-gradient-to-r purple-600 to-blue-600 px-8 py-4 rounded-xl font-bold shadow-2xl transition-all disabled:opacity-50">
                  {loadingAi ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "✨ Analisar com Gemini"}
                </button>
             </div>

             {aiInsight && (
               <div className="bg-slate-900 border border-emerald-500/20 p-6 rounded-2xl shadow-2xl animate-in slide-in-from-top-4">
                 <h3 className="text-emerald-400 font-bold mb-2">✨ Insight da IA</h3>
                 <div className="text-slate-300 italic whitespace-pre-wrap">{aiInsight}</div>
                 <button onClick={() => setAiInsight('')} className="mt-4 text-[10px] text-slate-500 uppercase hover:text-slate-300 underline">Fechar</button>
               </div>
             )}

             {currentRanking.length > 0 ? (
               <div className="space-y-10">
                 <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-3 bg-slate-900/50 p-6 rounded-2xl border border-slate-800 h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={currentRanking}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis dataKey="nick" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }} />
                          <Bar dataKey="kd" radius={[6, 6, 0, 0]} barSize={40}>
                             {currentRanking.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.kd >= 1.5 ? '#10b981' : entry.kd >= 1.0 ? '#3b82f6' : '#f43f5e'} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                   </div>
                   <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl flex flex-col justify-center items-center text-center shadow-xl">
                      <div className="mb-6">
                        <p className="text-slate-500 uppercase text-xs font-bold mb-1">Kills</p>
                        <p className="text-5xl font-gaming font-bold text-emerald-400">
                          {currentRanking.reduce((acc, curr) => acc + curr.kills, 0)}
                        </p>
                      </div>
                      <div className="w-full h-px bg-slate-800 my-4"></div>
                      <div>
                        <p className="text-slate-500 uppercase text-xs font-bold mb-1">Dano Total</p>
                        <p className="text-3xl font-gaming font-bold text-orange-400">
                          {(currentRanking.reduce((acc, curr) => acc + curr.damage, 0)).toLocaleString('pt-BR')}
                        </p>
                      </div>
                   </div>
                 </div>
                 <RankingTable data={currentRanking} />
               </div>
             ) : (
               <div className="text-center py-32 bg-slate-900/30 border border-slate-800 rounded-3xl border-dashed">
                 <p className="text-slate-500 text-lg italic">
                    {players.length === 0 ? 'Conectando ao banco de dados...' : 'Sem dados para esta temporada.'}
                 </p>
               </div>
             )}
          </div>
        ) : view === 'balancer' ? (
          <TeamBalancer players={players} seasons={seasons} stats={stats} />
        ) : !isAdminAuthenticated ? (
          <div className="max-w-md mx-auto mt-20 p-10 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl animate-in zoom-in-95">
            <h2 className="text-2xl font-gaming font-bold text-center mb-6 text-emerald-400">Autenticação Master</h2>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <input 
                type="password" 
                value={adminPasswordInput} 
                onChange={(e) => {setAdminPasswordInput(e.target.value); setLoginError(false);}} 
                placeholder="Senha de Acesso" 
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
          X5 dos Amigos &bull; Dados em Nuvem
        </p>
      </footer>
    </div>
  );
};

export default App;
