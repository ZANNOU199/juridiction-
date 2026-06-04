# 🚀 Guide de Démarrage - JUGE v2.0

## 📋 Prérequis

- **Node.js** v18+
- **npm** v9+

## ⚡ Installation rapide

### 1. Installer les dépendances

```bash
npm install
```

### 2. Initialiser la base de données

```bash
npm run db:push
```

Cela va créer automatiquement le fichier SQLite (`prisma/dev.db`) avec le schéma complet.

### 3. (Optionnel) Charger des données de test

```bash
npx tsx scripts/seed.ts
```

### 4. Démarrer le serveur

```bash
npm run dev
```

Le serveur démarre sur **http://localhost:3000**

## 🎮 Premier test

### Admin Panel
- Accédez à: `http://localhost:3000`
- Configurez un tournoi via l'interface

### Jury Console
- Accédez à: `http://localhost:3000`
- Login avec les credentials de seed (si exécuté):
  - **judge1** / password1
  - **judge2** / password2
  - **judge3** / password3

## 📊 Voir les données en temps réel

```bash
npx prisma studio
```

Ouvre une interface graphique pour explorer/modifier les données: http://localhost:5555

## 🛠 Commandes utiles

```bash
# Développement
npm run dev              # Start avec hot-reload

# Production
npm run build            # Build Vite + esbuild
npm run start            # Lancer le bundle production

# Database
npm run db:push          # Créer/synchroniser la DB
npm run db:migrate       # Créer une migration

# Maintenance
npm run clean            # Supprimer dist/ et dev.db
npm run lint             # TypeScript check
```

## 🗄️ Architecture Données

```
Tournament (1)
├── Participants (N)
├── JuryAccounts (N)
├── Matches (N)
│   ├── JuryVotes (N)
│   └── FinalizedMatches (N)
├── WarnedJuries (N)
└── JuryVotes (N) [globales]
```

## 🔧 Configuration

### Environnement de développement

Fichier `.env.local` (déjà créé):
```
DATABASE_URL="file:./prisma/dev.db"
```

### Production (PostgreSQL)

```
DATABASE_URL="postgresql://username:password@host:5432/juge"
```

Puis:
```bash
npm run build
npm run start
```

## 🆘 Dépannage

### Erreur "Database not initialized"
```bash
# Réinitialiser la DB
npm run clean
npm run db:push
npm run dev
```

### Prisma client invalide
```bash
npx prisma generate
npm run dev
```

### Port 3000 occupé
```bash
# Trouver le processus
lsof -i :3000

# Ou changer le port dans server.ts
```

## 📝 Prochaines étapes

1. ✅ **Persistence BD** - Terminé
2. ⏳ **WebSocket** - À implémenter (temps réel)
3. ⏳ **JWT Auth** - À implémenter (authentification robuste)
4. ⏳ **Export** - À implémenter (PDF/CSV)

## 📚 Documentation complète

Voir [DB_MIGRATION.md](DB_MIGRATION.md) pour tous les détails.

---

**Besoin d'aide?** Consultez la documentation Prisma: https://www.prisma.io/docs/
