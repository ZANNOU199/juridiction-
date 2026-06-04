-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "competitionName" TEXT NOT NULL DEFAULT 'ARENA CHAMPIONSHIP',
    "competitionLogo" TEXT NOT NULL DEFAULT '',
    "tournamentSize" INTEGER NOT NULL DEFAULT 16,
    "configured" BOOLEAN NOT NULL DEFAULT false,
    "currentMatchId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "photo" TEXT NOT NULL DEFAULT '',
    "countryCode" TEXT NOT NULL DEFAULT '',
    "countryName" TEXT NOT NULL DEFAULT '',
    "countryFlag" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Participant_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JuryAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JuryAccount_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Match" (
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
    "allVotesCastAt" BIGINT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Match_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JuryVote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "juryId" TEXT NOT NULL,
    "vote" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JuryVote_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JuryVote_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JuryVote_juryId_fkey" FOREIGN KEY ("juryId") REFERENCES "JuryAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WarnedJury" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "juryId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WarnedJury_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WarnedJury_juryId_fkey" FOREIGN KEY ("juryId") REFERENCES "JuryAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FinalizedMatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "juryId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinalizedMatch_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FinalizedMatch_juryId_fkey" FOREIGN KEY ("juryId") REFERENCES "JuryAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Participant_tournamentId_name_key" ON "Participant"("tournamentId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "JuryAccount_tournamentId_username_key" ON "JuryAccount"("tournamentId", "username");

-- CreateIndex
CREATE UNIQUE INDEX "Match_tournamentId_id_key" ON "Match"("tournamentId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "JuryVote_matchId_juryId_key" ON "JuryVote"("matchId", "juryId");

-- CreateIndex
CREATE UNIQUE INDEX "WarnedJury_tournamentId_juryId_key" ON "WarnedJury"("tournamentId", "juryId");

-- CreateIndex
CREATE UNIQUE INDEX "FinalizedMatch_matchId_juryId_key" ON "FinalizedMatch"("matchId", "juryId");
