import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  Navigate,
  useParams,
  useLocation,
} from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
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
  XCircle,
  Bell,
} from "lucide-react";
import { COUNTRIES } from "./data/countries";
import { AdminHub, EventSelector } from "./components/EventHub";
import { JuryManager } from "./components/JuryManager";
import { useGlobalCategory } from "./useGlobalCategory";

// --- Types ---

interface Participant {
  id: string;
  name: string;
  photo: string;
  countryCode?: string;
  countryName?: string;
  countryFlag?: string;
}

const DEFAULT_PARTICIPANTS: Participant[] = Array.from(
  { length: 16 },
  (_, i) => ({
    id: `p-${i + 1}`,
    name: `B-BOY ${i + 1}`,
    photo: "",
    countryCode: "",
    countryName: "",
    countryFlag: "",
  }),
);

const DEFAULT_SILHOUETTE =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231f2937'/><circle cx='50' cy='35' r='18' fill='%23000000'/><path d='M20 84 C 20 60, 30 53, 50 53 C 70 53, 80 60, 80 84 Z' fill='%23000000'/></svg>";

function DancerPhoto({
  photoUrl,
  className = "w-full h-full object-cover",
  alt = "Dancer",
}: {
  photoUrl?: string;
  className?: string;
  alt?: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [photoUrl]);

  if (!photoUrl || failed) {
    return (
      <svg
        className={`${className} bg-[#1f2937]`}
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="100" height="100" fill="#1f2937" />
        <circle cx="50" cy="35" r="18" fill="#000000" />
        <path
          d="M20 84 C 20 60, 30 53, 50 53 C 70 53, 80 60, 80 84 Z"
          fill="#000000"
        />
      </svg>
    );
  }

  return (
    <img
      src={photoUrl}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

interface Match {
  id: string;
  redTeamId: string;
  blueTeamId: string;
  redVotes: number;
  blueVotes: number;
  winnerId: string | null;
  status: "pending" | "active" | "finished";
  allVotesCastAt?: number;
  round: string;
  votingMode: "match" | "round";
  roundCount: number;
  currentRound: number;
  roundResults: { red: number; blue: number }[];
  finishedJuries: string[];
  revealed?: boolean;
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
  juryVotes: Record<string, "red" | "blue" | null>;
  warnedJuries: string[];
  configured: boolean;
  tournamentSize: 16 | 8 | 4 | 2;
  currentCategory?: string;
}

const DEFAULT_STATE: TournamentState = {
  competitionName: "ARENA CHAMPIONSHIP",
  competitionLogo: "",
  participants: DEFAULT_PARTICIPANTS,
  juryAccounts: [],
  juryCount: 3,
  currentMatchId: null,
  matches: [],
  juryVotes: {},
  warnedJuries: [],
  configured: false,
  tournamentSize: 16,
  currentCategory: "",
};

const STORAGE_KEY = "arena_tournament_state";
const ADMIN_PIN = "9090";
const ADMIN_AUTH_KEY = "admin_authenticated";

// --- Admin Auth Guard Component ---
function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem(ADMIN_AUTH_KEY) === "true";
  });
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (pin === ADMIN_PIN) {
      localStorage.setItem(ADMIN_AUTH_KEY, "true");
      setIsAuthenticated(true);
    } else {
      setError("PIN incorrect");
      setPin("");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_AUTH_KEY);
    window.location.reload();
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-surface-dark">
        <div className="w-full max-w-sm bg-white/5 border border-white/10 p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-black italic text-white uppercase">
              Admin Access
            </h1>
            <p className="text-white/40 text-sm mt-2">Entrez le PIN d'accès</p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Entrez le PIN"
              className="w-full bg-white/5 border border-white/10 text-white px-4 py-2 placeholder-white/20 focus:outline-none focus:border-white/30 text-center text-2xl tracking-widest"
              maxLength={4}
            />
            {error && (
              <div className="text-red-400 text-sm text-center font-bold">{error}</div>
            )}
            <button
              type="submit"
              className="w-full bg-white text-black px-4 py-2 font-bold uppercase hover:bg-white/90"
            >
              Accès Admin
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={handleLogout}
        className="fixed top-4 right-4 z-[999] p-2 bg-white text-black rounded-full hover:scale-110 transition-all shadow-lg"
        title="Déconnexion"
      >
        <LogOut size={20} />
      </button>
      {children}
    </div>
  );
}

// --- Manifest Manager Component ---
function ManifestManager() {
  const location = useLocation();

  useEffect(() => {
    const pathname = location.pathname;
    let manifestPath = "/manifest-home.json";
    let themeColor = "#FF8C00";

    // Determine manifest based on current route
    if (pathname.startsWith("/jury")) {
      manifestPath = "/manifest-jury.json";
    } else if (pathname.startsWith("/admin")) {
      manifestPath = "/manifest-admin.json";
    } else {
      manifestPath = "/manifest-home.json";
    }

    // Update manifest link
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink) {
      manifestLink.setAttribute("href", manifestPath);
    }

    // Update theme color
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute("content", themeColor);
    }
  }, [location.pathname]);

  return null;
}

// --- Main App ---

export default function App() {
  const [state, setState] = useState<TournamentState>(DEFAULT_STATE);

  const saveStateLocal = (newState: TournamentState) => {
    setState(newState);
  };

  const fetchState = async () => {
    try {
      const res = await fetch("/api/state");
      if (res.ok) {
        const data = await res.json();
        // Check if data is valid before updating
        if (data && typeof data === "object" && data.matches) {
          setState(data);

        }
      }
    } catch (err) {
      // Ignore network errors completely
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
    window.addEventListener("storage", handleStorage);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return (
    <BrowserRouter>
      <ManifestManager />
      <Routes>
        {/* Default route redirects to admin */}
        <Route path="/" element={<Navigate to="/admin" replace />} />
        
        {/* Legacy single-tournament routes */}
        <Route path="/bracket" element={<BracketView state={state} />} />
        <Route
          path="/admin/legacy"
          element={
            <AdminAuthGuard>
              <AdminView state={state} onSave={saveStateLocal} />
            </AdminAuthGuard>
          }
        />
        <Route
          path="/jury"
          element={<JuryGateway state={state} onSave={saveStateLocal} />}
        />

        {/* Multi-event routes */}
        <Route path="/admin" element={<AdminAuthGuard><AdminHub /></AdminAuthGuard>} />
        <Route path="/admin/:eventSlug/jury-manager" element={<AdminAuthGuard><JuryManager /></AdminAuthGuard>} />
        <Route
          path="/admin/:eventSlug/:category"
          element={
            <AdminAuthGuard>
              <AdminViewMultiEvent onSave={saveStateLocal} />
            </AdminAuthGuard>
          }
        />
        <Route path="/jury/:eventSlug/:category" element={<JuryGatewayMultiEvent />} />
        <Route path="/bracket/:eventSlug/:category" element={<BracketViewMultiEvent />} />
        <Route path="/:eventSlug/:category" element={<PublicViewMultiEvent />} />

        {/* Role selection */}
        <Route path="/select" element={<RoleSelection state={state} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

// === NEW MULTI-EVENT COMPONENTS ===

function AdminViewMultiEvent({ onSave }: { onSave: (s: any) => void }) {
  const { eventSlug, category } = useParams<{
    eventSlug: string;
    category: string;
  }>();
  const [state, setState] = useState<TournamentState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  // Use global category hook for cross-tab synchronization
  const { currentCategory, updateCategory } = useGlobalCategory(eventSlug);

  // Sync URL category with global state
  useEffect(() => {
    if (category && category !== currentCategory) {
      updateCategory(category);
    }
  }, [category]);

  // Navigate when global category changes (from another tab/page)
  useEffect(() => {
    if (currentCategory && category && currentCategory !== category) {
      console.log("🔄 Category changed globally, navigating to:", currentCategory);
      navigate(`/admin/${eventSlug}/${currentCategory}`, { replace: true });
    }
  }, [currentCategory]);

  useEffect(() => {
    if (!eventSlug || !currentCategory) {
      setLoading(false);
      return;
    }

    const fetchState = async () => {
      try {
        const res = await fetch(`/api/${eventSlug}/${currentCategory}/state`);
        if (res.ok) {
          const data = await res.json();
          
          setState(prevState => {
            // If match ID changed, ALWAYS clear votes
            if (prevState && data.currentMatchId !== prevState.currentMatchId) {
              console.log("🔄 Match changed! Old:", prevState.currentMatchId, "New:", data.currentMatchId, "Clearing votes");
              data.juryVotes = {};
            }
            return data;
          });
        } else {
          // Event doesn't exist - use DEFAULT_STATE to show configuration screen
          console.warn(`Tournament state not found, using DEFAULT_STATE`);
          setState(DEFAULT_STATE);
        }
      } catch (error) {
        console.error("Failed to fetch tournament state:", error);
        setState(DEFAULT_STATE);
      } finally {
        setLoading(false);
      }
    };

    fetchState();
    const interval = setInterval(fetchState, 5000);
    return () => clearInterval(interval);
  }, [eventSlug, currentCategory]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-dark">
        <div className="animate-spin w-8 h-8 border-2 border-white/10 border-t-white rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-dark">
      {/* Header with event and category selector */}
      <div className="border-b border-white/10 p-4 flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate("/admin")}
            className="text-sm font-bold text-white/40 hover:text-white mb-2"
          >
            ← Back to Events
          </button>
          <h1 className="text-2xl font-black italic text-white uppercase">
            {state.competitionName}
          </h1>
        </div>
        {eventSlug && (
          <EventSelector
            eventSlug={eventSlug}
            category={currentCategory}
            onCategoryChange={updateCategory}
          />
        )}
      </div>

      {/* Admin controls */}
      <AdminView
        state={state}
        onSave={(newState) => {
          setState(newState);
          onSave(newState);
        }}
        eventSlug={eventSlug}
        category={currentCategory}
      />
    </div>
  );
}

function JuryGatewayMultiEvent() {
  const { eventSlug, category: categoryFromRoute } = useParams<{ eventSlug: string; category: string }>();
  const navigate = useNavigate();
  const [juryId, setJuryId] = useState<string | null>(
    sessionStorage.getItem(`juryId_${eventSlug}`)
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [state, setState] = useState<TournamentState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);

  // Use global category hook for cross-tab synchronization
  const { currentCategory, updateCategory } = useGlobalCategory(eventSlug);

  // Sync URL category with global state
  useEffect(() => {
    if (categoryFromRoute && categoryFromRoute !== currentCategory) {
      updateCategory(categoryFromRoute);
    }
  }, [categoryFromRoute]);

  // Navigate when global category changes (from another tab/page)
  useEffect(() => {
    if (currentCategory && categoryFromRoute && currentCategory !== categoryFromRoute) {
      console.log("🔄 [JURY] Category changed globally, navigating to:", currentCategory);
      navigate(`/jury/${eventSlug}/${currentCategory}`, { replace: true });
    }
  }, [currentCategory]);

  useEffect(() => {
    if (!eventSlug || !currentCategory) {
      setLoading(false);
      return;
    }

    const fetchState = async () => {
      try {
        const res = await fetch(`/api/${eventSlug}/${currentCategory}/state`);
        if (res.ok) {
          const newState = await res.json();
          setState(prevState => {
            // If match ID changed, ALWAYS clear votes
            if (prevState && newState.currentMatchId !== prevState.currentMatchId) {
              console.log("🔄 [JURY] Match changed! Clearing votes");
              newState.juryVotes = {};
            }
            return newState;
          });
        }
      } catch (error) {
        console.error("Failed to fetch tournament state:", error);
        setState(DEFAULT_STATE);
      } finally {
        setLoading(false);
      }
    };

    fetchState();
    const interval = setInterval(fetchState, 2000);
    return () => clearInterval(interval);
  }, [eventSlug, currentCategory]);

  const handleJuryLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (!eventSlug || !currentCategory) {
      setLoginError("No event or category specified");
      return;
    }

    try {
      const res = await fetch(`/api/jury/${eventSlug}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem(`juryId_${eventSlug}`, data.juryId);
        setJuryId(data.juryId);
      } else {
        setLoginError(data.error || "Identifiants incorrects");
      }
    } catch (err) {
      setLoginError("Identifiants incorrects");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-dark">
        <div className="animate-spin w-8 h-8 border-2 border-white/10 border-t-white rounded-full" />
      </div>
    );
  }

  if (juryId && state && !loading) {
    return (
      <div className="min-h-screen bg-surface-dark">
        {/* Header with event and category selector */}
        <div className="hidden border-b border-white/10 p-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black italic text-white uppercase">
              {state.competitionName}
            </h1>
          </div>
          {eventSlug && currentCategory && (
            <EventSelector
              eventSlug={eventSlug}
              category={currentCategory}
              onCategoryChange={updateCategory}
            />
          )}
        </div>
        <JuryView
          state={state}
          juryId={juryId}
          onSave={(newState) => {
            setState(newState);
          }}
          onLogout={() => {
            sessionStorage.removeItem(`juryId_${eventSlug}`);
            setJuryId(null);
          }}
          eventSlug={eventSlug}
          category={currentCategory}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-surface-dark">
      <div className="w-full max-w-sm bg-white/5 border border-white/10 p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-black italic text-white uppercase">
            Jury Console
          </h1>
          <p className="text-white/40 text-sm mt-2">Authentification requise</p>
        </div>

        <form onSubmit={handleJuryLogin} className="space-y-4">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Nom d'utilisateur"
            className="w-full bg-white/5 border border-white/10 text-white px-4 py-2 placeholder-white/20 focus:outline-none focus:border-white/30"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            className="w-full bg-white/5 border border-white/10 text-white px-4 py-2 placeholder-white/20 focus:outline-none focus:border-white/30"
          />
          {loginError && (
            <div className="text-red-400 text-sm text-center">{loginError}</div>
          )}
          <button
            type="submit"
            className="w-full bg-white text-black px-4 py-2 font-bold uppercase hover:bg-white/90"
          >
            Connexion
          </button>
        </form>

        <button
          onClick={() => navigate("/select")}
          className="w-full mt-4 bg-white/10 border border-white/10 text-white px-4 py-2 text-sm font-bold uppercase hover:bg-white/20"
        >
          Retour au Menu
        </button>
      </div>
    </div>
  );
}

function BracketViewMultiEvent() {
  const { eventSlug, category: categoryFromRoute } = useParams<{ eventSlug: string; category: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<TournamentState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);

  // Use global category hook for cross-tab synchronization
  const { currentCategory, updateCategory } = useGlobalCategory(eventSlug);

  // Sync URL category with global state
  useEffect(() => {
    if (categoryFromRoute && categoryFromRoute !== currentCategory) {
      updateCategory(categoryFromRoute);
    }
  }, [categoryFromRoute]);

  // Navigate when global category changes (from another tab/page)
  useEffect(() => {
    if (currentCategory && categoryFromRoute && currentCategory !== categoryFromRoute) {
      console.log("🔄 [BRACKET] Category changed globally, navigating to:", currentCategory);
      navigate(`/bracket/${eventSlug}/${currentCategory}`, { replace: true });
    }
  }, [currentCategory]);

  useEffect(() => {
    if (!eventSlug || !currentCategory) {
      setLoading(false);
      return;
    }

    const fetchBracketData = async () => {
      try {
        const res = await fetch(`/api/${eventSlug}/${currentCategory}/state`);
        if (res.ok) {
          const tournamentData = await res.json();
          setState(prevState => {
            // If match ID changed, ALWAYS clear votes
            if (prevState && tournamentData.currentMatchId !== prevState.currentMatchId) {
              console.log("🔄 [BRACKET] Match changed! Clearing votes");
              tournamentData.juryVotes = {};
            }
            return tournamentData;
          });
        } else {
          setState(DEFAULT_STATE);
        }
      } catch (error) {
        console.error("Failed to fetch bracket data:", error);
        setState(DEFAULT_STATE);
      } finally {
        setLoading(false);
      }
    };

    fetchBracketData();
    const interval = setInterval(fetchBracketData, 2000);
    return () => clearInterval(interval);
  }, [eventSlug, currentCategory]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-dark">
        <div className="animate-spin w-8 h-8 border-2 border-white/10 border-t-white rounded-full" />
      </div>
    );
  }

  return <BracketView state={{ ...state, currentCategory }} />;
}

function PublicViewMultiEvent() {
  const { eventSlug, category: categoryFromRoute } = useParams<{ eventSlug: string; category: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<TournamentState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);

  // Use global category hook for cross-tab synchronization
  const { currentCategory, updateCategory } = useGlobalCategory(eventSlug);

  // Sync URL category with global state
  useEffect(() => {
    if (categoryFromRoute && categoryFromRoute !== currentCategory) {
      updateCategory(categoryFromRoute);
    }
  }, [categoryFromRoute]);

  // Navigate when global category changes (from another tab/page)
  useEffect(() => {
    if (currentCategory && categoryFromRoute && currentCategory !== categoryFromRoute) {
      console.log("🔄 [PUBLIC] Category changed globally, navigating to:", currentCategory);
      navigate(`/${eventSlug}/${currentCategory}`, { replace: true });
    }
  }, [currentCategory]);

  useEffect(() => {
    if (!eventSlug || !currentCategory) {
      setLoading(false);
      return;
    }

    const fetchPublicData = async () => {
      try {
        const res = await fetch(`/api/${eventSlug}/${currentCategory}/state`);
        if (res.ok) {
          const tournamentData = await res.json();
          setState(prevState => {
            // If match ID changed, ALWAYS clear votes
            if (prevState && tournamentData.currentMatchId !== prevState.currentMatchId) {
              console.log("🔄 [PUBLIC] Match changed! Clearing votes");
              tournamentData.juryVotes = {};
            }
            return tournamentData;
          });
        } else {
          setState(DEFAULT_STATE);
        }
      } catch (error) {
        console.error("Failed to fetch public data:", error);
        setState(DEFAULT_STATE);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicData();
    const interval = setInterval(fetchPublicData, 2000);
    return () => clearInterval(interval);
  }, [eventSlug, currentCategory]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-dark">
        <div className="animate-spin w-8 h-8 border-2 border-white/10 border-t-white rounded-full" />
      </div>
    );
  }

  // Display tournament data with category selector
  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-dark">
        <div className="text-white">Event not configured yet</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-dark">
      {/* Header with event and category selector */}
      <div className=" hidden border-b border-white/10 p-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black italic text-white uppercase">
            {state.competitionName}
          </h1>
        </div>
        {eventSlug && currentCategory && (
          <EventSelector
            eventSlug={eventSlug}
            category={currentCategory}
            onCategoryChange={updateCategory}
          />
        )}
      </div>
      <PublicView state={{ ...state, currentCategory }} />
    </div>
  );
}

function RoleSelection({ state }: { state: TournamentState }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-surface-dark bg-[radial-gradient(circle_at_50%_50%,_rgba(30,41,59,0.2)_0%,_rgba(5,5,5,1)_100%)]">
      <div className="text-center mb-16 px-4">
        <p className="text-white/20 font-black tracking-[1em] uppercase mb-4 text-[10px]">
          Access Portal
        </p>
        <h1 className="text-5xl md:text-8xl font-black italic tracking-tighter text-white uppercase">
          {state.competitionName || "ARENA SYSTEM"}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
        <button
          onClick={() => navigate("/admin")}
          className="group p-8 md:p-12 bg-white/5 border border-white/10 hover:border-white transition-all flex flex-col items-center gap-6"
        >
          <Settings className="w-12 h-12 md:w-16 md:h-16 text-white/40 group-hover:text-white transition-colors" />
          <div className="text-center">
            <h2 className="text-xl md:text-2xl font-black italic">
              ADMINISTRATION
            </h2>
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-2 group-hover:text-white/40">
              Configuration & Control
            </p>
          </div>
        </button>

        <button
          onClick={() => navigate("/jury")}
          className="group p-8 md:p-12 bg-white/5 border border-white/10 hover:border-white transition-all flex flex-col items-center gap-6"
        >
          <Lock className="w-12 h-12 md:w-16 md:h-16 text-white/40 group-hover:text-white transition-colors" />
          <div className="text-center">
            <h2 className="text-xl md:text-2xl font-black italic">
              CONSOLES JURY
            </h2>
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-2 group-hover:text-white/40">
              Log in to vote
            </p>
          </div>
        </button>

        <button
          onClick={() => navigate("/")}
          className="group p-8 md:p-12 bg-white/5 border border-white/10 hover:border-white transition-all flex flex-col items-center gap-6"
        >
          <Monitor className="w-12 h-12 md:w-16 md:h-16 text-white/40 group-hover:text-white transition-colors" />
          <div className="text-center">
            <h2 className="text-xl md:text-2xl font-black italic">
              AFFICHAGE PUBLIC
            </h2>
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-2 group-hover:text-white/40">
              Real-time scoreboard
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}

function JuryGateway({
  state,
  onSave,
}: {
  state: TournamentState;
  onSave: (s: TournamentState) => void;
}) {
  const [juryId, setJuryId] = useState<string | null>(
    sessionStorage.getItem("juryId"),
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const navigate = useNavigate();

  const handleJuryLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    try {
      const res = await fetch("/api/jury/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem("juryId", data.juryId);
        setJuryId(data.juryId);
      } else {
        setLoginError(data.error || "Identifiants incorrects");
      }
    } catch (err) {
      setLoginError("Identifiants incorrects");
    }
  };

  if (juryId) {
    return (
      <JuryView
        state={state}
        juryId={juryId}
        onSave={onSave}
        onLogout={() => {
          sessionStorage.removeItem("juryId");
          setJuryId(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-surface-dark">
      <div className="w-full max-w-sm bg-white/5 border border-white/10 p-8">
        {!state.configured ? (
          <div className="text-center space-y-4">
            <div className="animate-spin w-8 h-8 border-2 border-white/10 border-t-white rounded-full mx-auto" />
            <p className="text-[10px] font-black uppercase text-white/40 tracking-widest leading-loose">
              Système en attente de configuration par l'administrateur...
            </p>
            <button
              onClick={() => navigate("/")}
              className="w-full text-white/20 hover:text-white text-[9px] font-black uppercase tracking-widest pt-4"
            >
              Retour
            </button>
          </div>
        ) : (
          <form onSubmit={handleJuryLogin} className="w-full space-y-4">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-black italic uppercase tracking-tighter mb-2">
                LOGIN JURY
              </h1>
              <p className="text-[10px] font-black uppercase text-white/20 tracking-widest leading-loose">
                Entrez vos identifiants pour accéder à la console
              </p>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Utilisateur"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-black/40 border border-white/10 px-4 py-3 font-black focus:border-white transition-all outline-none italic text-sm text-white"
              />
              <input
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/10 px-4 py-3 font-black focus:border-white transition-all outline-none italic text-sm text-white"
              />
            </div>

            {loginError && (
              <p className="text-brand-red text-[10px] font-bold uppercase text-center pt-2">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-4 bg-white text-black font-black italic uppercase text-xs tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              disabled={!username || !password}
            >
              Accéder au Vote
            </button>

            <button
              type="button"
              onClick={() => navigate("/")}
              className="w-full text-white/20 hover:text-white text-[9px] font-black uppercase tracking-widest pt-4"
            >
              Retour à l'affichage
            </button>

            {state?.juryAccounts && state.juryAccounts.length > 0 && (
              <div className="pt-4 mt-4 border-t border-white/5 space-y-2">
                <p className="text-[8px] font-black uppercase text-white/30 tracking-widest text-center">
                  Raccourcis de connexion (Clic pour remplir)
                </p>
                <div className="flex flex-wrap gap-1 justify-center">
                  {state.juryAccounts.map((j) => (
                    <button
                      key={j.id}
                      type="button"
                      onClick={() => {
                        setUsername(j.username);
                        setPassword("");
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

function AdminView({
  state,
  onSave,
  eventSlug,
  category,
}: {
  state: TournamentState;
  onSave: (s: TournamentState) => void;
  eventSlug?: string;
  category?: string;
}) {
  const navigate = useNavigate();

  // Helper to build API endpoint URLs - admin endpoints
  const buildAdminUrl = (endpoint: string) => {
    if (eventSlug && category) {
      return `/api/admin/${eventSlug}/${category}${endpoint}`;
    }
    return `/api/admin${endpoint}`;
  };
  
  // Helper to build API endpoint URLs - common endpoints (vote, etc)
  const buildApiUrl = (endpoint: string) => {
    if (eventSlug && category) {
      return `/api/${eventSlug}/${category}${endpoint}`;
    }
    console.warn(`buildApiUrl called without eventSlug/category: eventSlug="${eventSlug}", category="${category}"`);
    console.warn(`buildApiUrl called without eventSlug/category: eventSlug="${eventSlug}", category="${category}"`);
    return endpoint;
  };
  const [competitionName, setCompetitionName] = useState(
    state.competitionName || "",
  );
  const [competitionLogo, setCompetitionLogo] = useState(
    state.competitionLogo || "",
  );
  const [tournamentSize, setTournamentSize] = useState<16 | 8 | 4 | 2>(
    state.tournamentSize || 16,
  );
  const [participants, setParticipants] = useState<Participant[]>(() => {
    if (state.participants && state.participants.length > 0)
      return state.participants;
    return DEFAULT_PARTICIPANTS;
  });
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);

  // Admin voting feature
  const [selectedJuryId, setSelectedJuryId] = useState<string | null>(null);

  // --- REST Countries API & Fallback List ---
  const FALLBACK_COUNTRIES = useMemo(
    () => COUNTRIES.map((country) => ({
      cca2: country.code,
      name: country.name,
      flag: country.flag,
      flagUrl: `https://flagcdn.com/w40/${country.code.toLowerCase()}.png`,
    })),
    [],
  );

  const [countries, setCountries] = useState<any[]>(() => {
    return FALLBACK_COUNTRIES.map((fc) => ({
      cca2: fc.cca2,
      name: { common: fc.name },
      translations: { fra: { common: fc.name } },
      flags: { png: fc.flagUrl, svg: fc.flagUrl },
      flag: fc.flag,
    }));
  });

  const [loadingCountries, setLoadingCountries] = useState(false);

  // Ensure state always has required properties for safe rendering
  const safeState: TournamentState = {
    ...DEFAULT_STATE,
    ...state,
    matches: state.matches || [],
    juryVotes: state.juryVotes || {},
    participants: state.participants || [],
    juryAccounts: state.juryAccounts || [],
    warnedJuries: state.warnedJuries || [],
  };

  useEffect(() => {
    setLoadingCountries(true);
    fetch(
      "https://restcountries.com/v3.1/all?fields=name,cca2,flags,translations,flag",
    )
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const sorted = data.sort((a, b) => {
            const nameA = a.translations?.fra?.common || a.name?.common || "";
            const nameB = b.translations?.fra?.common || b.name?.common || "";
            return nameA.localeCompare(nameB);
          });
          setCountries(sorted);
        }
        setLoadingCountries(false);
      })
      .catch((err) => {
        console.error("Error loading countries:", err);
        setLoadingCountries(false);
      });
  }, [FALLBACK_COUNTRIES]);

  const handleCountryChange = (index: number, countryCca2: string) => {
    const selected = countries.find((c) => c.cca2 === countryCca2);
    if (selected) {
      const flagUrl = selected.flags?.png || selected.flags?.svg || "";
      const nameFra =
        selected.translations?.fra?.common ||
        selected.name?.common ||
        selected.name?.official ||
        "";
      const newParticipants = [...participants];
      newParticipants[index] = {
        ...newParticipants[index],
        countryCode: selected.cca2,
        countryName: nameFra,
        countryFlag: flagUrl,
      };
      setParticipants(newParticipants);
    } else {
      const newParticipants = [...participants];
      newParticipants[index] = {
        ...newParticipants[index],
        countryCode: "",
        countryName: "",
        countryFlag: "",
      };
      setParticipants(newParticipants);
    }
  };

  const handleCountryChangeById = (pId: string, countryCca2: string) => {
    const selected = countries.find((c) => c.cca2 === countryCca2);
    if (selected) {
      const flagUrl = selected.flags?.png || selected.flags?.svg || "";
      const nameFra =
        selected.translations?.fra?.common ||
        selected.name?.common ||
        selected.name?.official ||
        "";
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === pId
            ? {
                ...p,
                countryCode: selected.cca2,
                countryName: nameFra,
                countryFlag: flagUrl,
              }
            : p,
        ),
      );
    } else {
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === pId
            ? {
                ...p,
                countryCode: "",
                countryName: "",
                countryFlag: "",
              }
            : p,
        ),
      );
    }
  };
  const [matches, setMatches] = useState<Match[]>(state.matches || []);
  const [juryCount, setJuryCount] = useState(state.juryCount || 3);
  const [juryAccounts, setJuryAccounts] = useState<JuryAccount[]>(
    state.juryAccounts || [],
  );
  const [showBracketPreview, setShowBracketPreview] = useState(false);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const previewMeasureRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);
  
  // Upload progress tracking
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  // CRITICAL: Sync local state with incoming state prop when category changes
  useEffect(() => {
    // Update local state from incoming state prop
    setCompetitionName(state.competitionName || "");
    setCompetitionLogo(state.competitionLogo || "");
    setTournamentSize(state.tournamentSize || 16);
    setMatches(state.matches || []);
    setJuryCount(state.juryCount || 3);
    setJuryAccounts(state.juryAccounts || []);
    
    // Reset participants from state or use defaults if not configured
    if (state.participants && state.participants.length > 0) {
      setParticipants(state.participants);
    } else {
      setParticipants(DEFAULT_PARTICIPANTS);
    }
  }, [state.id, category]); // Re-sync when tournament ID or category changes

  const updateMatchTeam = (
    matchId: string,
    side: "red" | "blue",
    pId: string,
  ) => {
    setMatches((prev) =>
      prev.map((m) => {
        if (m.id === matchId) {
          return side === "red"
            ? { ...m, redTeamId: pId }
            : { ...m, blueTeamId: pId };
        }
        return m;
      }),
    );
  };

  useEffect(() => {
    if (!showBracketPreview) return;

    const scrollTimer = setTimeout(() => {
      previewContainerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 150);

    const updateScale = () => {
      if (previewContainerRef.current && previewMeasureRef.current) {
        const containerWidth = previewContainerRef.current.offsetWidth;
        const contentWidth = 2200; // Increased base width for better spacing
        const scale = (containerWidth - 60) / contentWidth;
        setPreviewScale(Math.min(1, scale));
      }
    };

    updateScale();
    const timer = setTimeout(updateScale, 200);
    window.addEventListener("resize", updateScale);
    return () => {
      window.removeEventListener("resize", updateScale);
      clearTimeout(timer);
      clearTimeout(scrollTimer);
    };
  }, [showBracketPreview, tournamentSize]);

  const updateParticipantNameById = (id: string, newName: string) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name: newName } : p)),
    );
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
        newAccounts.push({
          id: `jury-${i + 1}`,
          username: `JURE ${i + 1}`,
          password: "",
        });
      }
    } else {
      newAccounts = newAccounts.slice(0, count);
    }
    setJuryAccounts(newAccounts);
  };

  const updateJuryAccount = (
    index: number,
    field: keyof JuryAccount,
    value: string,
  ) => {
    const newAccounts = [...juryAccounts];
    newAccounts[index] = { ...newAccounts[index], [field]: value };
    setJuryAccounts(newAccounts);
  };

  // Match Form
  const [newMatchRound, setNewMatchRound] = useState("");
  const [redId, setRedId] = useState("");
  const [blueId, setBlueId] = useState("");
  const [votingMode, setVotingMode] = useState<"match" | "round">("match");
  const [roundCount, setRoundCount] = useState(1);

  const updateParticipant = (
    index: number,
    field: keyof Participant,
    value: string,
  ) => {
    const newParticipants = [...participants];
    newParticipants[index] = { ...newParticipants[index], [field]: value };
    setParticipants(newParticipants);
  };

  const handlePhotoUpload = async (
    fileId: string,
    file: File,
    onSuccess: (url: string) => void
  ) => {
    try {
      setUploading((prev) => ({ ...prev, [fileId]: true }));
      setUploadProgress((prev) => ({ ...prev, [fileId]: 0 }));

      const formData = new FormData();
      formData.append("file", file);

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress((prev) => ({ ...prev, [fileId]: percentComplete }));
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          setUploadProgress((prev) => ({ ...prev, [fileId]: 100 }));
          setTimeout(() => {
            setUploading((prev) => ({ ...prev, [fileId]: false }));
            setUploadProgress((prev) => ({ ...prev, [fileId]: 0 }));
          }, 500);
          onSuccess(data.url);
        } else {
          console.error("Upload failed:", xhr.statusText);
          setUploading((prev) => ({ ...prev, [fileId]: false }));
        }
      });

      xhr.addEventListener("error", () => {
        console.error("Error uploading file");
        setUploading((prev) => ({ ...prev, [fileId]: false }));
      });

      xhr.open("POST", "/api/upload");
      xhr.send(formData);
    } catch (error) {
      console.error("Error uploading photo:", error);
      setUploading((prev) => ({ ...prev, [fileId]: false }));
    }
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
          status: "pending",
          round: "TOP 16",
          votingMode: "match",
          roundCount: 1,
          currentRound: 1,
          roundResults: [],
          finishedJuries: [],
        });
      }
    }

    // Top 8 (Empty containers for manual filling)
    if (size >= 8) {
      for (let i = 0; i < 4; i++) {
        newMatches.push({
          id: `t8-${i + 1}`,
          redTeamId: size === 8 ? participants[i * 2]?.id || "" : "",
          blueTeamId: size === 8 ? participants[i * 2 + 1]?.id || "" : "",
          redVotes: 0,
          blueVotes: 0,
          winnerId: null,
          status: "pending",
          round: "TOP 8",
          votingMode: "match",
          roundCount: 1,
          currentRound: 1,
          roundResults: [],
          finishedJuries: [],
        });
      }
    }

    // Semi (2 matches)
    if (size >= 4) {
      for (let i = 0; i < 2; i++) {
        newMatches.push({
          id: `semi-${i + 1}`,
          redTeamId: size === 4 ? participants[i * 2]?.id || "" : "",
          blueTeamId: size === 4 ? participants[i * 2 + 1]?.id || "" : "",
          redVotes: 0,
          blueVotes: 0,
          winnerId: null,
          status: "pending",
          round: "SEMI FINALE",
          votingMode: "match",
          roundCount: 1,
          currentRound: 1,
          roundResults: [],
          finishedJuries: [],
        });
      }
    }

    // Finale (1 match)
    newMatches.push({
      id: `final-1`,
      redTeamId: size === 2 ? participants[0]?.id || "" : "",
      blueTeamId: size === 2 ? participants[1]?.id || "" : "",
      redVotes: 0,
      blueVotes: 0,
      winnerId: null,
      status: "pending",
      round: "FINALE",
      votingMode: "match",
      roundCount: 1,
      currentRound: 1,
      roundResults: [],
      finishedJuries: [],
    });

    setMatches(newMatches);
  };

  const updateMatchParticipant = (
    matchId: string,
    side: "red" | "blue",
    participantId: string,
  ) => {
    setMatches(
      matches.map((m) => {
        if (m.id === matchId) {
          return {
            ...m,
            [side === "red" ? "redTeamId" : "blueTeamId"]: participantId,
          };
        }
        return m;
      }),
    );
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
        status: "pending",
        round: newMatchRound,
        votingMode,
        roundCount: votingMode === "round" ? roundCount : 1,
        currentRound: 1,
        roundResults: [],
        finishedJuries: [],
      };
      setMatches([...matches, m]);
      setNewMatchRound("");
      setRedId("");
      setBlueId("");
    }
  };

  const removeMatch = (id: string) => {
    setMatches(matches.filter((m) => m.id !== id));
  };

  const configure = async () => {
    const finalParticipants = participants.slice(0, tournamentSize);

    try {
      const res = await fetch(buildAdminUrl("/configure"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competitionName,
          competitionLogo,
          participants: finalParticipants,
          juryAccounts,
          matches,
          tournamentSize,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          onSave(data.state);
        }
      } else {
        console.error("Configuration failed:", res.status);
      }
    } catch (e) {
      console.error("Server error during configure:", e);
    }
  };

  const nextMatch = async () => {
    const nextIdx = state.matches.findIndex((m) => m.status === "pending");
    if (nextIdx !== -1) {
      await selectMatch(state.matches[nextIdx].id);
    }
  };

  const revealResults = async () => {
    const activeIdx = state.matches.findIndex(
      (m) => m.id === state.currentMatchId,
    );
    if (activeIdx !== -1) {
      try {
        const res = await fetch(buildAdminUrl("/reveal"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matchId: state.currentMatchId }),
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.state) {
            onSave(data.state);
          }
        }
      } catch (e) {
        console.error("Server error during reveal:", e);
      }
    }
  };

  const finishMatch = async () => {
    try {
      const res = await fetch(buildAdminUrl("/finish-match"), { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          onSave(data.state);
        }
      }
    } catch (e) {
      console.error("Server error during finishMatch:", e);
    }
  };

  const warnJudges = async () => {
    try {
      const res = await fetch(buildAdminUrl("/warn-juries"), { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          onSave(data.state);
        }
      }
    } catch (e) {
      console.error("Server error during warnJudges:", e);
    }
  };

  const cancelMatch = async () => {
    if (
      !confirm(
        "Voulez-vous vraiment annuler ce match ? Les votes seront perdus.",
      )
    )
      return;

    try {
      const res = await fetch(buildAdminUrl("/cancel-match"), { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          onSave(data.state);
        }
      }
    } catch (e) {
      console.error("Server error during cancelMatch:", e);
    }
  };

  const confirmRound = async () => {
    try {
      const res = await fetch(buildAdminUrl("/confirm-round"), { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          onSave(data.state);
        }
      }
    } catch (e) {
      console.error("Server error during confirmRound:", e);
    }
  };

  const selectMatch = async (matchId: string) => {
    try {
      const res = await fetch(buildAdminUrl("/select-match"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          onSave(data.state);
        }
      }
    } catch (e) {
      console.error("Server error during selectMatch:", e);
    }
  };

  const reset = async () => {
    try {
      const res = await fetch(buildAdminUrl("/reset"), { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        onSave(data.state || DEFAULT_STATE);
      } else {
        onSave(DEFAULT_STATE);
      }
    } catch (e) {
      console.warn("Server sync failed during reset");
      onSave(DEFAULT_STATE);
    }
  };

  const adminCastVote = async (juryId: string, vote: "red" | "blue") => {
    if (!state.currentMatchId) return;

    try {
      const res = await fetch(buildApiUrl("/vote"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: state.currentMatchId, juryId, vote }),
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          onSave(data.state);
          setSelectedJuryId(null);
          // Vote is now recorded - admin can manually finalize if needed
        }
      }
    } catch (e) {
      console.error("Server error during admin vote:", e);
    }
  };

  const activeMatch = safeState.matches.find((m) => m.id === safeState.currentMatchId);

  if (!safeState.configured) {
    return (
      <div className="min-h-screen p-6 md:p-12 flex flex-col items-center max-w-7xl mx-auto font-sans text-white bg-surface-dark">
        <header className="w-full flex justify-between items-center mb-12 border-b border-white/5 pb-8">
          <div className="flex flex-col">
            <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter">
              Configuration
            </h2>
          </div>
          <button
            onClick={() => navigate("/select")}
            className="text-white/20 hover:text-white transition-all"
          >
            <LogOut />
          </button>
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
                  <p className="text-[9px] font-black uppercase text-white/40 mb-3 tracking-widest">
                    Type de Compétition
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {[16, 8, 4, 2].map((s) => (
                      <button
                        key={s}
                        onClick={() => setTournamentSize(s as any)}
                        className={`py-3 font-black italic border-2 transition-all text-[10px] tracking-widest ${tournamentSize === s ? "bg-white border-white text-black" : "border-white/10 text-white/40"}`}
                      >
                        TOP {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <p className="text-[9px] font-black uppercase text-white/40 mb-3 tracking-widest">
                    Logo Événement
                  </p>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={competitionLogo}
                        onChange={(e) => setCompetitionLogo(e.target.value)}
                        placeholder="URL du logo..."
                        className="w-full bg-black/40 border border-white/15 focus:border-white px-3 py-2 font-black transition-all outline-none italic text-[10px]"
                        disabled={uploading["logo"]}
                      />
                      {uploading["logo"] && (
                        <div className="mt-2 w-full bg-black/40 border border-white/15 rounded h-2 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-color-primary to-brand-red transition-all"
                            style={{ width: `${uploadProgress["logo"] || 0}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <label className={`${uploading["logo"] ? "bg-gray-600" : "bg-color-primary hover:bg-[#d47a31]"} text-white font-black px-3 py-2 cursor-pointer transition-all text-[10px] italic whitespace-nowrap`}>
                      {uploading["logo"] ? `${Math.round(uploadProgress["logo"] || 0)}%` : "Upload"}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handlePhotoUpload("logo", e.target.files[0], (url) => {
                              setCompetitionLogo(url);
                            });
                          }
                        }}
                        className="hidden"
                        disabled={uploading["logo"]}
                      />
                    </label>
                  </div>
                  {competitionLogo && (
                    <div className="mt-3 w-16 h-16 border border-white/15 rounded overflow-hidden bg-black/40">
                      <img
                        src={competitionLogo}
                        alt="Logo"
                        className="w-full h-full object-contain p-1"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
                  )}
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
              {loadingCountries && (
                <div className="flex gap-2 items-center text-[10px] uppercase font-black tracking-widest text-[#f59e0b] mb-4">
                  <div className="w-2.5 h-2.5 border-2 border-[#f59e0b]/20 border-t-[#f59e0b] rounded-full animate-spin"></div>
                  Chargement des pays du monde...
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
                {participants.slice(0, tournamentSize).map((p, i) => (
                  <div
                    key={p.id}
                    className="p-4 bg-black/40 border border-white/5 hover:border-white/10 transition-all rounded-sm space-y-3 relative"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-white/20 italic">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-white/15 bg-white/5">
                          <DancerPhoto
                            photoUrl={p.photo}
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>

                      {p.countryFlag && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/5 border border-white/5 text-[9px] font-bold text-white/50 rounded-sm">
                          <img
                            src={p.countryFlag}
                            alt={p.countryName}
                            className="w-3.5 h-2.5 object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <span className="uppercase">{p.countryCode}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div>
                        <p className="text-[8px] font-black tracking-widest text-white/30 uppercase mb-1">
                          Nom du Danseur
                        </p>
                        <input
                          type="text"
                          value={p.name}
                          onChange={(e) =>
                            updateParticipant(i, "name", e.target.value)
                          }
                          placeholder={`DANS-BOY LILOU ${i + 1}`}
                          className="w-full bg-black/40 border border-white/15 focus:border-white px-3 py-2 font-black transition-all outline-none italic text-xs uppercase"
                        />
                      </div>

                      <div>
                        <p className="text-[8px] font-black tracking-widest text-white/30 uppercase mb-1">
                          Origine / Pays
                        </p>
                        <select
                          value={p.countryCode || ""}
                          onChange={(e) =>
                            handleCountryChange(i, e.target.value)
                          }
                          className="w-full bg-black/40 border border-white/15 focus:border-white px-2.5 py-2 font-black text-xs italic uppercase text-white/80 cursor-pointer"
                        >
                          <option value="" className="bg-[#101015]">
                            PAYS NON DÉFINI
                          </option>
                          {countries.map((country) => {
                            const cca = country.cca2;
                            const name =
                              country.translations?.fra?.common ||
                              country.name?.common ||
                              country.name?.official ||
                              "";
                            return (
                              <option
                                key={cca}
                                value={cca}
                                className="bg-[#101015]"
                              >
                                {name}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div>
                        <p className="text-[8px] font-black tracking-widest text-white/30 uppercase mb-1">
                          Photo URL
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={p.photo}
                            onChange={(e) =>
                              updateParticipant(i, "photo", e.target.value)
                            }
                            placeholder="https://images.unsplash.com/..."
                            className="flex-1 bg-black/40 border border-white/15 focus:border-white px-3 py-2 font-black transition-all outline-none italic text-[10px]"
                            disabled={uploading[`participant-${p.id}`]}
                          />
                          <label className={`${uploading[`participant-${p.id}`] ? "bg-gray-600" : "bg-brand-blue hover:bg-blue-600"} text-white font-black px-3 py-2 cursor-pointer transition-all text-[10px] italic whitespace-nowrap`}>
                            {uploading[`participant-${p.id}`] ? `${Math.round(uploadProgress[`participant-${p.id}`] || 0)}%` : "Upload"}
                            <input
                              type="file"
                              accept="image/*,video/*"
                              onChange={(e) => {
                                if (e.target.files?.[0]) {
                                  handlePhotoUpload(`participant-${p.id}`, e.target.files[0], (url) => {
                                    updateParticipant(i, "photo", url);
                                  });
                                }
                              }}
                              className="hidden"
                              disabled={uploading[`participant-${p.id}`]}
                            />
                          </label>
                        </div>
                        {uploading[`participant-${p.id}`] && (
                          <div className="mt-2 w-full bg-black/40 border border-white/15 rounded h-2 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-brand-blue to-brand-blue transition-all"
                              style={{ width: `${uploadProgress[`participant-${p.id}`] || 0}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
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
                  <p className="text-[11px] font-black italic uppercase text-white/20 mb-6 max-w-[200px]">
                    Initialiser le tableau Top {tournamentSize}
                  </p>
                  <button
                    onClick={() => generateBracket(tournamentSize)}
                    className="px-6 py-3 bg-white text-black font-black italic uppercase text-[10px] tracking-widest hover:scale-105 active:scale-95 transition-all"
                  >
                    GÉNÉRER LE TOP {tournamentSize}
                  </button>
                </div>
              ) : (
                <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
                  {["TOP 16", "TOP 8", "SEMI FINALE", "FINALE"]
                    .filter((r) => {
                      if (tournamentSize === 16) return r === "TOP 16";
                      if (tournamentSize === 8) return r === "TOP 8";
                      if (tournamentSize === 4) return r === "SEMI FINALE";
                      if (tournamentSize === 2) return r === "FINALE";
                      return true;
                    })
                    .map((roundName) => (
                      <div key={roundName} className="space-y-2">
                        <h4 className="text-[8px] font-black text-white/30 tracking-[0.3em] uppercase border-b border-white/5 pb-1">
                          {roundName}
                        </h4>
                        {matches
                          .filter((m) => m.round === roundName)
                          .map((m) => (
                            <div
                              key={m.id}
                              className="grid grid-cols-2 gap-1 bg-white/5 p-2 border border-white/5"
                            >
                              <select
                                value={m.redTeamId}
                                onChange={(e) =>
                                  updateMatchParticipant(
                                    m.id,
                                    "red",
                                    e.target.value,
                                  )
                                }
                                className="bg-black/50 border border-white/5 text-[9px] font-black italic uppercase p-1.5 outline-none"
                              >
                                <option value="">ROUGE</option>
                                {participants
                                  .slice(0, tournamentSize)
                                  .map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name}
                                    </option>
                                  ))}
                              </select>
                              <select
                                value={m.blueTeamId}
                                onChange={(e) =>
                                  updateMatchParticipant(
                                    m.id,
                                    "blue",
                                    e.target.value,
                                  )
                                }
                                className="bg-black/50 border border-white/5 text-[9px] font-black italic uppercase p-1.5 outline-none"
                              >
                                <option value="">BLEU</option>
                                {participants
                                  .slice(0, tournamentSize)
                                  .map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name}
                                    </option>
                                  ))}
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
                    {showBracketPreview
                      ? "CACHER LE BRACKET"
                      : "VOIR LE BRACKET"}
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
            <p className="text-[9px] font-black uppercase tracking-[0.3em] italic">
              System Ready
            </p>
          </div>
        </div>

        {showBracketPreview && (
          <div
            ref={previewContainerRef}
            className="w-full mt-12 p-4 bg-black/40 border-y border-white/5 overflow-hidden flex flex-col items-center"
          >
            <div className="w-full flex justify-between items-center mb-6">
              <h3 className="text-xl font-black italic uppercase tracking-tighter text-white">
                Aperçu du Tableau
              </h3>
              <button
                onClick={() => setShowBracketPreview(false)}
                className="px-4 py-1 border border-white/10 text-[9px] font-black uppercase hover:bg-white/5 transition-all text-white/40"
              >
                Fermer
              </button>
            </div>

            <div
              className="relative w-full flex justify-center items-start overflow-hidden py-10"
              style={{ height: `${previewScale * 1100 + 100}px` }}
            >
              {/* Hidden clone for measurement */}
              <div
                ref={previewMeasureRef}
                className="absolute top-0 left-0 invisible pointer-events-none"
                style={{ width: "2200px" }}
              >
                <BracketContent
                  state={{ ...state, participants, matches, tournamentSize }}
                  onUpdateParticipantCountry={handleCountryChangeById}
                  countries={countries}
                />
              </div>

              <div
                style={{
                  width: "2200px",
                  transform: `scale(${previewScale})`,
                  transformOrigin: "top center",
                  transition: "transform 0.4s ease-out",
                  willChange: "transform",
                  flexShrink: 0,
                }}
              >
                <BracketContent
                  state={{
                    ...state,
                    participants,
                    matches,
                    tournamentSize,
                  }}
                  onUpdateMatchTeam={updateMatchTeam}
                  onUpdateParticipantCountry={handleCountryChangeById}
                  countries={countries}
                />
              </div>
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
            <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter">
              {state.competitionName} - ADMIN
            </h2>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/30 text-green-500 text-[9px] font-black uppercase tracking-[0.2em]">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Live System
            </div>
          </div>
        </div>
        <div className="flex items-center gap-8">
          
          <button
            onClick={() => navigate("/select")}
            className="text-white/20 hover:text-white transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <div className="w-full max-w-6xl flex flex-col lg:grid lg:grid-cols-3 gap-8">
        {/* Detailed Match Tally */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-end">
            <h3 className="text-[10px] font-black tracking-widest uppercase text-white/30">
              Progression du Tournoi
            </h3>
            <span className="text-[10px] font-black italic opacity-20 uppercase tracking-widest">
              Matchs terminés:{" "}
              {state.matches.filter((m) => m.status === "finished").length}/
              {state.matches.length}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 overflow-y-auto max-h-[60vh] pr-2 scrollbar-hide">
            {(() => {
              // Show active match first, pending in middle, finished at bottom
              const displayMatches = [...state.matches].sort((a, b) => {
                // Active match first
                if (a.id === state.currentMatchId) return -1;
                if (b.id === state.currentMatchId) return 1;
                // Pending matches in middle, finished at bottom
                const statusPriority: Record<string, number> = {
                  "pending": 0,
                  "active": 0,
                  "finished": 1,
                };
                const priorityA = statusPriority[a.status] ?? 999;
                const priorityB = statusPriority[b.status] ?? 999;
                if (priorityA !== priorityB) return priorityA - priorityB;
                // Keep order as received from server
                return 0;
              });
              return displayMatches.map((m, i) => {
                const red = state.participants.find((p) => p.id === m.redTeamId);
                const blue = state.participants.find(
                  (p) => p.id === m.blueTeamId,
                );
                return (
                <div
                  key={m.id}
                  className={`p-5 md:p-6 flex flex-col md:flex-row justify-between items-center gap-4 transition-all border ${m.status === "active" ? "bg-white/10 border-white ring-1 ring-white/20" : "bg-white/5 border-white/5 opacity-50"}`}
                >
                  <div className="flex items-center gap-6 w-full md:w-auto">
                    <span className="text-[10px] font-black text-white/20 w-6">
                      0{i + 1}
                    </span>
                    <div className="flex flex-1 items-center gap-4 text-lg md:text-xl italic font-black">
                      <span
                        className={`${m.winnerId === m.redTeamId ? "text-brand-red" : ""} truncate`}
                      >
                        {red?.name}
                      </span>
                      <span className="text-white/10 text-[10px] not-italic font-bold">
                        VS
                      </span>
                      <span
                        className={`${m.winnerId === m.blueTeamId ? "text-brand-blue" : ""} truncate`}
                      >
                        {blue?.name}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                    {m.status === "pending" &&
                      (!state.currentMatchId ||
                        state.matches.find(
                          (ex) => ex.id === state.currentMatchId,
                        )?.status === "finished") &&
                      red &&
                      blue && (
                        <button
                          onClick={() => selectMatch(m.id)}
                          className="px-4 py-2 bg-white text-black text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all"
                        >
                          LANCER
                        </button>
                      )}
                    {m.id === state.currentMatchId && m.status === "active" && (
                      <div className="px-4 py-2 bg-green-500 text-black text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-black rounded-full animate-pulse" />
                        EN COURS
                      </div>
                    )}
                    {m.status === "finished" && (
                      <div className="flex gap-4 items-center">
                        <div className="flex items-center -space-x-1">
                          {Array.from({ length: m.redVotes }).map((_, i) => (
                            <div
                              key={i}
                              className="w-3 h-3 bg-brand-red rounded-full border border-black"
                            />
                          ))}
                          {Array.from({ length: m.blueVotes }).map((_, i) => (
                            <div
                              key={i}
                              className="w-3 h-3 bg-brand-blue rounded-full border border-black"
                            />
                          ))}
                        </div>
                        <Trophy size={16} className="text-yellow-500" />
                      </div>
                    )}
                    <div className="text-[9px] font-black uppercase tracking-widest opacity-40 italic">
                      {m.round}
                    </div>
                  </div>
                </div>
              );
              });
            })()}
          </div>
        </div>

        {/* Controls & Live Votes */}
        <div className="space-y-6">
          <h3 className="text-[10px] font-black tracking-widest uppercase text-white/30">
            Contrôle en Direct
          </h3>
          <div className="bg-white/5 p-6 md:p-8 border border-white/10 space-y-8 rounded-sm">
            <div className="text-center">
              <p className="text-[9px] font-black tracking-[0.4em] text-white/20 uppercase mb-3">
                Battle Actuel
              </p>
              <div className="text-xl md:text-2xl font-black italic truncate uppercase">
                {activeMatch
                  ? `${state.participants.find((p) => p.id === activeMatch.redTeamId)?.name} VS ${state.participants.find((p) => p.id === activeMatch.blueTeamId)?.name}`
                  : "AUCUN BATTLE ACTIF"}
              </div>
            </div>

            {/* Vote Visualization for Juries */}
            <div className="space-y-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-2">
                État des Votes ({Object.keys(state.juryVotes).length}/
                {state.juryCount})
              </p>
              <div className="flex justify-between gap-1 relative">
                {state.juryAccounts.map((jury) => {
                  const vote = state.juryVotes[jury.id];
                  const isSelected = selectedJuryId === jury.id;
                  return (
                    <div
                      key={jury.id}
                      className="flex-1 flex flex-col items-center gap-2 relative"
                    >
                      <button
                        onClick={() =>
                          setSelectedJuryId(isSelected ? null : jury.id)
                        }
                        className={`w-full aspect-square border-2 flex items-center justify-center transition-all duration-500 cursor-pointer hover:scale-105 active:scale-95 relative
                               ${
                                 vote
                                   ? vote === "red"
                                     ? "bg-brand-red border-brand-red"
                                     : "bg-brand-blue border-brand-blue"
                                   : "bg-white/5 border-white/10 hover:border-white/40"
                               }
                               ${isSelected ? "ring-2 ring-white/60 scale-110" : ""}
                        `}
                      >
                        {vote && (
                          <CheckCircle2 size={12} className="text-white" />
                        )}
                      </button>

                      {/* Voting Menu */}
                      {isSelected && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute top-full mt-2 z-50 flex gap-1 bg-black/60 border border-white/20 p-1 rounded-sm backdrop-blur-md"
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              adminCastVote(jury.id, "red");
                            }}
                            className="px-2 py-1 bg-brand-red text-white text-[8px] font-black uppercase tracking-widest hover:scale-110 transition-all active:scale-95"
                          >
                            RED
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              adminCastVote(jury.id, "blue");
                            }}
                            className="px-2 py-1 bg-brand-blue text-white text-[8px] font-black uppercase tracking-widest hover:scale-110 transition-all active:scale-95"
                          >
                            BLUE
                          </button>
                          {vote && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const newVotes = { ...state.juryVotes };
                                delete newVotes[jury.id];
                                onSave({ ...state, juryVotes: newVotes });
                                setSelectedJuryId(null);
                              }}
                              className="px-2 py-1 bg-white/10 text-white/60 text-[8px] font-black uppercase tracking-widest hover:scale-110 transition-all active:scale-95"
                            >
                              Clear
                            </button>
                          )}
                        </motion.div>
                      )}

                      <span className="text-[8px] font-black opacity-30 uppercase truncate w-full text-center leading-none mt-1">
                        {jury.username}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-white/10">
              {activeMatch && activeMatch.status === "active" && (
                <div className="space-y-3">
                  <button
                    onClick={revealResults}
                    disabled={
                      !state.juryAccounts.every((j) => state.juryVotes[j.id]) ||
                      activeMatch.revealed
                    }
                    className={`w-full py-4 font-black italic flex items-center justify-center gap-3 transition-all rounded-sm shadow-[0_4px_20px_rgba(34,197,94,0.2)]
                          ${
                            state.juryAccounts.every(
                              (j) => state.juryVotes[j.id],
                            ) && !activeMatch.revealed
                              ? "bg-green-500 text-black hover:scale-[1.02]"
                              : "bg-white/5 text-white/20 cursor-not-allowed"
                          }`}
                  >
                    <Monitor size={18} />{" "}
                    {activeMatch.revealed
                      ? "RÉSULTATS AFFICHÉS"
                      : "AFFICHER RÉSULTAT DU BATTLE"}
                  </button>

                  {(() => {
                    const missingVotes = state.juryAccounts.some(
                      (j) => !state.juryVotes[j.id],
                    );
                    return (
                      <button
                        onClick={warnJudges}
                        disabled={!missingVotes}
                        className={`w-full py-3 font-black italic flex items-center justify-center gap-3 transition-all rounded-sm 
                              ${
                                missingVotes
                                  ? "bg-yellow-500 text-black hover:bg-yellow-400 shadow-[0_4px_20px_rgba(234,179,8,0.3)]"
                                  : "bg-white/5 text-white/20 cursor-not-allowed"
                              }`}
                      >
                        <Bell size={18} /> AVERTIR LE JUGE
                      </button>
                    );
                  })()}

                  <button
                    onClick={cancelMatch}
                    className="w-full py-3 bg-white/5 border border-white/10 text-white/60 font-black italic flex items-center justify-center gap-3 transition-all rounded-sm hover:bg-white/10"
                  >
                    <XCircle size={18} /> ANNULER LE MATCH
                  </button>

                  <button
                    onClick={finishMatch}
                    disabled={
                      !state.juryAccounts.every((j) => state.juryVotes[j.id]) ||
                      !activeMatch.revealed
                    }
                    className={`w-full py-4 font-black italic flex items-center justify-center gap-3 transition-all rounded-sm mb-2 shadow-[0_4px_20px_rgba(225,29,72,0.3)]
                          ${
                            state.juryAccounts.every(
                              (j) => state.juryVotes[j.id],
                            ) && activeMatch.revealed
                              ? "bg-brand-red text-white hover:scale-[1.02]"
                              : "bg-white/5 text-white/20 cursor-not-allowed"
                          }`}
                  >
                    <CheckCircle2 size={18} /> MARQUER TERMINER
                  </button>
                </div>
              )}
              {activeMatch?.votingMode === "round" &&
                activeMatch.status === "active" && (
                  <button
                    onClick={confirmRound}
                    className="w-full py-4 bg-green-600 text-white font-black italic flex items-center justify-center gap-3 transition-all rounded-sm hover:scale-[1.02]"
                  >
                    {activeMatch.currentRound < activeMatch.roundCount
                      ? `VALIDER ROUND ${activeMatch.currentRound}`
                      : "VALIDER DERNIER ROUND"}
                  </button>
                )}
              <button
                disabled={
                  (state.currentMatchId !== null &&
                    state.matches.find((m) => m.id === state.currentMatchId)
                      ?.status === "active") ||
                  !state.matches.some((m) => m.status === "pending")
                }
                onClick={nextMatch}
                className={`w-full py-4 font-black italic flex items-center justify-center gap-3 transition-all rounded-sm
                      ${(state.currentMatchId !== null && state.matches.find((m) => m.id === state.currentMatchId)?.status === "active") || !state.matches.some((m) => m.status === "pending") ? "bg-white/5 text-white/10" : "bg-white text-black hover:scale-[1.02] cursor-pointer"}`}
              >
                <SkipForward size={18} /> MATCH SUIVANT
              </button>
              <button
                onClick={() => setShowResetConfirmation(true)}
                className="w-full py-4 border border-white/10 text-white/30 font-black italic hover:bg-red-500 hover:text-black hover:border-red-500 transition-all rounded-sm"
              >
                <RotateCcw size={18} /> RÉINITIALISER TOUT
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirmation && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-black border-2 border-red-500 p-8 max-w-md w-full shadow-[0_0_40px_rgba(225,29,72,0.3)]">
            <h2 className="text-2xl font-black italic text-white uppercase mb-4">
              Confirmation
            </h2>
            <p className="text-white/80 mb-8">
              Êtes-vous sûr de vouloir réinitialiser tous les données du tournoi ? Cette action est irréversible.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowResetConfirmation(false);
                  reset();
                }}
                className="flex-1 py-3 bg-red-500 text-black font-black italic uppercase hover:scale-105 transition-all"
              >
                OK
              </button>
              <button
                onClick={() => setShowResetConfirmation(false)}
                className="flex-1 py-3 bg-white/10 text-white font-black italic uppercase hover:bg-white/20 transition-all border border-white/10"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function JuryView({
  state,
  juryId,
  onSave,
  onLogout,
  eventSlug,
  category,
}: {
  state: TournamentState;
  juryId: string;
  onSave: (s: TournamentState) => void;
  onLogout: () => void;
  eventSlug?: string;
  category?: string;
}) {
  // Helper to build API endpoint URLs based on whether we have eventSlug/category
  const buildApiUrl = (endpoint: string) => {
    if (eventSlug && category) {
      return `/api/${eventSlug}/${category}${endpoint}`;
    }
    return endpoint;
  };
  const currentMatch = state.matches.find((m) => m.id === state.currentMatchId);
  const [view, setView] = useState<"list" | "vote">("list");

  useEffect(() => {
    // Auto-exit vote console if match is cancelled or finished by admin
    // Also reset isChanging flag when match changes
    if (view === "vote") {
      const liveMatch = state.matches.find(
        (m) => m.id === state.currentMatchId,
      );
      if (!liveMatch || liveMatch.status !== "active") {
        setView("list");
      }
    }
    setIsChanging(false);
  }, [state.currentMatchId, state.matches, view]);
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

  const redP = state.participants.find((p) => p.id === currentMatch?.redTeamId);
  const blueP = state.participants.find(
    (p) => p.id === currentMatch?.blueTeamId,
  );

  const currentVotesRed = Object.values(state.juryVotes).filter(
    (v) => v === "red",
  ).length;
  const currentVotesBlue = Object.values(state.juryVotes).filter(
    (v) => v === "blue",
  ).length;
  const totalCurrentVotes = currentVotesRed + currentVotesBlue;

  const confirmRound = async () => {
    try {
      const res = await fetch(buildApiUrl("/confirm-round"), { method: "POST" });
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
      const res = await fetch(buildApiUrl("/next-match"), { method: "POST" });
      if (res.ok) {
        // State will update via polling
      }
    } catch (e) {
      console.warn("Server sync failed during nextMatch");
    }
  };

  const selectMatch = async (matchId: string) => {

    try {
      const res = await fetch(buildApiUrl("/select-match"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId }),
      });
      if (res.ok) {
        // setShowMatchList(false);
        setView("vote");
      }
    } catch (e) {
      console.warn("Server sync failed during selectMatch");
    }
  };

  const finalizeMatch = async () => {
    const cid = state.currentMatchId;
    if (!cid) {
      setView("list");
      return;
    }

    try {
      const res = await fetch(buildApiUrl("/finalize"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ juryId, matchId: cid }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          onSave(data.state);
        }
      }
    } catch (e) {
      console.error("Server error during finalizeMatch:", e);
    }

    setView("list");
  };

  const castVote = async (vote: "red" | "blue") => {
    if (!state.currentMatchId) return;

    try {
      const res = await fetch(buildApiUrl("/vote"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: state.currentMatchId, juryId, vote }),
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          onSave(data.state);
          setIsChanging(false);
          // Vote is now recorded - jury must click VALIDER button to finalize
        }
      } else {
        console.error("Vote failed:", res.status);
      }
    } catch (err) {
      console.error("Server error during vote:", err);
    }
  };

  if (!state.configured) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center font-black p-6 text-center">
        <div className="animate-spin w-16 h-16 border-4 border-white/10 border-t-white rounded-full mb-8" />
        <h2 className="text-2xl italic tracking-tighter opacity-50 uppercase mb-4 text-white">
          Système en attente
        </h2>
        <p className="text-white/20 text-xs tracking-widest uppercase">
          L'administrateur n'a pas encore lancé le tournoi
        </p>
      </div>
    );
  }

  // Check if this jury is assigned to this category
  const isJuryAssignedToCategory = state.juryAccounts.some((j) => j.id === juryId);

  if (!isJuryAssignedToCategory) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center font-black p-6 text-center">
        <div className="text-6xl mb-8 animate-pulse">⏳</div>
        <h2 className="text-3xl italic tracking-tighter uppercase mb-4 text-white">
          BIENTOT
        </h2>
        <p className="text-white/60 text-lg tracking-widest uppercase">
          Patientez...
        </p>
        <p className="text-white/40 text-sm mt-6">
          Vous n'êtes pas assigné à cette catégorie
        </p>
      </div>
    );
  }

  return (
    <div className="force-landscape-layout fixed inset-0 flex flex-col bg-black overflow-y-auto select-none font-sans text-white">
      {/* Header for Jury Console */}
      <header className="fixed top-4 left-4 right-4 flex justify-between items-center z-[100] pointer-events-none">
        <div className="flex bg-black/40 backdrop-blur-md px-4 py-2 border border-white/10 rounded-full pointer-events-auto items-center gap-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-white italic">
            CONSOLE JURY :{" "}
            <span className="text-white/60 ml-2">
              {state.juryAccounts.find((j) => j.id === juryId)?.username}
            </span>
          </span>
        </div>
        <button
          onClick={view === "vote" ? () => setView("list") : onLogout}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black font-black italic uppercase text-[10px] tracking-widest rounded-full hover:scale-105 transition-all pointer-events-auto shadow-xl"
        >
          {view === "vote" ? (
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

      {/* Warning Alert */}
      {state.warnedJuries?.includes(juryId) && !state.juryVotes[juryId] && (
        <div
          className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center overflow-hidden"
          style={{ background: "rgba(234, 179, 8, 0.05)" }}
        >
          <div className="absolute inset-0 bg-yellow-400/10 animate-pulse pointer-events-none" />
          <motion.div
            initial={{ rotate: -12, scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-yellow-500 text-black font-black text-xs sm:text-base tracking-[0.2em] italic py-2 px-8 border-y-[3px] border-black shadow-[0_0_40px_rgba(234,179,8,0.4)] whitespace-nowrap z-[201]"
            style={{
              transform: "rotate(-12deg)",
            }}
          >
            VOTEZ MAINTENANT !
          </motion.div>
        </div>
      )}

      {/* Dynamic Palette / List Selection */}
      <AnimatePresence mode="wait">
        {view === "vote" && currentMatch && currentMatch.status === "active" ? (
          <motion.div
            key="palette"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`flex-1 flex flex-row h-full relative transition-all duration-700 p-4 sm:p-8 md:p-12 gap-4 sm:gap-8`}
          >
            <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-50 pointer-events-none">
              <h3 className="text-[8px] sm:text-[10px] font-black tracking-[0.5em] text-white/40 uppercase">
                {currentMatch.votingMode === "round"
                  ? `ROUND ${currentMatch.currentRound} / ${currentMatch.roundCount}`
                  : currentMatch.round}
              </h3>
              {currentMatch.votingMode === "round" && (
                <div className="flex gap-1">
                  {Array.from({ length: currentMatch.roundCount }).map(
                    (_, i) => (
                      <div
                        key={i}
                        className={`w-8 sm:w-12 h-1 ${i < currentMatch.currentRound - 1 ? "bg-green-500" : i === currentMatch.currentRound - 1 ? "bg-white/40" : "bg-white/5"}`}
                      />
                    ),
                  )}
                </div>
              )}
            </div>
            {/* Red Button */}
            <button
              onClick={() => castVote("red")}
              disabled={!!myVote && !isChanging}
              className={`flex-1 flex flex-col items-center justify-center transition-all duration-700 touch-none relative overflow-hidden group
                ${isChanging && myVote === "red" ? "ring-8 ring-white/30 z-20 shadow-[0_0_100px_rgba(225,29,72,0.8)]" : ""}
                ${myVote && !isChanging ? (myVote === "red" ? "opacity-100 rounded-3xl" : "opacity-20 scale-90 rounded-3xl") : "p-4 active:scale-95 active:brightness-90"}
              `}
              style={{ backgroundColor: "rgb(225, 29, 72)" }}
            >
              {redP && (
                <div
                  className={`absolute inset-0 flex items-center justify-center p-2 transition-all duration-700 ${myVote && !isChanging ? "opacity-40 scale-75" : "md:p-8"}`}
                >
                  <div
                    className={`w-full h-full max-w-[85%] max-h-[85%] rounded-[1.5rem] md:rounded-[2rem] overflow-hidden border-4 md:border-8 border-white/20 shadow-2xl relative transition-all duration-700 ${myVote && !isChanging ? "rounded-full" : ""}`}
                  >
                    <DancerPhoto
                      photoUrl={redP.photo}
                      alt={redP.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-red/40 to-transparent" />
                  </div>
                </div>
              )}
              <div
                className={`relative z-10 flex flex-col items-center bg-black/40 rounded-xl border border-white/10 transition-all duration-700 short-screen-p-sm ${myVote && !isChanging ? "px-4 py-2 scale-75" : "px-4 py-3 sm:px-6 sm:py-4"}`}
              >
                <Shield
                  className={`${myVote && !isChanging ? "w-8 h-8 mb-1" : "w-10 h-10 md:w-16 md:h-16 mb-2 md:mb-4 short-screen-hide"} text-white drop-shadow-lg`}
                />
                <h2
                  className={`${myVote && !isChanging ? "text-lg sm:text-xl" : "text-xl md:text-4xl short-screen-text-sm"} font-black italic uppercase tracking-tighter text-center leading-tight mb-1 sm:mb-2 drop-shadow-md flex items-center gap-2 justify-center`}
                >
                  {redP?.countryFlag && (
                    <img
                      src={redP.countryFlag}
                      alt={redP.countryCode}
                      className="w-5 h-3.5 sm:w-7 sm:h-5 object-cover shrink-0 border border-white/10"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <span>{redP?.name}</span>
                </h2>
                <div className="px-3 py-1 bg-white text-black font-black italic uppercase text-[8px] sm:text-[10px] tracking-widest shadow-xl short-screen-text-sm">
                  {myVote === "red" && !isChanging
                    ? "SÉLECTIONNÉ"
                    : isChanging && myVote === "red"
                      ? "VOTE ACTUEL"
                      : "ROUGE"}
                </div>
              </div>
            </button>

            {/* Blue Button */}
            <button
              onClick={() => castVote("blue")}
              disabled={!!myVote && !isChanging}
              className={`flex-1 flex flex-col items-center justify-center transition-all duration-700 touch-none border-white/20 relative overflow-hidden group
                ${isChanging && myVote === "blue" ? "ring-8 ring-white/30 z-20 shadow-[0_0_100px_rgba(37,99,235,0.8)]" : ""}
                ${myVote && !isChanging ? (myVote === "blue" ? "opacity-100 rounded-3xl" : "opacity-20 scale-90 rounded-3xl") : "p-4 active:scale-95 active:brightness-90 border-l-2"}
              `}
              style={{ backgroundColor: "rgb(37, 99, 235)" }}
            >
              {blueP && (
                <div
                  className={`absolute inset-0 flex items-center justify-center p-2 transition-all duration-700 ${myVote && !isChanging ? "opacity-40 scale-75" : "md:p-8"}`}
                >
                  <div
                    className={`w-full h-full max-w-[85%] max-h-[85%] rounded-[1.5rem] md:rounded-[2rem] overflow-hidden border-4 md:border-8 border-white/20 shadow-2xl relative transition-all duration-700 ${myVote && !isChanging ? "rounded-full" : ""}`}
                  >
                    <DancerPhoto
                      photoUrl={blueP.photo}
                      alt={blueP.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-blue/40 to-transparent" />
                  </div>
                </div>
              )}
              <div
                className={`relative z-10 flex flex-col items-center bg-black/40 rounded-xl border border-white/10 transition-all duration-700 short-screen-p-sm ${myVote && !isChanging ? "px-4 py-2 scale-75" : "px-4 py-3 sm:px-6 sm:py-4"}`}
              >
                <Rocket
                  className={`${myVote && !isChanging ? "w-8 h-8 mb-1" : "w-10 h-10 md:w-16 md:h-16 mb-2 md:mb-4 short-screen-hide"} text-white drop-shadow-lg`}
                />
                <h2
                  className={`${myVote && !isChanging ? "text-lg sm:text-xl" : "text-xl md:text-4xl short-screen-text-sm"} font-black italic uppercase tracking-tighter text-center leading-tight mb-1 sm:mb-2 drop-shadow-md flex items-center gap-2 justify-center`}
                >
                  {blueP?.countryFlag && (
                    <img
                      src={blueP.countryFlag}
                      alt={blueP.countryCode}
                      className="w-5 h-3.5 sm:w-7 sm:h-5 object-cover shrink-0 border border-white/10"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <span>{blueP?.name}</span>
                </h2>
                <div className="px-3 py-1 bg-white text-black font-black italic uppercase text-[8px] sm:text-[10px] tracking-widest shadow-xl short-screen-text-sm">
                  {myVote === "blue" && !isChanging
                    ? "SÉLECTIONNÉ"
                    : isChanging && myVote === "blue"
                      ? "VOTE ACTUEL"
                      : "BLEU"}
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
                  <div
                    className={`w-16 h-16 md:w-24 md:h-24 rounded-full flex items-center justify-center mb-4 md:mb-8 border-4 short-screen-hide ${myVote === "red" ? "border-brand-red bg-brand-red/20 shadow-[0_0_40px_rgba(225,29,72,0.4)]" : "border-brand-blue bg-brand-blue/20 shadow-[0_0_40px_rgba(37,99,235,0.4)]"}`}
                  >
                    <CheckCircle2
                      size={32}
                      className="text-white md:w-12 md:h-12"
                    />
                  </div>
                  <p className="text-[10px] font-black tracking-[0.5em] text-white/40 uppercase mb-2 md:mb-3 short-screen-text-sm">
                    VOTE ENREGISTRÉ
                  </p>
                  <h3 className="text-2xl md:text-5xl font-black italic tracking-tighter uppercase mb-1 md:mb-2 short-screen-text-sm flex items-center gap-2.5 justify-center">
                    {(myVote === "red" ? redP : blueP)?.countryFlag && (
                      <img
                        src={(myVote === "red" ? redP : blueP)?.countryFlag}
                        alt="Flag"
                        className="w-6 h-4 md:w-9 md:h-6 object-cover border border-white/10 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <span>{myVote === "red" ? redP?.name : blueP?.name}</span>
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
                <h2 className="text-4xl font-black italic uppercase tracking-tighter">
                  BATTLES DU TOURNOI
                </h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 italic">
                  Sélectionnez le match actif pour juger
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {(() => {
                  // Show active match first, pending in middle, finished at bottom
                  const displayMatches = [...state.matches].sort((a, b) => {
                    // Active match first
                    if (a.id === state.currentMatchId) return -1;
                    if (b.id === state.currentMatchId) return 1;
                    // Pending matches in middle, finished at bottom
                    const statusPriority: Record<string, number> = {
                      "pending": 0,
                      "active": 0,
                      "finished": 1,
                    };
                    const priorityA = statusPriority[a.status] ?? 999;
                    const priorityB = statusPriority[b.status] ?? 999;
                    if (priorityA !== priorityB) return priorityA - priorityB;
                    // Keep order as received from server
                    return 0;
                  });
                  return displayMatches.map((m, i) => {
                    const red = state.participants.find(
                      (p) => p.id === m.redTeamId,
                    );
                    const blue = state.participants.find(
                      (p) => p.id === m.blueTeamId,
                    );
                    const isActive = m.status === "active";
                    const isFinishedGlobal = m.status === "finished";
                    const isFinishedByMe =
                      m.finishedJuries &&
                      Array.isArray(m.finishedJuries) &&
                      m.finishedJuries.includes(juryId);
                  const isFinished = isFinishedGlobal || isFinishedByMe;

                  return (
                    <div
                      key={m.id}
                      className={`w-full group p-6 flex flex-col md:flex-row justify-between items-center gap-6 transition-all border 
                        ${isActive && !isFinishedByMe ? "bg-white/10 border-white shadow-[0_0_40px_rgba(255,255,255,0.1)]" : "bg-white/5 border-white/5"}
                        ${isFinished ? "opacity-30" : ""}
                      `}
                    >
                      <div className="flex items-center gap-6 w-full md:w-auto">
                        <span className="text-xs font-black text-white/20 w-6">
                          0{i + 1}
                        </span>
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black uppercase text-white/30 mb-1">
                            {m.round}
                          </span>
                          <div className="flex flex-1 items-center gap-4 text-xl italic font-black uppercase">
                            <span
                              className={
                                isFinishedGlobal && m.winnerId === m.redTeamId
                                  ? "text-brand-red"
                                  : ""
                              }
                            >
                              {red?.name}
                            </span>
                            <span className="text-white/10 text-[10px] not-italic font-bold">
                              VS
                            </span>
                            <span
                              className={
                                isFinishedGlobal && m.winnerId === m.blueTeamId
                                  ? "text-brand-blue"
                                  : ""
                              }
                            >
                              {blue?.name}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 w-full md:w-auto">
                        {isActive && !isFinishedByMe && red && blue ? (
                          <button
                            onClick={() => setView("vote")}
                            className="w-full md:w-auto px-8 py-3 bg-brand-red text-white font-black italic uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(225,29,72,0.4)] animate-pulse"
                          >
                            <Play size={14} className="fill-current" />
                            JUGER LA BATTLE
                          </button>
                        ) : isFinishedByMe ? (
                          <div className="flex flex-col items-end opacity-40">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 border border-white/10 px-4 py-2 bg-white/5">
                              TERMINÉ
                            </span>
                          </div>
                        ) : isFinishedGlobal ? (
                          <span className="text-[8px] font-black uppercase tracking-widest text-white/20 border border-white/5 px-3 py-2">
                            BATTLE TERMINÉ
                          </span>
                        ) : (
                          <span className="text-[8px] font-black uppercase tracking-widest text-white/10 italic">
                            EN ATTENTE...
                          </span>
                        )}
                      </div>
                    </div>
                  );
                  });
                })()}
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
        const contentWidth = 2450;
        const contentHeight = measureRef.current.offsetHeight;

        const scaleW = (containerWidth - 20) / contentWidth;
        const scaleH = (containerHeight - 20) / contentHeight;
        const scale = Math.min(1, scaleW, scaleH);

        setBracketScale(scale);
        setBracketHeight(contentHeight);
      }
    };

    updateScale();
    const timer = setTimeout(updateScale, 200);
    window.addEventListener("resize", updateScale);
    return () => {
      window.removeEventListener("resize", updateScale);
      clearTimeout(timer);
    };
  }, [state.matches, state.tournamentSize]);

  return (
    <div className="h-screen bg-[#0a0807] overflow-hidden flex flex-col selection:bg-primary/30">
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] diagonal-lines z-0"></div>

     <header className="px-0 py-3 md:py-4 flex items-center justify-center z-50 shrink-0 bg-black/60 backdrop-blur-md border-b border-white/5 w-full">
  <div className="flex items-center justify-between gap-4 w-full px-4 md:px-6">
    <div className="flex items-center flex-1 gap-2 min-w-0">
      <p className="text-xs md:text-sm font-black uppercase tracking-[0.2em] text-white/40 whitespace-nowrap flex-shrink-0">
        {state.currentCategory || "Bracket"}
      </p>
      <div className="h-1 flex-1 bg-gradient-to-r from-white/60 to-transparent"></div>
    </div>
    <div className="flex items-center justify-center gap-4 flex-shrink-0">
      {state.competitionLogo ? (
        <img 
          src={state.competitionLogo} 
          alt={state.competitionName}
          className="h-24 md:h-32 object-contain"
        />
      ) : (
        <h1 className="text-lg md:text-2xl font-black italic uppercase tracking-tighter text-white">
          {state.competitionName}
        </h1>
      )}
    </div>
    <div className="flex items-center flex-1 gap-2 min-w-0">
      <div className="h-1 flex-1 bg-gradient-to-l from-primary/60 to-transparent"></div>
      <p className="text-xs md:text-sm font-black uppercase tracking-widest text-primary whitespace-nowrap flex-shrink-0">
        {state.tournamentSize === 16 ? "TOP 16" : state.tournamentSize === 8 ? "TOP 8" : state.tournamentSize === 4 ? "TOP 4" : "FINALE"}
      </p>
    </div>
  </div>
</header>

      <main
        ref={bracketContainerRef}
        className="flex-1 relative z-10 overflow-hidden flex items-center justify-center px-1"
      >
        {/* Hidden clone for measurement */}
        <div
          ref={measureRef}
          className="absolute top-0 left-0 invisible pointer-events-none"
          style={{ width: "2450px" }}
        >
          <BracketContent state={state} />
        </div>

        {/* Scaled visible content */}
        <div
          style={{
            width: "2450px",
            transform: `scale(${bracketScale})`,
            transformOrigin: "center center",
            transition: "transform 0.4s ease-out",
            willChange: "transform",
            flexShrink: 0,
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
  side?: "left" | "right";
  key?: string | number;
  onUpdateMatchTeam?: (
    matchId: string,
    side: "red" | "blue",
    pId: string,
  ) => void;
  onUpdateParticipantCountry?: (pId: string, countryCode: string) => void;
  countries?: any[];
}

function MatchNode({
  match,
  participants,
  className = "",
  onUpdateMatchTeam,
  onUpdateParticipantCountry,
  countries,
}: MatchNodeProps) {
  const getParticipant = (id: string) => participants.find((p) => p.id === id);
  const red = match ? getParticipant(match.redTeamId) : null;
  const blue = match ? getParticipant(match.blueTeamId) : null;

  const isWinner = (pId: string) =>
    match?.status === "finished" && match.winnerId === pId;

  return (
    <div
      className={`bracket-card flex flex-col gap-1 group hover:border-primary/30 min-w-[180px] md:min-w-[240px] ${className} ${match?.status === "active" ? "bracket-card-active" : ""}`}
    >
      {[red, blue].map((p, idx) => {
        const side = idx === 0 ? "red" : "blue";
        const teamId = side === "red" ? match?.redTeamId : match?.blueTeamId;

        return (
          <div
            key={idx}
            className="flex justify-between items-center h-10 md:h-14 px-4 relative border-b border-white/5 last:border-b-0"
          >
            <div className="flex items-center gap-3 overflow-hidden w-full">
              {onUpdateMatchTeam && match ? (
                <div className="flex items-center gap-1.5 w-full overflow-hidden">
                  <select
                    value={teamId || ""}
                    onChange={(e) =>
                      onUpdateMatchTeam(match.id, side, e.target.value)
                    }
                    className="bg-transparent text-[13px] md:text-[18px] font-black uppercase italic tracking-tight outline-none border-b border-white/10 focus:border-primary flex-1 text-white cursor-pointer hover:text-primary transition-colors appearance-none min-w-0"
                  >
                    <option value="" className="bg-[#0a0807]">
                      -
                    </option>
                    {participants.map((part) => (
                      <option
                        key={part.id}
                        value={part.id}
                        className="bg-[#0a0807]"
                      >
                        {part.name}
                      </option>
                    ))}
                  </select>
                  {onUpdateParticipantCountry && p && countries && (
                    <div
                      className="relative shrink-0 flex items-center justify-center hover:scale-110 transition-transform duration-200"
                      title="Changer le pays"
                    >
                      {p.countryFlag ? (
                        <img
                          src={p.countryFlag}
                          alt={p.countryCode || "Drapeau"}
                          className="w-4.5 h-3 md:w-5 md:h-3.5 object-cover shrink-0 border border-white/20 rounded-xs"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <svg
                          className="w-4.5 h-3 md:w-5 md:h-3.5 text-white/30 border border-white/10 border-dashed rounded-xs bg-white/5 flex shrink-0"
                          viewBox="0 0 20 14"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 2v10M3 3h12l-2 3 2 3H3"
                          />
                        </svg>
                      )}

                      {/* Invisible native select overlaid on the flag to change the country */}
                      <select
                        value={p.countryCode || ""}
                        onChange={(e) =>
                          onUpdateParticipantCountry(p.id, e.target.value)
                        }
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      >
                        <option value="" className="bg-[#0a0807] text-white/50">
                          - Aucun pays -
                        </option>
                        {countries.map((c) => (
                          <option
                            key={c.cca2}
                            value={c.cca2}
                            className="bg-[#0a0807] text-white"
                          >
                            {c.translations?.fra?.common ||
                              c.name?.common ||
                              c.cca2}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ) : (
                <span
                  className={`text-[13px] md:text-[18px] font-black uppercase italic tracking-tight truncate flex items-center gap-1.5 ${p ? "text-white" : "text-white/10"} ${p && isWinner(p.id) ? "text-primary" : ""}`}
                >
                  <span>{p?.name || "-"}</span>
                  {p?.countryFlag && (
                    <img
                      src={p.countryFlag}
                      alt={p.countryCode}
                      className="w-4.5 h-3 md:w-5 md:h-3.5 object-cover shrink-0 border border-white/10 rounded-xs"
                      referrerPolicy="no-referrer"
                    />
                  )}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 md:gap-2 shrink-0 ml-2">
              <span
                className={`text-[12px] md:text-[15px] font-mono font-black ${p ? "text-white/40" : "text-white/5"}`}
              >
                {match?.status === "finished"
                  ? p?.id === match.redTeamId
                    ? match.redVotes
                    : p?.id === match.blueTeamId
                      ? match.blueVotes
                      : "-"
                  : "-"}
              </span>
            </div>
            {p && isWinner(p.id) && (
              <div className="absolute -left-0.5 md:-left-1 top-1/2 -translate-y-1/2 w-0.5 md:w-1 h-5 md:h-7 bg-primary shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function BracketContent({
  state,
  onUpdateMatchTeam,
  onUpdateParticipantCountry,
  countries,
}: {
  state: TournamentState;
  onUpdateMatchTeam?: (mId: string, s: "red" | "blue", pId: string) => void;
  onUpdateParticipantCountry?: (pId: string, countryCode: string) => void;
  countries?: any[];
}) {
  const getMatch = (round: string, index: number) => {
    const roundMatches = state.matches.filter((m) => m.round === round);
    return roundMatches[index];
  };

  const getWinner = (match?: Match) =>
    state.participants.find((p) => p.id === match?.winnerId);

  const showTop16 = state.tournamentSize >= 16;
  const showTop8 = state.tournamentSize >= 8;
  const showSemi = state.tournamentSize >= 4;

  return (
    <div className="flex justify-center items-center w-full px-10 md:px-20 py-2 md:py-6 relative gap-8 md:gap-12">
      {/* LEFT SIDE FLOW */}
      <div className="flex items-center gap-8 md:gap-12">
        {showTop16 && (
          <div className="flex flex-col gap-10 md:gap-14">
            {[0, 1, 2, 3].map((i) => (
              <MatchNode
                key={`l16-${i}`}
                match={getMatch("TOP 16", i)}
                participants={state.participants}
                onUpdateMatchTeam={onUpdateMatchTeam}
                onUpdateParticipantCountry={onUpdateParticipantCountry}
                countries={countries}
              />
            ))}
          </div>
        )}
        {showTop8 && (
          <div className="flex flex-col gap-40 md:gap-52">
            {[0, 1].map((i) => (
              <MatchNode
                key={`l8-${i}`}
                match={getMatch("TOP 8", i)}
                participants={state.participants}
                onUpdateMatchTeam={onUpdateMatchTeam}
                onUpdateParticipantCountry={onUpdateParticipantCountry}
                countries={countries}
              />
            ))}
          </div>
        )}
        {showSemi && (
          <div className="flex flex-col gap-2">
            <div className="p-4 border border-primary/20 bg-primary/5 rounded-sm relative w-[260px] shadow-[0_0_30px_rgba(255,255,255,0.02)]">
              <span className="absolute -top-3 left-6 text-[10px] font-black text-primary uppercase bg-[#0a0807] px-3 italic tracking-widest border border-primary/20 whitespace-nowrap">
                SEMI-FINAL A
              </span>
              <MatchNode
                match={getMatch("SEMI FINALE", 0)}
                participants={state.participants}
                className="border-none bg-transparent p-0 min-w-0"
                onUpdateMatchTeam={onUpdateMatchTeam}
                onUpdateParticipantCountry={onUpdateParticipantCountry}
                countries={countries}
              />
            </div>
            {getMatch("SEMI FINALE", 0)?.winnerId && (
              <div className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-yellow-400/60 bg-yellow-400/10 rounded-sm">
                <span className="text-[13px] font-black italic uppercase tracking-wide text-yellow-300">
                  {state.participants.find(p => p.id === getMatch("SEMI FINALE", 0)?.winnerId)?.name}
                </span>
                <span className="text-primary font-black">→</span>
                <span className="text-[12px] font-bold text-yellow-300 uppercase">FINALE</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CENTER: CHAMPION */}
      <div className="flex flex-col items-center gap-8 px-6 relative z-20 shrink-0">
        <div className="text-center">
          <Trophy
            className="text-primary mx-auto mb-2 animate-pulse drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]"
            size={48}
          />
          <h1 className="text-5xl md:text-6xl font-black italic tracking-tighter text-white leading-[0.8]">
            FINALE
          </h1>
        </div>

        <div className="champion-box w-[260px] h-[380px] p-0.5 flex flex-col relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-4 relative z-10">
            <div className="w-24 h-24 rounded-full bg-white/5 border-2 border-white/10 flex items-center justify-center overflow-hidden shadow-[0_0_40px_rgba(255,255,255,0.05)]">
              {getWinner(getMatch("FINALE", 0)) ? (
                <DancerPhoto
                  photoUrl={getWinner(getMatch("FINALE", 0))?.photo}
                  alt={getWinner(getMatch("FINALE", 0))?.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-white/5">
                  <Users size={48} />
                </div>
              )}
            </div>
            <div className="text-center space-y-2">
              <p className="text-[13px] font-bold text-primary uppercase tracking-[0.3em] italic">
                Champion
              </p>
              <h2 className="text-4xl font-black italic uppercase text-white tracking-tighter truncate w-[220px] drop-shadow-md">
                {getWinner(getMatch("FINALE", 0))?.name || "-"}
              </h2>
            </div>
          </div>
          <div className="h-1.5 bg-gradient-to-r from-transparent via-primary to-transparent" />
        </div>
      </div>

      {/* RIGHT SIDE FLOW */}
      <div className="flex items-center gap-8 md:gap-12 flex-row-reverse">
        {showTop16 && (
          <div className="flex flex-col gap-10 md:gap-14">
            {[4, 5, 6, 7].map((i) => (
              <MatchNode
                key={`r16-${i}`}
                match={getMatch("TOP 16", i)}
                participants={state.participants}
                onUpdateMatchTeam={onUpdateMatchTeam}
                onUpdateParticipantCountry={onUpdateParticipantCountry}
                countries={countries}
              />
            ))}
          </div>
        )}
        {showTop8 && (
          <div className="flex flex-col gap-40 md:gap-52">
            {[2, 3].map((i) => (
              <MatchNode
                key={`r8-${i}`}
                match={getMatch("TOP 8", i)}
                participants={state.participants}
                onUpdateMatchTeam={onUpdateMatchTeam}
                onUpdateParticipantCountry={onUpdateParticipantCountry}
                countries={countries}
              />
            ))}
          </div>
        )}
        {showSemi && (
          <div className="flex flex-col gap-2">
            <div className="p-4 border border-primary/20 bg-primary/5 rounded-sm relative w-[260px] shadow-[0_0_30px_rgba(255,255,255,0.02)]">
              <span className="absolute -top-3 right-6 text-[10px] font-black text-primary uppercase bg-[#0a0807] px-3 italic tracking-widest border border-primary/20 whitespace-nowrap">
                SEMI-FINAL B
              </span>
              <MatchNode
                match={getMatch("SEMI FINALE", 1)}
                participants={state.participants}
                className="border-none bg-transparent p-0 min-w-0"
                onUpdateMatchTeam={onUpdateMatchTeam}
                onUpdateParticipantCountry={onUpdateParticipantCountry}
                countries={countries}
              />
            </div>
            {getMatch("SEMI FINALE", 1)?.winnerId && (
              <div className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-yellow-400/60 bg-yellow-400/10 rounded-sm">
                <span className="text-[10px] font-bold text-yellow-300 uppercase">FINALE</span>
                <span className="text-primary font-black">←</span>
                <span className="text-[11px] font-black italic uppercase tracking-wide text-yellow-300">
                  {state.participants.find(p => p.id === getMatch("SEMI FINALE", 1)?.winnerId)?.name}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PublicView({ state }: { state: TournamentState }) {
  const navigate = useNavigate();
  const activeMatch = state.matches.find((m) => m.id === state.currentMatchId);
  const redP = activeMatch
    ? state.participants.find((p) => p.id === activeMatch.redTeamId)
    : null;
  const blueP = activeMatch
    ? state.participants.find((p) => p.id === activeMatch.blueTeamId)
    : null;

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
        setScale(1);
      }
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [activeMatch]);

  if (!activeMatch) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-12 text-center font-sans text-white">
        {state.competitionLogo ? (
          <img 
            src={state.competitionLogo} 
            alt={state.competitionName}
            className="h-40 md:h-52 object-contain mb-8"
          />
        ) : (
          <h1 className="text-4xl font-black italic text-white/10 uppercase tracking-widest leading-none mb-8">
            {state.competitionName || "ARENA SYSTEM"}
          </h1>
        )}
        <div className="w-16 h-16 border-2 border-white/5 border-t-white/40 rounded-full animate-spin mb-6" />
        <p className="text-white/10 font-bold uppercase tracking-[0.4em] text-[10px]">
          System Interlink Pending • Waiting for Active Battle
        </p>
        <button
          onClick={() => navigate("/select")}
          className="mt-12 text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-white transition-all underline underline-offset-8"
        >
          Hub System
        </button>
      </div>
    );
  }

  const currentVotesRed = Object.values(state.juryVotes).filter(
    (v) => v === "red",
  ).length;
  const currentVotesBlue = Object.values(state.juryVotes).filter(
    (v) => v === "blue",
  ).length;
  const totalCurrentVotes = currentVotesRed + currentVotesBlue;

  const gracePeriodPassed = activeMatch.allVotesCastAt
    ? now - activeMatch.allVotesCastAt > 5000
    : false;

  // Gate scores and results behind the revealed/finished status
  const showResults = activeMatch.status === "finished" || activeMatch.revealed;

  const redScore = showResults
    ? activeMatch.votingMode === "round"
      ? activeMatch.redVotes
      : currentVotesRed
    : 0;

  const blueScore = showResults
    ? activeMatch.votingMode === "round"
      ? activeMatch.blueVotes
      : currentVotesBlue
    : 0;

  const winner = showResults ? (redScore > blueScore ? redP : blueP) : null;

  // Get current tournament level from active match round
  const getCurrentTournamentLevel = () => {
    if (!activeMatch) return "FINALES";
    
    const round = activeMatch.round;
    if (round === "TOP 16") return "HUITIEMES DE FINALES";
    if (round === "TOP 8") return "QUART DE FINALE";
    if (round === "SEMI FINALE") return "DEMI-FINALES";
    return "FINALES";
  };

  return (
    <div className="h-screen bg-[#050502] text-white font-sans selection:bg-brand-red selection:text-white flex flex-col relative overflow-hidden pb-14 md:pb-20">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute -top-1/4 -left-1/4 w-full h-full bg-brand-red blur-[150px] opacity-10" />
        <div className="absolute -bottom-1/4 -right-1/4 w-full h-full bg-brand-blue blur-[150px] opacity-10" />
      </div>

      {/* Header Bar */}
      <header className="px-0 py-1 md:py-2 flex items-center justify-center z-20 shrink-0">
        <div className="flex items-center justify-between gap-1 md:gap-2 w-full px-1 sm:px-2 md:px-4">
          <div className="flex items-center flex-1 gap-0.5 md:gap-1 min-w-0">
            <p className="text-xs md:text-sm font-black italic uppercase tracking-widest text-white/60 whitespace-nowrap flex-shrink-0">
              {state.currentCategory || "Battle"}
            </p>
            <div className="h-0.5 md:h-1 flex-1 bg-gradient-to-r from-white/60 to-transparent"></div>
          </div>

          <div className="flex flex-col items-center pointer-events-none flex-shrink-0 px-1 md:px-2">
            {state.competitionLogo ? (
              <img 
                src={state.competitionLogo} 
                alt={state.competitionName}
                className="h-24 md:h-32 object-contain drop-shadow-2xl"
              />
            ) : (
              <h1 className="text-lg md:text-2xl font-black tracking-tighter leading-none italic uppercase truncate text-white/90 drop-shadow-2xl">
                {state.competitionName}
              </h1>
            )}
          </div>

          <div className="flex items-center flex-1 gap-0.5 md:gap-1 min-w-0">
            <div className="h-0.5 md:h-1 flex-1 bg-gradient-to-l from-primary/60 to-transparent"></div>
            <p className="text-xs md:text-sm font-black italic uppercase tracking-widest text-primary whitespace-nowrap flex-shrink-0">
              {state.tournamentSize === 16 ? "TOP 16" : state.tournamentSize === 8 ? "TOP 8" : state.tournamentSize === 4 ? "TOP 4" : "FINALE"}
            </p>
          </div>
        </div>
      </header>

      {/* Main Battle Area */}
      <main
        ref={containerRef}
        className="flex-1 flex flex-col items-center justify-center px-1 sm:px-2 md:px-4 z-10 overflow-hidden w-full relative"
      >
        <div
          ref={contentRef}
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "center center",
            transition: "transform 0.5s ease-out",
          }}
          className="w-full max-w-6xl flex flex-col items-center shrink-0"
        >
          <div className="w-full grid grid-cols-[1fr_auto_1fr] items-stretch gap-0 md:gap-1 relative py-1">
            {/* Red Side */}
            <div className="space-y-0 md:space-y-1 flex flex-col min-w-0">
              <div className="flex justify-end gap-0.5 md:gap-1 items-end flex-1">
                <div className="w-20 h-14 sm:w-44 sm:h-28 md:w-56 md:h-44 bg-white/5 border border-white/10 flex items-center justify-center p-0.5 relative group overflow-hidden shrink-0">
                  <DancerPhoto
                    photoUrl={redP?.photo}
                    alt={redP?.name}
                    className="w-full h-full object-cover transition-all duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
                <div className="w-6 h-6 sm:w-12 sm:h-12 md:w-16 md:h-16 bg-brand-red flex items-center justify-center text-xs sm:text-2xl md:text-3xl font-black italic shadow-[0_0_40px_rgba(225,29,72,0.3)] border-b border-black/20 uppercase shrink-0">
                  {redScore}
                </div>
              </div>
              <div className="bg-brand-red font-black italic text-[6px] sm:text-[8px] md:text-xs px-1 md:px-2 py-0.5 md:py-1 flex items-center justify-start gap-0.5 md:gap-1 border-l border-white/30 shadow-[inset_-20px_0_60px_rgba(0,0,0,0.3)] overflow-hidden">
                {redP?.countryFlag && (
                  <img
                    src={redP.countryFlag}
                    alt={redP.countryCode}
                    className="w-3 h-2 md:w-4 md:h-3 object-cover border border-white/10 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                )}
                <span className="truncate uppercase tracking-tighter text-[7px] md:text-sm">
                  {redP?.name || "-"}
                </span>
              </div>
            </div>

            {/* VS Divider */}
            <div className="text-[10px] md:text-xl font-black italic text-white/95 px-0.5 pt-1 md:pt-2 select-none self-center shrink-0 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
              VS
            </div>

            {/* Blue Side */}
            <div className="space-y-0 md:space-y-1 flex flex-col min-w-0">
              <div className="flex justify-start gap-0.5 md:gap-1 items-end flex-1">
                <div className="w-6 h-6 sm:w-12 sm:h-12 md:w-16 md:h-16 bg-brand-blue flex items-center justify-center text-xs sm:text-2xl md:text-3xl font-black italic shadow-[0_0_40px_rgba(37,99,235,0.3)] border-b border-black/20 uppercase shrink-0">
                  {blueScore}
                </div>
                <div className="w-20 h-14 sm:w-44 sm:h-28 md:w-56 md:h-44 bg-white/5 border border-white/10 flex items-center justify-center p-0.5 relative group overflow-hidden shrink-0">
                  <DancerPhoto
                    photoUrl={blueP?.photo}
                    alt={blueP?.name}
                    className="w-full h-full object-cover transition-all duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
              </div>
              <div className="bg-brand-blue font-black italic text-[6px] sm:text-[8px] md:text-xs px-1 md:px-2 py-0.5 md:py-1 flex items-center justify-end gap-0.5 md:gap-1 border-r border-white/30 shadow-[inset_20px_0_60px_rgba(0,0,0,0.3)] overflow-hidden">
                <span className="truncate uppercase tracking-tighter text-right text-[7px] md:text-sm">
                  {blueP?.name || "-"}
                </span>
                {blueP?.countryFlag && (
                  <img
                    src={blueP.countryFlag}
                    alt={blueP.countryCode}
                    className="w-3 h-2 md:w-4 md:h-3 object-cover border border-white/10 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Jury Table */}
          <div className="w-full mt-1 md:mt-2 relative overflow-hidden">
            <div className="bg-[#0a0a18]/60 border border-white/10 backdrop-blur-xl shadow-2xl overflow-x-auto no-scrollbar">
              <div
                className="grid border-b border-white/10 min-w-full"
                style={{
                  gridTemplateColumns: `repeat(${state.juryAccounts.length}, minmax(50px, 1fr))`,
                }}
              >
                {state.juryAccounts.map((jury, i) => {
                  return (
                    <div
                      key={jury.id}
                      className="py-1 md:py-1.5 text-center border-r border-white/5 last:border-r-0 overflow-hidden"
                    >
                      <span className="text-[6px] md:text-[8px] font-black uppercase tracking-widest italic text-white block truncate px-0.5">
                        {jury.username}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="flex gap-1">
                  {activeMatch.votingMode === "round"
                    ? Array.from({ length: activeMatch.roundCount }).map(
                        (_, i) => {
                          const result = activeMatch.roundResults?.[i];
                          return (
                            <div
                              key={i}
                              className="flex flex-col gap-0.5 items-center"
                            >
                              <div
                                className={`w-4 h-4 flex items-center justify-center border text-[6px] ${result ? (result.red > result.blue ? "bg-brand-red border-brand-red" : result.blue > result.red ? "bg-brand-blue border-brand-blue" : "bg-white/20 border-white/40") : "bg-white/5 border-white/10"}`}
                              >
                                {result && (
                                  <span className="text-[6px] font-black italic">
                                    {result.red > result.blue
                                      ? "R"
                                      : result.blue > result.red
                                        ? "B"
                                        : "="}
                                  </span>
                                )}
                              </div>
                              <span className="text-[5px] font-black opacity-20 uppercase">
                                R{i + 1}
                              </span>
                            </div>
                          );
                        },
                      )
                    : null}
                </div>
              </div>

              <div
                className="grid h-16"
                style={{
                  gridTemplateColumns: `repeat(${state.juryAccounts.length}, 1fr)`,
                }}
              >
                {state.juryAccounts.map((jury, i) => {
                  const hasVoted = !!state.juryVotes[jury.id];
                  const showActualVote =
                    activeMatch.status === "finished" || activeMatch.revealed;
                  const vote = showActualVote ? state.juryVotes[jury.id] : null;
                  
                  // Determine background color:
                  // - If results revealed and has vote: show actual color (red/blue)
                  // - If results NOT revealed but has voted: show WHITE
                  // - Otherwise: show dark
                  let bgColor = "bg-white/5";
                  if (showActualVote && vote) {
                    bgColor = vote === "red"
                      ? "bg-brand-red shadow-[inset_0_0_20px_rgba(225,29,72,0.5)]"
                      : "bg-brand-blue shadow-[inset_0_0_20px_rgba(37,99,235,0.5)]";
                  } else if (hasVoted && !showActualVote) {
                    bgColor = "bg-white shadow-[inset_0_0_20px_rgba(255,255,255,0.3)]";
                  }
                  
                  return (
                    <div
                      key={jury.id}
                      className="border-r border-white/5 last:border-r-0 flex flex-col p-2 relative overflow-hidden"
                    >
                      <div
                        className={`flex-1 transition-all duration-700 ${bgColor}`}
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
                animate={{ height: "auto", opacity: 1, scale: 1 }}
                className="w-full max-w-6xl mt-0.5 overflow-hidden"
              >
                <div
                  className={`py-2 md:py-3 flex items-center justify-center gap-1.5 md:gap-2 font-black italic text-base md:text-2xl tracking-tight uppercase shadow-[0_0_60px_rgba(0,0,0,1)] relative overflow-hidden border border-white/10
                ${winner.id === redP?.id ? "bg-brand-red" : "bg-brand-blue"}
              `}
                >
                  <div className="absolute inset-0 bg-white/10 animate-pulse mix-blend-overlay" />
                  <div className="z-10 flex items-center gap-1 md:gap-1.5 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                    <Trophy size={24} className="text-white fill-white/20" />
                    <span className="text-sm md:text-lg truncate">{winner.name} WINS</span>
                  </div>
                  {/* Glowing Outer Light */}
                  <div
                    className={`absolute -inset-1 blur-[20px] -z-10 opacity-40 ${winner.id === redP?.id ? "bg-brand-red" : "bg-brand-blue"}`}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Tournament Progression Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white text-black font-black italic uppercase tracking-tight py-1 md:py-1.5 px-2 z-30 h-auto flex items-center justify-center">
        <div className="text-center text-[10px] md:text-xl truncate">
          {getCurrentTournamentLevel()}
        </div>
      </footer>
    </div>
  );
}
