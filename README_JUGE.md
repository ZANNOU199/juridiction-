# 🎭 JUGE - Arena Battle Judge System (v2.0)

Professional real-time judging system for dance battles with persistence.

## ✨ Highlights

- **🗄️ Persistent Database**: SQLite (dev) + PostgreSQL (prod)
- **🔐 Secure**: Passwords hashed with bcrypt
- **⚡ Real-time Voting**: Multi-device synchronization (5s polling)
- **🎯 Tournament Management**: 16/8/4/2 bracket support
- **📊 Multi-round support**: Configurable voting modes

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm 9+

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Initialize database
npm run db:push

# 3. (Optional) Load test data
npx tsx scripts/seed.ts

# 4. Start development server
npm run dev

# 🎉 Open http://localhost:3000
```

---

## 📖 Documentation

| Document | Purpose |
|----------|---------|
| [QUICKSTART.md](QUICKSTART.md) | Getting started guide |
| [DB_MIGRATION.md](DB_MIGRATION.md) | Database architecture details |
| [CHANGELOG.md](CHANGELOG.md) | Complete v2.0 changes |
| [RESUME_MIGRATION.md](RESUME_MIGRATION.md) | French summary |
| [POSTGRESQL_SETUP.md](POSTGRESQL_SETUP.md) | Production deployment |

---

## 🏗️ Architecture

### Frontend
- **React 19** with TypeScript
- **Vite** for bundling
- **Tailwind CSS** + **Lucide Icons** for UI
- **Motion** for animations
- **React Router** v7

### Backend
- **Express.js** on Node.js
- **Prisma ORM** for database
- **Bcrypt** for security
- **SQLite/PostgreSQL** for persistence

### Database
- 8 Prisma models with relations
- Automatic migrations
- Indices for performance

---

## 🎮 Usage

### Admin Panel
- Configure tournament (participants, jury)
- Manage jury accounts
- Monitor votes in real-time
- Reveal/hide results

### Jury Console
- Login with credentials
- Vote in real-time (Red/Blue)
- See live vote counts
- Multi-device sync

### Spectator Screen
- Large display for results
- Hidden/revealed vote modes

---

## 🔄 API Endpoints

### State Management
```
GET  /api/state  # Get full tournament state
```

### Admin Operations
```
POST /api/admin/configure      # Setup tournament
POST /api/admin/warn-juries    # Alert non-voting judges
POST /api/admin/confirm-round  # Validate voting round
POST /api/admin/reveal         # Show/hide results
POST /api/admin/next-match     # Move to next match
POST /api/admin/reset          # Reset tournament
```

### Jury Operations
```
POST /api/jury/login     # Authenticate
POST /api/jury/vote      # Cast vote
POST /api/jury/finalize  # Mark round complete
```

---

## 💾 Database Schema

```
Tournament (1)
├── Participants (N)
├── JuryAccounts (N)      [passwords hashed]
├── Matches (N)
│   ├── JuryVotes (N)
│   └── FinalizedMatches (N)
├── WarnedJuries (N)
└── JuryVotes (N)
```

See [prisma/schema.prisma](prisma/schema.prisma) for complete schema.

---

## 🛠️ Available Commands

```bash
# Development
npm run dev              # Start with hot reload
npm run lint            # TypeScript check

# Production
npm run build           # Bundle for production
npm run start           # Run production build

# Database
npm run db:push         # Sync database
npm run db:migrate      # Create migration

# Maintenance
npm run clean           # Clean build artifacts
```

---

## 🔐 Security Features

- ✅ Bcrypt password hashing (salt: 10)
- ✅ No password exposure in API responses
- ✅ Input validation
- ✅ CORS ready
- ✅ Environment-based configuration

---

## 📈 Performance

- **Polling**: 5s synchronization interval
- **Caching**: localStorage on frontend
- **DB Indices**: Optimized for common queries
- **Connection Pool**: Prisma optimized

### Future Improvements
- WebSocket for real-time updates
- JWT authentication
- Audit logging
- Result export (PDF/CSV)

---

## 🚢 Deployment

### Vercel (Recommended)
```bash
vercel deploy
# Automatically builds and deploys
# PostgreSQL available via Vercel Postgres
```

### Traditional Node.js
```bash
npm run build
npm run start
# Server runs on port 3000
```

### Docker
```bash
docker build -t juge .
docker run -p 3000:3000 -e DATABASE_URL="..." juge
```

See [POSTGRESQL_SETUP.md](POSTGRESQL_SETUP.md) for production database setup.

---

## 🆘 Troubleshooting

### Database not found
```bash
npm run clean
npm run db:push
```

### Prisma client out of sync
```bash
npx prisma generate
npm run dev
```

### Port 3000 already in use
```bash
lsof -i :3000  # Find process
kill -9 <PID>  # Or change PORT in server.ts
```

---

## 📝 Project Structure

```
Juge/
├── src/                    # Frontend (React)
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── server/
│   └── db.ts              # Database layer
├── prisma/
│   ├── schema.prisma      # DB schema
│   └── dev.db             # SQLite (dev only)
├── scripts/
│   └── seed.ts            # Test data
├── server.ts              # Express server
├── vite.config.ts
├── tsconfig.json
├── package.json
├── .env.local
└── README files (docs)
```

---

## 📊 Statistics

- **Frontend**: ~2000 LOC (React/TypeScript)
- **Backend**: ~550 LOC (Express)
- **Database Layer**: ~350 LOC (Prisma)
- **Total**: ~3000 LOC

---

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Test locally (`npm run dev`)
4. Submit PR

---

## 📄 License

MIT

---

## 🎯 Version Info

- **Version**: 2.0
- **Status**: ✅ Production Ready
- **Database**: Prisma + SQLite/PostgreSQL
- **Last Updated**: May 2026

---

## 📞 Support

- 🐛 **Bugs**: Report in issue tracker
- 📖 **Docs**: See documentation files
- 🤔 **Questions**: Check QUICKSTART.md

---

**Ready to judge?** → [Get Started →](QUICKSTART.md)
