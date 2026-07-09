import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  transactionOptions: {
    timeout: 30000,
  },
});

// ===== UTILITY FUNCTIONS =====

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "")
    .replace(/-+/g, "");
}

// ===== EVENT OPERATIONS =====

export async function getEvent(eventSlug: string) {
  return await prisma.event.findUnique({
    where: { eventSlug },
  });
}

export async function getOrCreateEvent(eventName: string) {
  const slug = slugify(eventName);
  
  try {
    // Try to create first - if it fails due to unique constraint, event exists
    const event = await prisma.event.create({
      data: {
        eventName,
        eventSlug: slug,
      },
    });
    return event;
  } catch (error: any) {
    // If unique constraint error, event already exists - fetch it
    if (error?.code === "P2002") {
      const event = await prisma.event.findUnique({
        where: { eventSlug: slug },
      });
      if (event) return event;
    }
    throw error;
  }
}

export async function getOrCreateEventWithName(eventName: string, eventSlug: string, eventLogo: string) {
  const slug = eventSlug || slugify(eventName);
  
  try {
    // Try to create first - if it fails due to unique constraint, event exists
    const event = await prisma.event.create({
      data: {
        eventName,
        eventSlug: slug,
        eventLogo,
      },
    });
    return event;
  } catch (error: any) {
    // If unique constraint error, event already exists - fetch it
    if (error?.code === "P2002") {
      const event = await prisma.event.findUnique({
        where: { eventSlug: slug },
      });
      if (event) return event;
    }
    throw error;
  }
}

export async function createOrGetTournamentWithEventName(eventSlug: string, category: string, eventName: string, eventLogo: string) {
  const event = await getOrCreateEventWithName(eventName, eventSlug, eventLogo);

  // Use upsert to avoid race conditions
  const tournament = await prisma.tournament.upsert({
    where: {
      eventId_category: {
        eventId: event.id,
        category,
      },
    },
    update: {},
    create: {
      eventId: event.id,
      category,
      competitionName: event.eventName,
      competitionLogo: event.eventLogo || "",
    },
  });

  // Return the full tournament state, not just the basic tournament object
  return getTournamentState(tournament.id);
}

export async function getEventBySlug(eventSlug: string) {
  return await prisma.event.findUnique({
    where: { eventSlug },
    include: {
      tournaments: {
        include: {
          participants: true,
          matches: true,
        },
      },
      juryAccounts: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });
}

export async function getAllEvents() {
  return await prisma.event.findMany({
    include: {
      tournaments: {
        select: {
          id: true,
          category: true,
          configured: true,
        },
      },
      juryAccounts: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });
}

export async function getAllCategoriesChampions(eventSlug: string) {
  const tournaments = await prisma.tournament.findMany({
    where: { event: { eventSlug } },
    select: {
      category: true,
      matches: {
        where: {
          round: "FINALE",
          status: "finished",
        },
        select: {
          winnerId: true,
          isTieBrek: true,
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!tournaments) return null;

  const results = await Promise.all(
    tournaments.map(async (tournament) => {
      const finaleMatch = tournament.matches[0];
      const champion = finaleMatch?.winnerId
        ? await prisma.participant.findUnique({
            where: { id: finaleMatch.winnerId },
            select: {
              id: true,
              name: true,
              photo: true,
              countryCode: true,
              countryName: true,
              countryFlag: true,
              countryCode2: true,
              countryName2: true,
              countryFlag2: true,
            },
          })
        : null;

      return {
        category: tournament.category,
        champion,
        isTieBrek: finaleMatch?.isTieBrek ?? false,
      };
    }),
  );

  return results;
}

export async function getTournamentsByEventSlug(eventSlug: string) {
  return await prisma.tournament.findMany({
    where: {
      event: { eventSlug },
    },
    include: {
      participants: true,
      matches: true,
    },
  });
}

export async function getSelectedCategory(eventSlug: string) {
  const event = await prisma.event.findUnique({
    where: { eventSlug },
    select: { selectedCategory: true },
  });
  return event?.selectedCategory || "B-BOY";
}

export async function updateSelectedCategory(eventSlug: string, category: string) {
  await prisma.event.update({
    where: { eventSlug },
    data: { selectedCategory: category },
  });
}

export async function getAllCategoriesForEvent(eventSlug: string) {
  const tournaments = await prisma.tournament.findMany({
    where: {
      event: { eventSlug },
    },
    select: { category: true },
    distinct: ["category"],
  });
  return tournaments.map(t => t.category);
}

export async function getPreselectionCriteriaForEvent(eventSlug: string) {
  const event = await prisma.event.findUnique({
    where: { eventSlug },
    select: { preselectionCriteria: true },
  });

  if (!event) return [];

  try {
    const parsed = JSON.parse(event.preselectionCriteria || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function savePreselectionCriteriaForEvent(
  eventSlug: string,
  criteria: Array<{ name: string; maxScore: string }>
) {
  const event = await prisma.event.findUnique({
    where: { eventSlug },
  });

  if (!event) {
    throw new Error("Event not found");
  }

  const safeCriteria = criteria
    .map((criterion) => ({
      name: (criterion.name || "").trim(),
      maxScore: (criterion.maxScore || "10").toString().trim(),
    }))
    .filter((criterion) => criterion.name.length > 0);

  await prisma.event.update({
    where: { eventSlug },
    data: { preselectionCriteria: JSON.stringify(safeCriteria) },
  });

  return safeCriteria;
}

export async function getPreselectionScoresForEvent(eventSlug: string) {
  const event = await prisma.event.findUnique({
    where: { eventSlug },
    select: { preselectionScores: true },
  });

  if (!event) return [];

  try {
    const parsed = JSON.parse(event.preselectionScores || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function savePreselectionScoresForEvent(eventSlug: string, scores: unknown) {
  const event = await prisma.event.findUnique({
    where: { eventSlug },
  });

  if (!event) {
    throw new Error("Event not found");
  }

  await prisma.event.update({
    where: { eventSlug },
    data: { preselectionScores: JSON.stringify(scores) },
  });

  return scores;
}

export async function getSharedScreenMode(eventSlug: string) {
  const event = await prisma.event.findUnique({
    where: { eventSlug },
    select: { sharedScreenMode: true },
  });
  return event?.sharedScreenMode ?? false;
}

export async function setSharedScreenMode(eventSlug: string, mode: boolean) {
  await prisma.event.update({
    where: { eventSlug },
    data: { sharedScreenMode: mode },
  });
}

// ===== TOURNAMENT OPERATIONS =====

export async function getTournamentState(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      event: {
        include: {
          juryAccounts: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      },
      juryAssignments: {
        include: {
          jury: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      },
      participants: true,
      matches: {
        include: {
          votes: {
            select: {
              juryId: true,
              vote: true,
            },
          },
          finalizedBy: {
            select: {
              juryId: true,
            },
          },
        },
      },
    },
  });

  if (!tournament) return null;

  // Get warned juries for this tournament
  const warnedJuries = await prisma.warnedJury.findMany({
    where: { tournamentId },
    select: { juryId: true },
  });

  // Transform DB data to expected frontend format
  // IMPORTANT: Only include votes for the CURRENT match, not all matches!
  const juryVotes: Record<string, "red" | "blue" | "green" | "tie" | null> = {};
  if (tournament.currentMatchId) {
    const currentMatch = tournament.matches.find((m) => m.id === tournament.currentMatchId);
    if (currentMatch) {
      currentMatch.votes.forEach((v) => {
        juryVotes[v.juryId] = v.vote as "red" | "blue" | "green" | "tie";
      });
    }
  }

  const warnedJuryIds = warnedJuries.map((w) => w.juryId);

  // Define round ordering
  const roundOrder: Record<string, number> = {
    "TOP 16": 0,
    "TOP 8": 1,
    "SEMI FINALE": 2,
    "FINALE": 3,
  };

  // Sort matches by bracket order
  const sortedMatches = [...tournament.matches].sort((a, b) => {
    const orderA = roundOrder[a.round] ?? 999;
    const orderB = roundOrder[b.round] ?? 999;
    if (orderA !== orderB) return orderA - orderB;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  const matches = sortedMatches.map((m) => ({
    ...m,
    roundResults: JSON.parse(m.roundResults),
    finishedJuries: m.finalizedBy.map((f) => f.juryId),
  }));

  return {
    id: tournament.id,
    eventId: tournament.eventId,
    category: tournament.category,
    competitionName: tournament.competitionName,
    competitionLogo: tournament.competitionLogo,
    tournamentSize: tournament.tournamentSize as 16 | 8 | 4 | 2,
    configured: tournament.configured,
    currentMatchId: tournament.currentMatchId,
    participants: tournament.participants,
    juryAccounts: tournament.juryAssignments.map(ja => ja.jury),
    juryCount: tournament.juryAssignments.length,
    matches,
    juryVotes,
    warnedJuries: warnedJuryIds,
  };
}

export async function getTournamentStateForEvent(eventSlug: string, category: string) {
  // Get event WITHOUT creating it
  const event = await getEvent(eventSlug);
  
  if (!event) {
    return null;
  }

  // Find tournament WITHOUT creating it
  const tournament = await prisma.tournament.findUnique({
    where: {
      eventId_category: {
        eventId: event.id,
        category,
      },
    },
  });

  if (!tournament) {
    return null;
  }

  // Return the full tournament state
  return getTournamentState(tournament.id);
}

export async function createOrGetTournament(eventSlug: string, category: string) {
  const event = await getOrCreateEvent(eventSlug);

  // Use upsert to avoid race conditions
  const tournament = await prisma.tournament.upsert({
    where: {
      eventId_category: {
        eventId: event.id,
        category,
      },
    },
    update: {},
    create: {
      eventId: event.id,
      category,
      competitionName: event.eventName,
      competitionLogo: event.eventLogo || "",
    },
  });

  // Return the full tournament state, not just the basic tournament object
  return getTournamentState(tournament.id);
}

export async function configureTournament(
  tournamentId: string,
  data: {
    competitionName: string;
    competitionLogo: string;
    participants: Array<{ id: string; name: string; photo: string; countryCode?: string; countryName?: string; countryFlag?: string; countryCode2?: string; countryName2?: string; countryFlag2?: string }>;
    juryAccounts: Array<{ username: string; password: string }>;
    matches: Array<any>;
    tournamentSize: 16 | 8 | 4 | 2;
  }
) {
  // Get tournament and its event
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { event: true },
  });

  if (!tournament) throw new Error("Tournament not found");

  // Validate input data
  if (!data.participants || data.participants.length === 0) {
    throw new Error("No participants provided");
  }
  if (!data.juryAccounts || data.juryAccounts.length === 0) {
    throw new Error("No jury accounts provided");
  }
  if (!data.matches || data.matches.length === 0) {
    throw new Error("No matches provided");
  }

  // Wrap everything in a transaction to avoid race conditions
  await prisma.$transaction(async (tx) => {
    const oldMatches = await tx.match.findMany({
      where: { tournamentId },
      select: { id: true },
    });

    if (oldMatches.length > 0) {
      await tx.finalizedMatch.deleteMany({
        where: { matchId: { in: oldMatches.map((m) => m.id) } },
      });
      
      // Delete jury votes by matching matchIds (not tournamentId)
      await tx.juryVote.deleteMany({
        where: { matchId: { in: oldMatches.map((m) => m.id) } },
      });
    }

    await tx.warnedJury.deleteMany({ where: { tournamentId } });
    await tx.match.deleteMany({ where: { tournamentId } });
    await tx.participant.deleteMany({ where: { tournamentId } });

    // Create participants - generate unique IDs instead of using static ones
    // Keep a mapping of old IDs to new IDs for the matches
    const participantIdMap: Record<string, string> = {};
    await tx.participant.createMany({
      data: data.participants.map((p, idx) => {
        const newId = `${tournamentId}-p${idx + 1}`;
        participantIdMap[p.id] = newId;
        return {
          tournamentId,
          id: newId,
          name: p.name,
          photo: p.photo,
          countryCode: p.countryCode || "",
          countryName: p.countryName || "",
          countryFlag: p.countryFlag || "",
          countryCode2: p.countryCode2 || "",
          countryName2: p.countryName2 || "",
          countryFlag2: p.countryFlag2 || "",
        };
      }),
    });

    // Ensure jury accounts exist for the event (create if they don't exist)
    for (const j of data.juryAccounts) {
      // Skip if no username or password
      if (!j.username || !j.password) {
        console.warn("Skipping jury account with missing username or password");
        continue;
      }

      const username = j.username.trim().toLowerCase();
      const password = j.password.toString().trim();
      
      // Skip if username or password empty after trim
      if (!username || !password) {
        console.warn("Skipping jury account with empty username or password after trim");
        continue;
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      await tx.juryAccount.upsert({
        where: {
          eventId_username: {
            eventId: tournament.eventId,
            username,
          },
        },
        create: {
          eventId: tournament.eventId,
          username,
          password: hashedPassword,
        },
        update: {
          password: hashedPassword,
        },
      });
    }

    // Create matches
    const matches = [];
    for (let i = 0; i < data.matches.length; i++) {
      const m = data.matches[i];
      
      // Generate unique match ID - don't use m.id which is static across tournaments
      const uniqueMatchId = `${tournamentId}-m${i + 1}`;
      
      // Map the participant IDs from frontend to new database IDs
      const mappedRedTeamId = participantIdMap[m.redTeamId] || m.redTeamId;
      const mappedBlueTeamId = participantIdMap[m.blueTeamId] || m.blueTeamId;
      const mappedGreenTeamId = m.greenTeamId ? participantIdMap[m.greenTeamId] || m.greenTeamId : undefined;
      
      const match = await tx.match.create({
        data: {
          tournamentId,
          id: uniqueMatchId,
          redTeamId: mappedRedTeamId,
          blueTeamId: mappedBlueTeamId,
          greenTeamId: mappedGreenTeamId,
          round: m.round || "",
          status: i === 0 ? "active" : "pending",
          votingMode: m.votingMode || "match",
          roundCount: m.roundCount || 1,
          currentRound: 1,
          roundResults: JSON.stringify([]),
          redVotes: 0,
          blueVotes: 0,
        },
      });
      matches.push(match);
    }

    await tx.tournament.update({
      where: { id: tournamentId },
      data: {
        competitionName: data.competitionName,
        competitionLogo: data.competitionLogo,
        tournamentSize: data.tournamentSize,
        configured: true,
        currentMatchId: matches.length > 0 ? matches[0].id : null,
      },
    });
  });

  return await getTournamentState(tournamentId);
}

// ===== UPDATE PARTICIPANTS ONLY (without affecting matches) =====

export async function updateParticipantsOnly(
  tournamentId: string,
  participants: Array<{ id: string; name: string; photo: string; countryCode?: string; countryName?: string; countryFlag?: string; countryCode2?: string; countryName2?: string; countryFlag2?: string }>
) {
  if (!participants || participants.length === 0) {
    throw new Error("No participants provided");
  }

  // Delete old participants and recreate them
  await prisma.participant.deleteMany({
    where: { tournamentId },
  });

  // Recreate participants while preserving their frontend IDs.
  await prisma.participant.createMany({
    data: participants.map((p) => ({
      tournamentId,
      id: p.id,
      name: p.name,
      photo: p.photo,
      countryCode: p.countryCode || "",
      countryName: p.countryName || "",
      countryFlag: p.countryFlag || "",
      countryCode2: p.countryCode2 || "",
      countryName2: p.countryName2 || "",
      countryFlag2: p.countryFlag2 || "",
    })),
  });

  return await getTournamentState(tournamentId);
}

// ===== JURY LOGIN =====

export async function authenticateJury(
  eventSlug: string,
  username: string,
  password: string
) {
  const inputUsername = username.trim().toLowerCase();
  
  // Get the event by slug (don't create it)
  const event = await getEvent(eventSlug);
  if (!event) return null;

  // Get all juries for this event
  const juries = await prisma.juryAccount.findMany({
    where: { eventId: event.id },
  });

  // Find jury with case-insensitive username match
  const jury = juries.find(j => j.username.toLowerCase() === inputUsername);
  if (!jury) return null;

  const isValid = await bcrypt.compare(password.trim(), jury.password);
  return isValid ? jury : null;
}

// ===== VOTING =====

export async function castVote(
  matchId: string,
  juryId: string,
  vote: "red" | "blue" | "green" | "tie"
) {
  // Upsert vote
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

export async function warnMissingVotes(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });

  if (!tournament?.currentMatchId) return null;

  // Get all jury IDs for the event
  const allJury = await prisma.juryAccount.findMany({
    where: { eventId: tournament.eventId },
    select: { id: true },
  });

  const votedJury = await prisma.juryVote.findMany({
    where: {
      matchId: tournament.currentMatchId,
    },
    select: { juryId: true },
  });

  const votedIds = new Set(votedJury.map((v) => v.juryId));
  const missingJuryIds = allJury
    .map((j) => j.id)
    .filter((id) => !votedIds.has(id));

  // Create warned records
  await prisma.warnedJury.deleteMany({ where: { tournamentId } });
  for (const juryId of missingJuryIds) {
    await prisma.warnedJury.create({
      data: { tournamentId, juryId },
    });
  }

  return missingJuryIds;
}

export async function confirmRound(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });

  if (!tournament?.currentMatchId) return null;

  const match = await prisma.match.findUnique({
    where: { id: tournament.currentMatchId },
  });

  if (!match || match.status !== "active") return null;

  const votes = await prisma.juryVote.findMany({
    where: { matchId: match.id },
  });

  const redCount = votes.filter((v) => v.vote === "red").length;
  const blueCount = votes.filter((v) => v.vote === "blue").length;
  const greenCount = votes.filter((v) => v.vote === "green").length;
  const tieCount = votes.filter((v) => v.vote === "tie").length;

  if (match.votingMode === "round") {
    const roundResults = JSON.parse(match.roundResults);
    roundResults[match.currentRound - 1] = {
      red: redCount,
      blue: blueCount,
      green: greenCount,
      tie: tieCount,
    };

    let redVotesTotal = match.redVotes;
    let blueVotesTotal = match.blueVotes;
    let greenVotesTotal = match.greenVotes;

    const teamCounts = [
      { count: redCount, side: "red" as const },
      { count: blueCount, side: "blue" as const },
      { count: greenCount, side: "green" as const },
    ];
    const maxTeamCount = Math.max(...teamCounts.map((c) => c.count));
    const leaders = teamCounts.filter((c) => c.count === maxTeamCount);

    if (leaders.length === 1 && maxTeamCount > tieCount) {
      if (leaders[0].side === "red") redVotesTotal += 1;
      else if (leaders[0].side === "blue") blueVotesTotal += 1;
      else greenVotesTotal += 1;
    }

    if (match.currentRound < match.roundCount) {
      // Move to next round
      await prisma.match.update({
        where: { id: match.id },
        data: {
          currentRound: match.currentRound + 1,
          roundResults: JSON.stringify(roundResults),
          redVotes: redVotesTotal,
          blueVotes: blueVotesTotal,
          greenVotes: greenVotesTotal,
        },
      });
      // Clear votes for next round
      await prisma.juryVote.deleteMany({
        where: { matchId: match.id },
      });
    } else {
      // All rounds finished
      const winnerId =
        redVotesTotal > blueVotesTotal && redVotesTotal > greenVotesTotal
          ? match.redTeamId
          : blueVotesTotal > redVotesTotal && blueVotesTotal > greenVotesTotal
            ? match.blueTeamId
            : greenVotesTotal > redVotesTotal && greenVotesTotal > blueVotesTotal
              ? match.greenTeamId
              : null;

      await prisma.match.update({
        where: { id: match.id },
        data: {
          roundResults: JSON.stringify(roundResults),
          redVotes: redVotesTotal,
          blueVotes: blueVotesTotal,
          greenVotes: greenVotesTotal,
          winnerId,
        },
      });
    }
  }

  return await getTournamentState(tournamentId);
}

export async function revealMatch(tournamentId: string, matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
  });

  if (!match) return null;

  // Calculate winner based on current votes
  const votes = await prisma.juryVote.findMany({
    where: { matchId: matchId },
  });

  const redCount = votes.filter((v) => v.vote === "red").length;
  const blueCount = votes.filter((v) => v.vote === "blue").length;
  const greenCount = votes.filter((v) => v.vote === "green").length;
  const tieCount = votes.filter((v) => v.vote === "tie").length;

  // Determine winner and if it's a tie
  let winnerId: string | null = null;
  let isTieBrek = false;

  // Check if there's a clear winner
  const counts = [
    { count: redCount, id: match.redTeamId },
    { count: blueCount, id: match.blueTeamId },
    ...(match.greenTeamId ? [{ count: greenCount, id: match.greenTeamId }] : []),
  ];

  const maxCount = Math.max(...counts.map((c) => c.count));
  const winnersCount = counts.filter((c) => c.count === maxCount).length;

  if (winnersCount === 1 && maxCount > tieCount) {
    // Clear winner
    winnerId = counts.find((c) => c.count === maxCount)!.id;
  } else {
    // Tie break situation
    isTieBrek = true;
    winnerId = null;
  }

  // Update match with revealed status and winner
  await prisma.match.update({
    where: { id: matchId },
    data: {
      revealed: true,
      winnerId: winnerId,
      isTieBrek: isTieBrek,
      redVotes: redCount,
      blueVotes: blueCount,
      greenVotes: greenCount,
    },
  });

  return await getTournamentState(tournamentId);
}

export async function finishMatch(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });

  if (!tournament?.currentMatchId) return null;

  const currentMatch = await prisma.match.findUnique({
    where: { id: tournament.currentMatchId },
  });

  if (!currentMatch) return null;

  // If this match ended as a tie-break, reset it as a replay instead of finalizing
  if (currentMatch.isTieBrek) {
    // Clear previous jury votes for this match
    await prisma.juryVote.deleteMany({
      where: { matchId: currentMatch.id },
    });

    // Reset the match to an active replay with cleared counters
    await prisma.match.update({
      where: { id: currentMatch.id },
      data: {
        status: "active",
        revealed: false,
        winnerId: null,
        isTieBrek: false,
        redVotes: 0,
        blueVotes: 0,
        greenVotes: 0,
        roundResults: JSON.stringify([]),
      },
    });

    return await getTournamentState(tournamentId);
  }

  // Otherwise mark match as finished
  await prisma.match.update({
    where: { id: tournament.currentMatchId },
    data: { status: "finished" },
  });

  // Advance winner to next match if applicable
  const winnerId = currentMatch.winnerId;
  if (winnerId) {
    // Get all matches sorted by creation order to find indices
    const allMatches = await prisma.match.findMany({
      where: { tournamentId },
      orderBy: { createdAt: "asc" },
      select: { id: true, round: true, createdAt: true },
    });

    // Find current match index
    const currentMatchIndex = allMatches.findIndex((m) => m.id === currentMatch.id);
    if (currentMatchIndex === -1) return await getTournamentState(tournamentId);

    // Define round progression (works for any tournament size)
    const roundProgression: Record<string, string | null> = {
      "TOP 16": "TOP 8",
      "TOP 8": "SEMI FINALE",
      "SEMI FINALE": "FINALE",
      "FINALE": null,
    };

    const nextRound = roundProgression[currentMatch.round];
    if (!nextRound) {
      return await getTournamentState(tournamentId);
    }

    // Calculate round start indices dynamically based on actual matches in tournament
    const roundOrder = ["TOP 16", "TOP 8", "SEMI FINALE", "FINALE"];
    const roundStarts: Record<string, number> = {};
    let currentIndex = 0;

    // Only include rounds that actually exist in this tournament
    for (const round of roundOrder) {
      const roundMatches = allMatches.filter((m) => m.round === round);
      if (roundMatches.length > 0) {
        roundStarts[round] = currentIndex;
        currentIndex += roundMatches.length;
      }
    }

    // Calculate position in current round
    const currentRoundStart = roundStarts[currentMatch.round];
    if (currentRoundStart === undefined) {
      return await getTournamentState(tournamentId);
    }

    const positionInRound = currentMatchIndex - currentRoundStart;
    
    // Calculate where to place the winner in next round
    // Even positions (0, 2, 4...) go to red, odd positions (1, 3, 5...) go to blue
    const isRedSide = positionInRound % 2 === 0;
    const nextMatchPositionInRound = Math.floor(positionInRound / 2);
    const nextRoundStart = roundStarts[nextRound];

    if (nextRoundStart === undefined) {
      return await getTournamentState(tournamentId);
    }

    const nextMatchIndex = nextRoundStart + nextMatchPositionInRound;

    if (nextMatchIndex < allMatches.length) {
      const nextMatch = allMatches[nextMatchIndex];
      const updateData = isRedSide ? { redTeamId: winnerId } : { blueTeamId: winnerId };
      
      await prisma.match.update({
        where: { id: nextMatch.id },
        data: updateData,
      });
    }
  }

  return await getTournamentState(tournamentId);
}

export async function nextMatch(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament) return null;

  if (tournament.currentMatchId) {
    const currentMatch = await prisma.match.findUnique({
      where: { id: tournament.currentMatchId },
    });

    if (currentMatch?.status === "finished" && currentMatch.isTieBrek) {
      // Restart the tied match for a replay instead of advancing to another match.
      await prisma.juryVote.deleteMany({
        where: { matchId: currentMatch.id },
      });

      await prisma.match.update({
        where: { id: currentMatch.id },
        data: {
          status: "active",
          revealed: false,
          winnerId: null,
          isTieBrek: false,
          redVotes: 0,
          blueVotes: 0,
          greenVotes: 0,
        },
      });

      return await getTournamentState(tournamentId);
    }
  }

  const pendingMatches = await prisma.match.findMany({
    where: { tournamentId, status: "pending" },
    orderBy: { createdAt: "asc" },
  });

  if (pendingMatches.length === 0) {
    return await getTournamentState(tournamentId);
  }

  const nextMatch = pendingMatches[0];

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { currentMatchId: nextMatch.id },
  });

  await prisma.match.update({
    where: { id: nextMatch.id },
    data: { status: "active" },
  });

  return await getTournamentState(tournamentId);
}

export async function selectMatch(tournamentId: string, matchId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });

  // Finish current match if it exists
  if (tournament?.currentMatchId && tournament.currentMatchId !== matchId) {
    const currentMatch = await prisma.match.findUnique({
      where: { id: tournament.currentMatchId },
    });
    if (currentMatch?.status !== "finished") {
      await prisma.match.update({
        where: { id: tournament.currentMatchId },
        data: { status: "finished" },
      });
    }
  }

  // Set the new match as current
  await prisma.tournament.update({
    where: { id: tournamentId },
    data: {
      currentMatchId: matchId,
    },
  });

  // Activate the match if it was pending
  await prisma.match.update({
    where: { id: matchId },
    data: {
      status: "active",
    },
  });

  return await getTournamentState(tournamentId);
}

export async function resetTournament(tournamentId: string) {
  await prisma.$transaction(async (tx) => {
    // Get all matches for this tournament
    const matches = await tx.match.findMany({
      where: { tournamentId },
      select: { id: true },
    });

    // Clear votes by matching matchIds (not tournamentId)
    if (matches.length > 0) {
      await tx.juryVote.deleteMany({
        where: { matchId: { in: matches.map((m) => m.id) } },
      });
    }

    await tx.warnedJury.deleteMany({ where: { tournamentId } });

    // Delete all matches completely to ensure clean slate
    // This removes all roundResults history
    await tx.match.deleteMany({
      where: { tournamentId },
    });

    // IMPORTANT: Set configured to false and clear currentMatchId
    // This returns the UI to configuration screen without auto-launching
    await tx.tournament.update({
      where: { id: tournamentId },
      data: { 
        configured: false,
        currentMatchId: null,
      },
    });
  });

  return await getTournamentState(tournamentId);
}

export async function cancelMatch(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });

  if (!tournament?.currentMatchId) {
    return await getTournamentState(tournamentId);
  }

  // Set the current match to pending and clear all its votes
  await prisma.$transaction(async (tx) => {
    await tx.match.update({
      where: { id: tournament.currentMatchId! },
      data: {
        status: "pending",
        revealed: false,
      },
    });

    // Clear all votes for this match
    await tx.juryVote.deleteMany({
      where: { matchId: tournament.currentMatchId! },
    });

    // Clear warned juries for this tournament
    await tx.warnedJury.deleteMany({
      where: { tournamentId },
    });

    // Clear currentMatchId so admin can launch any pending match again
    await tx.tournament.update({
      where: { id: tournamentId },
      data: { currentMatchId: null },
    });
  });

  return await getTournamentState(tournamentId);
}

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

  // Return state - admin must manually click REVEAL/FINISH to show results
  // No automatic status change to "finished"
  return await getTournamentState(tournamentId);
}

// ===== DELETE OPERATIONS =====

export async function deleteEvent(eventSlug: string) {
  try {
    // Delete all tournaments and their related data for this event
    const event = await prisma.event.findUnique({
      where: { eventSlug },
      include: { tournaments: { select: { id: true } } },
    });

    if (!event) {
      console.warn(`Event not found: ${eventSlug}`);
      return false;
    }

    // Delete all data related to tournaments
    for (const tournament of event.tournaments) {
      // Get all match IDs for this tournament
      const matches = await prisma.match.findMany({
        where: { tournamentId: tournament.id },
        select: { id: true },
      });
      const matchIds = matches.map(m => m.id);

      // Delete votes for these matches
      if (matchIds.length > 0) {
        await prisma.juryVote.deleteMany({
          where: { matchId: { in: matchIds } },
        });
        // Delete finalized records for these matches
        await prisma.finalizedMatch.deleteMany({
          where: { matchId: { in: matchIds } },
        });
      }

      // Delete warned juries
      await prisma.warnedJury.deleteMany({
        where: { tournamentId: tournament.id },
      });
      // Delete matches
      await prisma.match.deleteMany({
        where: { tournamentId: tournament.id },
      });
      // Delete participants
      await prisma.participant.deleteMany({
        where: { tournamentId: tournament.id },
      });
      // Delete tournaments
      await prisma.tournament.delete({
        where: { id: tournament.id },
      });
    }

    // Delete jury accounts
    await prisma.juryAccount.deleteMany({
      where: { eventId: event.id },
    });

    // Delete event
    const deleted = await prisma.event.delete({
      where: { id: event.id },
    });

    console.log(`Successfully deleted event: ${eventSlug}`, deleted);
    return true;
  } catch (error) {
    console.error(`Error deleting event ${eventSlug}:`, error);
    return false;
  }
}

export async function deleteCategory(eventSlug: string, category: string) {
  try {
    // Delete a specific tournament (category) for an event
    const event = await prisma.event.findUnique({
      where: { eventSlug },
      include: { tournaments: { where: { category } } },
    });

    if (!event || event.tournaments.length === 0) {
      console.warn(`Category not found: ${eventSlug}/${category}`);
      return false;
    }

    const tournament = event.tournaments[0];

    // Get all match IDs for this tournament
    const matches = await prisma.match.findMany({
      where: { tournamentId: tournament.id },
      select: { id: true },
    });
    const matchIds = matches.map(m => m.id);

    // Delete all data related to this tournament
    if (matchIds.length > 0) {
      await prisma.juryVote.deleteMany({
        where: { matchId: { in: matchIds } },
      });
      await prisma.finalizedMatch.deleteMany({
        where: { matchId: { in: matchIds } },
      });
    }
    await prisma.warnedJury.deleteMany({
      where: { tournamentId: tournament.id },
    });
    await prisma.match.deleteMany({
      where: { tournamentId: tournament.id },
    });
    await prisma.participant.deleteMany({
      where: { tournamentId: tournament.id },
    });
    await prisma.tournament.delete({
      where: { id: tournament.id },
    });

    // If this was the selected category, reset to the first remaining tournament
    if (event.selectedCategory === category) {
      const remainingTournament = await prisma.tournament.findFirst({
        where: { eventId: event.id },
        select: { category: true },
      });
      if (remainingTournament) {
        await prisma.event.update({
          where: { eventSlug },
          data: { selectedCategory: remainingTournament.category },
        });
      }
    }

    console.log(`Successfully deleted category: ${eventSlug}/${category}`);
    return true;
  } catch (error) {
    console.error(`Error deleting category ${eventSlug}/${category}:`, error);
    return false;
  }
}

// ===== JURY OPERATIONS =====

export async function getJuryAccounts(eventSlug: string) {
  const event = await prisma.event.findUnique({
    where: { eventSlug },
    include: {
      juryAccounts: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });

  return event?.juryAccounts || [];
}

export async function createJuryAccount(eventSlug: string, username: string, password: string) {
  const event = await prisma.event.findUnique({
    where: { eventSlug },
  });

  if (!event) throw new Error("Event not found");

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const jury = await prisma.juryAccount.create({
      data: {
        eventId: event.id,
        username: username.trim(),
        password: hashedPassword,
      },
      select: {
        id: true,
        username: true,
      },
    });
    return jury;
  } catch (error: any) {
    if (error?.code === "P2002") {
      throw new Error("Username already exists for this event");
    }
    throw error;
  }
}

export async function deleteJuryAccount(eventSlug: string, juryId: string) {
  const event = await prisma.event.findUnique({
    where: { eventSlug },
  });

  if (!event) return false;

  // Delete the jury account (cascades will handle the rest)
  await prisma.juryAccount.delete({
    where: {
      id: juryId,
    },
  });

  return true;
}

export async function getJuryAssignments(eventSlug: string) {
  const event = await prisma.event.findUnique({
    where: { eventSlug },
    include: {
      tournaments: {
        select: {
          id: true,
          category: true,
          juryAssignments: {
            include: {
              jury: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!event) return {};

  const assignments: Record<string, Array<{ juryId: string; username: string }>> = {};
  event.tournaments.forEach((tournament) => {
    assignments[tournament.id] = tournament.juryAssignments.map((aj) => ({
      juryId: aj.juryId,
      username: aj.jury.username,
    }));
  });

  return assignments;
}

export async function assignJuryToTournament(tournamentId: string, juryId: string) {
  try {
    await prisma.tournamentJury.create({
      data: {
        tournamentId,
        juryId,
      },
    });
    return true;
  } catch (error: any) {
    if (error?.code === "P2002") {
      // Already assigned
      return true;
    }
    throw error;
  }
}

export async function removeJuryFromTournament(tournamentId: string, juryId: string) {
  await prisma.tournamentJury.delete({
    where: {
      tournamentId_juryId: {
        tournamentId,
        juryId,
      },
    },
  });
  return true;
}

export async function getTournamentWithJuries(eventSlug: string) {
  const event = await prisma.event.findUnique({
    where: { eventSlug },
    include: {
      tournaments: {
        select: {
          id: true,
          category: true,
        },
      },
    },
  });

  return event?.tournaments || [];
}
