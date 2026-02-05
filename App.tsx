
import React, { useState, useEffect, useCallback } from 'react';
import { ViewMode, Season, Player, PlayerRankingRow } from './types';
import { db } from './services/db';
import { getPlayerInsights } from './services/geminiService';

// Icons as SVG components to avoid external dependencies
const IconTrophy = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>;
const IconPlus = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>;
const IconSparkles = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" /></svg>;
const IconRefresh = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>;

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>(ViewMode.RANKING);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [ranking, setRanking] = useState<PlayerRankingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Form States
  const [formPlayerId, setFormPlayerId] = useState('');
  const [formKills, setFormKills] = useState(0);
  const [formDeaths, setFormDeaths] = useState(0);
  const [formAssists, setFormAssists] = useState(0);
  const [formDamage, setFormDamage] = useState(0);
  const [formMatches, setFormMatches] = useState(1);
  const [newPlayerNick, setNewPlayerNick] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [fetchedSeasons, fetchedPlayers] = await Promise.all([
        db.getSeasons(),
        db.getPlayers()
      ]);
      setSeasons(fetchedSeasons);
      setPlayers(fetchedPlayers);
      
      // Sempre seleciona a temporada mais recente (primeira da lista ordenada por created_at DESC)
      if (fetchedSeasons.length > 0) {
        setSelectedSeasonId(fetchedSeasons[0].id);
      }
    } catch (error) {
      console.error("Erro ao carregar dados do Supabase:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRanking = useCallback(async () => {
    if (selectedSeasonId) {
      const data = await db.getRanking(selectedSeasonId);
      setRanking(data);
    }
  }, [selectedSeasonId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadRanking();
  }, [selectedSeasonId, loadRanking]);

  const handleAddStats = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPlayerId || !selectedSeasonId) {
      alert("Selecione um jogador e uma temporada ativa.");
      return;
    }

    try {
      await db.saveMatchStats({
        player_id: formPlayerId,
        season_id: selectedSeasonId,
        kills: formKills,
        deaths: formDeaths,
        assists: formAssists,
        damage: formDamage,
        match_count: formMatches
      });

      // Reset Form
      setFormKills(0);
      setFormDeaths(0);
      setFormAssists(0);
      setFormDamage(0);
      setFormMatches(1);
      
      alert('Estatísticas registradas com sucesso!');
      await loadRanking();
      setView(ViewMode.RANKING);
    } catch (error) {
      alert("Erro ao salvar estatísticas. Verifique sua conexão com o Supabase.");
    }
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerNick.trim()) return;
    try {
      await db.addPlayer(newPlayerNick.trim());
      setNewPlayerNick('');
      const fetchedPlayers = await db.getPlayers();
      setPlayers(fetchedPlayers);
      alert('Jogador adicionado!');
    } catch (error) {
      alert("Erro ao adicionar jogador. O Nick pode já estar em uso.");
    }
  };

  const generateAIInsight = async () => {
    if (ranking.length === 0) return;
    setAiLoading(true);
    const season = seasons.find(s => s.id === selectedSeasonId);
    const insight = await getPlayerInsights(ranking, season?.name || 'Temporada');
    setAiInsight(insight);
    setAiLoading(false);
    setView(ViewMode.INSIGHTS);
  };

  return (
    <div className="min-h-screen flex flex-col items-center pb-20 pt-8 px-4 sm:px-8">
      {/* Header */}
      <header className="w-full max-w-6xl flex flex-col md:flex-row justify-between items-center mb-10 space-y-4 md:space-y-0">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-500/30">
            <IconTrophy />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white uppercase">X5 Friends <span className="text-indigo-500">Pro</span></h1>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">E-Sports Stats Tracker</p>
          </div>
        </div>

        <nav className="flex space-x-2 bg-slate-900/50 p-1.5 rounded-xl border border-slate-800">
          <button 
            onClick={() => setView(ViewMode.RANKING)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${view === ViewMode.RANKING ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white'}`}
          >
            Ranking
          </button>
          <button 
            onClick={() => setView(ViewMode.REGISTER)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${view === ViewMode.REGISTER ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white'}`}
          >
            Registrar
          </button>
          <button 
            onClick={generateAIInsight}
            disabled={aiLoading}
            className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center space-x-2 transition-all ${view === ViewMode.INSIGHTS ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            {aiLoading ? <IconRefresh className="animate-spin" /> : <IconSparkles />}
            <span>Análise IA</span>
          </button>
        </nav>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-6xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Conectando ao Supabase...</p>
          </div>
        ) : (
          <>
            {view === ViewMode.RANKING && (
              <div className="space-y-6">
                {/* Season Filter */}
                <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-2xl gap-4">
                  <div className="flex items-center space-x-4 w-full sm:w-auto">
                    <label className="text-slate-400 text-sm font-bold uppercase whitespace-nowrap">Temporada:</label>
                    <select 
                      value={selectedSeasonId}
                      onChange={(e) => setSelectedSeasonId(e.target.value)}
                      className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5 outline-none"
                    >
                      {seasons.length > 0 ? seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>) : <option>Nenhuma temporada encontrada</option>}
                    </select>
                  </div>
                  <div className="text-slate-500 text-xs font-mono uppercase">
                    Total: {ranking.length} Ativos nesta Season
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-800/50 text-slate-400 text-[10px] uppercase tracking-widest font-bold">
                        <th className="px-6 py-4"># Pos</th>
                        <th className="px-6 py-4">Nick</th>
                        <th className="px-6 py-4 text-center">Partidas</th>
                        <th className="px-6 py-4 text-center">Vítimas</th>
                        <th className="px-6 py-4 text-center">Mortes</th>
                        <th className="px-6 py-4 text-center text-indigo-400">Assists</th>
                        <th className="px-6 py-4 text-center">Dano Total</th>
                        <th className="px-6 py-4 text-center text-indigo-400">Dano/M</th>
                        <th className="px-6 py-4 text-right text-emerald-400">K/D</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {ranking.length > 0 ? ranking.map((row, index) => (
                        <tr key={row.player_id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs ${index === 0 ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20' : index === 1 ? 'bg-slate-300 text-black' : index === 2 ? 'bg-orange-400 text-black' : 'bg-slate-800 text-slate-400'}`}>
                              {index + 1}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-100">{row.nick}</td>
                          <td className="px-6 py-4 text-center mono text-slate-400">{row.matches}</td>
                          <td className="px-6 py-4 text-center mono text-slate-300 font-semibold">{row.kills}</td>
                          <td className="px-6 py-4 text-center mono text-slate-500">{row.deaths}</td>
                          <td className="px-6 py-4 text-center mono text-slate-400">{row.assists}</td>
                          <td className="px-6 py-4 text-center mono text-slate-400">{row.damage.toLocaleString()}</td>
                          <td className="px-6 py-4 text-center mono text-indigo-300 font-medium">{row.avg_damage}</td>
                          <td className="px-6 py-4 text-right mono font-extrabold text-emerald-400">{row.kd.toFixed(2)}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={9} className="px-6 py-20 text-center text-slate-500 uppercase tracking-widest text-sm">
                            Nenhum dado encontrado para a temporada selecionada.<br/>
                            <span className="text-xs font-normal lowercase">Comece registrando uma partida!</span>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {view === ViewMode.REGISTER && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Stats Form */}
                <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl">
                  <h3 className="text-lg font-bold text-white mb-6 uppercase flex items-center space-x-2">
                    <IconPlus /> <span>Lançar Estatísticas</span>
                  </h3>
                  <form onSubmit={handleAddStats} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="col-span-1 md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Jogador</label>
                        <select 
                          required
                          value={formPlayerId}
                          onChange={(e) => setFormPlayerId(e.target.value)}
                          className="bg-slate-800 border border-slate-700 text-white rounded-lg block w-full p-3 outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Selecione um jogador...</option>
                          {players.map(p => <option key={p.id} value={p.id}>{p.nick}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Partidas</label>
                        <input type="number" value={formMatches} onChange={(e) => setFormMatches(Number(e.target.value))} min="1" className="bg-slate-800 border border-slate-700 text-white rounded-lg block w-full p-3 outline-none" required />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Kills (Vítimas)</label>
                        <input type="number" value={formKills} onChange={(e) => setFormKills(Number(e.target.value))} min="0" className="bg-slate-800 border border-slate-700 text-white rounded-lg block w-full p-3 outline-none" required />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Mortes</label>
                        <input type="number" value={formDeaths} onChange={(e) => setFormDeaths(Number(e.target.value))} min="0" className="bg-slate-800 border border-slate-700 text-white rounded-lg block w-full p-3 outline-none" required />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Assistências</label>
                        <input type="number" value={formAssists} onChange={(e) => setFormAssists(Number(e.target.value))} min="0" className="bg-slate-800 border border-slate-700 text-white rounded-lg block w-full p-3 outline-none" required />
                      </div>
                      <div className="col-span-1 md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Dano Total</label>
                        <input type="number" value={formDamage} onChange={(e) => setFormDamage(Number(e.target.value))} min="0" className="bg-slate-800 border border-slate-700 text-white rounded-lg block w-full p-3 outline-none" required />
                      </div>
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-indigo-600/20 uppercase tracking-widest text-sm mt-4">
                      Salvar Estatísticas
                    </button>
                  </form>
                </div>

                {/* Player Management */}
                <div className="space-y-8">
                  <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl">
                    <h3 className="text-lg font-bold text-white mb-6 uppercase">Novo Jogador</h3>
                    <form onSubmit={handleAddPlayer} className="flex space-x-2">
                      <input 
                        type="text" 
                        placeholder="Nick do Jogador..." 
                        value={newPlayerNick}
                        onChange={(e) => setNewPlayerNick(e.target.value)}
                        className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500"
                        required 
                      />
                      <button type="submit" className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-6 rounded-lg transition-all uppercase text-xs">
                        Adicionar
                      </button>
                    </form>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl">
                    <h3 className="text-lg font-bold text-white mb-6 uppercase">Jogadores Cadastrados</h3>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                      {players.map(p => (
                        <div key={p.id} className="bg-slate-800/50 p-2 px-4 rounded border border-slate-700 text-slate-300 text-sm font-medium">
                          {p.nick}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {view === ViewMode.INSIGHTS && (
              <div className="max-w-3xl mx-auto space-y-8">
                <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/30 p-10 rounded-3xl shadow-2xl backdrop-blur-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <IconSparkles />
                  </div>
                  
                  <h2 className="text-3xl font-black text-white mb-8 uppercase italic flex items-center space-x-3">
                    <span className="text-indigo-400">#</span> 
                    <span>Relatório do Analista IA</span>
                  </h2>
                  
                  {aiInsight ? (
                    <div className="prose prose-invert prose-indigo max-w-none text-slate-300 leading-relaxed space-y-6 text-lg">
                      {aiInsight.split('\n').map((para, i) => (
                        <p key={i}>{para}</p>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-slate-500 uppercase font-bold tracking-widest">
                      Nenhuma análise gerada ainda.
                    </div>
                  )}

                  <div className="mt-12 pt-8 border-t border-slate-800 flex justify-between items-center">
                    <div className="flex items-center space-x-2 text-slate-500 text-xs uppercase font-bold tracking-widest">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                      <span>Gemini-3 Flash Active</span>
                    </div>
                    <button 
                      onClick={() => setView(ViewMode.RANKING)}
                      className="text-indigo-400 hover:text-white transition-colors text-sm font-bold uppercase"
                    >
                      Voltar ao Ranking
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {ranking.slice(0, 3).map((player, idx) => (
                    <div key={player.player_id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center shadow-lg transform hover:-translate-y-1 transition-all">
                      <div className={`text-2xl font-black mb-1 ${idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-slate-300' : 'text-orange-400'}`}>
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                      </div>
                      <div className="text-white font-bold text-sm uppercase truncate">{player.nick}</div>
                      <div className="text-slate-500 text-[10px] uppercase font-bold">MVP Candidate</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Persistent Call-to-Action for Mobile */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-xs md:hidden z-50">
        <button 
          onClick={() => setView(view === ViewMode.REGISTER ? ViewMode.RANKING : ViewMode.REGISTER)}
          className="w-full bg-indigo-600 text-white font-bold py-4 rounded-full shadow-2xl shadow-indigo-500/40 flex items-center justify-center space-x-2 border-2 border-white/10"
        >
          {view === ViewMode.REGISTER ? <IconTrophy /> : <IconPlus />}
          <span>{view === ViewMode.REGISTER ? 'Ver Ranking' : 'Lançar Stats'}</span>
        </button>
      </div>

      {/* Footer Info */}
      <footer className="mt-20 text-slate-600 text-[10px] uppercase tracking-widest font-bold text-center">
        &copy; 2024 X5 FRIENDS PRO RANKING SYSTEM • POWERED BY GEMINI 3 & SUPABASE
      </footer>
    </div>
  );
};

export default App;
