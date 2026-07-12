import { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import * as db from "../server/db.js";
import { uploadToR2 } from "../server/r2.js";
import multer from "multer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(express.json());

// ===== DYNAMIC MANIFEST ENDPOINT =====
app.get("/manifest", (req, res) => {
  const pathname = req.query.path as string || "/";
  let manifestConfig: any = {
    display: "standalone",
    orientation: "portrait-primary",
    theme_color: "#FF8C00",
    background_color: "#050502",
    icons: [
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
    ],
    categories: ["sports", "productivity"],
  };

  // Determine manifest type based on pathname
  if (pathname.startsWith("/jury")) {
    manifestConfig.name = "Jury Console";
    manifestConfig.short_name = "JURY";
    manifestConfig.description = "Jury voting and judging console";
    manifestConfig.start_url = pathname; // Use the actual current path
    manifestConfig.scope = "/jury";
  } else if (pathname.startsWith("/admin")) {
    manifestConfig.name = "Systeme de Juridiction - Admin Console";
    manifestConfig.short_name = "ADMIN";
    manifestConfig.description = "Tournament administration and control";
    manifestConfig.start_url = pathname;
    manifestConfig.scope = "/admin";
  } else {
    manifestConfig.name = "Systeme de Juridiction - Official Judging System";
    manifestConfig.short_name = "ARENA";
    manifestConfig.description = "Professional tournament judging and voting system";
    manifestConfig.start_url = "/";
    manifestConfig.scope = "/";
  }

  res.setHeader("Content-Type", "application/manifest+json");
  res.json(manifestConfig);
});

// Multer configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
});

// ===== UPLOAD ENDPOINT =====
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }
    const publicUrl = await uploadToR2(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );
    res.json({ success: true, url: publicUrl });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ error: "Failed to upload file" });
  }
});

// ===== API ROUTES =====

// Tournament State
app.get("/:eventSlug/:category/state", async (req, res) => {
  try {
    const { eventSlug, category } = req.params;
    const tournament = await db.getTournamentStateForEvent(eventSlug, category);
    if (!tournament) {
      return res.status(404).json({ error: "Event or tournament not found" });
    }
    res.json(tournament);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get All Categories Champions
app.get("/:eventSlug/all-categories-champions", async (req, res) => {
  try {
    const { eventSlug } = req.params;
    const championsData = await db.getAllCategoriesChampions(eventSlug);
    if (!championsData) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.json(championsData);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Events
app.get("/events", async (req, res) => {
  try {
    const events = await db.getAllEvents();
    res.json(events);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/events/:eventSlug", async (req, res) => {
  try {
    const { eventSlug } = req.params;
    const event = await db.getEventBySlug(eventSlug);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.json(event);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Default State (for polling)
app.get("/state", async (req, res) => {
  try {
    const { eventSlug, category } = req.query;
    if (eventSlug && category) {
      const tournament = await db.getTournamentStateForEvent(eventSlug as string, category as string);
      if (tournament) {
        return res.json(tournament);
      }
    }
    // Return default empty state if no params or not found
    res.json({
      matches: [],
      participants: [],
      juryAccounts: [],
      currentMatchId: null,
      revealedMatches: {},
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Preselection criteria
app.get("/preselection/:eventSlug", async (req, res) => {
  try {
    const { eventSlug } = req.params;
    const criteria = await db.getPreselectionCriteriaForEvent(eventSlug);
    res.json({ criteria });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/preselection/:eventSlug/scores", async (req, res) => {
  try {
    const { eventSlug } = req.params;
    const scores = await db.getPreselectionScoresForEvent(eventSlug);
    res.json({ scores });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Preselection mode (active flag + current index)
app.get("/preselection/:eventSlug/mode", async (req, res) => {
  try {
    const { eventSlug } = req.params;
    const mode = await db.getPreselectionModeForEvent(eventSlug);
    res.json(mode);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/preselection/:eventSlug/mode", async (req, res) => {
  try {
    const { eventSlug } = req.params;
    const { active } = req.body;
    if (typeof active !== "boolean") {
      return res.status(400).json({ error: "active must be boolean" });
    }
    const mode = await db.setPreselectionModeForEvent(eventSlug, active);
    res.json({ success: true, ...mode });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/preselection/:eventSlug/reset", async (req, res) => {
  try {
    const { eventSlug } = req.params;
    const result = await db.resetPreselectionForEvent(eventSlug);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/preselection/:eventSlug/current", async (req, res) => {
  try {
    const { eventSlug } = req.params;
    const mode = await db.getPreselectionModeForEvent(eventSlug);
    res.json({ currentIndex: mode.currentIndex });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/preselection/:eventSlug/current", async (req, res) => {
  try {
    const { eventSlug } = req.params;
    const { index } = req.body;
    if (typeof index !== "number") {
      return res.status(400).json({ error: "index must be a number" });
    }
    const mode = await db.setPreselectionCurrentIndexForEvent(eventSlug, index);
    res.json({ success: true, currentIndex: mode.currentIndex });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/preselection/:eventSlug", async (req, res) => {
  try {
    const { eventSlug } = req.params;
    const { criteria } = req.body;
    if (!Array.isArray(criteria)) {
      return res.status(400).json({ error: "Criteria must be an array" });
    }

    const savedCriteria = await db.savePreselectionCriteriaForEvent(eventSlug, criteria);
    res.json({ success: true, criteria: savedCriteria });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/preselection/:eventSlug/scores", async (req, res) => {
  try {
    const { eventSlug } = req.params;
    const { scores } = req.body;

    const savedScores = await db.savePreselectionScoresForEvent(eventSlug, scores);
    res.json({ success: true, scores: savedScores });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Return flattened saved scores for admin checks
app.get("/preselection/:eventSlug/scores-flat", async (req, res) => {
  try {
    const { eventSlug } = req.params;
    const scores = await db.getPreselectionScoresForEvent(eventSlug);
    res.json({ scores });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Selected Category
app.get("/:eventSlug/selected-category", async (req, res) => {
  try {
    const { eventSlug } = req.params;
    const category = await db.getSelectedCategory(eventSlug);
    res.json({ category });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/:eventSlug/select-category", async (req, res) => {
  try {
    const { eventSlug } = req.params;
    const { category } = req.body;
    if (!category) {
      return res.status(400).json({ error: "Category is required" });
    }
    await db.updateSelectedCategory(eventSlug, category);
    res.json({ success: true, category });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// All Categories for Shared Screen
app.get("/:eventSlug/categories", async (req, res) => {
  try {
    const { eventSlug } = req.params;
    const categories = await db.getAllCategoriesForEvent(eventSlug);
    if (!categories || categories.length === 0) {
      return res.status(404).json({ error: "No categories found" });
    }
    res.json(categories);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get Shared Screen Mode
app.get("/:eventSlug/shared-screen-mode", async (req, res) => {
  try {
    const { eventSlug } = req.params;
    const sharedScreenMode = await db.getSharedScreenMode(eventSlug);
    res.json({ sharedScreenMode });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Set Shared Screen Mode
app.post("/:eventSlug/shared-screen-mode", async (req, res) => {
  try {
    const { eventSlug } = req.params;
    const { mode } = req.body;
    if (typeof mode !== "boolean") {
      return res.status(400).json({ error: "Mode must be a boolean" });
    }
    await db.setSharedScreenMode(eventSlug, mode);
    res.json({ success: true, sharedScreenMode: mode });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Create Event
app.post("/events/create", async (req, res) => {
  try {
    const { eventName, eventLogo, category } = req.body;
    if (!eventName || !eventName.trim()) {
      return res.status(400).json({ error: "Event name is required" });
    }
    const slug = eventName
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9]/g, "");
    const event = await db.getOrCreateEventWithName(eventName, slug, eventLogo || "");
    const tournament = await db.createOrGetTournamentWithEventName(slug, category, eventName, eventLogo || "");
    res.json(tournament);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Jury Login
app.post("/jury/:eventSlug/login", async (req, res) => {
  try {
    const { eventSlug } = req.params;
    const { username, password } = req.body;
    const jury = await db.authenticateJury(eventSlug, username, password);
    if (jury) {
      res.json({ success: true, juryId: jury.id });
    } else {
      res.status(401).json({ error: "Username ou mot de passe incorrect" });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Admin Configure Tournament
app.post("/admin/:eventSlug/:category/configure", async (req, res) => {
  try {
    const { eventSlug, category } = req.params;
    const { competitionName, competitionLogo, participants, juryAccounts, matches, tournamentSize } = req.body;
    const tournament = await db.createOrGetTournament(eventSlug, category);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not created" });
    }
    const state = await db.configureTournament(tournament.id, {
      competitionName: competitionName || "Systeme de Juridiction",
      competitionLogo: competitionLogo || "",
      participants: participants || [],
      juryAccounts: juryAccounts || [],
      matches: matches || [],
      tournamentSize: tournamentSize || 16,
    });
    res.json({ success: true, state });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Admin Update Participants Only (without affecting matches)
app.post("/admin/:eventSlug/:category/update-participants", async (req, res) => {
  try {
    const { eventSlug, category } = req.params;
    const { participants } = req.body;
    const tournament = await db.createOrGetTournament(eventSlug, category);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not created" });
    }
    const state = await db.updateParticipantsOnly(tournament.id, participants || []);
    res.json({ success: true, state });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Admin Rename Category
app.put("/admin/:eventSlug/:category/rename", async (req, res) => {
  try {
    const { eventSlug, category } = req.params;
    const { category: newCategory } = req.body;
    if (!newCategory) {
      return res.status(400).json({ error: "New category is required" });
    }

    await db.renameCategory(eventSlug, category, newCategory);
    res.json({ success: true, category: newCategory });
  } catch (error) {
    console.error("Error:", error);
    if ((error as Error).message === "Category already exists") {
      return res.status(409).json({ error: "Category already exists" });
    }
    if ((error as Error).message === "Category not found") {
      return res.status(404).json({ error: "Category not found" });
    }
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Jury Voting
app.post("/:eventSlug/:category/vote", async (req, res) => {
  try {
    const { matchId, juryId, vote } = req.body;
    await db.castVote(matchId, juryId, vote);
    const tournament = await db.createOrGetTournament(req.params.eventSlug, req.params.category);
    const state = await db.getTournamentState(tournament.id);
    res.json({ success: true, state });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Admin Actions
app.post("/admin/:eventSlug/:category/warn-juries", async (req, res) => {
  try {
    const { eventSlug, category } = req.params;
    const tournament = await db.createOrGetTournament(eventSlug, category);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }
    await db.warnMissingVotes(tournament.id);
    const state = await db.getTournamentState(tournament.id);
    res.json({ success: true, state });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/admin/:eventSlug/:category/confirm-round", async (req, res) => {
  try {
    const { eventSlug, category } = req.params;
    const tournament = await db.createOrGetTournament(eventSlug, category);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }
    const state = await db.confirmRound(tournament.id);
    res.json({ success: true, state });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/admin/:eventSlug/:category/reveal", async (req, res) => {
  try {
    const { eventSlug, category } = req.params;
    const { matchId } = req.body;
    const tournament = await db.createOrGetTournament(eventSlug, category);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }
    const state = await db.revealMatch(tournament.id, matchId);
    res.json({ success: true, state });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/admin/:eventSlug/:category/finish-match", async (req, res) => {
  try {
    const { eventSlug, category } = req.params;
    const tournament = await db.createOrGetTournament(eventSlug, category);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }
    const state = await db.finishMatch(tournament.id);
    res.json({ success: true, state });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/admin/:eventSlug/:category/select-match", async (req, res) => {
  try {
    const { eventSlug, category } = req.params;
    const { matchId } = req.body;
    const tournament = await db.createOrGetTournament(eventSlug, category);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }
    const state = await db.selectMatch(tournament.id, matchId);
    res.json({ success: true, state });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/admin/:eventSlug/:category/reset", async (req, res) => {
  try {
    const { eventSlug, category } = req.params;
    const tournament = await db.createOrGetTournament(eventSlug, category);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }
    const state = await db.resetTournament(tournament.id);
    res.json({ success: true, state });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/:eventSlug/:category/finalize", async (req, res) => {
  try {
    const { eventSlug, category } = req.params;
    const { juryId, matchId } = req.body;
    const tournament = await db.createOrGetTournament(eventSlug, category);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }
    const state = await db.finalizeJury(tournament.id, juryId, matchId);
    res.json({ success: true, state });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/admin/:eventSlug/:category/cancel-match", async (req, res) => {
  try {
    const { eventSlug, category } = req.params;
    const tournament = await db.createOrGetTournament(eventSlug, category);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }
    const state = await db.cancelMatch(tournament.id);
    res.json({ success: true, state });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/admin/:eventSlug/:category/next-match", async (req, res) => {
  try {
    const { eventSlug, category } = req.params;
    const tournament = await db.createOrGetTournament(eventSlug, category);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }
    const state = await db.nextMatch(tournament.id);
    res.json({ success: true, state });
  } catch (error) {
    console.error("Error in next-match:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.delete("/admin/:eventSlug", async (req, res) => {
  try {
    const { eventSlug } = req.params;
    const success = await db.deleteEvent(eventSlug);
    if (!success) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.json({ success: true, message: "Event deleted" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.delete("/admin/:eventSlug/:category", async (req, res) => {
  try {
    const { eventSlug, category } = req.params;
    const success = await db.deleteCategory(eventSlug, category);
    if (!success) {
      return res.status(404).json({ error: "Category not found" });
    }
    res.json({ success: true, message: "Category deleted" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Jury Management
app.get("/jury-accounts/:eventSlug", async (req, res) => {
  try {
    const { eventSlug } = req.params;
    const juries = await db.getJuryAccounts(eventSlug);
    res.json(juries);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/jury-accounts/:eventSlug", async (req, res) => {
  try {
    const { eventSlug } = req.params;
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }
    const jury = await db.createJuryAccount(eventSlug, username, password);
    res.json(jury);
  } catch (error: any) {
    console.error("Error:", error);
    if (error.message.includes("already exists")) {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.delete("/jury-accounts/:eventSlug/:juryId", async (req, res) => {
  try {
    const { eventSlug, juryId } = req.params;
    const success = await db.deleteJuryAccount(eventSlug, juryId);
    if (!success) {
      return res.status(404).json({ error: "Jury not found" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/jury-assignments/:eventSlug", async (req, res) => {
  try {
    const { eventSlug } = req.params;
    const assignments = await db.getJuryAssignments(eventSlug);
    res.json(assignments);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/jury-assignments/:eventSlug/:tournamentId/:juryId", async (req, res) => {
  try {
    const { tournamentId, juryId } = req.params;
    await db.assignJuryToTournament(tournamentId, juryId);
    const assignments = await db.getJuryAssignments(req.params.eventSlug);
    res.json(assignments[tournamentId] || []);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.delete("/jury-assignments/:eventSlug/:tournamentId/:juryId", async (req, res) => {
  try {
    const { tournamentId, juryId } = req.params;
    await db.removeJuryFromTournament(tournamentId, juryId);
    res.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/admin/:eventSlug/reveal-all", async (req, res) => {
  try {
    const { eventSlug } = req.params;
    
    // Get all categories for this event
    const categories = await db.getAllCategoriesForEvent(eventSlug);
    if (!categories || categories.length === 0) {
      return res.status(404).json({ error: "No categories found" });
    }
    
    // Reveal all FINALE matches for each category
    for (const category of categories) {
      try {
        const tournament = await db.createOrGetTournament(eventSlug, category);
        if (tournament) {
          // Find the FINALE match
          const state = await db.getTournamentState(tournament.id);
          if (state && state.matches) {
            const finaleMatch = state.matches.find((m: any) => m.round === "FINALE");
            if (finaleMatch && !finaleMatch.revealed) {
              await db.revealMatch(tournament.id, finaleMatch.id);
            }
          }
        }
      } catch (error) {
        console.error(`Failed to reveal FINALE for category ${category}:`, error);
      }
    }
    
    res.json({ success: true, message: "All FINALE matches revealed" });
  } catch (error) {
    console.error("Error in reveal-all:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/admin/:eventSlug/finish-all", async (req, res) => {
  try {
    const { eventSlug } = req.params;
    
    // Get all categories for this event
    const categories = await db.getAllCategoriesForEvent(eventSlug);
    if (!categories || categories.length === 0) {
      return res.status(404).json({ error: "No categories found" });
    }
    
    // Finish all FINALE matches for each category
    for (const category of categories) {
      try {
        const tournament = await db.createOrGetTournament(eventSlug, category);
        if (tournament) {
          // Find the FINALE match
          const state = await db.getTournamentState(tournament.id);
          if (state && state.matches) {
            const finaleMatch = state.matches.find((m: any) => m.round === "FINALE");
            if (finaleMatch && finaleMatch.status !== "finished") {
              await db.finishMatch(tournament.id);
            }
          }
        }
      } catch (error) {
        console.error(`Failed to finish FINALE for category ${category}:`, error);
      }
    }
    
    res.json({ success: true, message: "All FINALE matches finished" });
  } catch (error) {
    console.error("Error in finish-all:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Vercel serverless handler
export default function handler(req: VercelRequest, res: VercelResponse) {
  // Remove /api prefix from the path
  const path = req.url?.replace(/^\/api/, "") || "/";
  req.url = path;
  
  return app(req as any, res as any);
}
