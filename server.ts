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
  // New fields for multi-round support
  votingMode: 'match' | 'round';
  roundCount: number;
  currentRound: number;
  roundResults: { red: number; blue: number }[]; // Index matches round index (0-based)
  finishedJuries: string[]; // List of juryIds who finalized this match
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
  juryVotes: Record<string, 'red' | 'blue' | null>;
  warnedJuries: string[];
  configured: boolean;
  tournamentSize: 16 | 8 | 4 | 2;
}

// Helper to check if a match is finished and update winner
function advanceWinner(finishedMatch: Match, state: TournamentState) {
  const winnerId = finishedMatch.winnerId;
  if (!winnerId) return;

  const matches = state.matches;
  const matchId = finishedMatch.id;

  // Progression map: which match indices/IDs flow into which
  const progression: Record<string, { nextMatchId: string; side: 'red' | 'blue' }> = {
    // Round 1 (indices 0-7) -> Round 2 (indices 8-11)
    't16-1': { nextMatchId: 't8-1', side: 'red' },
    't16-2': { nextMatchId: 't8-1', side: 'blue' },
    't16-3': { nextMatchId: 't8-2', side: 'red' },
    't16-4': { nextMatchId: 't8-2', side: 'blue' },
    't16-5': { nextMatchId: 't8-3', side: 'red' },
    't16-6': { nextMatchId: 't8-3', side: 'blue' },
    't16-7': { nextMatchId: 't8-4', side: 'red' },
    't16-8': { nextMatchId: 't8-4', side: 'blue' },
    // Round 2 (indices 8-11) -> Semi-Finals (indices 12-13)
    't8-1': { nextMatchId: 'semi-1', side: 'red' },
    't8-2': { nextMatchId: 'semi-1', side: 'blue' },
    't8-3': { nextMatchId: 'semi-2', side: 'red' },
    't8-4': { nextMatchId: 'semi-2', side: 'blue' },
    // Semi-Finals (indices 12-13) -> Finale (index 14)
    'semi-1': { nextMatchId: 'final-1', side: 'red' },
    'semi-2': { nextMatchId: 'final-1', side: 'blue' },
  };

  const nextInfo = progression[matchId];
  if (nextInfo) {
    const nextMatch = matches.find(m => m.id === nextInfo.nextMatchId);
    if (nextMatch) {
      if (nextInfo.side === 'red') {
        nextMatch.redTeamId = winnerId;
      } else {
        nextMatch.blueTeamId = winnerId;
      }
    }
  }
}

function updateMatchResult(match: Match, votes: Record<string, 'red' | 'blue' | null>, juryCount: number) {
  const voteList = Object.values(votes).filter(v => v !== null && v !== undefined);
  
  const redCount = voteList.filter(v => v === 'red').length;
  const blueCount = voteList.filter(v => v === 'blue').length;

  if (match.votingMode === 'match') {
    match.redVotes = redCount;
    match.blueVotes = blueCount;

    if (voteList.length >= juryCount) {
      match.allVotesCastAt = Date.now();
      match.winnerId = redCount > blueCount ? match.redTeamId : match.blueTeamId;
      advanceWinner(match, tournamentState);
    } else {
      match.allVotesCastAt = undefined;
      match.winnerId = null;
    }
  } else {
    // Round-based voting
    // We update the results for the CURRENT round
    if (voteList.length >= juryCount) {
      // Current round is finished locally in this update
      match.allVotesCastAt = Date.now();
    } else {
      match.allVotesCastAt = undefined;
    }
    
    // The actual "point" addition happens when moving to next round
    // But we can store temporary current round votes if needed
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
  warnedJuries: [],
  configured: false,
  tournamentSize: 16
};

const app = express();
const PORT = 3000;

app.use(express.json());

// --- API Routes ---

app.get("/api/state", (req, res) => {
  try {
    res.json(tournamentState);
  } catch (error) {
    console.error("Error in /api/state:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/admin/warn-juries", (req, res) => {
  // Aliasing warn-juries and warn-judges for compatibility
  try {
    if (!tournamentState.currentMatchId) return res.status(400).json({ error: "Aucun match actif" });
    
    const missingVotes = (tournamentState.juryAccounts || [])
      .filter(j => !tournamentState.juryVotes[j.id])
      .map(j => j.id);
    
    tournamentState.warnedJuries = missingVotes;
    res.json({ success: true, state: tournamentState });
  } catch (error) {
    console.error("Error in /api/admin/warn-juries:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/admin/warn-judges", (req, res) => {
  try {
    if (!tournamentState.currentMatchId) return res.status(400).json({ error: "Aucun match actif" });
    
    const missingVotes = (tournamentState.juryAccounts || [])
      .filter(j => !tournamentState.juryVotes[j.id])
      .map(j => j.id);
    
    tournamentState.warnedJuries = missingVotes;
    res.json({ success: true, state: tournamentState });
  } catch (error) {
    console.error("Error in /api/admin/warn-judges:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/jury/login", (req, res) => {
  const { username, password } = req.body;
  const normalizedUser = (username || "").trim().toLowerCase();
  const normalizedPass = (password || "").trim();

  const jury = tournamentState.juryAccounts.find(j => 
    j.username.trim().toLowerCase() === normalizedUser && 
    j.password.trim() === normalizedPass
  );
  if (jury) {
    res.json({ success: true, juryId: jury.id });
  } else {
    res.status(401).json({ error: "Username ou mot de passe incorrect" });
  }
});

app.post("/api/admin/configure", (req, res) => {
  const { competitionName, competitionLogo, participants, juryAccounts, matches, tournamentSize } = req.body;
  
  const processedMatches = (matches || []).map((m: any, i: number) => ({
    ...m,
    votingMode: m.votingMode || 'match',
    roundCount: m.roundCount || 1,
    currentRound: m.currentRound || 1,
    roundResults: m.roundResults || [],
    redVotes: 0,
    blueVotes: 0,
    winnerId: null,
    status: i === 0 ? 'active' : 'pending',
    finishedJuries: []
  }));

  tournamentState = {
    competitionName: competitionName || "ARENA CHAMPIONSHIP",
    competitionLogo: competitionLogo || "",
    participants: participants || [],
    juryAccounts: juryAccounts || [],
    juryCount: juryAccounts ? juryAccounts.length : 3,
    currentMatchId: processedMatches.length > 0 ? processedMatches[0].id : null,
    matches: processedMatches,
    juryVotes: {},
    warnedJuries: [],
    configured: true,
    tournamentSize: tournamentSize || 16
  };
  
  const active = tournamentState.matches.find(m => m.id === tournamentState.currentMatchId);
  if (active) active.status = 'active';

  res.json({ success: true, state: tournamentState });
});

app.post("/api/admin/confirm-round", (req, res) => {
  const match = tournamentState.matches.find(m => m.id === tournamentState.currentMatchId);
  if (!match || match.status !== 'active') return res.status(400).json({ error: "No active match" });

  const voteList = Object.values(tournamentState.juryVotes).filter(v => v !== null && v !== undefined);
  if (voteList.length < tournamentState.juryCount) {
    return res.status(400).json({ error: "En attente des votes de tous les jurés" });
  }

  const redCount = voteList.filter(v => v === 'red').length;
  const blueCount = voteList.filter(v => v === 'blue').length;

  if (match.votingMode === 'round') {
    // Save current round result
    if (!match.roundResults) match.roundResults = [];
    match.roundResults[match.currentRound - 1] = { red: redCount, blue: blueCount };

    // Update overall score
    if (redCount > blueCount) {
      match.redVotes += 1;
    } else if (blueCount > redCount) {
      match.blueVotes += 1;
    }

    if (match.currentRound < match.roundCount) {
      match.currentRound += 1;
      tournamentState.juryVotes = {}; // Reset for next round
      match.allVotesCastAt = undefined;
    } else {
      // All rounds finished
      if (match.redVotes > match.blueVotes) {
        match.winnerId = match.redTeamId;
      } else if (match.blueVotes > match.redVotes) {
        match.winnerId = match.blueTeamId;
      } else {
        match.winnerId = null; // Absolute tie
      }
      advanceWinner(match, tournamentState);
      // Manual finish required
    }
  }

  res.json({ success: true, state: tournamentState });
});

app.post("/api/admin/reveal", (req, res) => {
  try {
    const { matchId } = req.body;
    const match = (tournamentState.matches || []).find(m => m.id === matchId);
    if (match) {
      match.revealed = true;
      res.json({ success: true, state: tournamentState });
    } else {
      res.status(404).json({ error: "Match non trouvé" });
    }
  } catch (error) {
    console.error("Error in /api/admin/reveal:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/admin/cancel-match", (req, res) => {
  try {
    tournamentState.currentMatchId = null;
    tournamentState.juryVotes = {};
    tournamentState.warnedJuries = [];
    tournamentState.matches = (tournamentState.matches || []).map(m => {
      if (m.status === 'active') {
        return { ...m, status: 'pending', revealed: false, allVotesCastAt: null };
      }
      return m;
    });
    res.json({ success: true, state: tournamentState });
  } catch (error) {
    console.error("Error in /api/admin/cancel-match:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/admin/finish-match", (req, res) => {
  const match = tournamentState.matches.find(m => m.id === tournamentState.currentMatchId);
  if (match) {
    match.status = 'finished';
    advanceWinner(match, tournamentState);
    res.json({ success: true, state: tournamentState });
  } else {
    res.status(404).json({ error: "Aucun match actif" });
  }
});

app.post("/api/admin/select-match", (req, res) => {
  const { matchId } = req.body;
  const match = tournamentState.matches.find(m => m.id === matchId);
  if (match) {
    // Finish current if exists
    const current = tournamentState.matches.find(m => m.id === tournamentState.currentMatchId);
    if (current && current.status !== 'finished') current.status = 'finished';

    tournamentState.currentMatchId = matchId;
    match.status = 'active';
    match.finishedJuries = [];
    tournamentState.juryVotes = {};
    tournamentState.warnedJuries = [];
    res.json({ success: true, state: tournamentState });
  } else {
    res.status(404).json({ error: "Match non trouvé" });
  }
});

app.post("/api/admin/next-match", (req, res) => {
  const activeIdx = tournamentState.matches.findIndex(m => m.id === tournamentState.currentMatchId);
  if (activeIdx !== -1) {
    const match = tournamentState.matches[activeIdx];
    match.status = 'finished';
    advanceWinner(match, tournamentState);
    const next = tournamentState.matches.find((m, i) => i > activeIdx && m.status === 'pending');
    if (next) {
      tournamentState.currentMatchId = next.id;
      next.status = 'active';
      next.finishedJuries = [];
      tournamentState.juryVotes = {}; 
      tournamentState.warnedJuries = [];
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
  
  // Clear warning if they voted
  tournamentState.warnedJuries = tournamentState.warnedJuries.filter(id => id !== juryId);
  
  const match = tournamentState.matches.find(m => m.id === tournamentState.currentMatchId);
  if (match) {
    updateMatchResult(match, tournamentState.juryVotes, tournamentState.juryCount);
  }

  res.json({ success: true, state: tournamentState });
});

app.post("/api/jury/finalize", (req, res) => {
  const { juryId, matchId } = req.body;
  const match = tournamentState.matches.find(m => m.id === matchId);
  if (match) {
    if (!match.finishedJuries) match.finishedJuries = [];
    if (!match.finishedJuries.includes(juryId)) {
      match.finishedJuries.push(juryId);
    }
    res.json({ success: true, state: tournamentState });
  } else {
    res.status(404).json({ error: "Match non trouvé" });
  }
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
    warnedJuries: [],
    configured: false,
    tournamentSize: 16
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
