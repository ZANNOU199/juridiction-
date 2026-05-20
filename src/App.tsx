import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  tournamentSize: 16 | 8 | 4 | 2;
}

const DEFAULT_STATE: TournamentState = {
  competitionName: "ARENA CHAMPIONSHIP",
  competitionLogo: "",
  participants: Array.from({ length: 16 }, (_, i) => ({ id: `p-${i + 1}`, name: `B-BOY ${i + 1}`, photo: "" })),
  juryAccounts: [],
  juryCount: 3,
  currentMatchId: null,
  matches: [],
  juryVotes: {},
  configured: false,
  tournamentSize: 16
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
        // Only update if server state is actually newer or different
        // In local-first mode, we only overwrite if we get a valid response
        setState(data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
    } catch (err) {
      // Ignore network errors
    }
  };

  useEffect(() => {
    // Poll server for multi-device sync
    fetchState();
    const interval = setInterval(fetchState, 5000); // Reduce frequency to be less annoying if failing

    // Sync across tabs on the same device/browser
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const newState = JSON.parse(e.newValue);
          setState(newState);
        } catch (err) {
          console.error("Failed to parse storage update", err);
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicView state={state} />} />
        <Route path="/bracket" element={<BracketView state={state} />} />
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

    const normalizedUser = username.trim().toLowerCase();
    const normalizedPass = password.trim();

    const jury = state.juryAccounts.find(j => 
      j.username.trim().toLowerCase() === normalizedUser && 
      j.password.trim() === normalizedPass
    );
    if (jury) {
      sessionStorage.setItem('juryId', jury.id);
      setJuryId(jury.id);
      return;
    }

    try {
      const res = await fetch('/api/jury/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password: password.trim() })
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
        {!state.configured ? (
          <div className="text-center space-y-4">
             <div className="animate-spin w-8 h-8 border-2 border-white/10 border-t-white rounded-full mx-auto" />
             <p className="text-[10px] font-black uppercase text-white/40 tracking-widest leading-loose">Système en attente de configuration par l'administrateur...</p>
             <button 
               onClick={() => navigate('/')}
               className="w-full text-white/20 hover:text-white text-[9px] font-black uppercase tracking-widest pt-4"
             >
               Retour
             </button>
          </div>
        ) : (
          <form onSubmit={handleJuryLogin} className="w-full space-y-4">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-black italic uppercase tracking-tighter mb-2">LOGIN JURY</h1>
              <p className="text-[10px] font-black uppercase text-white/20 tracking-widest leading-loose">Entrez vos identifiants pour accéder à la console</p>
            </div>
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="Utilisateur" 
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
              className="w-full py-4 bg-white text-black font-black italic uppercase text-xs tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              disabled={!username}
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

            {state?.juryAccounts && state.juryAccounts.length > 0 && (
              <div className="pt-4 mt-4 border-t border-white/5 space-y-2">
                <p className="text-[8px] font-black uppercase text-white/30 tracking-widest text-center">Raccourcis de connexion (Clic pour remplir)</p>
                <div className="flex flex-wrap gap-1 justify-center">
                  {state.juryAccounts.map((j) => (
                    <button
                      key={j.id}
                      type="button"
                      onClick={() => {
                        setUsername(j.username);
                        setPassword(j.password || "");
                      }}
                      className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-sm text-[8px] font-mono tracking-tight transition-all uppercase border border-white/5 hover:border-white/10"
                    >
                      {j.username}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

function AdminView({ state, onSave }: { state: TournamentState, onSave: (s: TournamentState) => void }) {
  const navigate = useNavigate();
  const [competitionName, setCompetitionName] = useState(state.competitionName || "");
  const [competitionLogo, setCompetitionLogo] = useState(state.competitionLogo || "");
  const [tournamentSize, setTournamentSize] = useState<16 | 8 | 4 | 2>(state.tournamentSize || 16);
  const [participants, setParticipants] = useState<Participant[]>(() => {
    if (state.participants && state.participants.length > 0) return state.participants;
    return Array.from({ length: 16 }, (_, i) => ({ id: `p-${i + 1}`, name: `B-BOY ${i + 1}`, photo: "" }));
  });
  const [matches, setMatches] = useState<Match[]>(state.matches || []);
  const [juryCount, setJuryCount] = useState(state.juryCount || 3);
  const [juryAccounts, setJuryAccounts] = useState<JuryAccount[]>(state.juryAccounts || []);
  const [showBracketPreview, setShowBracketPreview] = useState(false);

  const updateParticipantNameById = (id: string, newName: string) => {
    setParticipants(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p));
  };

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

  // Match Form
  const [newMatchRound, setNewMatchRound] = useState("");
  const [redId, setRedId] = useState("");
  const [blueId, setBlueId] = useState("");
  const [votingMode, setVotingMode] = useState<'match' | 'round'>('match');
  const [roundCount, setRoundCount] = useState(1);

  const updateParticipant = (index: number, field: keyof Participant, value: string) => {
    const newParticipants = [...participants];
    newParticipants[index] = { ...newParticipants[index], [field]: value };
    setParticipants(newParticipants);
  };

  const generateBracket = (size: 16 | 8 | 4 | 2) => {
    const newMatches: Match[] = [];
    
    // Top 16 (8 matches)
    if (size >= 16) {
      for (let i = 0; i < 8; i++) {
        newMatches.push({
          id: `t16-${i + 1}`,
          redTeamId: participants[i * 2]?.id || "",
          blueTeamId: participants[i * 2 + 1]?.id || "",
          redVotes: 0,
          blueVotes: 0,
          winnerId: null,
          status: 'pending',
          round: "TOP 16",
          votingMode: 'match',
          roundCount: 1,
          currentRound: 1,
          roundResults: [],
          finishedJuries: []
        });
      }
    }

    // Top 8 (Empty containers for manual filling)
    if (size >= 8) {
      for (let i = 0; i < 4; i++) {
          newMatches.push({
            id: `t8-${i + 1}`,
            redTeamId: size === 8 ? (participants[i * 2]?.id || "") : "",
            blueTeamId: size === 8 ? (participants[i * 2 + 1]?.id || "") : "",
            redVotes: 0,
            blueVotes: 0,
            winnerId: null,
            status: 'pending',
            round: "TOP 8",
            votingMode: 'match',
            roundCount: 1,
            currentRound: 1,
            roundResults: [],
            finishedJuries: []
          });
        }
    }

    // Semi (2 matches)
    if (size >= 4) {
      for (let i = 0; i < 2; i++) {
          newMatches.push({
            id: `semi-${i + 1}`,
            redTeamId: size === 4 ? (participants[i * 2]?.id || "") : "",
            blueTeamId: size === 4 ? (participants[i * 2 + 1]?.id || "") : "",
            redVotes: 0,
            blueVotes: 0,
            winnerId: null,
            status: 'pending',
            round: "SEMI FINALE",
            votingMode: 'match',
            roundCount: 1,
            currentRound: 1,
            roundResults: [],
            finishedJuries: []
          });
        }
    }

    // Finale (1 match)
    newMatches.push({
        id: `final-1`,
        redTeamId: size === 2 ? (participants[0]?.id || "") : "",
        blueTeamId: size === 2 ? (participants[1]?.id || "") : "",
        redVotes: 0,
        blueVotes: 0,
        winnerId: null,
        status: 'pending',
        round: "FINALE",
        votingMode: 'match',
        roundCount: 1,
        currentRound: 1,
        roundResults: [],
        finishedJuries: []
    });

    setMatches(newMatches);
  };

  const updateMatchParticipant = (matchId: string, side: 'red' | 'blue', participantId: string) => {
    setMatches(matches.map(m => {
        if (m.id === matchId) {
            return {
                ...m,
                [side === 'red' ? 'redTeamId' : 'blueTeamId']: participantId
            };
        }
        return m;
    }));
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
    const finalParticipants = participants.slice(0, tournamentSize);
    const newState: TournamentState = {
      ...state,
      competitionName,
      competitionLogo,
      participants: finalParticipants,
      juryAccounts,
      juryCount: juryAccounts.length,
      currentMatchId: matches.length > 0 ? matches[0].id : null,
      matches: matches.map((m, i) => i === 0 ? { ...m, status: 'active' } : m),
      configured: true,
      juryVotes: {},
      tournamentSize
    };
    onSave(newState);

    try {
      await fetch('/api/admin/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitionName, competitionLogo, participants: finalParticipants, juryAccounts, matches, tournamentSize })
      });
    } catch (e) {
      console.warn("Server sync failed during configure");
    }
  };

  const nextMatch = async () => {
    const nextIdx = state.matches.findIndex(m => m.status === 'pending');
    if (nextIdx !== -1) {
      await selectMatch(state.matches[nextIdx].id);
    }
  };

  const finishMatch = async () => {
    const activeIdx = state.matches.findIndex(m => m.id === state.currentMatchId);
    if (activeIdx !== -1) {
       let newMatches = [...state.matches];
       const finishedMatch = { ...newMatches[activeIdx], status: 'finished' as const };
       newMatches[activeIdx] = finishedMatch;

       // ADVANCE WINNER LOCALLY
       const winnerId = finishedMatch.winnerId;
       if (winnerId) {
         const progression: Record<string, { nextMatchId: string; side: 'red' | 'blue' }> = {
           't16-1': { nextMatchId: 't8-1', side: 'red' },
           't16-2': { nextMatchId: 't8-1', side: 'blue' },
           't16-3': { nextMatchId: 't8-2', side: 'red' },
           't16-4': { nextMatchId: 't8-2', side: 'blue' },
           't16-5': { nextMatchId: 't8-3', side: 'red' },
           't16-6': { nextMatchId: 't8-3', side: 'blue' },
           't16-7': { nextMatchId: 't8-4', side: 'red' },
           't16-8': { nextMatchId: 't8-4', side: 'blue' },
           't8-1': { nextMatchId: 'semi-1', side: 'red' },
           't8-2': { nextMatchId: 'semi-1', side: 'blue' },
           't8-3': { nextMatchId: 'semi-2', side: 'red' },
           't8-4': { nextMatchId: 'semi-2', side: 'blue' },
           'semi-1': { nextMatchId: 'final-1', side: 'red' },
           'semi-2': { nextMatchId: 'final-1', side: 'blue' },
         };

         const nextInfo = progression[finishedMatch.id];
         if (nextInfo) {
           newMatches = newMatches.map(m => {
             if (m.id === nextInfo.nextMatchId) {
               return {
                 ...m,
                 [nextInfo.side === 'red' ? 'redTeamId' : 'blueTeamId']: winnerId
               };
             }
             return m;
           });
         }
       }

       const newState = { ...state, matches: newMatches };
       onSave(newState);
       
       try {
         await fetch('/api/admin/finish-match', { method: 'POST' });
       } catch (e) {
         console.warn("Server sync failed during finishMatch");
       }
    }
  };

  const confirmRound = async () => {
    // Round confirmation usually has complex logic, better to try server first but handle local
    try {
      const res = await fetch('/api/admin/confirm-round', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        onSave(data.state);
        return;
      }
    } catch (e) {
      console.warn("Server sync failed during confirmRound");
    }

    // Fallback local logic for confirmRound if server fails
    const match = state.matches.find(m => m.id === state.currentMatchId);
    if (match && match.votingMode === 'round' && match.status === 'active') {
       const redV = Object.values(state.juryVotes).filter(v => v === 'red').length;
       const blueV = Object.values(state.juryVotes).filter(v => v === 'blue').length;
       
       const newMatches = state.matches.map(m => {
         if (m.id === state.currentMatchId) {
           const newRoundResults = [...(m.roundResults || []), { red: redV, blue: blueV }];
           const isLastRound = m.currentRound >= m.roundCount;
           
           let finalRed = m.redVotes;
           let finalBlue = m.blueVotes;
           if (redV > blueV) finalRed++;
           else if (blueV > redV) finalBlue++;

           return {
             ...m,
             currentRound: isLastRound ? m.currentRound : m.currentRound + 1,
             roundResults: newRoundResults,
             redVotes: finalRed,
             blueVotes: finalBlue,
             // status: isLastRound ? 'finished' : 'active' // Manual finish requested by user now
           };
         }
         return m;
       });

       onSave({ ...state, matches: newMatches, juryVotes: {} });
    }
  };

  const selectMatch = async (matchId: string) => {
    const newMatches = state.matches.map(m => {
      if (m.id === matchId) return { ...m, status: 'active' as const };
      // if (m.status === 'active') return { ...m, status: 'finished' as const }; // Don't auto finish
      return m;
    });

    const newState: TournamentState = {
      ...state,
      currentMatchId: matchId,
      matches: newMatches,
      juryVotes: {}
    };
    onSave(newState);

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
      <div className="min-h-screen p-6 md:p-12 flex flex-col items-center max-w-7xl mx-auto font-sans text-white bg-surface-dark">
        <header className="w-full flex justify-between items-center mb-12 border-b border-white/5 pb-8">
          <div className="flex flex-col">
            <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter">Configuration</h2>
          </div>
          <button onClick={() => navigate('/select')} className="text-white/20 hover:text-white transition-all"><LogOut /></button>
        </header>

        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
          {/* Left: Settings */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-white/5 p-8 border border-white/10">
               <h3 className="text-[10px] font-black tracking-[0.2em] uppercase text-white/40 mb-6 flex items-center gap-2">
                 <Settings size={14} /> 1. Paramètres Généraux
               </h3>
               <div className="space-y-4">
                  <div className="pt-2">
                    <p className="text-[9px] font-black uppercase text-white/40 mb-3 tracking-widest">Type de Compétition</p>
                    <div className="grid grid-cols-4 gap-2">
                      {[16, 8, 4, 2].map(s => (
                        <button 
                          key={s}
                          onClick={() => setTournamentSize(s as any)}
                          className={`py-3 font-black italic border-2 transition-all text-[10px] tracking-widest ${tournamentSize === s ? 'bg-white border-white text-black' : 'border-white/10 text-white/40'}`}
                        >
                          TOP {s}
                        </button>
                      ))}
                    </div>
                  </div>

                 <input 
                   type="text" 
                   value={competitionName} 
                   onChange={e => setCompetitionName(e.target.value)}
                   placeholder="NOM DE L'ÉVÉNEMENT"
                   className="w-full bg-black/40 border border-white/10 px-4 py-4 font-black focus:border-white transition-all outline-none italic uppercase text-sm"
                 />
                 <input 
                   type="text" 
                   value={competitionLogo} 
                   onChange={e => setCompetitionLogo(e.target.value)}
                   placeholder="URL LOGO (OPTIONNEL)"
                   className="w-full bg-black/40 border border-white/10 px-4 py-4 font-bold focus:border-white transition-all outline-none italic text-xs"
                 />
                 
                 <div className="pt-4">
                   <p className="text-[9px] font-black uppercase text-white/40 mb-3 tracking-widest">Configuration des Juges</p>
                   <div className="flex gap-2 mb-6">
                     {[3, 5].map(n => (
                       <button 
                         key={n}
                         onClick={() => handleJuryCountChange(n)}
                         className={`flex-1 py-3 font-black italic border-2 transition-all text-[10px] tracking-widest ${juryCount === n ? 'bg-white border-white text-black' : 'border-white/10 text-white/40'}`}
                       >
                         {n} JUGES
                       </button>
                     ))}
                   </div>
                   
                   <div className="space-y-2">
                     {juryAccounts.map((jury, i) => (
                       <div key={jury.id} className="flex gap-2">
                         <input 
                           type="text" 
                           value={jury.username} 
                           onChange={e => updateJuryAccount(i, 'username', e.target.value)}
                           className="flex-1 bg-black/40 border border-white/5 px-3 py-2 font-black focus:border-white transition-all outline-none italic text-[10px] uppercase"
                         />
                         <input 
                           type="text" 
                           value={jury.password} 
                           onChange={e => updateJuryAccount(i, 'password', e.target.value)}
                           className="flex-1 bg-black/40 border border-white/5 px-3 py-2 font-black focus:border-white transition-all outline-none italic text-[10px] uppercase"
                         />
                       </div>
                     ))}
                   </div>
                 </div>
               </div>
            </div>
          </div>

          {/* Center: Participants */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-white/5 p-8 border border-white/10">
               <h3 className="text-[10px] font-black tracking-[0.2em] uppercase text-white/40 mb-6 flex items-center gap-2">
                 <Users size={14} /> 2. Participants ({tournamentSize})
               </h3>
               <div className="grid grid-cols-1 gap-2 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
                  {participants.slice(0, tournamentSize).map((p, i) => (
                    <div key={p.id} className="relative group">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/20 italic">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <input 
                        type="text" 
                        value={p.name} 
                        onChange={e => updateParticipant(i, 'name', e.target.value)}
                        placeholder={`NOM PARTICIPANT ${i + 1}`}
                        className="w-full bg-black/40 border border-white/5 pl-12 pr-4 py-3 font-black focus:border-white transition-all outline-none italic text-xs uppercase"
                      />
                    </div>
                  ))}
               </div>
            </div>
          </div>

          {/* Right: Bracket */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-white/5 p-8 border border-white/10">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="text-[10px] font-black tracking-[0.2em] uppercase text-white/40 flex items-center gap-2">
                   <Trophy size={14} /> 3. Structure du Tableau
                 </h3>
                 <button 
                  onClick={() => generateBracket(tournamentSize)}
                  className="text-[9px] font-black hover:text-white transition-colors uppercase italic border-b border-white/20"
                 >
                   Reset
                 </button>
               </div>

               {matches.length === 0 ? (
                 <div className="py-20 text-center border-2 border-dashed border-white/5 flex flex-col items-center">
                    <p className="text-[11px] font-black italic uppercase text-white/20 mb-6 max-w-[200px]">Initialiser le tableau Top {tournamentSize}</p>
                    <button 
                      onClick={() => generateBracket(tournamentSize)}
                      className="px-6 py-3 bg-white text-black font-black italic uppercase text-[10px] tracking-widest hover:scale-105 active:scale-95 transition-all"
                    >
                      GÉNÉRER LE TOP {tournamentSize}
                    </button>
                 </div>
               ) : (
                 <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
                    {['TOP 16', 'TOP 8', 'SEMI FINALE', 'FINALE'].filter(r => {
                      if (tournamentSize === 16) return r === 'TOP 16';
                      if (tournamentSize === 8) return r === 'TOP 8';
                      if (tournamentSize === 4) return r === 'SEMI FINALE';
                      if (tournamentSize === 2) return r === 'FINALE';
                      return true;
                    }).map(roundName => (
                        <div key={roundName} className="space-y-2">
                            <h4 className="text-[8px] font-black text-white/30 tracking-[0.3em] uppercase border-b border-white/5 pb-1">{roundName}</h4>
                            {matches.filter(m => m.round === roundName).map(m => (
                                <div key={m.id} className="grid grid-cols-2 gap-1 bg-white/5 p-2 border border-white/5">
                                    <select 
                                        value={m.redTeamId} 
                                        onChange={e => updateMatchParticipant(m.id, 'red', e.target.value)}
                                        className="bg-black/50 border border-white/5 text-[9px] font-black italic uppercase p-1.5 outline-none"
                                    >
                                        <option value="">ROUGE</option>
                                        {participants.slice(0, tournamentSize).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    <select 
                                        value={m.blueTeamId} 
                                        onChange={e => updateMatchParticipant(m.id, 'blue', e.target.value)}
                                        className="bg-black/50 border border-white/5 text-[9px] font-black italic uppercase p-1.5 outline-none"
                                    >
                                        <option value="">BLEU</option>
                                        {participants.slice(0, tournamentSize).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                            ))}
                        </div>
                    ))}
                 </div>
               )}

               {matches.length > 0 && (
                 <div className="pt-4 border-t border-white/5">
                   <button 
                     onClick={() => setShowBracketPreview(!showBracketPreview)}
                     className="w-full py-2 bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all italic flex items-center justify-center gap-2"
                   >
                     {showBracketPreview ? 'CACHER LE BRACKET' : 'VOIR LE BRACKET'}
                   </button>
                 </div>
               )}
            </div>
          </div>
        </div>

        <div className="w-full mt-16 flex flex-col items-center gap-8 pb-12">
          <button 
            disabled={matches.length === 0 || !competitionName}
            onClick={configure}
            className="w-full max-w-2xl py-6 bg-white text-black font-black italic uppercase text-xl md:text-2xl tracking-tighter shadow-[0_20px_50px_rgba(255,255,255,0.05)] hover:scale-[1.01] transition-all disabled:opacity-20"
          >
            Lancer l'Événement Officiel
          </button>
          <div className="flex gap-4 items-center opacity-40">
             <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
             <p className="text-[9px] font-black uppercase tracking-[0.3em] italic">System Ready</p>
          </div>
        </div>

        {showBracketPreview && (
          <div className="w-full mt-8 p-4 bg-black/40 border-y border-white/5 overflow-x-auto no-scrollbar">
            <div className="min-w-[1200px] py-10">
              <BracketContent 
                state={{ 
                  ...state, 
                  participants, 
                  matches, 
                  tournamentSize 
                }} 
                onUpdateName={updateParticipantNameById}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-12 flex flex-col items-center bg-surface-dark font-sans text-white">
       <header className="w-full flex justify-between items-center mb-12 max-w-7xl border-b border-white/5 pb-8">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-4 md:gap-6">
              <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter">{state.competitionName} - ADMIN</h2>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/30 text-green-500 text-[9px] font-black uppercase tracking-[0.2em]">
                 <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                 Live System
              </div>
            </div>
          </div>
          <div className="flex items-center gap-8">
            <button onClick={() => navigate('/bracket')} className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all border-b border-white/10 hover:border-white pb-1 italic">View Bracket</button>
            <button onClick={() => navigate('/select')} className="text-white/20 hover:text-white transition-colors"><LogOut size={20} /></button>
          </div>
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
                        {m.status === 'pending' && (!state.currentMatchId || state.matches.find(ex => ex.id === state.currentMatchId)?.status === 'finished') && (
                          <button 
                            onClick={() => selectMatch(m.id)}
                            className="px-4 py-2 bg-white text-black text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all"
                          >
                            LANCER
                          </button>
                        )}
                        {m.id === state.currentMatchId && m.status === 'active' && (
                          <div className="px-4 py-2 bg-green-500 text-black text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-black rounded-full animate-pulse" />
                            EN COURS
                          </div>
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
                  {activeMatch && activeMatch.status === 'active' && (
                    <button 
                      onClick={finishMatch}
                      disabled={!state.juryAccounts.every(j => state.juryVotes[j.id])}
                      className={`w-full py-4 font-black italic flex items-center justify-center gap-3 transition-all rounded-sm mb-2 shadow-[0_4px_20px_rgba(225,29,72,0.3)]
                        ${state.juryAccounts.every(j => state.juryVotes[j.id]) 
                          ? 'bg-brand-red text-white hover:scale-[1.02]' 
                          : 'bg-white/5 text-white/20 cursor-not-allowed'}`}
                    >
                      <CheckCircle2 size={18} /> MARQUER TERMINER
                    </button>
                  )}
                  {activeMatch?.votingMode === 'round' && activeMatch.status === 'active' && (
                    <button 
                      onClick={confirmRound}
                      className="w-full py-4 bg-green-600 text-white font-black italic flex items-center justify-center gap-3 transition-all rounded-sm hover:scale-[1.02]"
                    >
                      {activeMatch.currentRound < activeMatch.roundCount ? `VALIDER ROUND ${activeMatch.currentRound}` : "VALIDER DERNIER ROUND"}
                    </button>
                  )}
                  <button 
                    disabled={(state.currentMatchId !== null && state.matches.find(m => m.id === state.currentMatchId)?.status === 'active') || !state.matches.some(m => m.status === 'pending')}
                    onClick={nextMatch} 
                    className={`w-full py-4 font-black italic flex items-center justify-center gap-3 transition-all rounded-sm
                      ${((state.currentMatchId !== null && state.matches.find(m => m.id === state.currentMatchId)?.status === 'active') || !state.matches.some(m => m.status === 'pending')) ? 'bg-white/5 text-white/10' : 'bg-white text-black hover:scale-[1.02] cursor-pointer'}`}
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
    <div className="force-landscape-layout fixed inset-0 flex flex-col bg-black overflow-y-auto select-none font-sans text-white">
      {/* Header for Jury Console */}
      <header className="fixed top-4 left-4 right-4 flex justify-between items-center z-[100] pointer-events-none">
        <div className="flex bg-black/40 backdrop-blur-md px-4 py-2 border border-white/10 rounded-full pointer-events-auto items-center gap-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-white italic">
            CONSOLE JURY : <span className="text-white/60 ml-2">{state.juryAccounts.find(j => j.id === juryId)?.username}</span>
          </span>
        </div>
        <button 
          onClick={view === 'vote' ? () => setView('list') : onLogout}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black font-black italic uppercase text-[10px] tracking-widest rounded-full hover:scale-105 transition-all pointer-events-auto shadow-xl"
        >
          {view === 'vote' ? (
            <>
              <RotateCcw size={12} />
              BATTLES
            </>
          ) : (
            <>
              <LogOut size={12} />
              SORTIE
            </>
          )}
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
            className={`flex-1 flex flex-row h-full relative transition-all duration-700 p-4 sm:p-8 md:p-12 gap-4 sm:gap-8`}
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
                ${myVote && !isChanging ? (myVote === 'red' ? 'opacity-100 rounded-3xl' : 'opacity-20 scale-90 rounded-3xl') : 'p-4 active:scale-95 active:brightness-90'}
              `}
              style={{ backgroundColor: 'rgb(225, 29, 72)' }}
            >
              {redP?.photo && (
                <div className={`absolute inset-0 flex items-center justify-center p-2 transition-all duration-700 ${myVote && !isChanging ? 'opacity-40 scale-75' : 'md:p-8'}`}>
                  <div className={`w-full h-full max-w-[85%] max-h-[85%] rounded-[1.5rem] md:rounded-[2rem] overflow-hidden border-4 md:border-8 border-white/20 shadow-2xl relative transition-all duration-700 ${myVote && !isChanging ? 'rounded-full' : ''}`}>
                    <img src={redP.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-red/40 to-transparent" />
                  </div>
                </div>
              )}
              <div className={`relative z-10 flex flex-col items-center bg-black/40 rounded-xl border border-white/10 transition-all duration-700 short-screen-p-sm ${myVote && !isChanging ? 'px-4 py-2 scale-75' : 'px-4 py-3 sm:px-6 sm:py-4'}`}>
                <Shield className={`${myVote && !isChanging ? 'w-8 h-8 mb-1' : 'w-10 h-10 md:w-16 md:h-16 mb-2 md:mb-4 short-screen-hide'} text-white drop-shadow-lg`} />
                <h2 className={`${myVote && !isChanging ? 'text-lg sm:text-xl' : 'text-xl md:text-4xl short-screen-text-sm'} font-black italic uppercase tracking-tighter text-center leading-tight mb-1 sm:mb-2 drop-shadow-md`}>{redP?.name}</h2>
                <div className="px-3 py-1 bg-white text-black font-black italic uppercase text-[8px] sm:text-[10px] tracking-widest shadow-xl short-screen-text-sm">
                  {myVote === 'red' && !isChanging ? 'SÉLECTIONNÉ' : (isChanging && myVote === 'red' ? 'VOTE ACTUEL' : 'ROUGE')}
                </div>
              </div>
            </button>

            {/* Blue Button */}
            <button 
              onClick={() => castVote('blue')}
              disabled={!!myVote && !isChanging}
              className={`flex-1 flex flex-col items-center justify-center transition-all duration-700 touch-none border-white/20 relative overflow-hidden group
                ${isChanging && myVote === 'blue' ? 'ring-8 ring-white/30 z-20 shadow-[0_0_100px_rgba(37,99,235,0.8)]' : ''}
                ${myVote && !isChanging ? (myVote === 'blue' ? 'opacity-100 rounded-3xl' : 'opacity-20 scale-90 rounded-3xl') : 'p-4 active:scale-95 active:brightness-90 border-l-2'}
              `}
              style={{ backgroundColor: 'rgb(37, 99, 235)' }}
            >
              {blueP?.photo && (
                <div className={`absolute inset-0 flex items-center justify-center p-2 transition-all duration-700 ${myVote && !isChanging ? 'opacity-40 scale-75' : 'md:p-8'}`}>
                  <div className={`w-full h-full max-w-[85%] max-h-[85%] rounded-[1.5rem] md:rounded-[2rem] overflow-hidden border-4 md:border-8 border-white/20 shadow-2xl relative transition-all duration-700 ${myVote && !isChanging ? 'rounded-full' : ''}`}>
                    <img src={blueP.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-blue/40 to-transparent" />
                  </div>
                </div>
              )}
              <div className={`relative z-10 flex flex-col items-center bg-black/40 rounded-xl border border-white/10 transition-all duration-700 short-screen-p-sm ${myVote && !isChanging ? 'px-4 py-2 scale-75' : 'px-4 py-3 sm:px-6 sm:py-4'}`}>
                <Rocket className={`${myVote && !isChanging ? 'w-8 h-8 mb-1' : 'w-10 h-10 md:w-16 md:h-16 mb-2 md:mb-4 short-screen-hide'} text-white drop-shadow-lg`} />
                <h2 className={`${myVote && !isChanging ? 'text-lg sm:text-xl' : 'text-xl md:text-4xl short-screen-text-sm'} font-black italic uppercase tracking-tighter text-center leading-tight mb-1 sm:mb-2 drop-shadow-md`}>{blueP?.name}</h2>
                <div className="px-3 py-1 bg-white text-black font-black italic uppercase text-[8px] sm:text-[10px] tracking-widest shadow-xl short-screen-text-sm">
                   {myVote === 'blue' && !isChanging ? 'SÉLECTIONNÉ' : (isChanging && myVote === 'blue' ? 'VOTE ACTUEL' : 'BLEU')}
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
                             className="w-full md:w-auto px-8 py-3 bg-brand-red text-white font-black italic uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(225,29,72,0.4)] animate-pulse"
                           >
                             <Play size={14} className="fill-current" />
                             JUGER LA BATTLE
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
    </div>
  );
}

function BracketView({ state }: { state: TournamentState }) {
  const navigate = useNavigate();
  const bracketContainerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [bracketScale, setBracketScale] = useState(1);
  const [bracketHeight, setBracketHeight] = useState(1000);

  useEffect(() => {
    const updateScale = () => {
      if (bracketContainerRef.current && measureRef.current) {
        const containerWidth = bracketContainerRef.current.offsetWidth;
        const containerHeight = bracketContainerRef.current.offsetHeight;
        const contentWidth = 2000; 
        const contentHeight = measureRef.current.offsetHeight;
        
        const scaleW = (containerWidth - 60) / contentWidth;
        const scaleH = (containerHeight - 60) / contentHeight;
        const scale = Math.min(1, scaleW, scaleH);
        
        setBracketScale(scale);
        setBracketHeight(contentHeight);
      }
    };

    updateScale();
    const timer = setTimeout(updateScale, 200);
    window.addEventListener('resize', updateScale);
    return () => {
      window.removeEventListener('resize', updateScale);
      clearTimeout(timer);
    };
  }, [state.matches, state.tournamentSize]);

  return (
    <div className="h-screen bg-[#0a0807] overflow-hidden flex flex-col selection:bg-primary/30">
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] diagonal-lines z-0"></div>
      
      <header className="px-6 md:px-12 py-3 flex justify-between items-center border-b border-white/5 bg-black/60 backdrop-blur-md z-50 shrink-0">
        <div className="flex items-center gap-4">
           <button onClick={() => navigate('/select')} className="text-white/20 hover:text-white transition-colors">
              <Rocket size={18} />
           </button>
           <h2 className="text-xs md:text-sm font-black italic uppercase tracking-[0.3em] text-white/60">
             {state.competitionName} <span className="mx-2 text-primary">/</span> Bracket
           </h2>
        </div>
        <div className="flex gap-4">
           <button onClick={() => navigate('/')} className="px-4 py-1.5 bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all italic flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></div> Scoreboard
           </button>
        </div>
      </header>

      <main 
        ref={bracketContainerRef} 
        className="flex-1 relative z-10 overflow-hidden flex items-center justify-center p-2"
      >
        {/* Hidden clone for measurement */}
        <div 
          ref={measureRef} 
          className="absolute top-0 left-0 invisible pointer-events-none" 
          style={{ width: '2000px' }}
        >
          <BracketContent state={state} />
        </div>

        {/* Scaled visible content */}
        <div 
          style={{ 
            width: '2000px',
            transform: `scale(${bracketScale})`,
            transformOrigin: 'center center',
            transition: 'transform 0.4s ease-out',
            willChange: 'transform',
            flexShrink: 0
          }}
          className="flex justify-center"
        >
          <BracketContent state={state} />
        </div>
      </main>
    </div>
  );
}

interface MatchNodeProps {
  match?: Match;
  participants: Participant[];
  className?: string;
  side?: 'left' | 'right';
  key?: string | number;
  onUpdateName?: (id: string, newName: string) => void;
}

function MatchNode({ match, participants, className = "", onUpdateName }: MatchNodeProps) {
  const getParticipant = (id: string) => participants.find(p => p.id === id);
  const red = match ? getParticipant(match.redTeamId) : null;
  const blue = match ? getParticipant(match.blueTeamId) : null;

  const isWinner = (pId: string) => match?.status === 'finished' && match.winnerId === pId;

  return (
    <div className={`bracket-card flex flex-col gap-1 group hover:border-primary/30 min-w-[180px] md:min-w-[240px] ${className} ${match?.status === 'active' ? 'bracket-card-active' : ''}`}>
      {[red, blue].map((p, idx) => (
        <div key={idx} className="flex justify-between items-center h-10 md:h-14 px-4 relative border-b border-white/5 last:border-b-0">
          <div className="flex items-center gap-3 overflow-hidden">
             {p?.photo && (
               <div className="w-5 h-5 rounded-full overflow-hidden border border-white/10 shrink-0">
                 <img src={p.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
               </div>
             )}
             {onUpdateName && p ? (
               <input 
                 value={p.name}
                 onChange={(e) => onUpdateName(p.id, e.target.value)}
                 className="bg-transparent text-[11px] md:text-[16px] font-black uppercase italic tracking-tight outline-none border-b border-primary/20 focus:border-primary w-full"
               />
             ) : (
               <span className={`text-[11px] md:text-[16px] font-black uppercase italic tracking-tight truncate ${p ? 'text-white' : 'text-white/10'} ${p && isWinner(p.id) ? 'text-primary' : ''}`}>
                 {p?.name || "-"}
               </span>
             )}
          </div>
          <div className="flex items-center gap-1 md:gap-2">
             <span className={`text-[10px] md:text-[13px] font-mono font-black ${p ? 'text-white/40' : 'text-white/5'}`}>
               {match?.status === 'finished' ? (p?.id === match.redTeamId ? match.redVotes : (p?.id === match.blueTeamId ? match.blueVotes : '-')) : '-'}
             </span>
          </div>
          {p && isWinner(p.id) && <div className="absolute -left-0.5 md:-left-1 top-1/2 -translate-y-1/2 w-0.5 md:w-1 h-5 md:h-7 bg-primary shadow-[0_0_10px_rgba(255,255,255,0.5)]" />}
        </div>
      ))}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[7px] md:text-[10px] font-black text-white/30 uppercase bg-[#0a0807] px-2 italic tracking-widest border border-white/5 whitespace-nowrap">
         {match?.id || ""}
      </div>
    </div>
  );
}

function BracketContent({ state, onUpdateName }: { state: TournamentState; onUpdateName?: (id: string, name: string) => void }) {
  const getMatch = (round: string, index: number) => {
    const roundMatches = state.matches.filter(m => m.round === round);
    return roundMatches[index];
  };

  const getWinner = (match?: Match) => state.participants.find(p => p.id === match?.winnerId);

  const showTop16 = state.tournamentSize >= 16;
  const showTop8 = state.tournamentSize >= 8;
  const showSemi = state.tournamentSize >= 4;

  return (
    <div className="flex justify-center items-center w-full px-10 md:px-20 py-2 md:py-6 relative gap-8 md:gap-12">
      
      {/* LEFT SIDE FLOW */}
      <div className="flex items-center gap-8 md:gap-12">
        {showTop16 && (
          <div className="flex flex-col gap-10 md:gap-14">
            {[0, 1, 2, 3].map(i => <MatchNode key={`l16-${i}`} match={getMatch("TOP 16", i)} participants={state.participants} onUpdateName={onUpdateName} />)}
          </div>
        )}
        {showTop8 && (
          <div className="flex flex-col gap-40 md:gap-52">
            {[0, 1].map(i => <MatchNode key={`l8-${i}`} match={getMatch("TOP 8", i)} participants={state.participants} onUpdateName={onUpdateName} />)}
          </div>
        )}
        {showSemi && (
          <div className="flex flex-col">
            <div className="p-4 border border-primary/20 bg-primary/5 rounded-sm relative w-[260px] shadow-[0_0_30px_rgba(255,255,255,0.02)]">
              <span className="absolute -top-3 left-6 text-[9px] font-black text-primary uppercase bg-[#0a0807] px-3 italic tracking-widest border border-primary/20 whitespace-nowrap">SEMI-FINAL A</span>
              <MatchNode match={getMatch("SEMI FINALE", 0)} participants={state.participants} className="border-none bg-transparent p-0 min-w-0" onUpdateName={onUpdateName} />
            </div>
          </div>
        )}
      </div>

      {/* CENTER: CHAMPION */}
      <div className="flex flex-col items-center gap-8 px-6 relative z-20 shrink-0">
         <div className="text-center">
            <Trophy className="text-primary mx-auto mb-2 animate-pulse drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]" size={48} />
            <h1 className="text-5xl md:text-6xl font-black italic tracking-tighter text-white leading-[0.8] mb-1">
              {state.tournamentSize === 2 ? 'SUPER' : 'GRANDE'}
            </h1>
            <h1 className="text-5xl md:text-6xl font-black italic tracking-tighter text-white leading-[0.8]">FINALE</h1>
         </div>

         <div className="champion-box w-[260px] h-[380px] p-0.5 flex flex-col relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-4 relative z-10">
                <div className="w-24 h-24 rounded-full bg-white/5 border-2 border-white/10 flex items-center justify-center overflow-hidden shadow-[0_0_40px_rgba(255,255,255,0.05)]">
                    {getWinner(getMatch("FINALE", 0)) ? (
                        <img src={getWinner(getMatch("FINALE", 0))?.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                        <div className="text-white/5"><Users size={48} /></div>
                    )}
                </div>
                <div className="text-center space-y-2">
                    <p className="text-[11px] font-bold text-primary uppercase tracking-[0.3em] italic">Champion</p>
                    {onUpdateName && getWinner(getMatch("FINALE", 0)) ? (
                      <input 
                        value={getWinner(getMatch("FINALE", 0))?.name} 
                        onChange={(e) => onUpdateName(getWinner(getMatch("FINALE", 0))!.id, e.target.value)}
                        className="bg-transparent text-2xl font-black italic uppercase text-white tracking-tighter text-center outline-none border-b border-primary/20 focus:border-primary w-[220px]"
                      />
                    ) : (
                      <h2 className="text-3xl font-black italic uppercase text-white tracking-tighter truncate w-[220px] drop-shadow-md">
                          {getWinner(getMatch("FINALE", 0))?.name || "-"}
                      </h2>
                    )}
                </div>
            </div>
            <div className="h-1.5 bg-gradient-to-r from-transparent via-primary to-transparent" />
         </div>
      </div>

      {/* RIGHT SIDE FLOW */}
      <div className="flex items-center gap-8 md:gap-12 flex-row-reverse">
        {showTop16 && (
          <div className="flex flex-col gap-10 md:gap-14">
            {[4, 5, 6, 7].map(i => <MatchNode key={`r16-${i}`} match={getMatch("TOP 16", i)} participants={state.participants} onUpdateName={onUpdateName} />)}
          </div>
        )}
        {showTop8 && (
          <div className="flex flex-col gap-40 md:gap-52">
            {[2, 3].map(i => <MatchNode key={`r8-${i}`} match={getMatch("TOP 8", i)} participants={state.participants} onUpdateName={onUpdateName} />)}
          </div>
        )}
        {showSemi && (
          <div className="flex flex-col">
            <div className="p-4 border border-primary/20 bg-primary/5 rounded-sm relative w-[260px] shadow-[0_0_30px_rgba(255,255,255,0.02)]">
              <span className="absolute -top-3 right-6 text-[9px] font-black text-primary uppercase bg-[#0a0807] px-3 italic tracking-widest border border-primary/20 whitespace-nowrap">SEMI-FINAL B</span>
              <MatchNode match={getMatch("SEMI FINALE", 1)} participants={state.participants} className="border-none bg-transparent p-0 min-w-0" onUpdateName={onUpdateName} />
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

function PublicView({ state }: { state: TournamentState }) {
  const navigate = useNavigate();
  const activeMatch = state.matches.find(m => m.id === state.currentMatchId);
  const redP = activeMatch ? state.participants.find(p => p.id === activeMatch.redTeamId) : null;
  const blueP = activeMatch ? state.participants.find(p => p.id === activeMatch.blueTeamId) : null;

  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current && contentRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const containerHeight = containerRef.current.offsetHeight;
        const contentWidth = 1280; // Correct base width for max-w-7xl (1280px)
        const contentHeight = contentRef.current.offsetHeight;
        
        const scaleW = (containerWidth - 60) / contentWidth;
        const scaleH = (containerHeight - 60) / contentHeight;
        setScale(Math.min(1, scaleW, scaleH));
      }
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [activeMatch]);

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
    <div className="h-screen bg-[#050502] text-white font-sans selection:bg-brand-red selection:text-white flex flex-col relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute -top-1/4 -left-1/4 w-full h-full bg-brand-red blur-[150px] opacity-10" />
        <div className="absolute -bottom-1/4 -right-1/4 w-full h-full bg-brand-blue blur-[150px] opacity-10" />
      </div>

      {/* Header Bar */}
      <header className="px-4 md:px-12 py-3 md:py-6 flex justify-between items-start z-20">
        <div className="w-20 hidden md:block"></div>
        
        <div className="absolute left-1/2 -translate-x-1/2 text-center top-2 md:top-4 w-full max-w-[90%] pointer-events-none flex flex-col items-center">
          <h1 className="text-xl md:text-4xl font-black tracking-tighter leading-none italic uppercase truncate mb-4 md:mb-8 text-white/90 drop-shadow-2xl">
            {state.competitionName}
          </h1>
          <div className="text-xs md:text-xl font-black italic uppercase tracking-[0.2em] text-primary bg-primary/5 border-x border-primary/40 py-1 md:py-2 px-6 md:px-12 inline-block transform -skew-x-12 shadow-[0_0_20px_rgba(255,77,0,0.1)]">
            {activeMatch.round}
          </div>
        </div>

        <div className="w-20 hidden md:block"></div>
      </header>

      {/* Main Battle Area */}
      <main ref={containerRef} className="flex-1 flex flex-col items-center justify-center px-4 md:px-12 z-10 overflow-hidden w-full relative">
        <div 
          ref={contentRef}
          style={{ 
            transform: `scale(${scale})`, 
            transformOrigin: 'center center',
            transition: 'transform 0.5s ease-out'
          }}
          className="w-full max-w-7xl flex flex-col items-center shrink-0"
        >
          <div className="w-full grid grid-cols-[1fr_auto_1fr] items-stretch gap-1 md:gap-8 relative py-4">
            
            {/* Red Side */}
            <div className="space-y-1 md:space-y-4 flex flex-col min-w-0">
              <div className="flex justify-end gap-1.5 md:gap-6 items-end flex-1">
                <div className="w-16 h-12 sm:w-32 sm:h-24 md:w-48 md:h-32 bg-white/5 border border-white/10 flex items-center justify-center p-0.5 md:p-1 relative group overflow-hidden shrink-0">
                  {redP?.photo ? (
                    <img src={redP.photo} className="w-full h-full object-cover transition-all duration-700" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-[5px] md:text-[8px] font-black text-white/10 uppercase tracking-widest italic">img</span>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
                <div className="w-10 h-10 sm:w-24 sm:h-24 md:w-36 md:h-36 bg-brand-red flex items-center justify-center text-xl sm:text-5xl md:text-7xl font-black italic shadow-[0_0_80px_rgba(225,29,72,0.3)] border-b md:border-b-4 border-black/20 uppercase shrink-0">
                  {redScore}
                </div>
              </div>
              <div className="bg-brand-red font-black italic text-[10px] sm:text-xl md:text-3xl px-2 md:px-8 py-1.5 md:py-4 flex items-center justify-start border-l-[3px] md:border-l-[8px] border-white/30 shadow-[inset_-20px_0_60px_rgba(0,0,0,0.3)] overflow-hidden">
                <span className="truncate uppercase tracking-tighter">{redP?.name || "-"}</span>
              </div>
            </div>

            {/* VS Divider */}
            <div className="text-lg md:text-5xl font-black italic text-white/95 px-1 pt-4 md:pt-20 select-none self-center shrink-0 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">VS</div>

            {/* Blue Side */}
            <div className="space-y-1 md:space-y-4 flex flex-col min-w-0">
              <div className="flex justify-start gap-1.5 md:gap-6 items-end flex-1">
                <div className="w-10 h-10 sm:w-24 sm:h-24 md:w-36 md:h-36 bg-brand-blue flex items-center justify-center text-xl sm:text-5xl md:text-7xl font-black italic shadow-[0_0_80px_rgba(37,99,235,0.3)] border-b md:border-b-4 border-black/20 uppercase shrink-0">
                  {blueScore}
                </div>
                <div className="w-16 h-12 sm:w-32 sm:h-24 md:w-48 md:h-32 bg-white/5 border border-white/10 flex items-center justify-center p-0.5 md:p-1 relative group overflow-hidden shrink-0">
                  {blueP?.photo ? (
                    <img src={blueP.photo} className="w-full h-full object-cover transition-all duration-700" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-[5px] md:text-[8px] font-black text-white/10 uppercase tracking-widest italic">img</span>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
              </div>
              <div className="bg-brand-blue font-black italic text-[10px] sm:text-xl md:text-3xl px-2 md:px-8 py-1.5 md:py-4 flex items-center justify-end border-r-[3px] md:border-r-[8px] border-white/30 shadow-[inset_20px_0_60px_rgba(0,0,0,0.3)] overflow-hidden">
                <span className="truncate uppercase tracking-tighter text-right">{blueP?.name || "-"}</span>
              </div>
            </div>
          </div>

          {/* Jury Table */}
          <div className="w-full mt-4 md:mt-12 relative overflow-hidden">
            <div className="bg-[#0a0a18]/60 border border-white/10 backdrop-blur-xl shadow-2xl overflow-x-auto no-scrollbar">
              <div 
                className="grid border-b border-white/10 min-w-full"
                style={{ gridTemplateColumns: `repeat(${state.juryAccounts.length}, minmax(50px, 1fr))` }}
              >
                 {state.juryAccounts.map((jury, i) => {
                   return (
                     <div key={jury.id} className="py-2 md:py-3 text-center border-r border-white/5 last:border-r-0 overflow-hidden">
                       <span className="text-[7px] md:text-[10px] font-black uppercase tracking-widest italic text-white/50 block truncate px-0.5">
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
      </div>
    </main>
    </div>
  );
}
