import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Rocket, 
  Trophy, 
  CheckCircle2, 
  LogOut, 
  Vote, 
  Users, 
  Settings,
  Monitor,
  Lock,
  Plus,
  Trash2,
  Play,
  SkipForward,
  RotateCcw
} from 'lucide-react';

// --- Types ---

interface Participant {
  id: string;
  name: string;
  photo: string;
}

interface Match {
  id: string;
  redTeamId: string;
  blueTeamId: string;
  redVotes: number;
  blueVotes: number;
  winnerId: string | null;
  status: 'pending' | 'active' | 'finished';
  round: string;
}

interface JuryAccount {
  id: string;
  username: string;
  password: string;
}

interface TournamentState {
  competitionName: string;
  competitionLogo: string;
  participants: Participant[];
  juryAccounts: JuryAccount[];
  juryCount: number;
  currentMatchId: string | null;
  matches: Match[];
  juryVotes: Record<string, 'red' | 'blue' | null>;
  configured: boolean;
}

enum UserRole {
  SELECT = 'select',
  ADMIN = 'admin',
  JURY = 'jury',
  PUBLIC = 'public'
}

const DEFAULT_STATE: TournamentState = {
  competitionName: "ARENA CHAMPIONSHIP",
  competitionLogo: "",
  participants: [],
  juryAccounts: [],
  juryCount: 3,
  currentMatchId: null,
  matches: [],
  juryVotes: {},
  configured: false
};

const STORAGE_KEY = 'arena_tournament_state';

// --- Main App ---

export default function App() {
  const [role, setRole] = useState<UserRole>(UserRole.SELECT);
  const [juryId, setJuryId] = useState<string | null>(localStorage.getItem('juryId'));
  const [state, setState] = useState<TournamentState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_STATE;
  });
  const [error, setError] = useState<string | null>(null);

  const saveStateLocal = (newState: TournamentState) => {
    setState(newState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
  };

  useEffect(() => {
    // Check URL parameters for direct view access
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    if (view === 'admin') setRole(UserRole.ADMIN);
    if (view === 'public') setRole(UserRole.PUBLIC);
    if (view === 'jury' && juryId) setRole(UserRole.JURY);
  }, [juryId]);

  // Sync state with server
  const fetchState = async () => {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        saveStateLocal(data);
        setError(null);
      }
    } catch (err) {
      console.warn("Fetch failed, using local storage", err);
      // We don't set error here because we are using localStorage for now
    }
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 3000); // Poll every 3s
    return () => clearInterval(interval);
  }, []);

  // --- View Switcher ---

  if (role === UserRole.SELECT) {
    return <RoleSelection state={state} onSelect={(r, id) => { setRole(r); if (id) setJuryId(id); }} />;
  }

  if (role === UserRole.ADMIN) {
    return <AdminView state={state} onSave={saveStateLocal} onBack={() => setRole(UserRole.SELECT)} />;
  }

  if (role === UserRole.JURY && juryId) {
    return <JuryView state={state} juryId={juryId} onSave={saveStateLocal} onBack={() => setRole(UserRole.SELECT)} />;
  }

  if (role === UserRole.PUBLIC) {
    return <PublicView state={state} onBack={() => setRole(UserRole.SELECT)} />;
  }

  return null;
}

// --- sub-components ---

function RoleSelection({ onSelect, state }: { onSelect: (role: UserRole, juryId?: string) => void, state: TournamentState }) {
  const [showJuryLogin, setShowJuryLogin] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const handleJuryLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    // Local Login first
    const jury = state.juryAccounts.find(j => j.username === username && j.password === password);
    if (jury) {
      localStorage.setItem('juryId', jury.id);
      onSelect(UserRole.JURY, jury.id);
      return;
    }

    try {
      const res = await fetch('/api/jury/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('juryId', data.juryId);
        onSelect(UserRole.JURY, data.juryId);
      } else {
        setLoginError(data.error);
      }
    } catch (err) {
      setLoginError("Identifiants incorrects (Mode Local)");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-surface-dark bg-[radial-gradient(circle_at_50%_50%,_rgba(30,41,59,0.2)_0%,_rgba(5,5,5,1)_100%)]">
      <div className="text-center mb-16 px-4">
        <p className="text-white/20 font-black tracking-[1em] uppercase mb-4 text-[10px]">Access Portal</p>
        <h1 className="text-5xl md:text-8xl font-black italic tracking-tighter text-white uppercase">{state.competitionName || "ARENA SYSTEM"}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
        <button 
          onClick={() => onSelect(UserRole.ADMIN)}
          className="group p-8 md:p-12 bg-white/5 border border-white/10 hover:border-white transition-all flex flex-col items-center gap-6"
        >
          <Settings className="w-12 h-12 md:w-16 md:h-16 text-white/40 group-hover:text-white transition-colors" />
          <div className="text-center">
            <h2 className="text-xl md:text-2xl font-black italic">ADMINISTRATION</h2>
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-2 group-hover:text-white/40">Configuration & Control</p>
          </div>
        </button>

        <div className="group p-8 md:p-12 bg-white/5 border border-white/10 flex flex-col items-center gap-6">
          {!showJuryLogin ? (
            <>
              <Lock className="w-12 h-12 md:w-16 md:h-16 text-white/40 group-hover:text-white transition-colors" />
              <div className="text-center mb-4">
                <h2 className="text-xl md:text-2xl font-black italic">CONSOLES JURY</h2>
                <button 
                  onClick={() => setShowJuryLogin(true)}
                  className="mt-6 px-8 py-3 bg-white text-black font-black italic uppercase text-xs tracking-widest hover:scale-105 transition-all"
                >
                  Se Connecter
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleJuryLogin} className="w-full space-y-4">
              <h2 className="text-xl font-black italic text-center mb-4">LOGIN JURY</h2>
              <input 
                type="text" 
                placeholder="Username" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-black/40 border border-white/10 px-4 py-2 font-black focus:border-white transition-all outline-none italic text-sm"
              />
              <input 
                type="password" 
                placeholder="Password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/10 px-4 py-2 font-black focus:border-white transition-all outline-none italic text-sm"
              />
              {loginError && <p className="text-brand-red text-[10px] font-bold uppercase text-center">{loginError}</p>}
              <button 
                type="submit"
                className="w-full py-3 bg-white text-black font-black italic uppercase text-xs tracking-widest"
              >
                Accéder
              </button>
              <button 
                type="button"
                onClick={() => setShowJuryLogin(false)}
                className="w-full text-white/20 hover:text-white text-[9px] font-black uppercase tracking-widest"
              >
                Retour
              </button>
            </form>
          )}
        </div>

        <button 
          onClick={() => onSelect(UserRole.PUBLIC)}
          className="group p-8 md:p-12 bg-white/5 border border-white/10 hover:border-white transition-all flex flex-col items-center gap-6"
        >
          <Monitor className="w-12 h-12 md:w-16 md:h-16 text-white/40 group-hover:text-white transition-colors" />
          <div className="text-center">
            <h2 className="text-xl md:text-2xl font-black italic">AFFICHAGE PUBLIC</h2>
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-2 group-hover:text-white/40">Real-time scoreboard</p>
          </div>
        </button>
      </div>
    </div>
  );
}

function AdminView({ state, onSave, onBack }: { state: TournamentState, onSave: (s: TournamentState) => void, onBack: () => void }) {
  const [competitionName, setCompetitionName] = useState(state.competitionName || "");
  const [competitionLogo, setCompetitionLogo] = useState(state.competitionLogo || "");
  const [participants, setParticipants] = useState<Participant[]>(state.participants || []);
  const [matches, setMatches] = useState<Match[]>(state.matches || []);
  const [juryCount, setJuryCount] = useState(state.juryCount || 3);
  const [juryAccounts, setJuryAccounts] = useState<JuryAccount[]>(state.juryAccounts || []);

  useEffect(() => {
    if (juryAccounts.length === 0) {
      handleJuryCountChange(juryCount);
    }
  }, []);

  const handleJuryCountChange = (count: number) => {
    setJuryCount(count);
    let newAccounts = [...juryAccounts];
    if (count > juryAccounts.length) {
      for (let i = juryAccounts.length; i < count; i++) {
        newAccounts.push({ id: `jury-${Date.now()}-${i}`, username: `JURE ${i + 1}`, password: "" });
      }
    } else {
      newAccounts = newAccounts.slice(0, count);
    }
    setJuryAccounts(newAccounts);
  };

  const updateJuryAccount = (index: number, field: keyof JuryAccount, value: string) => {
    const newAccounts = [...juryAccounts];
    newAccounts[index] = { ...newAccounts[index], [field]: value };
    setJuryAccounts(newAccounts);
  };

  // Participant Form
  const [participantCount, setParticipantCount] = useState(state.participants?.length || 0);

  // Match Form
  const [newMatchRound, setNewMatchRound] = useState("");
  const [redId, setRedId] = useState("");
  const [blueId, setBlueId] = useState("");

  const handleParticipantCountChange = (count: number) => {
    setParticipantCount(count);
    let newParticipants = [...participants];
    if (count > participants.length) {
      for (let i = participants.length; i < count; i++) {
        newParticipants.push({ id: `p-${Date.now()}-${i}`, name: "", photo: "" });
      }
    } else if (count < participants.length) {
      newParticipants = newParticipants.slice(0, count);
      const remainingIds = new Set(newParticipants.map(p => p.id));
      setMatches(matches.filter(m => remainingIds.has(m.redTeamId) && remainingIds.has(m.blueTeamId)));
    }
    setParticipants(newParticipants);
  };

  const updateParticipant = (index: number, field: keyof Participant, value: string) => {
    const newParticipants = [...participants];
    newParticipants[index] = { ...newParticipants[index], [field]: value };
    setParticipants(newParticipants);
  };

  const addMatch = () => {
    if (newMatchRound && redId && blueId && redId !== blueId) {
      const m: Match = {
        id: `m-${Date.now()}`,
        redTeamId: redId,
        blueTeamId: blueId,
        redVotes: 0,
        blueVotes: 0,
        winnerId: null,
        status: 'pending',
        round: newMatchRound
      };
      setMatches([...matches, m]);
      setNewMatchRound("");
      setRedId("");
      setBlueId("");
    }
  };

  const removeMatch = (id: string) => { setMatches(matches.filter(m => m.id !== id)); };

  const configure = async () => {
    const newState: TournamentState = {
      ...state,
      competitionName,
      competitionLogo,
      participants,
      juryAccounts,
      juryCount: juryAccounts.length,
      currentMatchId: matches.length > 0 ? matches[0].id : null,
      matches: matches.map((m, i) => i === 0 ? { ...m, status: 'active' } : m),
      configured: true,
      juryVotes: {}
    };
    onSave(newState);

    try {
      await fetch('/api/admin/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitionName, competitionLogo, participants, juryAccounts, matches })
      });
    } catch (e) {
      console.warn("Server sync failed during configure");
    }
  };

  const nextMatch = async () => {
    const activeIdx = state.matches.findIndex(m => m.id === state.currentMatchId);
    if (activeIdx !== -1) {
      const newMatches = [...state.matches];
      newMatches[activeIdx] = { ...newMatches[activeIdx], status: 'finished' };
      
      const nextIdx = newMatches.findIndex((m, i) => i > activeIdx && m.status === 'pending');
      let nextId = null;
      if (nextIdx !== -1) {
        newMatches[nextIdx] = { ...newMatches[nextIdx], status: 'active' };
        nextId = newMatches[nextIdx].id;
      }

      const newState: TournamentState = {
        ...state,
        matches: newMatches,
        currentMatchId: nextId,
        juryVotes: {}
      };
      onSave(newState);
    }

    try {
      await fetch('/api/admin/next-match', { method: 'POST' });
    } catch (e) {
      console.warn("Server sync failed during nextMatch");
    }
  };

  const reset = async () => {
    onSave(DEFAULT_STATE);
    try {
      await fetch('/api/admin/reset', { method: 'POST' });
    } catch (e) {
      console.warn("Server sync failed during reset");
    }
  };

  const activeMatch = state.matches.find(m => m.id === state.currentMatchId);

  if (!state.configured) {
    return (
      <div className="min-h-screen p-6 md:p-12 flex flex-col items-center max-w-6xl mx-auto font-sans text-white">
        <header className="w-full flex justify-between items-center mb-12">
          <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter">Configuration du Tournoi</h2>
          <button onClick={onBack} className="text-white/40 hover:text-white"><LogOut /></button>
        </header>

        <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
          {/* Section 1: General Info */}
          <div className="space-y-6 bg-white/5 p-6 border border-white/10">
            <h3 className="text-[10px] font-black tracking-widest uppercase text-white/40">1. Infos Compétition</h3>
            <div className="space-y-4">
              <input 
                type="text" 
                value={competitionName} 
                onChange={e => setCompetitionName(e.target.value)}
                placeholder="Nom de la compétition"
                className="w-full bg-black/40 border border-white/10 px-4 py-3 font-black focus:border-white transition-all outline-none italic uppercase"
              />
              <input 
                type="text" 
                value={competitionLogo} 
                onChange={e => setCompetitionLogo(e.target.value)}
                placeholder="URL Logo (Optionnel)"
                className="w-full bg-black/40 border border-white/10 px-4 py-3 font-bold focus:border-white transition-all outline-none italic"
              />
              <div>
                <p className="text-[9px] font-black uppercase text-white/40 mb-2">Nombre de Juges</p>
                <div className="flex gap-2">
                  {[3, 5].map(n => (
                    <button 
                      key={n}
                      onClick={() => handleJuryCountChange(n)}
                      className={`flex-1 py-3 font-black italic border-2 transition-all text-xs ${juryCount === n ? 'border-white bg-white text-black' : 'border-white/10 text-white/40'}`}
                    >
                      {n} JUGES
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-white/5">
                <p className="text-[9px] font-black uppercase text-white/40 mb-2">Comptes Jury (Username / Password)</p>
                {juryAccounts.map((jury, i) => (
                  <div key={jury.id} className="flex gap-2">
                    <input 
                      type="text" 
                      value={jury.username} 
                      onChange={e => updateJuryAccount(i, 'username', e.target.value)}
                      placeholder="Username"
                      className="flex-1 bg-black/40 border border-white/10 px-3 py-2 font-black focus:border-white transition-all outline-none italic text-[10px]"
                    />
                    <input 
                      type="text" 
                      value={jury.password} 
                      onChange={e => updateJuryAccount(i, 'password', e.target.value)}
                      placeholder="Password"
                      className="flex-1 bg-black/40 border border-white/10 px-3 py-2 font-black focus:border-white transition-all outline-none italic text-[10px]"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Participants */}
          <div className="space-y-6 bg-white/5 p-6 border border-white/10 lg:col-span-1">
            <h3 className="text-[10px] font-black tracking-widest uppercase text-white/40">2. Configuration Participants</h3>
            <div className="space-y-4">
              <div>
                <p className="text-[9px] font-black uppercase text-white/40 mb-2">Nombre total de participants</p>
                <input 
                  type="number" 
                  min="0"
                  value={participantCount || ""}
                  onChange={e => handleParticipantCountChange(parseInt(e.target.value) || 0)}
                  placeholder="Ex: 8"
                  className="w-full bg-black/40 border border-white/10 px-4 py-2 font-black focus:border-white transition-all outline-none italic"
                />
              </div>

              <div className="max-h-[350px] overflow-y-auto space-y-4 pt-4 border-t border-white/5">
                {participants.map((p, i) => (
                  <div key={p.id} className="p-3 bg-white/5 border border-white/5 space-y-2 relative group">
                    <span className="absolute -left-2 -top-2 w-5 h-5 bg-white text-black flex items-center justify-center text-[10px] font-black italic">
                      {i + 1}
                    </span>
                    <input 
                      type="text" 
                      value={p.name} 
                      onChange={e => updateParticipant(i, 'name', e.target.value)}
                      placeholder={`Nom Participant ${i + 1}`}
                      className="w-full bg-black/40 border border-white/10 px-4 py-2 font-black focus:border-white transition-all outline-none italic text-sm"
                    />
                    <input 
                      type="text" 
                      value={p.photo} 
                      onChange={e => updateParticipant(i, 'photo', e.target.value)}
                      placeholder="URL Photo (Optionnel)"
                      className="w-full bg-black/40 border border-white/10 px-4 py-2 font-bold focus:border-white transition-all outline-none italic text-[10px] opacity-60"
                    />
                  </div>
                ))}
                {participants.length === 0 && (
                  <p className="text-center py-12 text-white/10 font-bold italic uppercase tracking-widest text-[10px]">
                    Indiquez le nombre de participants ci-dessus
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Bracket Builder */}
          <div className="space-y-6 bg-white/5 p-6 border border-white/10">
            <h3 className="text-[10px] font-black tracking-widest uppercase text-white/40">3. Bracket Manuel ({matches.length} Matchs)</h3>
            <div className="space-y-2">
              <input 
                type="text" 
                value={newMatchRound} 
                onChange={e => setNewMatchRound(e.target.value)}
                placeholder="Etape (ex: FINALE)"
                className="w-full bg-black/40 border border-white/10 px-4 py-2 font-black focus:border-white transition-all outline-none italic uppercase text-xs"
              />
              <div className="grid grid-cols-2 gap-2">
                <select 
                  value={redId} 
                  onChange={e => setRedId(e.target.value)}
                  className="bg-black/40 border border-white/10 px-2 py-2 font-black text-xs outline-none italic"
                >
                  <option value="">ROUGE</option>
                  {participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select 
                  value={blueId} 
                  onChange={e => setBlueId(e.target.value)}
                  className="bg-black/40 border border-white/10 px-2 py-2 font-black text-xs outline-none italic"
                >
                  <option value="">BLEU</option>
                  {participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <button 
                onClick={addMatch} 
                disabled={!newMatchRound || !redId || !blueId}
                className="w-full bg-white text-black py-2 font-black italic flex justify-center items-center gap-2 disabled:opacity-20"
              >
                <Plus size={16} /> AJOUTER LE MATCH
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1 mt-4">
              {matches.map((m, i) => (
                <div key={m.id} className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-sm text-[10px]">
                  <div className="flex flex-col">
                    <span className="opacity-40 font-black">{m.round}</span>
                    <span className="font-black italic uppercase">
                      {participants.find(p => p.id === m.redTeamId)?.name} VS {participants.find(p => p.id === m.blueTeamId)?.name}
                    </span>
                  </div>
                  <button onClick={() => removeMatch(m.id)} className="text-white/20 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="w-full mt-12 flex flex-col items-center gap-6">
          <button 
            disabled={matches.length === 0}
            onClick={configure}
            className={`w-full max-w-lg py-6 font-black italic text-xl md:text-2xl tracking-tighter flex items-center justify-center gap-4 transition-all
              ${matches.length === 0 ? 'bg-white/5 text-white/10' : 'bg-green-500 text-black shadow-[0_10px_40px_rgba(34,197,94,0.3)] hover:scale-[1.01]'}`}
          >
            <Play size={24} /> LANCER LA COMPÉTITION
          </button>
          <p className="text-[9px] text-center font-bold text-white/20 uppercase tracking-widest italic">Vérifiez toutes les informations avant de démarrer.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-12 flex flex-col items-center bg-surface-dark font-sans text-white">
       <header className="w-full flex justify-between items-center mb-12 max-w-6xl">
          <div className="flex items-center gap-4 md:gap-6">
            <h2 className="text-2xl md:text-3xl font-black italic">{state.competitionName} - ADMIN</h2>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/30 text-green-500 text-[9px] font-black uppercase tracking-widest">
               <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
               Live System
            </div>
          </div>
          <button onClick={onBack} className="text-white/40 hover:text-white transition-colors"><LogOut /></button>
        </header>

        <div className="w-full max-w-6xl flex flex-col lg:grid lg:grid-cols-3 gap-8">
          {/* Detailed Match Tally */}
          <div className="lg:col-span-2 space-y-6">
             <div className="flex justify-between items-end">
                <h3 className="text-[10px] font-black tracking-widest uppercase text-white/30">Progression du Tournoi</h3>
                <span className="text-[10px] font-black italic opacity-20 uppercase tracking-widest">Matchs terminés: {state.matches.filter(m => m.status === 'finished').length}/{state.matches.length}</span>
             </div>
             
             <div className="grid grid-cols-1 gap-2 overflow-y-auto max-h-[60vh] pr-2 scrollbar-hide">
                {state.matches.map((m, i) => {
                  const red = state.participants.find(p => p.id === m.redTeamId);
                  const blue = state.participants.find(p => p.id === m.blueTeamId);
                  return (
                    <div key={m.id} className={`p-5 md:p-6 flex flex-col md:flex-row justify-between items-center gap-4 transition-all border ${m.status === 'active' ? 'bg-white/10 border-white ring-1 ring-white/20' : 'bg-white/5 border-white/5 opacity-50'}`}>
                      <div className="flex items-center gap-6 w-full md:w-auto">
                        <span className="text-[10px] font-black text-white/20 w-6">0{i+1}</span>
                        <div className="flex flex-1 items-center gap-4 text-lg md:text-xl italic font-black">
                            <span className={`${m.winnerId === m.redTeamId ? 'text-brand-red' : ''} truncate`}>{red?.name}</span>
                            <span className="text-white/10 text-[10px] not-italic font-bold">VS</span>
                            <span className={`${m.winnerId === m.blueTeamId ? 'text-brand-blue' : ''} truncate`}>{blue?.name}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                        {m.status === 'finished' && (
                          <div className="flex gap-4 items-center">
                              <div className="flex items-center -space-x-1">
                                {Array.from({ length: m.redVotes }).map((_, i) => <div key={i} className="w-3 h-3 bg-brand-red rounded-full border border-black" />)}
                                {Array.from({ length: m.blueVotes }).map((_, i) => <div key={i} className="w-3 h-3 bg-brand-blue rounded-full border border-black" />)}
                              </div>
                              <Trophy size={16} className="text-yellow-500" />
                          </div>
                        )}
                        <div className="text-[9px] font-black uppercase tracking-widest opacity-40 italic">{m.round}</div>
                      </div>
                    </div>
                  );
                })}
             </div>
          </div>

          {/* Controls & Live Votes */}
          <div className="space-y-6">
             <h3 className="text-[10px] font-black tracking-widest uppercase text-white/30">Contrôle en Direct</h3>
             <div className="bg-white/5 p-6 md:p-8 border border-white/10 space-y-8 rounded-sm">
                <div className="text-center">
                  <p className="text-[9px] font-black tracking-[0.4em] text-white/20 uppercase mb-3">Battle Actuel</p>
                  <div className="text-xl md:text-2xl font-black italic truncate uppercase">
                    {activeMatch ? (
                      `${state.participants.find(p => p.id === activeMatch.redTeamId)?.name} VS ${state.participants.find(p => p.id === activeMatch.blueTeamId)?.name}`
                    ) : "AUCUN BATTLE ACTIF"}
                  </div>
                </div>

                {/* Vote Visualization for Juries */}
                <div className="space-y-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-2">État des Votes ({Object.keys(state.juryVotes).length}/{state.juryCount})</p>
                    <div className="flex justify-between gap-1">
                       {state.juryAccounts.map((jury) => {
                         const vote = state.juryVotes[jury.id];
                         return (
                           <div key={jury.id} className="flex-1 flex flex-col items-center gap-2">
                             <div 
                               className={`w-full aspect-square border-2 flex items-center justify-center transition-all duration-500 
                               ${vote 
                                 ? (vote === 'red' ? 'bg-brand-red border-brand-red' : 'bg-brand-blue border-brand-blue') 
                                 : 'bg-white/5 border-white/10'}`}
                             >
                               {vote && <CheckCircle2 size={12} className="text-white" />}
                             </div>
                             <span className="text-[8px] font-black opacity-30 uppercase truncate w-full text-center leading-none mt-1">{jury.username}</span>
                           </div>
                         );
                       })}
                    </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-white/10">
                  <button 
                    disabled={!activeMatch || activeMatch.status !== 'finished'}
                    onClick={nextMatch} 
                    className={`w-full py-4 font-black italic flex items-center justify-center gap-3 transition-all rounded-sm
                      ${!activeMatch || activeMatch.status !== 'finished' ? 'bg-white/5 text-white/10' : 'bg-white text-black hover:scale-[1.02] cursor-pointer'}`}
                  >
                    <SkipForward size={18} /> MATCH SUIVANT
                  </button>
                  <button onClick={reset} className="w-full py-4 border border-white/10 text-white/30 font-black italic hover:bg-red-500 hover:text-black hover:border-red-500 transition-all rounded-sm">
                    <RotateCcw size={18} /> RÉINITIALISER TOUT
                  </button>
                </div>
             </div>
          </div>
        </div>
    </div>
  );
}

function JuryView({ state, juryId, onSave, onBack }: { state: TournamentState, juryId: string, onSave: (s: TournamentState) => void, onBack: () => void }) {
  const currentMatch = state.matches.find(m => m.id === state.currentMatchId);
  const myVote = state.juryVotes[juryId];

  const redP = state.participants.find(p => p.id === currentMatch?.redTeamId);
  const blueP = state.participants.find(p => p.id === currentMatch?.blueTeamId);

  const castVote = async (vote: 'red' | 'blue') => {
    const newVotes = { ...state.juryVotes, [juryId]: vote };
    const currentMatch = state.matches.find(m => m.id === state.currentMatchId);
    
    if (currentMatch) {
      const redVotes = Object.values(newVotes).filter(v => v === 'red').length;
      const blueVotes = Object.values(newVotes).filter(v => v === 'blue').length;
      const totalVotes = redVotes + blueVotes;
      
      const newMatches = state.matches.map(m => {
        if (m.id === state.currentMatchId) {
          const finished = totalVotes >= state.juryCount;
          return {
            ...m,
            redVotes,
            blueVotes,
            status: finished ? 'finished' as const : m.status,
            winnerId: finished ? (redVotes > blueVotes ? m.redTeamId : m.blueTeamId) : null
          };
        }
        return m;
      });

      const newState: TournamentState = {
        ...state,
        juryVotes: newVotes,
        matches: newMatches
      };
      onSave(newState);
    }

    try {
      await fetch('/api/jury/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ juryId, vote })
      });
    } catch (err) {
      console.warn("Server sync failed during vote");
    }
  };

  if (!state.configured) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center font-black p-6 text-center">
        <div className="animate-spin w-16 h-16 border-4 border-white/10 border-t-white rounded-full mb-8" />
        <h2 className="text-2xl italic tracking-tighter opacity-50 uppercase mb-4 text-white">Système en attente</h2>
        <p className="text-white/20 text-xs tracking-widest uppercase">L'administrateur n'a pas encore lancé le tournoi</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-black overflow-hidden select-none font-sans text-white">
      {/* Dynamic Palette */}
      <AnimatePresence mode="wait">
        {currentMatch && currentMatch.status === 'active' && !myVote ? (
          <motion.div 
            key="palette"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col sm:flex-row h-full"
          >
            <button 
              onClick={() => castVote('red')}
              className="flex-1 bg-brand-red flex flex-col items-center justify-center p-8 transition-all active:scale-95 active:brightness-90 touch-none relative"
            >
              {redP?.photo && <img src={redP.photo} className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay grayscale" />}
              <div className="relative z-10 flex flex-col items-center">
                <Shield className="w-16 h-16 md:w-24 md:h-24 mb-6 opacity-40 text-white" />
                <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-center leading-tight mb-4">{redP?.name}</h2>
                <div className="px-6 py-2 bg-white text-black font-black italic uppercase text-[10px] tracking-widest">VOTER ROUGE</div>
              </div>
            </button>

            <button 
              onClick={() => castVote('blue')}
              className="flex-1 bg-brand-blue flex flex-col items-center justify-center p-8 transition-all active:scale-95 active:brightness-90 touch-none border-t-2 sm:border-t-0 sm:border-l-2 border-white/20 relative"
            >
              {blueP?.photo && <img src={blueP.photo} className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay grayscale" />}
              <div className="relative z-10 flex flex-col items-center">
                <Rocket className="w-16 h-16 md:w-24 md:h-24 mb-6 opacity-40 text-white" />
                <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-center leading-tight mb-4">{blueP?.name}</h2>
                <div className="px-6 py-2 bg-white text-black font-black italic uppercase text-[10px] tracking-widest">VOTER BLEU</div>
              </div>
            </button>
          </motion.div>
        ) : (
          <motion.div 
            key="status"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col items-center justify-center p-12 text-center"
          >
            {myVote ? (
              <>
                <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-8 border-4 ${myVote === 'red' ? 'border-brand-red bg-brand-red/20' : 'border-brand-blue bg-brand-blue/20'}`}>
                   <CheckCircle2 size={64} className="text-white" />
                </div>
                <h2 className="text-4xl font-black italic tracking-tighter mb-4 uppercase">Vote Transmis</h2>
                <p className="text-white/20 font-bold uppercase tracking-[0.4em] text-[10px]">Attente des autres juges & du résultat</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 border-2 border-white/10 border-t-white rounded-full animate-spin mb-8" />
                <h2 className="text-3xl font-black italic tracking-tighter mb-4 opacity-30 uppercase">Attente du Battle</h2>
                <p className="text-white/10 font-bold uppercase tracking-[0.4em] text-[10px]">Le match n'est pas encore ouvert au vote</p>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="h-16 bg-black/80 backdrop-blur-xl border-t border-white/10 flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-4">
           <div className={`w-2 h-2 rounded-full ${myVote ? 'bg-green-500' : 'bg-white/20 animate-pulse'}`} />
           <span className="text-[10px] font-black tracking-widest uppercase opacity-40">
             CONTRÔLE: {state.juryAccounts.find(j => j.id === juryId)?.username || "GUEST"}
           </span>
        </div>
        <button 
          onClick={onBack}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-black uppercase tracking-widest"
        >
          QUITTER
        </button>
      </footer>
    </div>
  );
}

function PublicView({ state, onBack }: { state: TournamentState, onBack: () => void }) {
  const currentMatch = state.matches.find(m => m.id === state.currentMatchId);
  const redCount = Object.values(state.juryVotes).filter(v => v === 'red').length;
  const blueCount = Object.values(state.juryVotes).filter(v => v === 'blue').length;

  const redP = state.participants.find(p => p.id === currentMatch?.redTeamId);
  const blueP = state.participants.find(p => p.id === currentMatch?.blueTeamId);

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col p-6 md:p-12 relative overflow-hidden font-sans text-white">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden opacity-20">
         <div className="absolute -top-1/2 -left-1/4 w-[150%] h-[150%] bg-[radial-gradient(circle_at_center,rgba(225,29,72,0.15)_0%,transparent_50%)]" />
         <div className="absolute -bottom-1/2 -right-1/4 w-[150%] h-[150%] bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.15)_0%,transparent_50%)]" />
      </div>

      <header className="flex flex-col sm:flex-row justify-between items-center sm:items-start mb-12 gap-4 z-10">
        <div className="bg-white/5 border border-white/10 px-4 py-1 text-[10px] font-black uppercase tracking-widest text-white/30 truncate flex items-center gap-2">
          {state.competitionLogo && <img src={state.competitionLogo} className="w-4 h-4 object-contain" />}
          Live Feed • {state.matches.filter(m => m.status === 'finished').length + 1} / {state.matches.length}
        </div>
        <div className="text-center order-first sm:order-none">
          <p className="text-[10px] font-black tracking-[0.5em] text-white/40 mb-2 uppercase">CHAMPIONSHIP LIVE</p>
          <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter leading-none border-b-4 border-white/10 pb-4 uppercase">{state.competitionName}</h1>
        </div>
        <button onClick={onBack} className="text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white transition-all">Hub System</button>
      </header>

      {currentMatch ? (
        <div className="flex-1 flex flex-col justify-center gap-12 z-10">
          <div className="text-center">
             <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="inline-block px-12 py-2 bg-white/5 border border-white/10 text-xs font-black italic uppercase tracking-[0.8em]"
             >
               {currentMatch.round}
             </motion.div>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center justify-center gap-12 max-w-7xl mx-auto w-full">
            {/* Participant Red Section */}
            <div className="flex flex-col items-center gap-6 w-full">
              <div className="flex items-center gap-6 w-full">
                <div className="w-32 h-32 md:w-48 md:h-48 bg-white/5 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden relative">
                   {redP?.photo ? (
                     <img src={redP.photo} className="absolute inset-0 w-full h-full object-cover" />
                   ) : (
                     <Shield className={`w-16 h-16 ${currentMatch.winnerId === currentMatch.redTeamId ? 'text-brand-red' : 'text-white/10'}`} />
                   )}
                </div>
                <div className={`flex-1 h-32 md:h-48 flex items-center justify-center relative overflow-hidden transition-all duration-700
                  ${currentMatch.winnerId === currentMatch.redTeamId ? 'bg-brand-red shadow-[0_0_100px_rgba(225,29,72,0.6)]' : 'bg-white/5 border border-white/10'}`}>
                  <span className="text-7xl md:text-[10rem] font-black italic tracking-tighter leading-none z-10">
                    {currentMatch.status === 'finished' ? currentMatch.redVotes : redCount}
                  </span>
                </div>
              </div>
              <div className="w-full h-20 bg-brand-red border-l-[12px] border-white/30 flex items-center px-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-black/20" />
                <h2 className="text-4xl font-black italic uppercase truncate relative z-10">{redP?.name}</h2>
              </div>
            </div>

            {/* VS Divider */}
            <div className="text-center relative py-8 md:py-0">
              <span className="text-5xl md:text-7xl font-black italic opacity-20 tracking-tighter">VS</span>
            </div>

            {/* Participant Blue Section */}
            <div className="flex flex-col items-center gap-6 w-full">
              <div className="flex items-center gap-6 w-full">
                <div className={`flex-1 h-32 md:h-48 flex items-center justify-center relative overflow-hidden transition-all duration-700
                  ${currentMatch.winnerId === currentMatch.blueTeamId ? 'bg-brand-blue shadow-[0_0_100px_rgba(37,99,235,0.6)]' : 'bg-white/5 border border-white/10'}`}>
                  <span className="text-7xl md:text-[10rem] font-black italic tracking-tighter leading-none z-10">
                    {currentMatch.status === 'finished' ? currentMatch.blueVotes : blueCount}
                  </span>
                </div>
                <div className="w-32 h-32 md:w-48 md:h-48 bg-white/5 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden relative">
                   {blueP?.photo ? (
                     <img src={blueP.photo} className="absolute inset-0 w-full h-full object-cover" />
                   ) : (
                     <Rocket className={`w-16 h-16 ${currentMatch.winnerId === currentMatch.blueTeamId ? 'text-brand-blue' : 'text-white/10'}`} />
                   )}
                </div>
              </div>
              <div className="w-full h-20 bg-brand-blue border-r-[12px] border-white/30 flex items-center justify-end px-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-black/20" />
                <h2 className="text-4xl font-black italic uppercase truncate relative z-10">{blueP?.name}</h2>
              </div>
            </div>
          </div>

          {/* Winner Announcement Overlay */}
          <AnimatePresence>
            {currentMatch.status === 'finished' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
              >
                 <div className="px-24 py-12 bg-white/95 backdrop-blur-3xl border-y-8 border-black shadow-[0_0_200px_rgba(255,255,255,0.3)] flex flex-col items-center">
                    <Trophy className="w-24 h-24 text-yellow-500 mb-6" />
                    <p className="text-black font-black italic uppercase tracking-[0.5em] text-sm mb-4">MATCH WINNER</p>
                    <h3 className="text-8xl font-black italic text-black uppercase tracking-tighter">
                      {state.participants.find(p => p.id === currentMatch.winnerId)?.name}
                    </h3>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>

          <footer className="max-w-4xl mx-auto w-full py-8 border-t border-white/10 flex flex-col items-center gap-6">
            <div className="flex flex-wrap justify-center gap-4">
              {state.juryAccounts.map((jury, i) => (
                <div 
                  key={jury.id} 
                  className={`flex-1 min-w-[100px] max-w-[120px] aspect-square border-2 flex flex-col items-center justify-center text-[10px] font-black transition-all duration-300 gap-2
                  ${state.juryVotes[jury.id] 
                    ? (state.juryVotes[jury.id] === 'red' ? 'bg-brand-red border-brand-red shadow-[0_0_20px_rgba(225,29,72,0.4)]' : 'bg-brand-blue border-brand-blue shadow-[0_0_20px_rgba(37,99,235,0.4)]') 
                    : 'bg-white/5 border-white/10 text-white/5'}`}
                >
                  {state.juryVotes[jury.id] ? <CheckCircle2 size={16} /> : <span className="opacity-20 text-[8px] uppercase truncate px-2 text-center">{jury.username}</span>}
                  <span className={`text-[8px] uppercase truncate px-1 text-center font-black ${state.juryVotes[jury.id] ? 'text-white' : 'text-white/20'}`}>
                    {jury.username}
                  </span>
                </div>
              ))}
            </div>
            
            <div className="flex flex-col items-center gap-3 pt-6 border-t border-white/5 w-full">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/20">Liens Directs (Affichage Live)</p>
              <div className="flex gap-4">
                <a href={`${window.location.origin}?view=public`} target="_blank" rel="noreferrer" className="text-[10px] font-black italic uppercase text-white/40 hover:text-white transition-all border-b border-white/10 pb-1">
                  Écran Public
                </a>
                <a href={`${window.location.origin}?view=admin`} target="_blank" rel="noreferrer" className="text-[10px] font-black italic uppercase text-white/40 hover:text-white transition-all border-b border-white/10 pb-1">
                  Console Admin
                </a>
              </div>
            </div>
          </footer>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center z-10 text-center">
           <div className="w-32 h-32 border-4 border-white/5 border-t-white rounded-full animate-spin mb-12" />
           <p className="text-4xl font-black italic opacity-20 uppercase tracking-[0.5em]">System Interlink Pending</p>
        </div>
      )}

      <footer className="mt-auto h-12 flex justify-between items-center text-[10px] font-black tracking-[0.5em] text-white/5 uppercase z-10">
        <span>ARENA LIVE FEED</span>
        <span>© {new Date().getFullYear()} ARENA PRO OFFICIALS</span>
      </footer>
    </div>
  );
}
