import * as db from "../server/db.js";

/**
 * Script de seed pour remplir la base de données avec des données de test
 * Usage: npx tsx scripts/seed.ts
 */

async function main() {
  console.log("🌱 Seeding database...");

  // Create or get a tournament for "Arena Championship" event with "B-BOY" category
  const tournament = await db.createOrGetTournament("arenachampionship", "B-BOY");
  if (!tournament?.id) {
    throw new Error("Failed to create tournament");
  }

  const tournamentId = tournament.id;
  console.log(`✅ Tournament created: ${tournamentId}`);

  // Create participants
  const participants = [
    { id: "p-1", name: "B-BOY ALPHA", photo: "", countryCode: "FR", countryName: "France", countryFlag: "🇫🇷" },
    { id: "p-2", name: "B-BOY BETA", photo: "", countryCode: "JP", countryName: "Japan", countryFlag: "🇯🇵" },
    { id: "p-3", name: "B-BOY GAMMA", photo: "", countryCode: "US", countryName: "USA", countryFlag: "🇺🇸" },
    { id: "p-4", name: "B-BOY DELTA", photo: "", countryCode: "KR", countryName: "Korea", countryFlag: "🇰🇷" },
  ];

  // Create jury accounts
  const juryAccounts = [
    { username: "judge1", password: "password1" },
    { username: "judge2", password: "password2" },
    { username: "judge3", password: "password3" },
  ];

  // Create matches
  const matches = [
    { id: "m-1", redTeamId: "p-1", blueTeamId: "p-2", round: "Semifinals 1" },
    { id: "m-2", redTeamId: "p-3", blueTeamId: "p-4", round: "Semifinals 2" },
  ];

  // Configure tournament
  const state = await db.configureTournament(tournamentId, {
    competitionName: "ARENA CHAMPIONSHIP",
    competitionLogo: "",
    participants,
    juryAccounts,
    matches,
    tournamentSize: 16,
  });

  console.log("✅ Tournament configured with:");
  console.log(`   - ${state?.participants?.length || 0} participants`);
  console.log(`   - ${state?.juryAccounts?.length || 0} jury members`);
  console.log(`   - ${state?.matches?.length || 0} matches`);
  console.log("");
  console.log("🎯 Jury Credentials:");
  juryAccounts.forEach((j) => {
    console.log(`   - ${j.username} / ${j.password}`);
  });
  console.log("");
  console.log("✨ Seeding complete!");
}

main().catch((error) => {
  console.error("❌ Seeding failed:", error);
  process.exit(1);
});
