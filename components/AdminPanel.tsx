
import React, { useState, useRef } from 'react';
import { Player, Season, PlayerStats, ViewType } from '../types';

interface AdminPanelProps {
  players: Player[];
  seasons: Season[];
  stats: PlayerStats[];
  onAddPlayer: (nick: string) => void;
  onEditPlayer: (id: string, newNick: string) => void;
  onDeletePlayer: (id: string) => void;
  onAddSeason: (name: string) => void;
  onEditSeason: (id: string, newName: string) => void;
  onDeleteSeason: (id: string) => void;
  onUpdateStats: (entry: Omit<PlayerStats, 'id'>) => void;
  onResetData: () => void;
  onSetView: (view: ViewType) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  players, seasons, stats,
  onAddPlayer, onEditPlayer, onDeletePlayer,
  onAddSeason, onEditSeason, onDeleteSeason,
  onUpdateStats, onResetData, onSetView
}) => {
  const [newPlayerNick, setNewPlayerNick] = useState('');
  const [newSeasonName, setNewSeasonName] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [matchData, setMatchData] = useState({ matches: 0, kills: 0, deaths: 0, assists: 0, damage: 0 });
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Verifica se existe a variável de ambiente para mostrar o status correto
  const isCloudEnabled = !!process.env.MONGODB_DATA_API_KEY;

  const handleUpdateStats = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayerId || !selectedSeasonId) return;
    setIsSaving(true);
    
    // Sincroniza os dados via Props (que chama o db.updateStats no App.tsx)
    onUpdateStats({
      playerId: selectedPlayerId,
      seasonId: selectedSeasonId,
      ...matchData
    });
    
    // Pequeno delay para garantir UX suave durante o push
    await new Promise(r => setTimeout(r, 800));
    
    setIsSaving(false);
    setSaveSuccess(true);
    setMatchData({ matches: 0, kills: 0, deaths: 0, assists: 0, damage: 0 });
    setTimeout(() => setSaveSuccess(false), 4000);
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-3xl font-gaming font-bold">Gerenciamento Atlas Cloud</h2>
        <div className={`flex items-center gap-2 px-4 py-2 border rounded-full ${isCloudEnabled ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
          <span className={`w-2.5 h-2.5 rounded-full ${isCloudEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
          <span className={`text-xs font-bold uppercase tracking-widest ${isCloudEnabled ? 'text-emerald-400' : 'text-amber-400'}`}>
            {isCloudEnabled ? 'Conectado ao MongoDB Atlas (Vercel)' : 'Modo Offline (LocalStorage)'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gestão de Entidades */}
        <div className="space-y-8">
          <section className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 shadow-lg">
            <h3 className="text-lg font-bold mb-4 text-blue-400 uppercase tracking-widest flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
              Jogadores Registrados
            </h3>
            <div className="flex gap-2 mb-4">
              <input type="text" value={newPlayerNick} onChange={(e) => setNewPlayerNick(e.target.value)} placeholder="Nick do novo player..." className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 outline-none focus:ring-1 focus:ring-blue-500" />
              <button onClick={() => { if(newPlayerNick) { onAddPlayer(newPlayerNick); setNewPlayerNick(''); } }} className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-xl font-bold transition-all">Add</button>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-2 custom-scrollbar pr-2">
              {players.length === 0 && <p className="text-slate-500 text-sm italic">Nenhum jogador na base.</p>}
              {players.map(p => (
                <div key={p.id} className="flex justify-between items-center p-3 bg-slate-800/40 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-colors group">
                  <span className="text-slate-200 font-bold">{p.nick}</span>
                  <button onClick={() => onDeletePlayer(p.id)} className="text-rose-500 p-1 hover:bg-rose-500/10 rounded transition-all">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 shadow-lg">
            <h3 className="text-lg font-bold mb-4 text-purple-400 uppercase tracking-widest flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
              Temporadas Ativas
            </h3>
            <div className="flex gap-2 mb-4">
              <input type="text" value={newSeasonName} onChange={(e) => setNewSeasonName(e.target.value)} placeholder="Nome da temporada..." className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 outline-none focus:ring-1 focus:ring-purple-500" />
              <button onClick={() => { if(newSeasonName) { onAddSeason(newSeasonName); setNewSeasonName(''); } }} className="bg-purple-600 hover:bg-purple-500 px-6 py-2 rounded-xl font-bold transition-all">Criar</button>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-2 custom-scrollbar pr-2">
              {seasons.map(s => (
                <div key={s.id} className="flex justify-between items-center p-3 bg-slate-800/40 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-colors">
                  <span className="text-slate-200 font-bold">{s.name}</span>
                  <button onClick={() => onDeleteSeason(s.id)} className="text-rose-500 p-1 hover:bg-rose-500/10 rounded transition-all">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Registro Assíncrono */}
        <div className="space-y-8">
          <section className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-2xl relative overflow-hidden h-full">
            {saveSuccess && (
              <div className="absolute inset-0 bg-emerald-600/90 backdrop-blur-sm flex flex-col items-center justify-center animate-in zoom-in duration-300 z-30">
                <div className="bg-white text-emerald-600 w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-2xl">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <h4 className="text-2xl font-bold text-white mb-2">DB Sincronizado!</h4>
                <p className="text-emerald-100 mb-6">Dados registrados no MongoDB Cloud.</p>
                <div className="flex gap-4">
                  <button onClick={() => setSaveSuccess(false)} className="bg-emerald-700 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-800 transition-all">Novo Registro</button>
                  <button onClick={() => onSetView('ranking')} className="bg-white text-emerald-950 px-6 py-2 rounded-xl font-bold hover:bg-slate-100 transition-all">Ver Ranking</button>
                </div>
              </div>
            )}
            
            <h3 className="text-xl font-gaming font-bold mb-6 text-emerald-400 flex items-center gap-2">
              <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
              Contabilizar Novas Partidas
            </h3>
            
            <form onSubmit={handleUpdateStats} className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Atleta</label>
                    <select value={selectedPlayerId} onChange={(e) => setSelectedPlayerId(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 outline-none focus:border-emerald-500 transition-all text-slate-200">
                      <option value="">Selecionar Jogador...</option>
                      {players.map(p => <option key={p.id} value={p.id}>{p.nick}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Competição</label>
                    <select value={selectedSeasonId} onChange={(e) => setSelectedSeasonId(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 outline-none focus:border-emerald-500 transition-all text-slate-200">
                      <option value="">Selecionar Temporada...</option>
                      {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Jogos (+)</label>
                    <input type="number" min="0" value={matchData.matches} onChange={e => setMatchData({...matchData, matches: parseInt(e.target.value) || 0})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Dano (+)</label>
                    <input type="number" min="0" value={matchData.damage} onChange={e => setMatchData({...matchData, damage: parseInt(e.target.value) || 0})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4" />
                  </div>
               </div>

               <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-emerald-500 uppercase">Kills</label>
                    <input type="number" min="0" value={matchData.kills} onChange={e => setMatchData({...matchData, kills: parseInt(e.target.value) || 0})} className="w-full bg-slate-900 border border-emerald-500/20 rounded-xl p-4 text-emerald-400 font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-rose-500 uppercase">Deaths</label>
                    <input type="number" min="0" value={matchData.deaths} onChange={e => setMatchData({...matchData, deaths: parseInt(e.target.value) || 0})} className="w-full bg-slate-900 border border-rose-500/20 rounded-xl p-4 text-rose-400 font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-sky-500 uppercase">Assists</label>
                    <input type="number" min="0" value={matchData.assists} onChange={e => setMatchData({...matchData, assists: parseInt(e.target.value) || 0})} className="w-full bg-slate-900 border border-sky-500/20 rounded-xl p-4 text-sky-400 font-bold" />
                  </div>
               </div>

               <button type="submit" disabled={isSaving || !selectedPlayerId || !selectedSeasonId} className="w-full bg-emerald-600 hover:bg-emerald-500 py-5 rounded-2xl font-bold text-xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-emerald-900/20 disabled:opacity-50">
                  {isSaving ? (
                    <>
                      <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Enviando para o Atlas...</span>
                    </>
                  ) : 'Atualizar Cloud DB'}
               </button>
            </form>

            <div className="mt-8 pt-8 border-t border-slate-700/50">
              <button onClick={onResetData} className="w-full bg-rose-950/20 hover:bg-rose-950/40 text-rose-500 border border-rose-900/30 py-4 rounded-xl font-bold transition-all text-sm uppercase tracking-widest">Wipe Data: Resetar Tudo</button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
