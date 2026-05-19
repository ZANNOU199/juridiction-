import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Navigate, useParams } from 'react-router-dom';
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
  RotateCcw,
  Smartphone,
  RefreshCw
} from 'lucide-react';

// --- Components ---

function OrientationWarning() {
  return (
    <div className="orientation-warning">
      <motion.div
        animate={{ rotate: 90 }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="mb-8"
      >
        <Smartphone size={64} className="text-white/20" />
      </motion.div>
      <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-4 text-white">MODE PAYSAGE REQUIS</h2>
      <p className="text-white/40 text-[10px] font-black uppercase tracking-widest leading-loose max-w-[200px]">
        Veuillez faire pivoter votre appareil pour utiliser la console de vote.
      </p>
      <div className="mt-8 flex items-center gap-2 text-white/20">
        <RefreshCw size={14} className="animate-spin" />
        <span className="text-[8px] font-black uppercase tracking-widest">Attente de rotation...</span>
      </div>
    </div>
  );
}

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
  allVotesCastAt?: number;
  round: string;
  votingMode: 'match' | 'round';
  roundCount: number;
  currentRound: number;
  roundResults: { red: number; blue: number }[];
  finishedJuries: string[];
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
  const [state, setState] = useState<TournamentState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_STATE;
  });

  const saveStateLocal = (newState: TournamentState) => {
    setState(newState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
  };

  const fetchState = async () => {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        saveStateLocal(data);
      }
    } catch (err) {
      console.warn("Fetch failed, using local storage", err);
    }
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 1000);

    // Attempt to lock orientation to landscape (works better on some mobile browsers if installed as PWA)
    try {
      if (screen.orientation && (screen.orientation as any).lock) {
        (screen.orientation as any).lock('landscape').catch(() => {
          // Silent fail - usually needs full screen or PWA
        });
      }
    } catch (e) {
      // Ignore errors
    }

    return () => clearInterval(interval);
  }, []);

  return (
    <BrowserRouter>
      <OrientationWarning />
      <Routes>
        <Route path="/" element={<PublicView state={state} />} />
        <Route path="/admin" element={<AdminView state={state} onSave={saveStateLocal} />} />
        <Route path="/jury" element={<JuryGateway state={state} onSave={saveStateLocal} />} />
        <Route path="/select" element={<RoleSelection state={state} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function RoleSelection({ state }: { state: TournamentState }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-surface-dark bg-[radial-gradient(circle_at_50%_50%,_rgba(30,41,59,0.2)_0%,_rgba(5,5,5,1)_100%)]">
      <div className="text-center mb-16 px-4">
        <p className="text-white/20 font-black tracking-[1em] uppercase mb-4 text-[10px]">Access Portal</p>
        <h1 className="text-5xl md:text-8xl font-black italic tracking-tighter text-white uppercase">{state.competitionName || "ARENA SYSTEM"}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
        <button 
          onClick={() => navigate('/admin')}
          className="group p-8 md:p-12 bg-white/5 border border-white/10 hover:border-white transition-all flex flex-col items-center gap-6"
        >
          <Settings className="w-12 h-12 md:w-16 md:h-16 text-white/40 group-hover:text-white transition-colors" />
          <div className="text-center">
            <h2 className="text-xl md:text-2xl font-black italic">ADMINISTRATION</h2>
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-2 group-hover:text-white/40">Configuration & Control</p>
          </div>
        </button>

        <button 
          onClick={() => navigate('/jury')}
          className="group p-8 md:p-12 bg-white/5 border border-white/10 hover:border-white transition-all flex flex-col items-center gap-6"
        >
          <Lock className="w-12 h-12 md:w-16 md:h-16 text-white/40 group-hover:text-white transition-colors" />
          <div className="text-center">
            <h2 className="text-xl md:text-2xl font-black italic">CONSOLES JURY</h2>
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-2 group-hover:text-white/40">Log in to vote</p>
          </div>
        </button>

        <button 
          onClick={() => navigate('/')}
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

function JuryGateway({ state, onSave }: { state: TournamentState, onSave: (s: TournamentState) => void }) {
  const [juryId, setJuryId] = useState<string | null>(sessionStorage.getItem('juryId'));
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const navigate = useNavigate();

  const handleJuryLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    const jury = state.juryAccounts.find(j => j.username === username && j.password === password);
    if (jury) {
      sessionStorage.setItem('juryId', jury.id);
      setJuryId(jury.id);
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
        sessionStorage.setItem('juryId', data.juryId);
        setJuryId(data.juryId);
      } else {
        setLoginError(data.error);
      }
    } catch (err) {
      setLoginError("Identifiants incorrects");
    }
  };

  if (juryId) {
    return <JuryView state={state} juryId={juryId} onSave={onSave} onLogout={() => { sessionStorage.removeItem('juryId'); setJuryId(null); }} />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-surface-dark">
      <div className="w-full max-w-sm bg-white/5 border border-white/10 p-8">
        <form onSubmit={handleJuryLogin} className="w-full space-y-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black italic uppercase tracking-tighter mb-2">LOGIN JURY</h1>
            <p className="text-[10px] font-black uppercase text-white/20 tracking-widest leading-loose">Veuillez entrer vos identifiants pour accéder à la console de vote</p>
          </div>
          <div className="space-y-4">
            <input 
              type="text" 
              placeholder="Nom d'utilisateur" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-black/40 border border-white/10 px-4 py-3 font-black focus:border-white transition-all outline-none italic text-sm text-white"
            />
            <input 
              type="password" 
              placeholder="Mot de passe" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-black/40 border border-white/10 px-4 py-3 font-black focus:border-white transition-all outline-none italic text-sm text-white"
            />
          </div>
          
          {loginError && <p className="text-brand-red text-[10px] font-bold uppercase text-center pt-2">{loginError}</p>}
          
          <button 
            type="submit"
            className="w-full py-4 bg-white text-black font-black italic uppercase text-xs tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Accéder au Vote
          </button>
          
          <button 
            type="button"
            onClick={() => navigate('/')}
            className="w-full text-white/20 hover:text-white text-[9px] font-black uppercase tracking-widest pt-4"
          >
            Retour à l'affichage
          </button>
        </form>
      </div>
    </div>
  );
}

function AdminView({ state, onSave }: { state: TournamentState, onSave: (s: TournamentState) => void }) {
  const navigate = useNavigate();
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
        newAccounts.push({ id: `jury-${i + 1}`, username: `JURE ${i + 1}`, password: "" });
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
  const [votingMode, setVotingMode] = useState<'match' | 'round'>('match');
  const [roundCount, setRoundCount] = useState(1);

  const handleParticipantCountChange = (count: number) => {
    setParticipantCount(count);
    let newParticipants = [...participants];
    if (count > participants.length) {
      for (let i = participants.length; i < count; i++) {
        newParticipants.push({ id: `p-${i + 1}`, name: "", photo: "" });
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
        round: newMatchRound,
        votingMode,
        roundCount: votingMode === 'round' ? roundCount : 1,
        currentRound: 1,
        roundResults: [],
        finishedJuries: []
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

  const confirmRound = async () => {
    try {
      const res = await fetch('/api/admin/confirm-round', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        onSave(data.state);
      }
    } catch (e) {
      console.warn("Server sync failed during confirmRound");
    }
  };

  const selectMatch = async (matchId: string) => {
    try {
      await fetch('/api/admin/select-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId })
      });
    } catch (e) {
      console.warn("Server sync failed during selectMatch");
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
          <button onClick={() => navigate('/select')} className="text-white/40 hover:text-white"><LogOut /></button>
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
            <div className="space-y-3">
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
              
              <div className="space-y-2 py-2 border-y border-white/5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-white/30 italic">Type de Juridiction</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setVotingMode('match')}
                      className={`px-3 py-1 text-[9px] font-black italic border ${votingMode === 'match' ? 'bg-white text-black border-white' : 'border-white/10 text-white/40'}`}
                    >
                      BATTLE
                    </button>
                    <button 
                      onClick={() => setVotingMode('round')}
                      className={`px-3 py-1 text-[9px] font-black italic border ${votingMode === 'round' ? 'bg-white text-black border-white' : 'border-white/10 text-white/40'}`}
                    >
                      ROUND
                    </button>
                  </div>
                </div>

                {votingMode === 'round' && (
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-white/30 italic">Nombre de Rounds</span>
                    <input 
                      type="number"
                      min="1"
                      max="10"
                      value={roundCount}
                      onChange={e => setRoundCount(parseInt(e.target.value) || 1)}
                      className="w-16 bg-black/40 border border-white/10 px-2 py-1 font-black text-xs outline-none italic text-center"
                    />
                  </div>
                )}
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
          <button onClick={() => navigate('/select')} className="text-white/40 hover:text-white transition-colors"><LogOut /></button>
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
                        {m.status === 'pending' && (
                          <button 
                            onClick={() => selectMatch(m.id)}
                            className="px-4 py-2 bg-white text-black text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all"
                          >
                            LANCER
                          </button>
                        )}
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
                  {activeMatch?.votingMode === 'round' && activeMatch.status === 'active' && (
                    <button 
                      onClick={confirmRound}
                      className="w-full py-4 bg-green-600 text-white font-black italic flex items-center justify-center gap-3 transition-all rounded-sm hover:scale-[1.02]"
                    >
                      {activeMatch.currentRound < activeMatch.roundCount ? `VALIDER ROUND ${activeMatch.currentRound}` : "VALIDER DERNIER ROUND"}
                    </button>
                  )}
                  <button 
                    disabled={!activeMatch || (activeMatch.votingMode === 'round' && activeMatch.currentRound <= activeMatch.roundCount && activeMatch.status !== 'finished') || activeMatch.status === 'finished'}
                    onClick={nextMatch} 
                    className={`w-full py-4 font-black italic flex items-center justify-center gap-3 transition-all rounded-sm
                      ${(!activeMatch || (activeMatch.votingMode === 'round' && activeMatch.currentRound <= activeMatch.roundCount && activeMatch.status !== 'finished') || activeMatch.status === 'finished') ? 'bg-white/5 text-white/10' : 'bg-white text-black hover:scale-[1.02] cursor-pointer'}`}
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

function JuryView({ state, juryId, onSave, onLogout }: { state: TournamentState, juryId: string, onSave: (s: TournamentState) => void, onLogout: () => void }) {
  const currentMatch = state.matches.find(m => m.id === state.currentMatchId);
  const [view, setView] = useState<'list' | 'vote'>('list');
  const [isChanging, setIsChanging] = useState(false);
  const myVote = state.juryVotes[juryId];
  const navigate = useNavigate();

  // Redirect to vote if we were already voting or if a match is active and we want to auto-join?
  // User said: "si le jury se connecte il doit avoir la liste des battles"
  // So we stay in 'list' by default.

  // Reset local state when round or match changes
  useEffect(() => {
    setIsChanging(false);
  }, [state.currentMatchId, currentMatch?.currentRound]);

  const redP = state.participants.find(p => p.id === currentMatch?.redTeamId);
  const blueP = state.participants.find(p => p.id === currentMatch?.blueTeamId);

  const currentVotesRed = Object.values(state.juryVotes).filter(v => v === 'red').length;
  const currentVotesBlue = Object.values(state.juryVotes).filter(v => v === 'blue').length;
  const totalCurrentVotes = currentVotesRed + currentVotesBlue;

  const confirmRound = async () => {
    try {
      const res = await fetch('/api/admin/confirm-round', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        onSave(data.state);
      }
    } catch (e) {
      console.warn("Server sync failed during confirmRound");
    }
  };

  const nextMatch = async () => {
    try {
      const res = await fetch('/api/admin/next-match', { method: 'POST' });
      if (res.ok) {
        // State will update via polling
      }
    } catch (e) {
      console.warn("Server sync failed during nextMatch");
    }
  };

  const selectMatch = async (matchId: string) => {
    const localFinished = JSON.parse(localStorage.getItem(`finished_${juryId}`) || '[]');
    if (localFinished.includes(matchId)) return;

    try {
      const res = await fetch('/api/admin/select-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId })
      });
      if (res.ok) {
        // setShowMatchList(false);
        setView('vote');
      }
    } catch (e) {
      console.warn("Server sync failed during selectMatch");
    }
  };

  const finalizeMatch = async () => {
    const cid = state.currentMatchId;
    if (!cid) {
      setView('list');
      return;
    }
    
    // Optimistic UI update: local storage and state
    const juryFinishedMatches = JSON.parse(localStorage.getItem(`finished_${juryId}`) || '[]');
    if (!juryFinishedMatches.includes(cid)) {
      juryFinishedMatches.push(cid);
      localStorage.setItem(`finished_${juryId}`, JSON.stringify(juryFinishedMatches));
    }
    
    setView('list'); 
    
    try {
      const res = await fetch('/api/jury/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ juryId, matchId: cid })
      });
      if (res.ok) {
        const data = await res.json();
        onSave(data.state);
      }
    } catch (e) {
      console.warn("Server sync failed during finalizeMatch");
    }
  };

  const castVote = async (vote: 'red' | 'blue') => {
    const newVotes = { ...state.juryVotes, [juryId]: vote };
    const currentMatchRef = state.matches.find(m => m.id === state.currentMatchId);
    
    if (currentMatchRef) {
      const redVotes = Object.values(newVotes).filter(v => v === 'red').length;
      const blueVotes = Object.values(newVotes).filter(v => v === 'blue').length;
      const totalVotes = redVotes + blueVotes;
      
      const newMatches = state.matches.map(m => {
        if (m.id === state.currentMatchId) {
          const allVoted = totalVotes >= state.juryCount;
          return {
            ...m,
            redVotes: m.votingMode === 'match' ? redVotes : m.redVotes,
            blueVotes: m.votingMode === 'match' ? blueVotes : m.blueVotes,
            allVotesCastAt: allVoted ? Date.now() : undefined,
            winnerId: allVoted && m.votingMode === 'match' ? (redVotes > blueVotes ? m.redTeamId : m.blueTeamId) : m.winnerId
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
      setIsChanging(false);
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
      {/* Header for Jury Console */}
      <header className="fixed top-4 left-4 right-4 flex justify-between items-center z-[100] pointer-events-none">
        <div className="flex bg-black/40 backdrop-blur-md px-4 py-2 border border-white/10 rounded-full pointer-events-auto items-center gap-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-white italic">
            CONSOLE JURY : <span className="text-white/60 ml-2">{state.juryAccounts.find(j => j.id === juryId)?.username}</span>
          </span>
          {view === 'vote' && (
            <button 
              onClick={myVote ? finalizeMatch : () => setView('list')}
              className="text-[9px] font-black uppercase text-white/40 hover:text-white border-l border-white/10 pl-4 transition-colors"
            >
              {myVote ? 'VALIDER & QUITTER' : 'RETOUR LISTE'}
            </button>
          )}
        </div>
        <button 
          onClick={onLogout}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black font-black italic uppercase text-[10px] tracking-widest rounded-full hover:scale-105 transition-all pointer-events-auto"
        >
          <LogOut size={12} />
          SORTIE
        </button>
      </header>

      {/* Dynamic Palette / List Selection */}
      <AnimatePresence mode="wait">
        {view === 'vote' && currentMatch && currentMatch.status === 'active' ? (
          <motion.div 
            key="palette"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`flex-1 flex flex-col sm:flex-row h-full relative transition-all duration-700 ${myVote && !isChanging ? 'p-2 sm:p-4 gap-2 sm:gap-4' : ''}`}
          >
            <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-50 pointer-events-none">
               <h3 className="text-[8px] sm:text-[10px] font-black tracking-[0.5em] text-white/40 uppercase">
                 {currentMatch.votingMode === 'round' ? `ROUND ${currentMatch.currentRound} / ${currentMatch.roundCount}` : currentMatch.round}
               </h3>
               {currentMatch.votingMode === 'round' && (
                 <div className="flex gap-1">
                   {Array.from({ length: currentMatch.roundCount }).map((_, i) => (
                     <div 
                       key={i} 
                       className={`w-8 sm:w-12 h-1 ${i < currentMatch.currentRound - 1 ? 'bg-green-500' : (i === currentMatch.currentRound - 1 ? 'bg-white/40' : 'bg-white/5')}`} 
                     />
                   ))}
                 </div>
               )}
            </div>
            {/* Red Button */}
            <button 
              onClick={() => castVote('red')}
              disabled={!!myVote && !isChanging}
              className={`flex-1 flex flex-col items-center justify-center transition-all duration-700 touch-none relative overflow-hidden group
                ${isChanging && myVote === 'red' ? 'ring-8 ring-white/30 z-20 shadow-[0_0_100px_rgba(225,29,72,0.8)]' : ''}
                ${myVote && !isChanging ? (myVote === 'red' ? 'opacity-100 rounded-3xl' : 'opacity-20 scale-90 rounded-3xl') : 'p-8 active:scale-95 active:brightness-90'}
              `}
              style={{ backgroundColor: 'rgb(225, 29, 72)' }}
            >
              {redP?.photo && (
                <div className={`absolute inset-0 flex items-center justify-center p-4 transition-all duration-700 ${myVote && !isChanging ? 'opacity-40 scale-75' : 'md:p-8'}`}>
                  <div className={`w-full h-full max-w-[75%] max-h-[75%] rounded-[2rem] overflow-hidden border-8 border-white/20 shadow-2xl relative transition-all duration-700 ${myVote && !isChanging ? 'rounded-full' : ''}`}>
                    <img src={redP.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-red/40 to-transparent" />
                  </div>
                </div>
              )}
              <div className={`relative z-10 flex flex-col items-center bg-black/40 rounded-xl border border-white/10 transition-all duration-700 short-screen-p-sm ${myVote && !isChanging ? 'px-4 py-2 scale-75' : 'px-6 py-4'}`}>
                <Shield className={`${myVote && !isChanging ? 'w-8 h-8 mb-1' : 'w-12 h-12 md:w-16 md:h-16 mb-4 short-screen-hide'} text-white drop-shadow-lg`} />
                <h2 className={`${myVote && !isChanging ? 'text-xl' : 'text-2xl md:text-4xl short-screen-text-sm'} font-black italic uppercase tracking-tighter text-center leading-tight mb-2 drop-shadow-md`}>{redP?.name}</h2>
                <div className="px-4 py-1 bg-white text-black font-black italic uppercase text-[10px] tracking-widest shadow-xl short-screen-text-sm">
                  {myVote === 'red' && !isChanging ? 'SÉLECTIONNÉ' : (isChanging && myVote === 'red' ? 'VOTE ACTUEL' : 'VOTER ROUGE')}
                </div>
              </div>
            </button>

            {/* Blue Button */}
            <button 
              onClick={() => castVote('blue')}
              disabled={!!myVote && !isChanging}
              className={`flex-1 flex flex-col items-center justify-center transition-all duration-700 touch-none border-white/20 relative overflow-hidden group
                ${isChanging && myVote === 'blue' ? 'ring-8 ring-white/30 z-20 shadow-[0_0_100px_rgba(37,99,235,0.8)]' : ''}
                ${myVote && !isChanging ? (myVote === 'blue' ? 'opacity-100 rounded-3xl' : 'opacity-20 scale-90 rounded-3xl') : 'p-8 active:scale-95 active:brightness-90 border-t-2 sm:border-t-0 sm:border-l-2'}
              `}
              style={{ backgroundColor: 'rgb(37, 99, 235)' }}
            >
              {blueP?.photo && (
                <div className={`absolute inset-0 flex items-center justify-center p-4 transition-all duration-700 ${myVote && !isChanging ? 'opacity-40 scale-75' : 'md:p-8'}`}>
                  <div className={`w-full h-full max-w-[75%] max-h-[75%] rounded-[2rem] overflow-hidden border-8 border-white/20 shadow-2xl relative transition-all duration-700 ${myVote && !isChanging ? 'rounded-full' : ''}`}>
                    <img src={blueP.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-blue/40 to-transparent" />
                  </div>
                </div>
              )}
              <div className={`relative z-10 flex flex-col items-center bg-black/40 rounded-xl border border-white/10 transition-all duration-700 short-screen-p-sm ${myVote && !isChanging ? 'px-4 py-2 scale-75' : 'px-6 py-4'}`}>
                <Rocket className={`${myVote && !isChanging ? 'w-8 h-8 mb-1' : 'w-12 h-12 md:w-16 md:h-16 mb-4 short-screen-hide'} text-white drop-shadow-lg`} />
                <h2 className={`${myVote && !isChanging ? 'text-xl' : 'text-2xl md:text-4xl short-screen-text-sm'} font-black italic uppercase tracking-tighter text-center leading-tight mb-2 drop-shadow-md`}>{blueP?.name}</h2>
                <div className="px-4 py-1 bg-white text-black font-black italic uppercase text-[10px] tracking-widest shadow-xl short-screen-text-sm">
                   {myVote === 'blue' && !isChanging ? 'SÉLECTIONNÉ' : (isChanging && myVote === 'blue' ? 'VOTE ACTUEL' : 'VOTER BLEU')}
                </div>
              </div>
            </button>

            {/* Confirmation Overlay (Active when vote cast and not changing) */}
            {myVote && !isChanging && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center z-30 px-6"
              >
                <div className="bg-black/90 backdrop-blur-2xl border border-white/20 p-6 md:p-12 rounded-3xl md:rounded-[3.5rem] flex flex-col items-center text-center shadow-[0_0_100px_rgba(0,0,0,1)] pointer-events-auto max-w-lg w-full short-screen-p-sm">
                    <div className={`w-16 h-16 md:w-24 md:h-24 rounded-full flex items-center justify-center mb-4 md:mb-8 border-4 short-screen-hide ${myVote === 'red' ? 'border-brand-red bg-brand-red/20 shadow-[0_0_40px_rgba(225,29,72,0.4)]' : 'border-brand-blue bg-brand-blue/20 shadow-[0_0_40px_rgba(37,99,235,0.4)]'}`}>
                       <CheckCircle2 size={32} className="text-white md:w-12 md:h-12" />
                    </div>
                    <p className="text-[10px] font-black tracking-[0.5em] text-white/40 uppercase mb-2 md:mb-3 short-screen-text-sm">VOTE ENREGISTRÉ</p>
                    <h3 className="text-2xl md:text-5xl font-black italic tracking-tighter uppercase mb-1 md:mb-2 short-screen-text-sm">
                       {myVote === 'red' ? redP?.name : blueP?.name}
                    </h3>
                    <p className="text-[10px] md:text-[11px] text-white/30 font-bold uppercase tracking-widest mb-6 md:mb-10 italic short-screen-hide">
                       SÉLECTION BIEN TRANSMISE AU SYSTÈME
                    </p>
                    
                    <div className="flex flex-col md:flex-row gap-2 md:gap-4 w-full max-w-xs md:max-w-md">
                       <button 
                         onClick={finalizeMatch}
                         className="flex-1 flex items-center justify-center gap-3 px-6 py-4 md:px-10 md:py-6 bg-white text-black font-black italic uppercase text-xs md:text-sm tracking-widest hover:scale-105 transition-all rounded-full shadow-[0_10px_30px_rgba(255,255,255,0.2)] short-screen-p-sm"
                       >
                         <LogOut size={16} />
                         <span>VALIDER</span>
                       </button>

                       <button 
                         onClick={() => setIsChanging(true)}
                         className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-white/40 hover:text-white text-[9px] font-black uppercase tracking-widest transition-all"
                       >
                         Changer
                       </button>
                    </div>
                </div>
              </motion.div>
            )}

            {isChanging && (
              <button 
                onClick={() => setIsChanging(false)}
                className="absolute top-8 left-1/2 -translate-x-1/2 bg-white text-black px-6 py-3 font-black italic uppercase text-xs tracking-widest z-50 shadow-2xl border-2 border-black rounded-full"
              >
                Annuler le changement
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="list-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center p-6 sm:p-12 overflow-y-auto pt-24"
          >
            <div className="w-full max-w-3xl flex flex-col">
              <div className="flex flex-col mb-12 text-center sm:text-left">
                <h2 className="text-4xl font-black italic uppercase tracking-tighter">BATTLES DU TOURNOI</h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 italic">Sélectionnez le match actif pour juger</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {state.matches.map((m, i) => {
                  const red = state.participants.find(p => p.id === m.redTeamId);
                  const blue = state.participants.find(p => p.id === m.blueTeamId);
                  const isActive = m.status === 'active';
                  const isFinishedGlobal = m.status === 'finished';
                  const localFinished = JSON.parse(localStorage.getItem(`finished_${juryId}`) || '[]');
                  const isFinishedByMe = (m.finishedJuries && Array.isArray(m.finishedJuries) && m.finishedJuries.includes(juryId)) || localFinished.includes(m.id);
                  const isFinished = isFinishedGlobal || isFinishedByMe;

                  return (
                    <div 
                      key={m.id}
                      className={`w-full group p-6 flex flex-col md:flex-row justify-between items-center gap-6 transition-all border 
                        ${isActive && !isFinishedByMe ? 'bg-white/10 border-white shadow-[0_0_40px_rgba(255,255,255,0.1)]' : 'bg-white/5 border-white/5'}
                        ${isFinished ? 'opacity-30' : ''}
                      `}
                    >
                      <div className="flex items-center gap-6 w-full md:w-auto">
                        <span className="text-xs font-black text-white/20 w-6">0{i+1}</span>
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black uppercase text-white/30 mb-1">{m.round}</span>
                          <div className="flex flex-1 items-center gap-4 text-xl italic font-black uppercase">
                              <span className={isFinishedGlobal && m.winnerId === m.redTeamId ? 'text-brand-red' : ''}>{red?.name}</span>
                              <span className="text-white/10 text-[10px] not-italic font-bold">VS</span>
                              <span className={isFinishedGlobal && m.winnerId === m.blueTeamId ? 'text-brand-blue' : ''}>{blue?.name}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 w-full md:w-auto">
                         {isActive && !isFinishedByMe ? (
                           <button 
                             onClick={() => setView('vote')}
                             className="w-full md:w-auto px-8 py-3 bg-white text-black font-black italic uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                           >
                             <Play size={14} className="fill-current" />
                             ENTRER
                           </button>
                         ) : isFinishedByMe ? (
                            <div className="flex flex-col items-end opacity-40">
                               <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 border border-white/10 px-4 py-2 bg-white/5">TERMINÉ</span>
                            </div>
                         ) : isFinishedGlobal ? (
                           <span className="text-[8px] font-black uppercase tracking-widest text-white/20 border border-white/5 px-3 py-2">BATTLE TERMINÉ</span>
                         ) : (
                           <span className="text-[8px] font-black uppercase tracking-widest text-white/10 italic">EN ATTENTE...</span>
                         )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="h-16 md:h-20 bg-black/80 backdrop-blur-xl border-t border-white/10 flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-4">
           <div className={`w-2 h-2 rounded-full ${myVote ? 'bg-green-500' : 'bg-white/20 animate-pulse'}`} />
           <div className="flex flex-col">
             <span className="text-[10px] font-black tracking-widest uppercase opacity-40 leading-none mb-1 short-screen-text-sm">
               CONTRÔLE: {state.juryAccounts.find(j => j.id === juryId)?.username || "GUEST"}
             </span>
           </div>
        </div>
        <button 
          onClick={onLogout}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-black uppercase tracking-widest short-screen-text-sm"
        >
          QUITTER
        </button>
      </footer>

    </div>
  );
}

function PublicView({ state }: { state: TournamentState }) {
  const navigate = useNavigate();
  const activeMatch = state.matches.find(m => m.id === state.currentMatchId);
  const redP = activeMatch ? state.participants.find(p => p.id === activeMatch.redTeamId) : null;
  const blueP = activeMatch ? state.participants.find(p => p.id === activeMatch.blueTeamId) : null;

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(interval);
  }, []);

  if (!activeMatch) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-12 text-center font-sans text-white">
        <h1 className="text-4xl font-black italic text-white/10 uppercase tracking-widest leading-none mb-8">
          {state.competitionName || "ARENA SYSTEM"}
        </h1>
        <div className="w-16 h-16 border-2 border-white/5 border-t-white/40 rounded-full animate-spin mb-6" />
        <p className="text-white/10 font-bold uppercase tracking-[0.4em] text-[10px]">System Interlink Pending • Waiting for Active Battle</p>
        <button onClick={() => navigate('/select')} className="mt-12 text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-white transition-all underline underline-offset-8">Hub System</button>
      </div>
    );
  }

  const currentVotesRed = Object.values(state.juryVotes).filter(v => v === 'red').length;
  const currentVotesBlue = Object.values(state.juryVotes).filter(v => v === 'blue').length;
  const totalCurrentVotes = currentVotesRed + currentVotesBlue;
  
  const gracePeriodPassed = activeMatch.allVotesCastAt ? (now - activeMatch.allVotesCastAt > 5000) : false;
  
  // In ROUND mode, the score is the number of rounds won (from match object)
  // In MATCH mode, the score is the jury vote count
  const redScore = activeMatch.votingMode === 'round' 
    ? activeMatch.redVotes 
    : (activeMatch.status === 'finished' || (totalCurrentVotes >= state.juryCount && gracePeriodPassed) ? currentVotesRed : 0);
  
  const blueScore = activeMatch.votingMode === 'round' 
    ? activeMatch.blueVotes 
    : (activeMatch.status === 'finished' || (totalCurrentVotes >= state.juryCount && gracePeriodPassed) ? currentVotesBlue : 0);

  const showResults = activeMatch.status === 'finished' || (totalCurrentVotes >= state.juryCount && gracePeriodPassed);
  const winner = showResults ? (redScore > blueScore ? redP : blueP) : null;

  return (
    <div className="min-h-screen bg-[#050502] text-white font-sans selection:bg-brand-red selection:text-white flex flex-col overflow-hidden relative">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute -top-1/4 -left-1/4 w-full h-full bg-brand-red blur-[150px] opacity-10" />
        <div className="absolute -bottom-1/4 -right-1/4 w-full h-full bg-brand-blue blur-[150px] opacity-10" />
      </div>

      {/* Header Bar */}
      <header className="px-6 md:px-12 py-4 md:py-8 flex justify-between items-start z-10">
        <div className="flex flex-col gap-2">
          <div className="bg-white/10 border border-white/20 px-4 py-1 text-[9px] md:text-[11px] font-black italic uppercase tracking-widest text-white/80">
            {activeMatch.round}
          </div>
          <button onClick={() => navigate('/select')} className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-white transition-all text-left">BACK TO HUB</button>
        </div>
        
        <div className="absolute left-1/2 -translate-x-1/2 text-center top-4 md:top-8 w-full px-4 pointer-events-none">
          <p className="text-[8px] md:text-[10px] font-black tracking-[0.45em] text-white/30 uppercase mb-1 md:mb-2">INSTAX PRESENTED BY</p>
          <h1 className="text-2xl md:text-5xl font-black tracking-tighter leading-none italic uppercase truncate">{state.competitionName}</h1>
        </div>

        <div className="text-right">
          <div className="h-[2px] w-full bg-gradient-to-l from-white/20 to-transparent mt-2" />
        </div>
      </header>

      {/* Main Battle Area */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 md:px-12 z-10 -mt-8 md:-mt-16 overflow-y-auto">
        <div className="w-full max-w-7xl flex flex-col lg:grid lg:grid-cols-[1fr_auto_1fr] items-center gap-6 md:gap-12 relative py-8">
          
          {/* Red Side */}
          <div className="space-y-4 md:space-y-8 w-full lg:w-auto">
            <div className="flex justify-center lg:justify-end gap-4 md:gap-8 items-end">
              <div className="w-40 h-28 md:w-64 md:h-40 bg-white/5 border border-white/10 flex items-center justify-center p-2 relative group overflow-hidden">
                {redP?.photo ? (
                  <img src={redP.photo} className="w-full h-full object-cover transition-all duration-700" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-[10px] font-black text-white/10 uppercase tracking-widest italic">img</span>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-all" />
              </div>
              <div className="w-32 h-32 md:w-48 md:h-48 bg-brand-red flex items-center justify-center text-6xl md:text-8xl font-black italic shadow-[0_0_100px_rgba(225,29,72,0.4)] border-b-8 border-black/20 uppercase">
                {redScore}
              </div>
            </div>
            <div className="bg-brand-red font-black italic text-2xl md:text-4xl px-6 md:px-10 py-4 md:py-6 flex items-center justify-center lg:justify-start border-l-[10px] border-white/30 shadow-[inset_-20px_0_60px_rgba(0,0,0,0.3)]">
              <span className="truncate uppercase tracking-tighter">{redP?.name || "???"}</span>
            </div>
          </div>

          {/* VS Divider */}
          <div className="text-4xl md:text-6xl font-black italic text-white/5 px-4 pt-4 lg:pt-24 select-none">VS</div>

          {/* Blue Side */}
          <div className="space-y-4 md:space-y-8 w-full lg:w-auto">
            <div className="flex flex-row-reverse lg:flex-row justify-center lg:justify-start gap-4 md:gap-8 items-end">
              <div className="w-32 h-32 md:w-48 md:h-48 bg-brand-blue flex items-center justify-center text-6xl md:text-8xl font-black italic shadow-[0_0_100px_rgba(37,99,235,0.4)] border-b-8 border-black/20 uppercase">
                {blueScore}
              </div>
              <div className="w-40 h-28 md:w-64 md:h-40 bg-white/5 border border-white/10 flex items-center justify-center p-2 relative group overflow-hidden">
                {blueP?.photo ? (
                  <img src={blueP.photo} className="w-full h-full object-cover transition-all duration-700" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-[10px] font-black text-white/10 uppercase tracking-widest italic">img</span>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-all" />
              </div>
            </div>
            <div className="bg-brand-blue font-black italic text-2xl md:text-4xl px-6 md:px-10 py-4 md:py-6 flex items-center justify-center lg:justify-end border-r-[10px] border-white/30 shadow-[inset_20px_0_60px_rgba(0,0,0,0.3)]">
              <span className="truncate uppercase tracking-tighter">{blueP?.name || "???"}</span>
            </div>
          </div>
        </div>

        {/* Jury Table */}
        <div className="w-full max-w-7xl mt-8 md:mt-20 relative px-4 md:px-0 mb-8">
          <div className="bg-[#0a0a18]/60 border border-white/10 backdrop-blur-xl shadow-2xl">
            <div 
              className="grid border-b border-white/10"
              style={{ gridTemplateColumns: `repeat(${state.juryAccounts.length}, 1fr)` }}
            >
               {state.juryAccounts.map((jury, i) => {
                 return (
                   <div key={jury.id} className="py-3 text-center border-r border-white/5 last:border-r-0">
                     <span className="text-[10px] font-black uppercase tracking-widest italic text-white/50">
                       {jury.username}
                     </span>
                   </div>
                 );
               })}
            </div>
            <div className="flex flex-col items-center gap-4">
              <div className="flex gap-2">
                {activeMatch.votingMode === 'round' ? (
                  Array.from({ length: activeMatch.roundCount }).map((_, i) => {
                    const result = activeMatch.roundResults?.[i];
                    return (
                      <div key={i} className="flex flex-col gap-1 items-center">
                        <div className={`w-8 h-8 flex items-center justify-center border ${result ? (result.red > result.blue ? 'bg-brand-red border-brand-red' : (result.blue > result.red ? 'bg-brand-blue border-brand-blue' : 'bg-white/20 border-white/40')) : 'bg-white/5 border-white/10'}`}>
                          {result && <span className="text-[10px] font-black italic">{result.red > result.blue ? 'R' : (result.blue > result.red ? 'B' : '=')}</span>}
                        </div>
                        <span className="text-[8px] font-black opacity-20 uppercase">R{i+1}</span>
                      </div>
                    );
                  })
                ) : null}
              </div>
            </div>

            <div 
              className="grid h-16"
              style={{ gridTemplateColumns: `repeat(${state.juryAccounts.length}, 1fr)` }}
            >
               {state.juryAccounts.map((jury, i) => {
                 const allVoted = Object.keys(state.juryVotes).length >= state.juryAccounts.length;
                 const showVotes = allVoted && gracePeriodPassed;
                 const vote = showVotes ? state.juryVotes[jury.id] : null;
                 return (
                   <div key={jury.id} className="border-r border-white/5 last:border-r-0 flex flex-col p-2 relative overflow-hidden">
                      <div 
                        className={`flex-1 transition-all duration-700 ${
                          vote 
                            ? (vote === 'red' ? 'bg-brand-red shadow-[inset_0_0_20px_rgba(225,29,72,0.5)]' : 'bg-brand-blue shadow-[inset_0_0_20px_rgba(37,99,235,0.5)]') 
                            : 'bg-white/5'
                        }`} 
                      />
                   </div>
                 );
               })}
            </div>
          </div>
        </div>

        {/* Winner Banner */}
        <AnimatePresence>
          {winner && (
            <motion.div 
              initial={{ height: 0, opacity: 0, scale: 0.95 }}
              animate={{ height: 'auto', opacity: 1, scale: 1 }}
              className="w-full max-w-7xl mt-16 overflow-hidden"
            >
              <div className={`py-10 flex items-center justify-center gap-10 font-black italic text-5xl tracking-widest uppercase shadow-[0_0_120px_rgba(0,0,0,1)] relative overflow-hidden border-y-2 border-white/10
                ${winner.id === redP?.id ? 'bg-brand-red' : 'bg-brand-blue'}
              `}>
                <div className="absolute inset-0 bg-white/10 animate-pulse mix-blend-overlay" />
                <div className="z-10 flex items-center gap-8 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                  <Trophy size={48} className="text-white fill-white/20" />
                  {winner.name} WINS
                </div>
                {/* Glowing Outer Light */}
                <div className={`absolute -inset-1 blur-[40px] -z-10 opacity-60 animate-pulse ${winner.id === redP?.id ? 'bg-brand-red' : 'bg-brand-blue'}`} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Admin Quick Links (Discreet) */}
      <div className="absolute bottom-32 left-1/2 -translate-x-1/2 flex gap-8 z-10 opacity-30 hover:opacity-100 transition-opacity">
          <a href="/admin" className="text-[10px] font-black italic uppercase tracking-[0.2em] border-b border-transparent hover:border-white pb-1">Console Admin</a>
          <a href="/" className="text-[10px] font-black italic uppercase tracking-[0.2em] border-b border-transparent hover:border-white pb-1">Affichage Public</a>
      </div>

      {/* Footer Info */}
      <footer className="px-12 py-10 flex justify-center gap-16 border-t border-white/5 mt-auto bg-black/40 backdrop-blur-md">
        <span className="text-[10px] font-black tracking-[0.4em] text-white/20 uppercase">INSTAX</span>
        <span className="text-[10px] font-black tracking-[0.4em] text-white/20 uppercase">ARENA JUDGE PRO</span>
        <span className="text-[10px] font-black tracking-[0.4em] text-white/20 uppercase">WDSF OFFICIATING SYSTEM</span>
      </footer>
    </div>
  );
}
