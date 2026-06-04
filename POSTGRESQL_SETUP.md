# 🐘 PostgreSQL Setup - Production

Ce guide explique comment configurer PostgreSQL pour la production.

## 🚀 Déploiement sur Vercel, Heroku, ou autre PaaS

### 1. Créer une BD PostgreSQL

**Option A: Vercel Postgres** (Recommandé pour Vercel)
```bash
vercel env pull  # Récupère DATABASE_URL
```

**Option B: Heroku PostgreSQL**
```bash
heroku addons:create heroku-postgresql:standard-0
```

**Option C: Self-hosted**
```bash
docker run --name postgres -e POSTGRES_PASSWORD=mypassword -d postgres
```

### 2. Configurer `.env.production`

```env
DATABASE_URL="postgresql://username:password@host:5432/juge"
NODE_ENV="production"
```

### 3. Migrer le schéma

```bash
npm run build
```

Prisma va automatiquement:
- Générer le client
- Vérifier les migrations
- Créer les tables

### 4. Déployer

**Vercel:**
```bash
vercel deploy
```

**Heroku:**
```bash
git push heroku main
```

---

## 🔒 Sécurité PostgreSQL

### Connection pooling avec Prisma

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### SSL en production

```env
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
```

---

## 📊 Migration depuis SQLite

### Exporter données de SQLite
```bash
# Dump structure et data
sqlite3 prisma/dev.db ".dump" > backup.sql
```

### Charger dans PostgreSQL
```bash
psql postgres://user:pass@host/juge < backup.sql
```

### Ou via Prisma (recommandé)
```bash
# 1. Backup SQLite
cp prisma/dev.db prisma/dev.db.backup

# 2. Change DATABASE_URL vers PostgreSQL
# 3. Reset PostgreSQL
npx prisma migrate reset  # WARNING: Supprime tout!

# 4. Reseed données
npx tsx scripts/seed.ts
```

---

## 🆘 Dépannage

### "Connection refused"
```bash
# Vérifier la connexion
psql "postgresql://user:pass@host:5432/db"

# Ou depuis Node
npx tsx -e "import prisma from './server/db.js'; console.log(await prisma.tournament.findMany());"
```

### "Too many connections"
Ajouter connection pooling:
```env
DATABASE_URL="postgresql://user:pass@host/db?schema=public&connection_limit=5"
```

### Migrations en conflit
```bash
npx prisma migrate resolve --rolled-back "migration_name"
npx prisma migrate deploy
```

---

## 💡 Tips Production

1. **Backups réguliers**
   ```bash
   # Vercel Postgres
   vercel postgres query "SELECT * FROM pg_tables"
   
   # Heroku
   heroku pg:backups:capture
   ```

2. **Monitoring**
   - Vercel: Analytics intégré
   - Heroku: Dataclips pour queries
   - Self-hosted: pgAdmin ou Adminer

3. **Performance**
   - Indices sur les colonnes fréquemment utilisées (✅ déjà dans schema)
   - Partitioning pour grandes tables (future)

---

## 📋 Checklist déploiement

- [ ] Créer BD PostgreSQL
- [ ] Tester connexion local
- [ ] Setter DATABASE_URL en prod
- [ ] Tester migrations
- [ ] Reseed données si nécessaire
- [ ] Vérifier logs
- [ ] Tester endpoints
- [ ] Setup backups

---

Pour plus d'aide: https://www.prisma.io/docs/orm/overview/databases/postgresql
