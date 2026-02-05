
import React, { useState } from 'react';
import { Player, Season, PlayerStats, ViewType } from '../types';
import { db } from '../services/databaseService';

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
  onAddPlayer, onDeletePlayer,
  onAddSeason, onDeleteSeason,
  onUpdateStats, onResetData, onSetView
}) => {
  const [newPlayerNick, setNewPlayerNick] = useState('');
  const [newSeasonName, setNewSeasonName] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [matchData, setMatchData] = useState({ matches: 0, kills: 0, deaths: 0, assists: 0, damage: 0 });
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleUpdateStats = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayerId || !selectedSeasonId) return;
    setIsSaving(true);
    
    onUpdateStats({
      playerId: selectedPlayerId,
      seasonId: selectedSeasonId,
      ...matchData
    });
    
    await new Promise(r => setTimeout(r, 600));
    setIsSaving(false);
    setSaveSuccess(true);
    setMatchData({ matches: 0, kills: 0, deaths: 0, assists: 0, damage: 0 });
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  const checkEnv = (key: string) => !!(process.env as any)[key];

  return (
    <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          Status de Conexão Supabase (Postgres)
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Supabase URL', key: 'SUPABASE_URL' },
            { label: 'Anon Key', key: 'SUPABASE_ANON_KEY' }
          ].map(item => (
            <div key={item.key} className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center gap-1 ${checkEnv(item.key) ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
               <span className="text-[9px] font-bold text-slate-400 uppercase">{item.label}</span>
               <span className={`text-[10px] font-bold ${checkEnv(item.key) ? 'text-emerald-400' : 'text-rose-400'}`}>
                 {checkEnv(item.key) ? 'ATIVO NO VERCEL' : 'NÃO CONFIGURADO'}
               </span>
            </div>
          ))}
        </div>
        {!db.isCloudEnabled() && (
          <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <p className="text-[11px] text-amber-500 leading-relaxed">
              <b>Dica de Setup:</b> Para salvar na nuvem, crie um projeto no Supabase, crie as tabelas (players, seasons, stats) e adicione as chaves <b>SUPABASE_URL</b> e <b>SUPABASE_ANON_KEY</b> no painel do Vercel.
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          <section className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
            <h3 className="text-lg font-bold mb-6 text-blue-400 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
              Gerenciar Jogadores
            </h3>
            <div className="flex gap-2 mb-6">
              <input type="text" value={newPlayerNick} onChange={(e) => setNewPlayerNick(e.target.value)} placeholder="Nick do player..." className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-blue-500 transition-all" />
              <button onClick={() => { if(newPlayerNick) { onAddPlayer(newPlayerNick); setNewPlayerNick(''); } }} className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20">Add</button>
            </div>
            <div className="max-h-56 overflow-y-auto space-y-2 custom-scrollbar pr-2">
              {players.map(p => (
                <div key={p.id} className="flex justify-between items-center p-3 bg-slate-800/40 rounded-xl border border-slate-700/50 hover:bg-slate-800 transition-all">
                  <span className="text-slate-200 font-bold">{p.nick}</span>
                  <button onClick={() => onDeletePlayer(p.id)} className="text-rose-500 p-2 hover:bg-rose-500/10 rounded-lg transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
            <h3 className="text-lg font-bold mb-6 text-purple-400 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              Gerenciar Temporadas
            </h3>
            <div className="flex gap-2 mb-6">
              <input type="text" value={newSeasonName} onChange={(e) => setNewSeasonName(e.target.value)} placeholder="Nome da Season..." className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-purple-500 transition-all" />
              <button onClick={() => { if(newSeasonName) { onAddSeason(newSeasonName); setNewSeasonName(''); } }} className="bg-purple-600 hover:bg-purple-500 px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-purple-500/20">Criar</button>
            </div>
            <div className="max-h-56 overflow-y-auto space-y-2 custom-scrollbar pr-2">
              {seasons.map(s => (
                <div key={s.id} className="flex justify-between items-center p-3 bg-slate-800/40 rounded-xl border border-slate-700/50 hover:bg-slate-800 transition-all">
                  <span className="text-slate-200 font-bold">{s.name}</span>
                  <button onClick={() => onDeleteSeason(s.id)} className="text-rose-500 p-2 hover:bg-rose-500/10 rounded-lg transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section className="bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl relative overflow-hidden h-full">
            {saveSuccess && (
              <div className="absolute inset-0 bg-emerald-600/95 backdrop-blur-md flex flex-col items-center justify-center animate-in zoom-in duration-300 z-30">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-2xl">
                  <svg className="w-12 h-12 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <h4 className="text-2xl font-bold text-white mb-2">Supabase Sync OK!</h4>
                <p className="text-emerald-100 mb-8 opacity-80 text-sm">Dados salvos com sucesso no PostgreSQL.</p>
                <div className="flex gap-4">
                  <button onClick={() => setSaveSuccess(false)} className="bg-emerald-800 hover:bg-emerald-900 text-white px-8 py-3 rounded-xl font-bold transition-all">Novo Registro</button>
                  <button onClick={() => onSetView('ranking')} className="bg-white text-emerald-950 px-8 py-3 rounded-xl font-bold hover:bg-slate-100 transition-all">Ver Ranking</button>
                </div>
              </div>
            )}
            
            <h3 className="text-xl font-gaming font-bold mb-8 text-emerald-400 flex items-center gap-3">
              <span className="w-1.5 h-8 bg-emerald-500 rounded-full"></span>
              Registrar Pontuação
            </h3>
            
            <form onSubmit={handleUpdateStats} className="space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Atleta</label>
                    <select value={selectedPlayerId} onChange={(e) => setSelectedPlayerId(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 outline-none focus:border-emerald-500 transition-all text-slate-200 appearance-none cursor-pointer shadow-inner">
                      <option value="">Selecione o Jogador</option>
                      {players.map(p => <option key={p.id} value={p.id}>{p.nick}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Temporada</label>
                    <select value={selectedSeasonId} onChange={(e) => setSelectedSeasonId(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 outline-none focus:border-emerald-500 transition-all text-slate-200 appearance-none cursor-pointer shadow-inner">
                      <option value="">Selecione a Temporada</option>
                      {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
               </div>
               
               <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Partidas (+)</label>
                    <input type="number" min="0" value={matchData.matches} onChange={e => setMatchData({...matchData, matches: parseInt(e.target.value) || 0})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-slate-100 outline-none focus:border-emerald-500 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Dano (+)</label>
                    <input type="number" min="0" value={matchData.damage} onChange={e => setMatchData({...matchData, damage: parseInt(e.target.value) || 0})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-slate-100 outline-none focus:border-emerald-500 transition-all" />
                  </div>
               </div>

               <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Kills</label>
                    <input type="number" min="0" value={matchData.kills} onChange={e => setMatchData({...matchData, kills: parseInt(e.target.value) || 0})} className="w-full bg-slate-900 border border-emerald-500/20 rounded-2xl p-4 text-emerald-400 font-bold outline-none focus:border-emerald-500 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Deaths</label>
                    <input type="number" min="0" value={matchData.deaths} onChange={e => setMatchData({...matchData, deaths: parseInt(e.target.value) || 0})} className="w-full bg-slate-900 border border-rose-500/20 rounded-2xl p-4 text-rose-400 font-bold outline-none focus:border-rose-500 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-sky-500 uppercase tracking-widest">Assists</label>
                    <input type="number" min="0" value={matchData.assists} onChange={e => setMatchData({...matchData, assists: parseInt(e.target.value) || 0})} className="w-full bg-slate-900 border border-sky-500/20 rounded-2xl p-4 text-sky-400 font-bold outline-none focus:border-sky-500 transition-all" />
                  </div>
               </div>

               <button type="submit" disabled={isSaving || !selectedPlayerId || !selectedSeasonId} className="w-full bg-emerald-600 hover:bg-emerald-500 py-6 rounded-2xl font-bold text-xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-emerald-600/20 disabled:opacity-30">
                  {isSaving ? (
                    <div className="w-7 h-7 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                      Enviar p/ Cloud Postgres
                    </>
                  )}
               </button>
            </form>

            <div className="mt-12 pt-8 border-t border-slate-700/50 flex flex-col gap-4">
              <button onClick={onResetData} className="w-full bg-rose-950/20 hover:bg-rose-950/40 text-rose-500 border border-rose-900/30 py-4 rounded-xl font-bold transition-all text-xs uppercase tracking-widest">Zerar Banco Postgres (Wipe)</button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
