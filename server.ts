import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

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

// Helper to check if a match is finished and update winner
function updateMatchResult(match: Match, votes: Record<string, 'red' | 'blue' | null>, juryCount: number) {
  const voteList = Object.values(votes).filter(v => v !== null && v !== undefined);
  
  const redCount = voteList.filter(v => v === 'red').length;
  const blueCount = voteList.filter(v => v === 'blue').length;
  match.redVotes = redCount;
  match.blueVotes = blueCount;

  if (voteList.length >= juryCount) {
    // Record when all votes were in for the 5s grace period
    match.allVotesCastAt = Date.now();
    // We do NOT set status = 'finished' here anymore. 
    // It will stay 'active' so jury doesn't know they are done.
    // WinnerId is calculated but not used for display yet.
    match.winnerId = redCount > blueCount ? match.redTeamId : match.blueTeamId;
  } else {
    match.allVotesCastAt = undefined;
    match.winnerId = null;
  }
}

let tournamentState: TournamentState = {
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

const app = express();
const PORT = 3000;

app.use(express.json());

// --- API Routes ---

app.get("/api/state", (req, res) => {
  res.json(tournamentState);
});

app.post("/api/jury/login", (req, res) => {
  const { username, password } = req.body;
  const jury = tournamentState.juryAccounts.find(j => j.username === username && j.password === password);
  if (jury) {
    res.json({ success: true, juryId: jury.id });
  } else {
    res.status(401).json({ error: "Username ou mot de passe incorrect" });
  }
});

app.post("/api/admin/configure", (req, res) => {
  const { competitionName, competitionLogo, participants, juryAccounts, matches } = req.body;
  
  tournamentState = {
    competitionName: competitionName || "ARENA CHAMPIONSHIP",
    competitionLogo: competitionLogo || "",
    participants: participants || [],
    juryAccounts: juryAccounts || [],
    juryCount: juryAccounts ? juryAccounts.length : 3,
    currentMatchId: matches && matches.length > 0 ? matches[0].id : null,
    matches: matches || [],
    juryVotes: {},
    configured: true
  };
  
  const active = tournamentState.matches.find(m => m.id === tournamentState.currentMatchId);
  if (active) active.status = 'active';

  res.json({ success: true, state: tournamentState });
});

app.post("/api/admin/next-match", (req, res) => {
  const activeIdx = tournamentState.matches.findIndex(m => m.id === tournamentState.currentMatchId);
  if (activeIdx !== -1) {
    tournamentState.matches[activeIdx].status = 'finished';
    const next = tournamentState.matches.find((m, i) => i > activeIdx && m.status === 'pending');
    if (next) {
      tournamentState.currentMatchId = next.id;
      next.status = 'active';
      tournamentState.juryVotes = {}; 
    } else {
      tournamentState.currentMatchId = null;
    }
  }
  res.json({ success: true, state: tournamentState });
});

app.post("/api/jury/vote", (req, res) => {
  const { juryId, vote } = req.body;
  if (!tournamentState.currentMatchId) return res.status(400).json({ error: "No match active" });

  tournamentState.juryVotes[juryId] = vote;
  
  const match = tournamentState.matches.find(m => m.id === tournamentState.currentMatchId);
  if (match) {
    updateMatchResult(match, tournamentState.juryVotes, tournamentState.juryCount);
  }

  res.json({ success: true, state: tournamentState });
});

app.post("/api/admin/reset", (req, res) => {
  tournamentState = {
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
  res.json({ success: true, state: tournamentState });
});

async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

if (process.env.NODE_ENV !== "production") {
  setupVite().then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  });
} else {
  // In production (Vercel/CloudRun), setup handles static files
  setupVite();
  // Listen only if not on Vercel (Vercel uses the exported app)
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  }
}

export default app;
