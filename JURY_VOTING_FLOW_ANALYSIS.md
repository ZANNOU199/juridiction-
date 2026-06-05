# Jury Voting Flow Analysis - JUGE System

## OVERVIEW
When a jury member casts a vote, here's exactly what happens and why results appear / match gets marked as finished.

---

## 1. FUNCTION: Casting the Vote (Client-Side)

**Location:** [src/App.tsx](src/App.tsx#L2597) - `castVote` function inside `JuryView` component

```typescript
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
```

**What happens:**
- Makes POST request to `/api/:eventSlug/:category/vote`
- Sends: `{ matchId, juryId, vote }`
- Receives back the updated tournament state
- Updates local state with `onSave(data.state)`
- Sets `isChanging` to false
- **Important:** Jury has NOT finalized yet - they can still change their vote

---

## 2. SERVER ENDPOINT: Vote Handler

**Location:** [server.ts](server.ts#L226) - `/api/:eventSlug/:category/vote` POST endpoint

```typescript
app.post("/api/:eventSlug/:category/vote", async (req, res) => {
  try {
    const { matchId, juryId, vote } = req.body;
    await db.castVote(matchId, juryId, vote);
    const tournament = await db.createOrGetTournament(req.params.eventSlug, req.params.category);
    const state = await db.getTournamentState(tournament.id);
    res.json({ success: true, state });
  } catch (error) {
    console.error("Error in vote:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
```

**What happens:**
1. Calls `db.castVote()` to save the vote to database
2. Fetches the updated tournament state from database
3. Returns the state to the client

---

## 3. DATABASE FUNCTION: Save Vote

**Location:** [server/db.ts](server/db.ts#L513) - `castVote` function

```typescript
export async function castVote(
  matchId: string,
  juryId: string,
  vote: "red" | "blue"
) {
  // Upsert vote - creates new or updates existing
  const juryVote = await prisma.juryVote.upsert({
    where: {
      matchId_juryId: {
        matchId,
        juryId,
      },
    },
    create: {
      matchId,
      juryId,
      vote,
    },
    update: {
      vote,
    },
  });

  // Get the tournament from the match
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { tournamentId: true },
  });

  if (match) {
    // Remove from warned list if they vote
    await prisma.warnedJury.deleteMany({
      where: {
        tournamentId: match.tournamentId,
        juryId,
      },
    });
  }

  return juryVote;
}
```

**What happens:**
1. Creates or updates the juryVote record in the database
2. Removes jury from the "warned" list (if they were warned for not voting)
3. **Does NOT automatically mark match as finished**

---

## 4. FRONTEND: Confirmation UI After Vote

**Location:** [src/App.tsx](src/App.tsx#L2871) - Confirmation overlay in `JuryView`

```typescript
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
          <img src={(myVote === "red" ? redP : blueP)?.countryFlag} alt="Flag" className="w-6 h-4 md:w-9 md:h-6 object-cover border border-white/10 shrink-0" referrerPolicy="no-referrer" />
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
```

**What happens:**
- Shows "VOTE ENREGISTRÉ" (Vote Recorded) message
- Displays the chosen candidate's name and flag
- Shows two buttons:
  1. **VALIDER (Confirm)** - calls `finalizeMatch()`
  2. **Changer (Change)** - allows jury to change their vote before confirming

---

## 5. FUNCTION: Finalize Match (Jury Clicks VALIDER)

**Location:** [src/App.tsx](src/App.tsx#L2557) - `finalizeMatch` function inside `JuryView`

```typescript
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
```

**What happens:**
- Makes POST request to `/api/:eventSlug/:category/finalize`
- Sends: `{ juryId, matchId }`
- Updates state with response
- Returns jury to the matches list view

---

## 6. SERVER ENDPOINT: Finalize Handler

**Location:** [server.ts](server.ts#L374) - `/api/:eventSlug/:category/finalize` POST endpoint

```typescript
app.post("/api/:eventSlug/:category/finalize", async (req, res) => {
  try {
    const { eventSlug, category } = req.params;
    const { juryId, matchId } = req.body;
    const tournament = await db.createOrGetTournament(eventSlug, category);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }
    
    // Mark this jury as finalized and check if all juries have finalized
    const state = await db.finalizeJury(tournament.id, juryId, matchId);
    res.json({ success: true, state });
  } catch (error) {
    console.error("Error in finalize:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
```

**What happens:**
1. Calls `db.finalizeJury()` which:
   - Marks this jury as having finalized for this match
   - Checks if ALL juries have finalized
   - If yes: **Automatically marks match status as "finished"**
   - If no: Match stays "active"
2. Returns updated tournament state

---

## 7. DATABASE FUNCTION: Finalize Jury

**Location:** [server/db.ts](server/db.ts#L898) - `finalizeJury` function

```typescript
export async function finalizeJury(tournamentId: string, juryId: string, matchId: string) {
  // Mark this jury as having finalized their vote for this match
  await prisma.finalizedMatch.upsert({
    where: {
      matchId_juryId: {
        matchId,
        juryId,
      },
    },
    update: {},
    create: {
      matchId,
      juryId,
    },
  });

  // Get the tournament to find out how many juries there are
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      event: {
        include: {
          juryAccounts: true,
        },
      },
    },
  });

  if (!tournament) {
    return await getTournamentState(tournamentId);
  }

  const juryCount = tournament.event.juryAccounts.length;

  // Check if all juries have finalized for this match
  const finalizedCount = await prisma.finalizedMatch.count({
    where: { matchId },
  });

  // If all juries have finalized, mark the match as finished
  if (finalizedCount >= juryCount) {
    await prisma.match.update({
      where: { id: matchId },
      data: { status: "finished" },
    });
  }

  return await getTournamentState(tournamentId);
}
```

**CRITICAL LOGIC - THIS IS WHERE THE MAGIC HAPPENS:**

1. Records that this jury finalized their vote
2. Counts how many juries have finalized: `finalizedCount`
3. Gets the total jury count: `juryCount`
4. **If `finalizedCount >= juryCount`:**
   - Updates the match status from "active" to **"finished"**
   - This happens AUTOMATICALLY when the last jury clicks VALIDER
5. Returns the updated state to all clients polling

---

## 8. STATE THAT GETS RETURNED

**Location:** [server/db.ts](server/db.ts#L176) - `getTournamentState` function

The state includes:
- **juryVotes**: A record of which jury voted for which team (only for current match)
- **matches**: Array of match objects, each including:
  - `status`: "pending", "active", or **"finished"**
  - `finishedJuries`: Array of jury IDs that have finalized
  - `winnerId`: The ID of the winning participant (if match is finished)

```typescript
const matches = sortedMatches.map((m) => ({
  ...m,
  roundResults: JSON.parse(m.roundResults),
  finishedJuries: m.finalizedBy.map((f) => f.juryId),  // <-- Array of finalized jury IDs
}));
```

---

## SUMMARY: WHY RESULTS APPEAR AND MATCH GETS MARKED AS FINISHED

### Vote Cast (Red/Blue Button)
✅ Vote is saved to database
✅ "VOTE ENREGISTRÉ" message shown to jury
❌ Match does NOT automatically finish
❌ Results are NOT revealed

### VALIDER Button Clicked
✅ Jury is marked as finalized
✅ **If all juries finalized:** Match status automatically changes to "finished"
✅ **If all juries finalized:** All clients polling get updated state with `status: "finished"`
✅ Admin can then manually click "REVEAL" to show results on public display

### Automatic Triggers
1. **Match Finishes:** When the LAST jury clicks VALIDER
2. **Results Reveal:** MANUAL - Admin must click "REVEAL" button after all juries finalize
3. **Vote Changes:** Jury can click "Changer" to cast a different vote before clicking VALIDER

### Key State Variables
- `myVote`: The vote this jury has cast (if any)
- `isChanging`: Whether jury is in "change vote" mode
- `finishedJuries`: Array of jury IDs that clicked VALIDER
- `match.status`: "pending" → "active" → **"finished"** (automatic on last VALIDER click)

