
import React, { useState, useEffect, useRef } from 'react';
import { Player, Season, PlayerStats, ViewType, ExtractedMatchData, MatchRecord } from '../types';
import { db } from '../services/databaseService';
import { extractMatchDataFromImage } from '../services/geminiService';

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
  onOverwriteStats: (entry: Omit<PlayerStats, 'id'>) => void; // Novo prop para editar
  onResetData: () => void;
  onSetView: (view: ViewType) => void;
  onPublish: () => void;
  onAddMatch: (match: MatchRecord, updatedStats: PlayerStats[]) => void;
  globalSelectedSeasonId?: string;
  setGlobalSelectedSeasonId?: (id: string) => void;
}

type FormMode = 'add' | 'edit' | 'image';

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  players, seasons, stats,
  onAddPlayer, onDeletePlayer, onEditPlayer,
  onAddSeason, onDeleteSeason,
  onUpdateStats, onOverwriteStats, onResetData, onSetView, onPublish, onAddMatch,
  globalSelectedSeasonId, setGlobalSelectedSeasonId
}) => {
  const [newPlayerNick, setNewPlayerNick] = useState('');
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null); // ID do jogador sendo editado

  const [newSeasonName, setNewSeasonName] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  
  // Usa o state global se fornecido, senão usa local
  const [localSelectedSeasonId, setLocalSelectedSeasonId] = useState('');
  const selectedSeasonId = globalSelectedSeasonId !== undefined ? globalSelectedSeasonId : localSelectedSeasonId;
  const setSelectedSeasonId = setGlobalSelectedSeasonId || setLocalSelectedSeasonId;

  const [matchData, setMatchData] = useState({ matches: 0, kills: 0, deaths: 0, assists: 0, damage: 0 });
  
  const [formMode, setFormMode] = useState<FormMode>('add');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Estados para extração de imagem
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedMatchData | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados para configuração manual
  const [manualUrl, setManualUrl] = useState('');
  const [manualKey, setManualKey] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [isConnected, setIsConnected] = useState(db.isCloudEnabled());

  useEffect(() => {
    setManualUrl(localStorage.getItem('supabase_url') || '');
    setManualKey(localStorage.getItem('supabase_anon_key') || '');
    const connected = db.isCloudEnabled();
    setIsConnected(connected);
    if (!connected) setShowConfig(true);
  }, []);

  // Efeito para carregar dados existentes quando estiver em modo de edição
  useEffect(() => {
    if (formMode === 'edit' && selectedPlayerId && selectedSeasonId) {
      const existingStat = stats.find(s => s.playerId === selectedPlayerId && s.seasonId === selectedSeasonId);
      if (existingStat) {
        setMatchData({
          matches: existingStat.matches,
          kills: existingStat.kills,
          deaths: existingStat.deaths,
          assists: existingStat.assists,
          damage: existingStat.damage
        });
      } else {
        // Se não existir dados, zera
        setMatchData({ matches: 0, kills: 0, deaths: 0, assists: 0, damage: 0 });
      }
    } else if (formMode === 'add') {
      // Se mudar para add, zera para começar limpo (ou mantém o anterior se preferir, aqui optei por zerar)
      // setMatchData({ matches: 0, kills: 0, deaths: 0, assists: 0, damage: 0 });
    }
  }, [formMode, selectedPlayerId, selectedSeasonId, stats]);

  const handleSubmitStats = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayerId || !selectedSeasonId) return;
    setIsSaving(true);
    
    const entry = {
      playerId: selectedPlayerId,
      seasonId: selectedSeasonId,
      ...matchData
    };

    if (formMode === 'add') {
      onUpdateStats(entry);
    } else {
      onOverwriteStats(entry);
    }
    
    await new Promise(r => setTimeout(r, 600));
    setIsSaving(false);
    setSaveSuccess(true);
    
    if (formMode === 'add') {
        setMatchData({ matches: 0, kills: 0, deaths: 0, assists: 0, damage: 0 });
    }
    
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  const handleSavePlayerEdit = () => {
    if (editingPlayerId && newPlayerNick.trim()) {
      onEditPlayer(editingPlayerId, newPlayerNick);
      setEditingPlayerId(null);
      setNewPlayerNick('');
    }
  };

  const startEditingPlayer = (player: Player) => {
    setEditingPlayerId(player.id);
    setNewPlayerNick(player.nick);
  };

  const saveManualConfig = () => {
    if (manualUrl && manualKey) {
      db.setCloudKeys(manualUrl.trim(), manualKey.trim());
      alert("Chaves salvas! A página será recarregada para aplicar a conexão.");
      window.location.reload();
    } else {
      alert("Preencha URL e Chave.");
    }
  };

  const clearManualConfig = () => {
    db.clearCloudKeys();
    setManualUrl('');
    setManualKey('');
    window.location.reload();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    setExtractedData(null);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      setImagePreview(base64String);
      
      // Remove o prefixo "data:image/png;base64,"
      const base64Data = base64String.split(',')[1];
      
      try {
        const data = await extractMatchDataFromImage(base64Data, file.type);
        setExtractedData(data);
      } catch (error: any) {
        alert(error.message || "Erro desconhecido ao processar imagem.");
        // Clear the preview on error so they try again
        setImagePreview(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } finally {
        setIsExtracting(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmExtractedData = async () => {
    if (!extractedData || !selectedSeasonId) {
      alert("Selecione uma temporada antes de confirmar.");
      return;
    }

    // Verifica se todos os jogadores estão vinculados
    const unlinkedPlayers = extractedData.players.filter(p => !players.some(existing => existing.nick.toLowerCase() === p.nick.toLowerCase()));
    if (unlinkedPlayers.length > 0) {
      alert(`Existem jogadores não vinculados: ${unlinkedPlayers.map(p => p.nick).join(', ')}. Por favor, vincule-os a jogadores existentes ou crie-os primeiro.`);
      return;
    }

    setIsSaving(true);

    const matchPlayers = [];
    let updatedStats = [...stats];

    for (const p of extractedData.players) {
      let player = players.find(existing => existing.nick.toLowerCase() === p.nick.toLowerCase());
      
      if (player) {
        const entry = {
          playerId: player.id,
          seasonId: selectedSeasonId,
          matches: 1, // 1 partida
          kills: p.kills,
          deaths: p.deaths,
          assists: p.assists,
          damage: p.damage,
          hsPercent: p.hsPercent
        };

        // Atualiza a lista local de stats para salvar na nuvem
        const idx = updatedStats.findIndex(s => s.playerId === entry.playerId && s.seasonId === entry.seasonId);
        if (idx > -1) {
          updatedStats[idx] = { 
            ...updatedStats[idx], 
            matches: updatedStats[idx].matches + entry.matches,
            kills: updatedStats[idx].kills + entry.kills,
            deaths: updatedStats[idx].deaths + entry.deaths,
            assists: updatedStats[idx].assists + entry.assists,
            damage: updatedStats[idx].damage + entry.damage,
            hsPercent: Math.round(((updatedStats[idx].hsPercent || 0) * updatedStats[idx].matches + (entry.hsPercent || 0)) / (updatedStats[idx].matches + entry.matches))
          };
        } else {
          updatedStats.push({ ...entry, id: `st${Date.now()}_${Math.random().toString(36).substr(2, 9)}` });
        }
        
        matchPlayers.push({
          playerId: player.id,
          nick: player.nick,
          team: p.team || 'team1',
          kills: p.kills,
          deaths: p.deaths,
          assists: p.assists,
          damage: p.damage,
          hsPercent: p.hsPercent
        });
      }
    }

    const newMatch: MatchRecord = {
      id: `m${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      seasonId: selectedSeasonId,
      map: extractedData.map,
      team1Name: extractedData.team1Name || 'TIME 1',
      team2Name: extractedData.team2Name || 'TIME 2',
      team1Score: extractedData.team1Score || 0,
      team2Score: extractedData.team2Score || 0,
      winningTeam: extractedData.winningTeam,
      date: new Date().toISOString(),
      players: matchPlayers
    };

    onAddMatch(newMatch, updatedStats);

    await new Promise(r => setTimeout(r, 600));
    setIsSaving(false);
    setSaveSuccess(true);
    setExtractedData(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  const handleEditExtractedStat = (index: number, field: string, value: any) => {
    if (!extractedData) return;
    const newData = { ...extractedData };
    newData.players[index] = { ...newData.players[index], [field]: value };
    setExtractedData(newData);
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
      {/* SEÇÃO DE DIAGNÓSTICO E CONFIGURAÇÃO */}
      <div className={`border p-6 rounded-2xl shadow-xl transition-all ${isConnected ? 'bg-slate-900 border-slate-800' : 'bg-rose-950/20 border-rose-500/50'}`}>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
            Status da Nuvem: {isConnected ? <span className="text-emerald-500">Conectado ao bando de dados</span> : <span className="text-rose-500">Desconectado / Local</span>}
          </h3>
{/*          <button onClick={() => setShowConfig(!showConfig)} className="text-xs text-blue-400 hover:underline bg-slate-800 px-3 py-1 rounded-lg">
            {showConfig ? 'Ocultar Configuração' : '⚙️ Configurar Conexão'}
          </button>*/}
        </div>
        
        {!isConnected && (
            <p className="text-xs text-rose-300 mb-4">
              ⚠️ O Painel não está conseguindo salvar na nuvem. Verifique as chaves abaixo ou edite o arquivo <code>databaseService.ts</code>.
            </p>
        )}

        {showConfig && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 border-t border-slate-700/50 pt-4 mt-4 bg-slate-950/50 p-4 rounded-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold ml-1 uppercase">Supabase URL</label>
                <input 
                  type="text" 
                  value={manualUrl} 
                  onChange={(e) => setManualUrl(e.target.value)}
                  placeholder="https://seu-projeto.supabase.co" 
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs outline-none focus:border-emerald-500 text-emerald-300 font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold ml-1 uppercase">Anon Key</label>
                <input 
                  type="password" 
                  value={manualKey} 
                  onChange={(e) => setManualKey(e.target.value)}
                  placeholder="Sua chave pública (anon)..." 
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs outline-none focus:border-emerald-500 text-emerald-300 font-mono"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={saveManualConfig}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold py-3 rounded-lg transition-all shadow-lg shadow-emerald-900/20"
              >
                SALVAR E RECONECTAR
              </button>
              <button 
                onClick={clearManualConfig}
                className="bg-rose-900/30 hover:bg-rose-900/50 text-rose-500 text-[10px] font-bold px-4 py-3 rounded-lg transition-all border border-rose-900/30"
              >
                LIMPAR
              </button>
            </div>
          </div>
        )}
      </div>

      {/* BOTÃO DE PUBLICAÇÃO GLOBAL */}
      {isConnected ? (
        <div className="bg-emerald-600/10 border border-emerald-500/20 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
           <div>
             <h4 className="text-emerald-400 font-bold">Publicar dados</h4>
             <p className="text-xs text-slate-400">Envia as alterações locais para o banco de dados oficial.</p>
           </div>
           <button onClick={onPublish} className="bg-emerald-600 hover:bg-emerald-500 px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 text-white">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
             SINCRONIZAR AGORA
           </button>
        </div>
      ) : (
        <div className="bg-rose-600/10 border border-rose-500/20 p-4 rounded-xl text-center">
            <p className="text-rose-400 font-bold text-sm">Conexão necessária para publicar dados.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* GERENCIAR JOGADORES */}
        <div className="space-y-8">
          <section className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
            <h3 className="text-lg font-bold mb-6 text-blue-400 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
              Gerenciar jogadores
            </h3>
            <div className="flex gap-2 mb-6">
              <input 
                type="text" 
                value={newPlayerNick} 
                onChange={(e) => setNewPlayerNick(e.target.value)} 
                placeholder={editingPlayerId ? "Novo nome..." : "Nick do player..."} 
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-blue-500 transition-all text-slate-100" 
              />
              {editingPlayerId ? (
                <div className="flex gap-2">
                   <button onClick={handleSavePlayerEdit} className="bg-emerald-600 hover:bg-emerald-500 px-4 py-3 rounded-xl font-bold transition-all text-white">Salvar</button>
                   <button onClick={() => { setEditingPlayerId(null); setNewPlayerNick(''); }} className="bg-slate-700 hover:bg-slate-600 px-4 py-3 rounded-xl font-bold transition-all text-slate-300">X</button>
                </div>
              ) : (
                <button onClick={() => { if(newPlayerNick) { onAddPlayer(newPlayerNick); setNewPlayerNick(''); } }} className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 text-white">Add</button>
              )}
            </div>
            <div className="max-h-56 overflow-y-auto space-y-2 custom-scrollbar pr-2">
              {players.length === 0 && <p className="text-xs text-slate-600 text-center py-4">Nenhum jogador cadastrado.</p>}
              {players.map(p => (
                <div key={p.id} className={`flex justify-between items-center p-3 rounded-xl border transition-all ${editingPlayerId === p.id ? 'bg-blue-900/20 border-blue-500/50' : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800'}`}>
                  <span className="text-slate-200 font-bold">{p.nick}</span>
                  <div className="flex gap-1">
                    <button onClick={() => startEditingPlayer(p)} className="text-blue-400 p-2 hover:bg-blue-500/10 rounded-lg transition-colors" title="Renomear">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    </button>
                    <button 
                      onClick={() => { if(window.confirm(`Tem certeza que deseja excluir o jogador "${p.nick}"?`)) onDeletePlayer(p.id); }} 
                      className="text-rose-500 p-2 hover:bg-rose-500/10 rounded-lg transition-colors" 
                      title="Excluir"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* GERENCIAR TEMPORADAS */}
          <section className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
            <h3 className="text-lg font-bold mb-6 text-purple-400 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              Gerenciar temporadas
            </h3>
            <div className="flex gap-2 mb-6">
              <input type="text" value={newSeasonName} onChange={(e) => setNewSeasonName(e.target.value)} placeholder="Nome da Season..." className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-purple-500 transition-all text-slate-100" />
              <button onClick={() => { if(newSeasonName) { onAddSeason(newSeasonName); setNewSeasonName(''); } }} className="bg-purple-600 hover:bg-purple-500 px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-purple-500/20 text-white">Criar</button>
            </div>
            <div className="max-h-56 overflow-y-auto space-y-2 custom-scrollbar pr-2">
            {seasons.length === 0 && <p className="text-xs text-slate-600 text-center py-4">Nenhuma temporada criada.</p>}
              {seasons.map(s => (
                <div key={s.id} className="flex justify-between items-center p-3 bg-slate-800/40 rounded-xl border border-slate-700/50 hover:bg-slate-800 transition-all">
                  <span className="text-slate-200 font-bold">{s.name}</span>
                  <button 
                    onClick={() => { if(window.confirm(`Tem certeza que deseja excluir a temporada "${s.name}"?`)) onDeleteSeason(s.id); }} 
                    className="text-rose-500 p-2 hover:bg-rose-500/10 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section className={`bg-slate-800 p-8 rounded-3xl border shadow-2xl relative overflow-hidden h-full transition-colors ${formMode === 'edit' ? 'border-amber-500/30' : 'border-slate-700'}`}>
            {saveSuccess && (
              <div className="absolute inset-0 bg-emerald-600/95 backdrop-blur-md flex flex-col items-center justify-center animate-in zoom-in duration-300 z-30">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-2xl">
                  <svg className="w-12 h-12 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <h4 className="text-2xl font-bold text-white mb-2">
                   {formMode === 'add' ? 'Registrado!' : 'Atualizado!'}
                </h4>
                <p className="text-emerald-100 mb-8 opacity-80 text-sm text-center">
                   {formMode === 'add' ? 'Dados adicionados à soma total.' : 'Dados substituídos com sucesso.'}
                </p>
                <button onClick={() => setSaveSuccess(false)} className="bg-emerald-800 hover:bg-emerald-900 text-white px-8 py-3 rounded-xl font-bold transition-all">Continuar</button>
              </div>
            )}
            
            <div className="flex justify-between items-start mb-8">
              <h3 className={`text-xl font-gaming font-bold flex items-center gap-3 ${formMode === 'edit' ? 'text-amber-400' : formMode === 'image' ? 'text-purple-400' : 'text-emerald-400'}`}>
                <span className={`w-1.5 h-8 rounded-full ${formMode === 'edit' ? 'bg-amber-500' : formMode === 'image' ? 'bg-purple-500' : 'bg-emerald-500'}`}></span>
                {formMode === 'edit' ? 'Editar estatísticas' : formMode === 'image' ? 'Cadastrar por Imagem' : 'Registrar pontuação'}
              </h3>

              <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700">
                <button 
                  onClick={() => setFormMode('add')} 
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${formMode === 'add' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  ADICIONAR
                </button>
                <button 
                  onClick={() => setFormMode('edit')} 
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${formMode === 'edit' ? 'bg-amber-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  EDITAR
                </button>
                <button 
                  onClick={() => setFormMode('image')} 
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${formMode === 'image' ? 'bg-purple-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  IMAGEM
                </button>
              </div>
            </div>

            {formMode === 'image' ? (
              <div className="space-y-6">
                <div className="border-2 border-dashed border-slate-700 rounded-2xl p-8 text-center hover:bg-slate-800/50 transition-colors cursor-pointer relative">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                    ref={fileInputRef}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  {isExtracting ? (
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                      <p className="text-purple-400 font-bold">Analisando imagem com IA...</p>
                    </div>
                  ) : imagePreview ? (
                    <div className="flex flex-col items-center">
                      <img src={imagePreview} alt="Preview" className="max-h-48 rounded-xl mb-4 shadow-lg" />
                      <p className="text-slate-400 text-sm">Clique para trocar a imagem</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <svg className="w-12 h-12 text-slate-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                      <p className="text-slate-300 font-bold mb-1">Envie o print do placar final</p>
                      <p className="text-slate-500 text-xs">Arraste ou clique para selecionar</p>
                    </div>
                  )}
                </div>

                {extractedData && (
                  <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-6 animate-in slide-in-from-bottom-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-purple-400 font-bold text-lg">Dados Extraídos</h4>
                      <div className="text-right">
                        <p className="text-xs text-slate-500 uppercase">Mapa: <span className="text-slate-300 font-bold">{extractedData.map}</span></p>
                        <p className="text-xs text-slate-500 uppercase">Vencedor: <span className="text-emerald-400 font-bold">{extractedData.winningTeam}</span></p>
                      </div>
                    </div>

                    <div className="flex justify-center items-center gap-4 mb-6 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                      <div className="flex flex-col items-center">
                        <label className="text-[10px] text-slate-500 uppercase font-bold mb-1">Time 1</label>
                        <input type="text" value={extractedData.team1Name || ''} onChange={(e) => setExtractedData({...extractedData, team1Name: e.target.value})} className="bg-slate-900 border border-slate-700 rounded p-1 text-center text-sm w-24 outline-none focus:border-purple-500" placeholder="Nome" />
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="number" value={extractedData.team1Score || 0} onChange={(e) => setExtractedData({...extractedData, team1Score: parseInt(e.target.value) || 0})} className="bg-slate-900 border border-slate-700 rounded p-2 text-center text-xl font-bold w-16 text-emerald-400 outline-none focus:border-purple-500" />
                        <span className="text-slate-500 font-bold">X</span>
                        <input type="number" value={extractedData.team2Score || 0} onChange={(e) => setExtractedData({...extractedData, team2Score: parseInt(e.target.value) || 0})} className="bg-slate-900 border border-slate-700 rounded p-2 text-center text-xl font-bold w-16 text-rose-400 outline-none focus:border-purple-500" />
                      </div>
                      <div className="flex flex-col items-center">
                        <label className="text-[10px] text-slate-500 uppercase font-bold mb-1">Time 2</label>
                        <input type="text" value={extractedData.team2Name || ''} onChange={(e) => setExtractedData({...extractedData, team2Name: e.target.value})} className="bg-slate-900 border border-slate-700 rounded p-1 text-center text-sm w-24 outline-none focus:border-purple-500" placeholder="Nome" />
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-6">
                      {extractedData.players.map((p, i) => {
                        const matchedPlayer = players.find(existing => existing.nick.toLowerCase() === p.nick.toLowerCase());
                        return (
                          <div key={i} className="flex flex-col md:flex-row md:justify-between md:items-center bg-slate-800 p-3 rounded-xl text-sm gap-3">
                            <div className="flex flex-col gap-1">
                              <span className="font-bold text-slate-200 flex items-center gap-2">
                                {p.nick}
                              </span>
                              <select 
                                className="bg-slate-900 border border-slate-700 rounded p-1 text-xs text-slate-300 outline-none focus:border-purple-500"
                                defaultValue={matchedPlayer?.id || ""}
                                onChange={(e) => {
                                  // Atualiza o nick no extractedData para o nick do jogador selecionado
                                  // Isso é um hack simples para o handleConfirmExtractedData encontrar o jogador
                                  const selectedPlayer = players.find(pl => pl.id === e.target.value);
                                  if (selectedPlayer) {
                                    const newData = {...extractedData};
                                    newData.players[i].nick = selectedPlayer.nick;
                                    setExtractedData(newData);
                                  }
                                }}
                              >
                                <option value="">-- Vincular Jogador --</option>
                                {players.map(pl => (
                                  <option key={pl.id} value={pl.id}>{pl.nick}</option>
                                ))}
                              </select>
                              <select 
                                value={p.team || 'team1'} 
                                onChange={(e) => handleEditExtractedStat(i, 'team', e.target.value)}
                                className="bg-slate-900 border border-slate-700 rounded p-1 text-[10px] text-slate-400 outline-none focus:border-purple-500 mt-1"
                              >
                                <option value="team1">Time 1</option>
                                <option value="team2">Time 2</option>
                              </select>
                            </div>
                            <div className="flex gap-2 text-xs font-mono bg-slate-900 p-2 rounded-lg border border-slate-700 overflow-x-auto">
                              <div className="flex flex-col items-center">
                                <span className="text-[8px] text-slate-500">K</span>
                                <input type="number" value={p.kills} onChange={(e) => handleEditExtractedStat(i, 'kills', parseInt(e.target.value) || 0)} className="w-10 bg-transparent text-emerald-400 text-center outline-none" />
                              </div>
                              <div className="flex flex-col items-center">
                                <span className="text-[8px] text-slate-500">D</span>
                                <input type="number" value={p.deaths} onChange={(e) => handleEditExtractedStat(i, 'deaths', parseInt(e.target.value) || 0)} className="w-10 bg-transparent text-rose-400 text-center outline-none" />
                              </div>
                              <div className="flex flex-col items-center">
                                <span className="text-[8px] text-slate-500">A</span>
                                <input type="number" value={p.assists} onChange={(e) => handleEditExtractedStat(i, 'assists', parseInt(e.target.value) || 0)} className="w-10 bg-transparent text-sky-400 text-center outline-none" />
                              </div>
                              <div className="flex flex-col items-center">
                                <span className="text-[8px] text-slate-500">DMG</span>
                                <input type="number" value={p.damage} onChange={(e) => handleEditExtractedStat(i, 'damage', parseInt(e.target.value) || 0)} className="w-12 bg-transparent text-orange-400 text-center outline-none" />
                              </div>
                              <div className="flex flex-col items-center">
                                <span className="text-[8px] text-slate-500">%HS</span>
                                <input type="number" value={p.hsPercent} onChange={(e) => handleEditExtractedStat(i, 'hsPercent', parseInt(e.target.value) || 0)} className="w-10 bg-transparent text-purple-400 text-center outline-none" />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="space-y-2 mb-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Temporada da Partida</label>
                      <select value={selectedSeasonId} onChange={(e) => setSelectedSeasonId(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 outline-none focus:border-purple-500 transition-all text-slate-200 appearance-none cursor-pointer shadow-inner">
                        <option value="">Selecione a temporada para contabilizar no ranking...</option>
                        {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>

                    <div className="flex gap-4">
                      <button 
                        onClick={() => {
                          setExtractedData(null);
                          setImagePreview(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        disabled={isSaving}
                        className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 py-4 rounded-xl font-bold transition-all disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={handleConfirmExtractedData}
                        disabled={isSaving || !selectedSeasonId}
                        className="w-2/3 bg-purple-600 hover:bg-purple-500 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-purple-600/20 flex justify-center items-center gap-2 disabled:opacity-50"
                      >
                        {isSaving ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                            Confirmar e Salvar Partida
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {formMode === 'edit' && (
                  <div className="mb-6 bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl">
                    <p className="text-amber-200 text-xs font-bold">⚠️ Modo de edição ativo</p>
                    <p className="text-amber-400/70 text-[10px] mt-1">Os valores abaixo substituirão o total atual. Use para corrigir erros.</p>
                  </div>
                )}
                
                <form onSubmit={handleSubmitStats} className="space-y-8">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Jogador</label>
                        <select value={selectedPlayerId} onChange={(e) => setSelectedPlayerId(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 outline-none focus:border-emerald-500 transition-all text-slate-200 appearance-none cursor-pointer shadow-inner">
                          <option value="">Selecione o Jogador</option>
                          {players.map(p => <option key={p.id} value={p.id}>{p.nick}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Temporada</label>
                        <select value={selectedSeasonId} onChange={(e) => setSelectedSeasonId(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 outline-none focus:border-emerald-500 transition-all text-slate-200 appearance-none cursor-pointer shadow-inner">
                          <option value="">Selecione a temporada</option>
                          {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{formMode === 'add' ? 'Partidas (+)' : 'Total Partidas'}</label>
                        <input type="number" min="0" value={matchData.matches} onChange={e => setMatchData({...matchData, matches: parseInt(e.target.value) || 0})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-slate-100 outline-none focus:border-emerald-500 transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{formMode === 'add' ? 'Dano (+)' : 'Total Dano'}</label>
                        <input type="number" min="0" value={matchData.damage} onChange={e => setMatchData({...matchData, damage: parseInt(e.target.value) || 0})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-slate-100 outline-none focus:border-emerald-500 transition-all" />
                      </div>
                   </div>

                   <div className="grid grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{formMode === 'add' ? 'Kills (+)' : 'Total Kills'}</label>
                        <input type="number" min="0" value={matchData.kills} onChange={e => setMatchData({...matchData, kills: parseInt(e.target.value) || 0})} className="w-full bg-slate-900 border border-emerald-500/20 rounded-2xl p-4 text-emerald-400 font-bold outline-none focus:border-emerald-500 transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">{formMode === 'add' ? 'Deaths (+)' : 'Total Deaths'}</label>
                        <input type="number" min="0" value={matchData.deaths} onChange={e => setMatchData({...matchData, deaths: parseInt(e.target.value) || 0})} className="w-full bg-slate-900 border border-rose-500/20 rounded-2xl p-4 text-rose-400 font-bold outline-none focus:border-rose-500 transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-sky-500 uppercase tracking-widest">{formMode === 'add' ? 'Assists (+)' : 'Total Assists'}</label>
                        <input type="number" min="0" value={matchData.assists} onChange={e => setMatchData({...matchData, assists: parseInt(e.target.value) || 0})} className="w-full bg-slate-900 border border-sky-500/20 rounded-2xl p-4 text-sky-400 font-bold outline-none focus:border-sky-500 transition-all" />
                      </div>
                   </div>

                   <button 
                    type="submit" 
                    disabled={isSaving || !selectedPlayerId || !selectedSeasonId} 
                    className={`w-full py-6 rounded-2xl font-bold text-xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl disabled:opacity-30 text-white
                      ${formMode === 'add' ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20' : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'}
                    `}
                   >
                      {isSaving ? (
                        <div className="w-7 h-7 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <>
                          {formMode === 'add' ? (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                          ) : (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                          )}
                          {formMode === 'add' ? 'Adicionar ao ranking local' : 'Salvar correção'}
                        </>
                      )}
                   </button>
                </form>
              </>
            )}

          {/*  <div className="mt-12 pt-8 border-t border-slate-700/50 flex flex-col gap-4">
              <button onClick={onResetData} className="w-full bg-rose-950/20 hover:bg-rose-950/40 text-rose-500 border border-rose-900/30 py-4 rounded-xl font-bold transition-all text-xs uppercase tracking-widest">Wipe (Resetar Tudo)</button>
            </div>*/}
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
