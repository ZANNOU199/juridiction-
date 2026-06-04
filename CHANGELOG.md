# 📋 CHANGELOG - v2.0 Database Migration

## 🎯 Objectif
Migrer du **localStorage** vers une **base de données persistante** avec **Prisma ORM**.

## ✅ Changements implémentés

### 🗄️ Backend

#### Nouvelles dépendances
- `@prisma/client` - ORM client
- `prisma` - CLI et migrations
- `bcrypt` - Hashing des mots de passe
- `@types/bcrypt` - Types TypeScript

#### Nouveaux fichiers
- **`server/db.ts`** (350+ lignes)
  - Couche d'abstraction pour toutes les opérations DB
  - Fonctions pour: getTournamentState, configureTournament, castVote, etc.
  - Hashing automatique des passwords avec bcrypt
  - Pas d'exposition des passwords au frontend

- **`prisma/schema.prisma`**
  - 8 modèles: Tournament, Participant, JuryAccount, Match, JuryVote, WarnedJury, FinalizedMatch
  - Relations avec CASCADE delete
  - Indices pour optimisation des requêtes

- **`.env.local`**
  - Configuration de la BD (SQLite local)
  - Prêt pour PostgreSQL en production

### 🔄 Changements serveur (`server.ts`)

#### Avant
```typescript
let tournamentState: TournamentState = { ... };

app.post("/api/admin/configure", (req, res) => {
  tournamentState = { ... };
  res.json({ state: tournamentState });
});
```

#### Après
```typescript
let currentTournamentId: string;

app.post("/api/admin/configure", async (req, res) => {
  const state = await db.configureTournament(currentTournamentId, data);
  res.json({ state });
});
```

#### Avantages
- ✅ Tous les endpoints deviennent **async**
- ✅ Données **persistantes** en BD
- ✅ **Hashing** automatique des passwords
- ✅ Pas de "state" global en mémoire
- ✅ Multi-tournoi compatible

### 📊 Schema DB

```sql
Tournament
  - id (PK)
  - competitionName
  - competitionLogo
  - tournamentSize
  - configured
  - currentMatchId
  - createdAt, updatedAt

Participant
  - id (PK)
  - tournamentId (FK)
  - name, photo
  - countryCode, countryName, countryFlag
  - UNIQUE(tournamentId, name)

JuryAccount
  - id (PK)
  - tournamentId (FK)
  - username, password (hashed)
  - UNIQUE(tournamentId, username)

Match
  - id (PK)
  - tournamentId (FK)
  - redTeamId, blueTeamId
  - redVotes, blueVotes
  - status, winnerId
  - votingMode, roundCount, currentRound
  - roundResults (JSON)
  - revealed

JuryVote
  - id (PK)
  - matchId (FK)
  - juryId (FK)
  - vote (red|blue)
  - UNIQUE(matchId, juryId)

WarnedJury
  - id (PK)
  - tournamentId (FK)
  - juryId (FK)
  - UNIQUE(tournamentId, juryId)

FinalizedMatch
  - id (PK)
  - matchId (FK)
  - juryId (FK)
  - UNIQUE(matchId, juryId)
```

### 🔐 Sécurité

**Avant:**
```typescript
const jury = accounts.find(j => 
  j.password.trim() === inputPassword
);
```
❌ Mots de passe en clair! Très risqué.

**Après:**
```typescript
const jury = await prisma.juryAccount.findUnique(...);
const isValid = await bcrypt.compare(inputPassword, jury.password);
```
✅ Hashed avec bcrypt, salt: 10

### 📱 Frontend

**Pas de changement côté frontend!**
- Toujours utilise `localStorage` pour cache local
- Toujours poll l'API toutes les 5s
- Endpoints API signature identique

### 🛠 Scripts et configuration

#### Nouveaux scripts dans package.json
```json
"dev": "prisma migrate dev --name init && tsx server.ts",
"build": "prisma generate && vite build && esbuild...",
"db:push": "prisma db push",
"db:migrate": "prisma migrate dev"
```

#### Nouveaux fichiers
- `scripts/seed.ts` - Charger des données de test
- `.env.local` - Configuration BD
- `DB_MIGRATION.md` - Documentation complète
- `QUICKSTART.md` - Guide démarrage
- `setup.sh` - Script installation

## 🚀 Migration guide

### Pour les développeurs existants

1. **Cloner/Pull le code**
   ```bash
   git pull
   ```

2. **Installer les nouvelles dépendances**
   ```bash
   npm install
   ```

3. **Initialiser la BD**
   ```bash
   npm run db:push
   ```

4. **(Optionnel) Seed data de test**
   ```bash
   npx tsx scripts/seed.ts
   ```

5. **Démarrer normalement**
   ```bash
   npm run dev
   ```

### ⚠️ Breaking changes

- ❌ `localStorage` ne restaure plus automatiquement l'état
- ❌ Les données du localStorage existant sont pertes (migration demandée)
- ✅ Les données de la BD persistent entre redémarrages

## 📈 Amélioration de performance

| Aspect | Avant | Après |
|--------|-------|-------|
| **Persistence** | Non | ✅ DB |
| **Hashing passwords** | Clair | ✅ Bcrypt |
| **Scalabilité** | 1 tournoi | ✅ Multi-tournoi |
| **Sync multi-device** | 5s polling | ➡️ 5s polling (amélioration future: WebSocket) |
| **Backup données** | Aucun | ✅ Possible |

## 🔄 Endpoints compatibilité

**Tous les endpoints API gardent la même signature:**

```typescript
// Avant et après: Signature identique
POST /api/admin/configure
GET  /api/state
POST /api/jury/login
POST /api/jury/vote
... etc
```

Frontend n'a **aucun changement à faire**.

## 📝 Prochaines étapes

### Phase 3: Real-time
- [ ] WebSocket au lieu de polling
- [ ] Socket.io ou ws
- [ ] Broadcast des votes en temps réel

### Phase 4: Sécurité avancée
- [ ] JWT tokens
- [ ] Session management
- [ ] Audit logs complets
- [ ] Rate limiting

### Phase 5: Fonctionnalités
- [ ] Export résultats (PDF)
- [ ] Stats et analytics
- [ ] Replay des matches
- [ ] Internationalization (i18n)

## 📞 Support

- **Questions?** Voir QUICKSTART.md
- **Bugs?** Créer un issue GitHub
- **Prisma docs**: https://www.prisma.io/docs/

---

**Version**: 2.0  
**Date**: Mai 2026  
**Statut**: ✅ Production Ready
