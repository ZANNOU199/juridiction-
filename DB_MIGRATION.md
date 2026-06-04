# 🎭 JUGE - Battle de Danse Platform

## 📦 Migration vers Base de Données

Ce projet a été migré de **localStorage** vers une **base de données persistante**.

### ✅ Améliorations

- **Database**: SQLite (dev) / PostgreSQL (production)
- **ORM**: Prisma pour gestion du schema
- **Security**: Mots de passe hashés avec bcrypt
- **Persistence**: Toutes les données sont persistantes
- **Sessions**: Multi-tournois support

### 🚀 Installation

1. **Installer les dépendances:**
```bash
npm install
```

2. **Initialiser la base de données:**
```bash
npm run db:push
```

3. **Lancer en développement:**
```bash
npm run dev
```

### 📊 Structure des données

#### Tournament (Tournoi)
- Nom et logo de la compétition
- Configuration (nombre de participants, etc.)
- Statut actuel (match courant, etc.)

#### Participant (Danseur)
- Informations personnelles
- Drapeau du pays
- Photos

#### JuryAccount (Compte Juré)
- Credentials (username/password hashé avec bcrypt)
- Lié à un tournoi

#### Match (Combat)
- Équipes (Red/Blue)
- Votes actuels
- Gagnant
- Support multi-rounds

#### JuryVote (Vote)
- Vote d'un juré pour un match
- Timestamp

#### WarnedJury (Jurés avertis)
- Suivi des jurés qui n'ont pas voté

### 🔐 Sécurité

- ✅ Mots de passe hashés (bcrypt, salt: 10)
- ✅ Pas d'exposition de password au frontend
- ✅ Validation des entrées

### 📱 Frontend

Le frontend utilise toujours **localStorage** pour le cache local et polling (5s) pour la synchronisation multi-appareil.

### 🛠 Commandes

```bash
# Développement
npm run dev

# Build
npm run build

# Production
npm run start

# Migrations DB
npm run db:push
npm run db:migrate

# Nettoyage
npm run clean
```

### 📝 Variables d'environnement

```
DATABASE_URL="file:./prisma/dev.db"  # SQLite local
# DATABASE_URL="postgresql://user:pass@host/juge"  # PostgreSQL
```

### 🎯 Prochaines étapes

- [ ] WebSocket pour sync temps réel (au lieu de polling)
- [ ] Authentification admin (JWT)
- [ ] Audit logs complets
- [ ] Export résultats
- [ ] API multi-tournois

---

**Version**: 1.0.0 avec Prisma + SQLite/PostgreSQL
