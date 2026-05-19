# Security Specification - Arena Judge Pro

## Data Invariants
1. Competition settings can only be modified by admins.
2. Matches can only be created/modified by admins.
3. Juries can only vote on the 'active' match.
4. Juries can only vote once per match/round.
5. Juries can only finalize a match they are authorized to judge.
6. A match winner can only be set when all votes are cast (enforced by server logic or strict client patterns).

## The Dirty Dozen Payloads
1. Trying to change `competitionName` as a non-admin.
2. Trying to delete a match as a non-admin.
3. A jury trying to vote on a 'pending' match.
4. A jury trying to vote on a 'finished' match.
5. A jury trying to change someone else's vote.
6. A jury trying to set the `winnerId` directly on a match document.
7. A jury trying to vote multiple times by spamming different `voteId`s.
8. Injection of a huge string (1MB) into the `name` field of a participant.
9. Trying to modify the `order` of matches to disrupt the tournament sequence.
10. Trying to join as a jury account that doesn't exist.
11. Trying to view private admin logs (if any).
12. Trying to reset the entire competition settings as a regular user.

## Permissions Strategy
- **Admins**: Full read/write on all collections. (Identified by UID in `admins` collection).
- **Juries**: 
    - Read access to `settings`, `participants`, `matches`.
    - Write access to `matches/{matchId}/votes/{juryId}` if they are authenticated and the match is active.
    - Write access to `matches/{matchId}` only to append their ID to `finishedJuries`.

## Initial Admins
- user: zannoharry@gmail.com
