import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { OAuth2Client } from "google-auth-library";
import multer from "multer";
import * as db from "./server/db.js";
import { uploadToR2 } from "./server/r2.js";

const app = express();
const PORT = 3000;

// Google OAuth Client
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Authorized admin emails (stored in memory, can be extended to database)
let authorizedEmails: string[] = ["zannoharry@gmail.com"];

// Middleware
app.use(express.json());

// Multer configuration for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
  fileFilter: (req, file, cb) => {
    // Allow images and videos
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
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    // Upload to R2
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

// --- Tournament State ---
app.get("/api/:eventSlug/:category/state", async (req, res) => {
  try {
    const { eventSlug, category } = req.params;
    const tournament = await db.getTournamentStateForEvent(eventSlug, category);
    if (!tournament) {
      return res.status(404).json({ error: "Event or tournament not found" });
    }
    res.json(tournament);
  } catch (error) {
    console.error("Error in /api/:eventSlug/:category/state:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- Get All Categories Champions (for finals display) ---
app.get("/api/:eventSlug/all-categories-champions", async (req, res) => {
  try {
    const { eventSlug } = req.params;
    const championsData = await db.getAllCategoriesChampions(eventSlug);
    if (!championsData) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.json(championsData);
  } catch (error) {
    console.error("Error in /api/:eventSlug/all-categories-champions:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// --- Events ---
app.get("/api/events", async (req, res) => {
  try {
    const events = await db.getAllEvents();
    res.json(events);
  } catch (error) {
    console.error("Error in /api/events:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/events/:eventSlug", async (req, res) => {
  try {
    const { eventSlug } = req.params;
    const event = await db.getEventBySlug(eventSlug);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.json(event);
  } catch (error) {
    console.error("Error in /api/events/:eventSlug:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- Preselection Criteria ---
app.get("/api/preselection/:eventSlug", async (req, res) => {
  try {
    const { eventSlug } = req.params;
    const criteria = await db.getPreselectionCriteriaForEvent(eventSlug);
    res.json({ criteria });
  } catch (error) {
    console.error("Error in /api/preselection/:eventSlug:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/preselection/:eventSlug", async (req, res) => {
  try {
    const { eventSlug } = req.params;
    const { criteria } = req.body;
    if (!Array.isArray(criteria)) {
      return res.status(400).json({ error: "Criteria must be an array" });
    }

    const savedCriteria = await db.savePreselectionCriteriaForEvent(eventSlug, criteria);
    res.json({ success: true, criteria: savedCriteria });
  } catch (error) {
    console.error("Error in /api/preselection/:eventSlug:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- Get Selected Category (for multi-browser sync) ---
app.get("/api/:eventSlug/selected-category", async (req, res) => {
  try {
    const { eventSlug } = req.params;
    const category = await db.getSelectedCategory(eventSlug);
    res.json({ category });
  } catch (error) {
    console.error("Error in /api/:eventSlug/selected-category:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- Update Selected Category (for multi-browser sync) ---
app.post("/api/:eventSlug/select-category", async (req, res) => {
  try {
    const { eventSlug } = req.params;
    const { category } = req.body;
    if (!category) {
      return res.status(400).json({ error: "Category is required" });
    }
    await db.updateSelectedCategory(eventSlug, category);
    res.json({ success: true, category });
  } catch (error) {
    console.error("Error in /api/:eventSlug/select-category:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- Create Event ---
app.post("/api/events/create", async (req, res) => {
  try {
    const { eventName, eventLogo, category } = req.body;
    if (!eventName || !eventName.trim()) {
      return res.status(400).json({ error: "Event name is required" });
    }

    const slug = eventName
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9]/g, "");

    // Create or get event with proper eventName
    const event = await db.getOrCreateEventWithName(eventName, slug, eventLogo || "");
    
    // Create tournament for first category
    const tournament = await db.createOrGetTournamentWithEventName(slug, category, eventName, eventLogo || "");
    
    res.json(tournament);
  } catch (error) {
    console.error("Error in /api/events/create:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- Jury Login ---
app.post("/api/jury/:eventSlug/login", async (req, res) => {
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
    console.error("Error in /api/jury/:eventSlug/login:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- Admin Configure Tournament ---
app.post("/api/admin/:eventSlug/:category/configure", async (req, res) => {
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
    console.error("Error in /api/admin/:eventSlug/:category/configure:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- Admin Update Participants Only (without affecting matches) ---
app.post("/api/admin/:eventSlug/:category/update-participants", async (req, res) => {
  try {
    const { eventSlug, category } = req.params;
    const { participants } = req.body;

    const tournament = await db.createOrGetTournament(eventSlug, category);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not created" });
    }

    // Update only participants without touching matches
    await db.updateParticipantsOnly(tournament.id, participants || []);
    const state = await db.getTournamentState(tournament.id);

    res.json({ success: true, state });
  } catch (error) {
    console.error("Error in /api/admin/:eventSlug/:category/update-participants:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- Jury Voting ---
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

// --- Admin Actions ---
app.post("/api/admin/:eventSlug/:category/warn-juries", async (req, res) => {
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
    console.error("Error in warn-juries:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/admin/:eventSlug/:category/confirm-round", async (req, res) => {
  try {
    const { eventSlug, category } = req.params;
    const tournament = await db.createOrGetTournament(eventSlug, category);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }
    
    const state = await db.confirmRound(tournament.id);
    res.json({ success: true, state });
  } catch (error) {
    console.error("Error in confirm-round:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/admin/:eventSlug/:category/reveal", async (req, res) => {
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
    console.error("Error in reveal:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/admin/:eventSlug/:category/finish-match", async (req, res) => {
  try {
    const { eventSlug, category } = req.params;
    const tournament = await db.createOrGetTournament(eventSlug, category);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }
    
    const state = await db.finishMatch(tournament.id);
    res.json({ success: true, state });
  } catch (error) {
    console.error("Error in finish-match:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/admin/:eventSlug/:category/select-match", async (req, res) => {
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
    console.error("Error in select-match:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/admin/:eventSlug/:category/reset", async (req, res) => {
  try {
    const { eventSlug, category } = req.params;
    const tournament = await db.createOrGetTournament(eventSlug, category);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }
    
    const state = await db.resetTournament(tournament.id);
    res.json({ success: true, state });
  } catch (error) {
    console.error("Error in reset:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- Jury Finalize (end voting on a match) ---
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

// --- Admin Cancel Match ---
app.post("/api/admin/:eventSlug/:category/cancel-match", async (req, res) => {
  try {
    const { eventSlug, category } = req.params;
    const tournament = await db.createOrGetTournament(eventSlug, category);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }
    
    const state = await db.cancelMatch(tournament.id);
    res.json({ success: true, state });
  } catch (error) {
    console.error("Error in cancel-match:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- Admin Next Match ---
app.post("/api/admin/:eventSlug/:category/next-match", async (req, res) => {
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

// --- Delete Event ---
app.delete("/api/admin/:eventSlug", async (req, res) => {
  try {
    const { eventSlug } = req.params;
    const success = await db.deleteEvent(eventSlug);
    if (!success) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.json({ success: true, message: "Event deleted" });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- Delete Category ---
app.delete("/api/admin/:eventSlug/:category", async (req, res) => {
  try {
    const { eventSlug, category } = req.params;
    const success = await db.deleteCategory(eventSlug, category);
    if (!success) {
      return res.status(404).json({ error: "Category not found" });
    }
    res.json({ success: true, message: "Category deleted" });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ===== JURY MANAGEMENT =====

// --- Get Jury Accounts ---
app.get("/api/jury-accounts/:eventSlug", async (req, res) => {
  try {
    const { eventSlug } = req.params;
    const juries = await db.getJuryAccounts(eventSlug);
    res.json(juries);
  } catch (error) {
    console.error("Error fetching jury accounts:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- Create Jury Account ---
app.post("/api/jury-accounts/:eventSlug", async (req, res) => {
  try {
    const { eventSlug } = req.params;
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const jury = await db.createJuryAccount(eventSlug, username, password);
    res.json(jury);
  } catch (error: any) {
    console.error("Error creating jury account:", error);
    if (error.message.includes("already exists")) {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- Delete Jury Account ---
app.delete("/api/jury-accounts/:eventSlug/:juryId", async (req, res) => {
  try {
    const { eventSlug, juryId } = req.params;
    const success = await db.deleteJuryAccount(eventSlug, juryId);
    if (!success) {
      return res.status(404).json({ error: "Jury not found" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting jury account:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- Get Jury Assignments ---
app.get("/api/jury-assignments/:eventSlug", async (req, res) => {
  try {
    const { eventSlug } = req.params;
    const assignments = await db.getJuryAssignments(eventSlug);
    res.json(assignments);
  } catch (error) {
    console.error("Error fetching jury assignments:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- Assign Jury to Tournament ---
app.post("/api/jury-assignments/:eventSlug/:tournamentId/:juryId", async (req, res) => {
  try {
    const { tournamentId, juryId } = req.params;
    
    await db.assignJuryToTournament(tournamentId, juryId);

    // Return updated assignments for this tournament
    const assignments = await db.getJuryAssignments(req.params.eventSlug);
    res.json(assignments[tournamentId] || []);
  } catch (error) {
    console.error("Error assigning jury:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- Remove Jury from Tournament ---
app.delete("/api/jury-assignments/:eventSlug/:tournamentId/:juryId", async (req, res) => {
  try {
    const { tournamentId, juryId } = req.params;
    
    await db.removeJuryFromTournament(tournamentId, juryId);
    res.json({ success: true });
  } catch (error) {
    console.error("Error removing jury assignment:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ===== GOOGLE AUTH ROUTES =====

// Verify Google Token
app.post("/api/auth/verify-google", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload?.email || "";

    // Check if email is authorized
    const authorized = authorizedEmails.includes(email);

    res.json({
      success: true,
      authorized,
      email,
    });
  } catch (error) {
    console.error("Error verifying Google token:", error);
    res.status(401).json({ error: "Invalid token" });
  }
});

// Get authorized emails
app.get("/api/auth/authorized-emails", (req, res) => {
  res.json({ emails: authorizedEmails });
});

// Add authorized email
app.post("/api/auth/add-email", (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ error: "Email is required" });
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!authorizedEmails.includes(trimmedEmail)) {
      authorizedEmails.push(trimmedEmail);
    }

    res.json({ success: true, emails: authorizedEmails });
  } catch (error) {
    console.error("Error adding email:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Remove authorized email
app.post("/api/auth/remove-email", (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ error: "Email is required" });
    }

    const trimmedEmail = email.trim().toLowerCase();
    // Prevent removing the last email
    if (authorizedEmails.length <= 1) {
      return res.status(400).json({ error: "Cannot remove the last email" });
    }

    authorizedEmails = authorizedEmails.filter(
      (e) => e.toLowerCase() !== trimmedEmail
    );

    res.json({ success: true, emails: authorizedEmails });
  } catch (error) {
    console.error("Error removing email:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ===== VITE & STATIC FILES =====

async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
}

// ===== START SERVER =====

async function startServer() {
  try {
    // Setup Vite
    await setupVite();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
      console.log(`📊 Database: ${process.env.DATABASE_URL}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== "production") {
  startServer();
} else {
  setupVite().then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
    });
  });
}

export default app;
