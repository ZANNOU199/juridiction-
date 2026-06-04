/*
  Warnings:

  - You are about to drop the column `tournamentId` on the `JuryAccount` table. All the data in the column will be lost.
  - You are about to drop the column `tournamentId` on the `JuryVote` table. All the data in the column will be lost.
  - You are about to drop the column `allVotesCastAt` on the `Match` table. All the data in the column will be lost.
  - Added the required column `eventId` to the `JuryAccount` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category` to the `Tournament` table without a default value. This is not possible if the table is not empty.
  - Added the required column `eventId` to the `Tournament` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Participant_tournamentId_name_key";

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventName" TEXT NOT NULL,
    "eventSlug" TEXT NOT NULL,
    "eventLogo" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_JuryAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JuryAccount_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_JuryAccount" ("createdAt", "id", "password", "updatedAt", "username") SELECT "createdAt", "id", "password", "updatedAt", "username" FROM "JuryAccount";
DROP TABLE "JuryAccount";
ALTER TABLE "new_JuryAccount" RENAME TO "JuryAccount";
CREATE UNIQUE INDEX "JuryAccount_eventId_username_key" ON "JuryAccount"("eventId", "username");
CREATE TABLE "new_JuryVote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "juryId" TEXT NOT NULL,
    "vote" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JuryVote_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JuryVote_juryId_fkey" FOREIGN KEY ("juryId") REFERENCES "JuryAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_JuryVote" ("createdAt", "id", "juryId", "matchId", "updatedAt", "vote") SELECT "createdAt", "id", "juryId", "matchId", "updatedAt", "vote" FROM "JuryVote";
DROP TABLE "JuryVote";
ALTER TABLE "new_JuryVote" RENAME TO "JuryVote";
CREATE UNIQUE INDEX "JuryVote_matchId_juryId_key" ON "JuryVote"("matchId", "juryId");
CREATE TABLE "new_Match" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "redTeamId" TEXT NOT NULL,
    "blueTeamId" TEXT NOT NULL,
    "redVotes" INTEGER NOT NULL DEFAULT 0,
    "blueVotes" INTEGER NOT NULL DEFAULT 0,
    "winnerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "round" TEXT NOT NULL DEFAULT '',
    "votingMode" TEXT NOT NULL DEFAULT 'match',
    "roundCount" INTEGER NOT NULL DEFAULT 1,
    "currentRound" INTEGER NOT NULL DEFAULT 1,
    "roundResults" TEXT NOT NULL DEFAULT '[]',
    "revealed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Match_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Match" ("blueTeamId", "blueVotes", "createdAt", "currentRound", "id", "redTeamId", "redVotes", "revealed", "round", "roundCount", "roundResults", "status", "tournamentId", "updatedAt", "votingMode", "winnerId") SELECT "blueTeamId", "blueVotes", "createdAt", "currentRound", "id", "redTeamId", "redVotes", "revealed", "round", "roundCount", "roundResults", "status", "tournamentId", "updatedAt", "votingMode", "winnerId" FROM "Match";
DROP TABLE "Match";
ALTER TABLE "new_Match" RENAME TO "Match";
CREATE TABLE "new_Tournament" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "competitionName" TEXT NOT NULL DEFAULT 'ARENA CHAMPIONSHIP',
    "competitionLogo" TEXT NOT NULL DEFAULT '',
    "configured" BOOLEAN NOT NULL DEFAULT false,
    "tournamentSize" INTEGER NOT NULL DEFAULT 16,
    "currentMatchId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tournament_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Tournament" ("competitionLogo", "competitionName", "configured", "createdAt", "currentMatchId", "id", "tournamentSize", "updatedAt") SELECT "competitionLogo", "competitionName", "configured", "createdAt", "currentMatchId", "id", "tournamentSize", "updatedAt" FROM "Tournament";
DROP TABLE "Tournament";
ALTER TABLE "new_Tournament" RENAME TO "Tournament";
CREATE UNIQUE INDEX "Tournament_eventId_category_key" ON "Tournament"("eventId", "category");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Event_eventSlug_key" ON "Event"("eventSlug");
