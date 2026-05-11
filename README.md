# NouveLLM

Interface IA institutionnelle de l'Université Sorbonne Nouvelle — projet pilote INTEGRIA (ANR-25-CMAS-0024). NouveLLM expose les workflows Dify (bibliographie, traduction, analyse, rédaction…) à travers une interface web sécurisée avec gestion des rôles, sessions de cours, quotas et conformité RGPD.

---

## Lancer le projet

```bash
# 1. Dépendances
npm install

# 2. Base de données SQLite (crée nouvellm.db + applique toutes les migrations)
npx prisma migrate deploy
npx prisma generate

# 3. Données initiales (agents, sources, groupes, comptes de test)
npx ts-node --project tsconfig.json prisma/seed.ts

# 4. Serveur de développement
npm run dev -- --port 3001
```

Ouvrir http://localhost:3001

---

## Comptes de test

| Rôle | Email | Mot de passe |
|---|---|---|
| Enseignant-Chercheur | camille.daniaux@sorbonne-nouvelle.fr | demo1234 |
| Administrateur | transvers.art@gmail.com | demo1234 |
| Étudiant | etudiant.test@sorbonne-nouvelle.fr | demo1234 |

---

## Variables d'environnement

Créer un fichier `.env` à la racine :

```env
# Auth
AUTH_SECRET="une-chaine-aleatoire-32-chars-min"
NEXTAUTH_URL="http://localhost:3001"

# Dify (URL directe du conteneur, sans passer par nginx)
DIFY_BASE_URL="http://172.19.0.5:5001"
DIFY_IIIAAS_API_KEY="app-xxxx"   # Workflow générique IIIAAS
DIFY_AITUDIANT_API_KEY="app-xxxx" # Workflow étudiant
```

Les clés API par agent sont stockées dans la base (table `Agent.difyApiKey`) et gérées via le panel admin `/admin/agents`.

---

## Architecture

**Next.js 16 App Router** — pages serveur + composants client, streaming SSE natif.  
**Prisma 7 + SQLite** (driver adapter `better-sqlite3`, sans moteur binaire) — migrable vers PostgreSQL via `scripts/migrate-to-postgres.md`.  
**NextAuth v5 (beta)** — JWT, credentials provider, middleware Edge pour le RBAC (`STUDENT / EC / ADMIN`).  
**Dify** — orchestrateur de workflows LLM sur port 5001 ; chaque agent a son `difyApiKey` + `difyAppId`; le streaming est consommé en SSE `event: message` / `event: message_end`.  
**Sessions de cours** — un EC crée une session avec agents filtrés + QR code SVG ; les étudiants rejoignent via `/session/[code]` ; les tokens sont imputés à la session, pas au quota étudiant.

---

## Structure des dossiers clés

```
app/
  page.tsx              — Page principale (server component, dispatch rôle)
  ConversationPage.tsx  — Interface de chat (streaming, agents, upload)
  admin/                — Panel admin (dashboard, agents, sources, users)
  sessions/             — Gestion sessions EC (new, dashboard)
  session/[code]/       — Chat étudiant en session
  api/                  — Routes API (chat, sessions, surveys, quota…)
components/
  layout/               — Header, Footer (quota, sondages)
  chat/                 — Message, SourcesBlock, ProcessingState
  sidebar/              — Sidebar EC (3 onglets)
  onboarding/           — Modal onboarding 4 étapes (étudiant)
  surveys/              — SurveyModal (QCM → tokens)
lib/
  dify.ts               — streamDifyChat, AGENT_INPUTS, parseDifySources
  auth.ts               — NextAuth config + blocage deletedAt
  prisma.ts             — Singleton PrismaClient (dev hot-reload safe)
prisma/
  schema.prisma         — Schéma complet (User, Agent, Source, CourseSession, Survey…)
  seed.ts               — Données initiales
scripts/
  cleanup.ts            — Rétention : supprime convs > 365j, comptes anonymisés > 30j
  migrate-to-postgres.md — Guide migration SQLite → PostgreSQL (9 étapes)
```

---

## Version

`v0.1.0` — Sprints 1–5 complets, démonstrateur fonctionnel validé E2E (Playwright, mai 2026).
