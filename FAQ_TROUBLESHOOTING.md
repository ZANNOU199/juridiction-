# 🆘 FAQ & Troubleshooting - JUGE

## ❓ Questions Fréquemment Posées

### 1. Où sont sauvegardées mes données?

**Réponse:**
- **Développement**: `prisma/dev.db` (fichier SQLite local)
- **Production**: PostgreSQL serveur

Voir [DB_MIGRATION.md](DB_MIGRATION.md) pour les détails.

### 2. Mes données se réinitialisent à chaque redémarrage?

**Non!** Les données sont maintenant persistantes en BD. Si ça arrive:
```bash
npm run clean           # Supprime dev.db
npm run db:push        # Récrée la DB
npm run dev            # Redémarre
```

### 3. Comment ajouter un nouveau jury?

**Via admin panel** (interface) ou **directement en DB**:
```bash
npx prisma studio
# Navigate to JuryAccount
# Click "Add record"
# Fill in: username, password (sera hashé), tournamentId
```

### 4. Les mots de passe sont-ils sécurisés?

**Oui!** Utilisent bcrypt (salt: 10). Vérifiez:
```bash
npx prisma studio
# Voir JuryAccount.password (valeur hashée)
```

### 5. Comment exporter les résultats?

**Actuellement**: Pas de fonction d'export (v2.1 prévu)

**Workaround**: Utilisez `npx prisma studio` pour copier les données.

---

## 🐛 Erreurs courantes et solutions

### Erreur: "database connection refused"

```
Error: ENOENT: no such file or directory, open 'prisma/dev.db'
```

**Solution:**
```bash
npm run db:push        # Crée la DB
npm run dev            # Redémarre
```

---

### Erreur: "Prisma client out of sync"

```
Error: Invalid `prisma.tournament.findUnique()` invocation
```

**Solution:**
```bash
rm -rf node_modules/.prisma
npx prisma generate
npm run dev
```

---

### Erreur: "PORT 3000 is already in use"

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**
```bash
# Find process
lsof -i :3000

# Kill it
kill -9 <PID>

# Or use different port in server.ts
const PORT = 3001;
```

---

### Erreur: "TypeScript compilation failed"

```
error TS1086: An accessor cannot be declared in an ambient context.
```

**Solution:**
```bash
npm run lint
npx tsc --noEmit
# Check errors and fix

npm run dev
```

---

### Erreur: "Seeds not working"

```
npx tsx scripts/seed.ts
# SyntaxError: ...
```

**Solution:**
```bash
# Vérifier tsconfig.json
cat tsconfig.json | grep "\"module\""

# Devrait avoir "module": "ES2020" ou plus récent
```

---

### Erreur: "Frontend can't connect to backend"

**Frontend affiche**: "Error fetching state"

**Solution:**
1. Vérifiez que le serveur tourne:
```bash
curl http://localhost:3000/api/state
```

2. Si erreur CORS:
```typescript
// Dans server.ts, ajouter:
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});
```

3. Si "ERR_CONNECTION_REFUSED":
- Vérifier port dans server.ts
- Vérifier pare-feu

---

### Erreur: "localStorage not syncing across tabs"

**Problème**: Un onglet met à jour, l'autre ne voit pas

**Solution**: C'est normal avec polling 5s
- Les votes sync avec le serveur chaque 5s
- Rafraîchir la page pour forcer la sync
- Upgrade futur: WebSocket pour temps réel

---

## 🔍 Debugging

### Voir les requêtes SQL

```bash
# Terminal 1: Dev server
npm run dev

# Terminal 2: Prisma Studio (visual DB)
npx prisma studio
```

Prisma Studio affiche:
- Tables
- Données en temps réel
- Requêtes exécutées

### Logs détaillés

```bash
# Enable Prisma debug
export DEBUG=prisma*
npm run dev
```

### Inspecter les variables d'env

```typescript
// Dans server.ts, ajouter:
console.log("Database:", process.env.DATABASE_URL);
console.log("Node env:", process.env.NODE_ENV);

npm run dev
```

---

## 📊 Vérifications courantes

### Vérifier que la DB existe

```bash
ls -la prisma/
# Vous devriez voir "dev.db"
```

### Vérifier la connexion DB

```bash
npx tsx -e "import db from './server/db.js'; console.log(await db.getTournamentState('test'))"
```

### Vérifier les dépendances

```bash
npm list
# Chercher: @prisma/client, bcrypt
```

### Vérifier les scripts

```bash
npm run dev
npm run build
npm run db:push
# Tous doivent exister
```

---

## ⚙️ Configuration avancée

### Changer le port

**server.ts:**
```typescript
const PORT = 3001;  // Au lieu de 3000
```

Puis redémarrer.

### Augmenter polling interval

**src/App.tsx:**
```typescript
const interval = setInterval(fetchState, 10000);  // 10s au lieu de 5s
```

### Ajouter plus de jurés

**DB directement:**
```bash
npx prisma studio
# JuryAccount → Add record
```

**Ou en seed:**
```typescript
// scripts/seed.ts
const juryAccounts = [
  { username: "judge1", password: "pass1" },
  // Ajouter plus ici
];
```

---

## 📈 Performance

### La DB est lente?

```bash
# Vérifier la taille
du -sh prisma/dev.db

# Réinitialiser si énorme
npm run clean
npm run db:push
```

### Polling tous les 5s c'est trop?

**Réduction latence**:
```typescript
// Dans App.tsx
const interval = setInterval(fetchState, 2000);  // 2s
```

**Note**: Prévoir WebSocket v3.0 pour temps réel

---

## 🔐 Sécurité

### Tester bcrypt hashing

```bash
npx tsx -e "
import bcrypt from 'bcrypt';
const hashed = await bcrypt.hash('password123', 10);
console.log('Hashed:', hashed);
const isValid = await bcrypt.compare('password123', hashed);
console.log('Valid:', isValid);
"
```

### Vérifier les credentials

```bash
npx prisma studio
# Cliquer sur JuryAccount
# Voir les passwords hashés
```

---

## 📝 Logging & Monitoring

### Voir les logs du serveur

```bash
npm run dev 2>&1 | tee server.log
```

### Monitorer les requêtes DB

```bash
npm run dev
# + npx prisma studio (dans autre terminal)
# Actions visibles en temps réel
```

---

## 🔄 Migration depuis v1.0

### J'ai des données dans localStorage

```bash
# 1. Exporter localStorage
# Browser console: localStorage.getItem('arena_tournament_state')

# 2. Créer seeds.ts avec les données
# 3. Charger les seeds
npx tsx scripts/seed.ts
```

### Comment tester l'upgrade?

```bash
# Backup ancien état
cp prisma/dev.db prisma/dev.db.backup

# Test upgrade
npm run db:push
npm run dev

# Si problème, restore
cp prisma/dev.db.backup prisma/dev.db
```

---

## 📞 Support

### Je suis encore bloqué

1. **Vérifier logs**: `npm run dev`
2. **Vérifier .env.local**: `cat .env.local`
3. **Prisma studio**: `npx prisma studio`
4. **Tests de base**:
   ```bash
   curl http://localhost:3000/api/state
   npx prisma generate
   ```

### Escalade

- 🐛 GitHub Issues
- 📖 Prisma Docs: https://www.prisma.io/docs/
- 🆘 Prisma Support: https://www.prisma.io/support

---

## ✅ Checklist debug

- [ ] `npm install` exécuté
- [ ] `.env.local` existe
- [ ] `npm run db:push` exécuté
- [ ] Port 3000 libre
- [ ] Node.js 18+ installé
- [ ] `npm run dev` démarre sans erreurs
- [ ] http://localhost:3000 accessible
- [ ] Voir `/api/state` dans navigateur

Si tout ✅, vous êtes prêt!

---

**Questions?** Consultez [QUICKSTART.md](QUICKSTART.md) ou [INDEX.md](INDEX.md)
