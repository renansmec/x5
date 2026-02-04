
import React, { useState } from 'react';
import { Player, Season, PlayerStats } from '../types';

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
}

interface ConfirmModalState {
  isOpen: boolean;
  type: 'player' | 'season' | null;
  id: string;
  name: string;
}

interface EditModalState {
  isOpen: boolean;
  type: 'player' | 'season' | null;
  id: string;
  value: string;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  players, 
  seasons, 
  onAddPlayer, 
  onEditPlayer,
  onDeletePlayer,
  onAddSeason, 
  onEditSeason,
  onDeleteSeason,
  onUpdateStats 
}) => {
  const [newPlayerNick, setNewPlayerNick] = useState('');
  const [newSeasonName, setNewSeasonName] = useState('');
  
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [matchData, setMatchData] = useState({
    matches: 0,
    kills: 0,
    deaths: 0,
    assists: 0,
    damage: 0
  });

  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    isOpen: false,
    type: null,
    id: '',
    name: ''
  });

  const [editModal, setEditModal] = useState<EditModalState>({
    isOpen: false,
    type: null,
    id: '',
    value: ''
  });

  const handleUpdateStats = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayerId || !selectedSeasonId) return;
    onUpdateStats({
      playerId: selectedPlayerId,
      seasonId: selectedSeasonId,
      ...matchData
    });
    alert('Estatísticas atualizadas com sucesso!');
  };

  const openConfirmModal = (type: 'player' | 'season', id: string, name: string) => {
    setConfirmModal({ isOpen: true, type, id, name });
  };

  const closeConfirmModal = () => {
    setConfirmModal({ isOpen: false, type: null, id: '', name: '' });
  };

  const openEditModal = (type: 'player' | 'season', id: string, value: string) => {
    setEditModal({ isOpen: true, type, id, value });
  };

  const closeEditModal = () => {
    setEditModal({ isOpen: false, type: null, id: '', value: '' });
  };

  const executeDelete = () => {
    if (confirmModal.type === 'player') onDeletePlayer(confirmModal.id);
    else if (confirmModal.type === 'season') onDeleteSeason(confirmModal.id);
    closeConfirmModal();
  };

  const executeEdit = () => {
    if (!editModal.value.trim()) return;
    if (editModal.type === 'player') onEditPlayer(editModal.id, editModal.value);
    else if (editModal.type === 'season') onEditSeason(editModal.id, editModal.value);
    closeEditModal();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative">
      {/* Confirmation Modal Overlay */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-800 border border-slate-700 p-8 rounded-2xl shadow-2xl max-w-md w-full transform animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h4 className="text-xl font-gaming font-bold text-center mb-2 text-slate-100">Confirmar Exclusão</h4>
            <p className="text-slate-400 text-center mb-8">
              Tem certeza que deseja excluir {confirmModal.type === 'player' ? 'o jogador' : 'a temporada'} <strong className="text-slate-100">"{confirmModal.name}"</strong>? 
              Esta ação removerá permanentemente todos os dados vinculados e não pode ser desfeita.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={closeConfirmModal}
                className="flex-1 bg-slate-700 hover:bg-slate-600 px-6 py-3 rounded-xl font-bold transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={executeDelete}
                className="flex-1 bg-rose-600 hover:bg-rose-700 px-6 py-3 rounded-xl font-bold transition-colors shadow-lg shadow-rose-600/20"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal Overlay */}
      {editModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-800 border border-slate-700 p-8 rounded-2xl shadow-2xl max-w-md w-full transform animate-in zoom-in-95 duration-200">
            <h4 className="text-xl font-gaming font-bold text-center mb-6 text-slate-100">
              Editar {editModal.type === 'player' ? 'Jogador' : 'Temporada'}
            </h4>
            <div className="space-y-4 mb-8">
              <label className="block text-sm font-bold text-slate-500 uppercase tracking-widest">Novo Nome</label>
              <input 
                type="text" 
                value={editModal.value}
                onChange={(e) => setEditModal({...editModal, value: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 shadow-lg"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && executeEdit()}
              />
            </div>
            <div className="flex gap-4">
              <button 
                onClick={closeEditModal}
                className="flex-1 bg-slate-700 hover:bg-slate-600 px-6 py-3 rounded-xl font-bold transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={executeEdit}
                className="flex-1 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-bold transition-colors shadow-lg shadow-blue-600/20"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cadastro e Listas */}
      <div className="space-y-8">
        {/* Gestão de Jogadores */}
        <section className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-xl font-gaming font-bold mb-4 flex items-center gap-2 text-slate-100">
            <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
            Gestão de Jogadores
          </h3>
          <div className="flex gap-2 mb-6">
            <input 
              type="text" 
              value={newPlayerNick}
              onChange={(e) => setNewPlayerNick(e.target.value)}
              placeholder="Nick do novo jogador..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button 
              onClick={() => { onAddPlayer(newPlayerNick); setNewPlayerNick(''); }}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-bold transition-colors"
            >
              Adicionar
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {players.length === 0 && <p className="text-slate-500 text-sm italic">Nenhum jogador cadastrado.</p>}
            {players.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-slate-900/50 p-3 rounded border border-slate-700/50 hover:border-slate-600 transition-colors">
                <span className="font-medium text-slate-200">{p.nick}</span>
                <div className="flex gap-1">
                  <button 
                    onClick={() => openEditModal('player', p.id, p.nick)}
                    className="text-slate-400 hover:text-blue-400 p-1.5 rounded hover:bg-blue-400/10 transition-colors"
                    title="Editar jogador"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                  <button 
                    onClick={() => openConfirmModal('player', p.id, p.nick)}
                    className="text-slate-400 hover:text-rose-500 p-1.5 rounded hover:bg-rose-500/10 transition-colors"
                    title="Excluir jogador"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Gestão de Temporadas */}
        <section className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-xl font-gaming font-bold mb-4 flex items-center gap-2 text-slate-100">
            <span className="w-2 h-6 bg-purple-500 rounded-full"></span>
            Gestão de Temporadas
          </h3>
          <div className="flex gap-2 mb-6">
            <input 
              type="text" 
              value={newSeasonName}
              onChange={(e) => setNewSeasonName(e.target.value)}
              placeholder="Nome da nova temporada..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
            />
            <button 
              onClick={() => { onAddSeason(newSeasonName); setNewSeasonName(''); }}
              className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded font-bold transition-colors"
            >
              Criar
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {seasons.length === 0 && <p className="text-slate-500 text-sm italic">Nenhuma temporada cadastrada.</p>}
            {seasons.map(s => (
              <div key={s.id} className="flex items-center justify-between bg-slate-900/50 p-3 rounded border border-slate-700/50 hover:border-slate-600 transition-colors">
                <span className="font-medium text-slate-200">{s.name}</span>
                <div className="flex gap-1">
                  <button 
                    onClick={() => openEditModal('season', s.id, s.name)}
                    className="text-slate-400 hover:text-blue-400 p-1.5 rounded hover:bg-blue-400/10 transition-colors"
                    title="Editar temporada"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                  <button 
                    onClick={() => openConfirmModal('season', s.id, s.name)}
                    className="text-slate-400 hover:text-rose-500 p-1.5 rounded hover:bg-rose-500/10 transition-colors"
                    title="Excluir temporada"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Registro de Stats */}
      <div className="space-y-8">
        <section className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-xl font-gaming font-bold mb-4 flex items-center gap-2 text-slate-100">
            <span className="w-2 h-6 bg-yellow-500 rounded-full"></span>
            Registrar/Atualizar Stats
          </h3>
          <form onSubmit={handleUpdateStats} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Jogador</label>
                <select 
                  value={selectedPlayerId}
                  onChange={(e) => setSelectedPlayerId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 outline-none focus:border-yellow-500/50"
                  required
                >
                  <option value="">Selecione...</option>
                  {players.map(p => <option key={p.id} value={p.id}>{p.nick}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Temporada</label>
                <select 
                  value={selectedSeasonId}
                  onChange={(e) => setSelectedSeasonId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 outline-none focus:border-yellow-500/50"
                  required
                >
                  <option value="">Selecione...</option>
                  {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Partidas</label>
                <input 
                  type="number" 
                  min="0"
                  value={matchData.matches}
                  onChange={(e) => setMatchData({...matchData, matches: parseInt(e.target.value) || 0})}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Dano Total</label>
                <input 
                  type="number" 
                  min="0"
                  value={matchData.damage}
                  onChange={(e) => setMatchData({...matchData, damage: parseInt(e.target.value) || 0})}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1 text-emerald-400 font-bold">Vítimas</label>
                <input 
                  type="number" 
                  min="0"
                  value={matchData.kills}
                  onChange={(e) => setMatchData({...matchData, kills: parseInt(e.target.value) || 0})}
                  className="w-full bg-slate-900 border border-emerald-500/30 rounded px-3 py-2 outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1 text-rose-400 font-bold">Mortes</label>
                <input 
                  type="number" 
                  min="0"
                  value={matchData.deaths}
                  onChange={(e) => setMatchData({...matchData, deaths: parseInt(e.target.value) || 0})}
                  className="w-full bg-slate-900 border border-rose-500/30 rounded px-3 py-2 outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1 text-sky-400 font-bold">Assists</label>
                <input 
                  type="number" 
                  min="0"
                  value={matchData.assists}
                  onChange={(e) => setMatchData({...matchData, assists: parseInt(e.target.value) || 0})}
                  className="w-full bg-slate-900 border border-sky-500/30 rounded px-3 py-2 outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={players.length === 0 || seasons.length === 0}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed py-4 rounded-lg font-bold text-lg transition-all transform hover:scale-[1.01] active:scale-95 shadow-lg shadow-emerald-500/20"
            >
              Salvar Estatísticas
            </button>
          </form>
        </section>

        {/* Tip Informativo */}
        <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800 text-slate-400 text-sm italic">
          <p>Dica: O ranking é calculado usando Vítimas / Mortes. Jogadores invictos (0 mortes) recebem o total de kills como pontuação K/D.</p>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #0f172a;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
      `}</style>
    </div>
  );
};

export default AdminPanel;
