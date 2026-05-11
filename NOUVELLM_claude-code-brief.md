# Brief Claude Code — NouveLLM
## Développement de l'interface frontend

**Projet : NouveLLM — Service IA institutionnel**
**Université Sorbonne Nouvelle (Paris 3) · INTEGRIA · ANR France 2030**
**Version brief : 1.0 — Mai 2026**

---

## 0. Contexte et posture

Tu vas construire **NouveLLM**, une interface web qui expose un moteur IA (Dify) à des enseignants-chercheurs et des étudiants universitaires. Dify est le moteur **invisible** — l'utilisateur ne voit jamais Dify, jamais les noms de modèles (Mistral, DeepSeek), jamais les identifiants techniques. Il ne voit que NouveLLM.

**Ce n'est pas un prototype.** C'est un démonstrateur institutionnel qui doit convaincre une direction universitaire et un comité scientifique ANR. La qualité visuelle, la robustesse et la cohérence de l'interface comptent autant que les fonctionnalités.

**Documents de référence à lire en premier :**
- `~/nouvellm/NOUVELLM_interface-spec.md` — spécification fonctionnelle complète
- `~/nouvellm/NOUVELLM_plan-deploiement.md` — architecture Dify, App IDs, Dataset IDs

---

## 1. Ce qu'on construit

### Une seule application, trois profils

```
NouveLLM
├── Interface Conversation (EC + Étudiants — même UI, droits distincts)
├── Interface Session de cours (mode spécial pour les étudiants)
├── Panel Admin (/admin)
├── Page de connexion
├── Onboarding Étudiant (obligatoire)
└── Onboarding EC (optionnel)
```

### Règles non négociables

| Règle | Application |
|-------|-------------|
| Jamais de nom LLM | Ni Mistral, ni DeepSeek, ni GPT — nulle part dans l'interface |
| Toute réponse sourcée | Bloc sources cliquables obligatoire sous chaque message NouveLLM |
| Jamais "KB" | Toujours "Espaces documentaires" ou "Sources" |
| Jamais "Dify" | Ni dans l'UI, ni dans les messages d'erreur |
| Pied de page fixe | "Université Sorbonne Nouvelle · INTEGRIA · France 2030" |
| Accessibilité | RGAA AA — contrastes, focus visible, labels ARIA |

---

## 2. Stack technique

```bash
# Frontend
Next.js 14 (App Router)
TailwindCSS
Shadcn/ui (composants accessibles — installer dès le début)
Vercel AI SDK (streaming des réponses Dify)
NextAuth.js (auth — email/mdp pour le pilote, SSO CAS en juin)

# Backend léger (API routes Next.js)
- Couche métier entre le frontend et Dify
- Gestion des profils utilisateurs et des droits
- Configuration dynamique agents/sources (pas en dur dans le code)

# Base de données
SQLite (pilote) → PostgreSQL (production)
Prisma ORM

# Infrastructure
Mini PC local (Intel N100, Zorin OS)
Dify sur localhost:8090
URL de production future : nouveLLM.fr
```

### Variables d'environnement nécessaires

```env
DIFY_BASE_URL=http://localhost:8090
DIFY_ADMIN_EMAIL=transvers.art@gmail.com
DIFY_ADMIN_PASSWORD_B64=TWFzdGVyUG91bGV0UG9sbG9zSGVybWFub3M3NQ==
NEXTAUTH_SECRET=[générer]
DATABASE_URL=file:./nouvellm.db
```

---

## 3. Design system — extrait des maquettes

### Palette de couleurs

```css
/* Identité USN */
--blue-primary: #1a1f6b;    /* Bleu marine USN — header, boutons primaires, badges */
--blue-light: #e8eaf6;      /* Bleu très clair — fonds actifs, hover */
--white: #ffffff;
--gray-50: #f8f9fa;         /* Fond page */
--gray-100: #f1f3f4;        /* Fond sidebar, cartes */
--gray-200: #e2e6ea;        /* Bordures */
--gray-500: #6c757d;        /* Texte secondaire */
--gray-900: #1a1a2e;        /* Texte principal */

/* Accents fonctionnels */
--green-500: #28a745;       /* Connecté, succès */
--orange-400: #fd7e14;      /* Avertissement */
--red-500: #dc3545;         /* Erreur, déconnecté */

/* Token @agent */
--agent-token-bg: #dce4f5;
--agent-token-text: #1a1f6b;
--agent-token-border: #1a1f6b;

/* Token #source */
--source-token-bg: #e8f5e9;
--source-token-text: #2e7d32;
--source-token-border: #2e7d32;
```

### Typographie

```css
/* Titres — interface institutionnelle */
font-family: 'Inter', system-ui, sans-serif;

/* Tailles */
--text-xs: 0.75rem;    /* Labels, métadonnées */
--text-sm: 0.875rem;   /* Corps secondaire, sidebar */
--text-base: 1rem;     /* Corps principal */
--text-lg: 1.125rem;   /* Titres de section */
--text-xl: 1.25rem;    /* Titre page */

/* Graisses */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
```

### Composants clés identifiés dans les maquettes

**Header** (hauteur 56px, fond blanc, bordure bas gris-200)
```
[NouveLLM | Université Sorbonne Nouvelle]  [?] [🔔] [⚙] [Avatar Nom · Rôle]
```

**Message utilisateur** — bulle droite, fond bleu-light, avatar initiales bleu-primary

**Message NouveLLM** — bulle gauche, fond blanc, bordure grise, logo X bleu en avatar
- Label : "NOUVELLM · À L'INSTANT · AGENT @[nom]" en petites capitales gris-500
- Corps du message en texte-base
- **Bloc sources** en dessous (fond gris-50, bordure gris-200, typo xs)
- Barre d'actions au survol : [📋 Copier] [📥 Télécharger] [🔄 Régénérer] [👍] [👎]

**Palette `@` Agents** (dropdown depuis le champ de saisie)
- Largeur 480px, fond blanc, ombre portée
- En-tête "AGENTS · Sélectionnez un workflow pour structurer votre demande."
- Chaque entrée : icône + **@nom en gras bleu-primary** + description gris-500
- Navigation clavier (↑↓ + Entrée)
- Pied de palette : "8 agents disponibles" + raccourcis [↑↓ naviguer] [↵ sélectionner] [esc fermer]

**Palette `#` Sources** (même pattern)
- En-tête "SOURCES DOCUMENTAIRES · Choisissez les bases à interroger pour cette réponse."
- Chaque entrée : icône + **#nom en gras vert** + description + nombre de docs + badge "Public"
- Multi-sélection avec [esc] pour fermer

**Token `@` dans le texte**
```html
<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
             bg-blue-50 text-blue-700 border border-blue-200">
  @bibliographie
</span>
```

**Token `#` dans le texte**
```html
<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
             bg-green-50 text-green-700 border border-green-200">
  #pédagogie-usn
</span>
```

**Champ de saisie** (fond blanc, bordure gris-200, radius 8px)
```
[zone texte — placeholder: "Posez une question ou tapez @ pour un agent, # pour une source · Cmd+Entrée"]
[@] [#] [📎] [🗑]                                                    [ENVOYER →]
```
- Bouton ENVOYER : fond bleu-primary, texte blanc, radius 6px, flèche →
- Icônes barre d'outils : gris-500, 20px, hover bleu-primary

**Sidebar droite EC** (largeur 280px, fond gris-50, bordure gauche gris-200)
- Trois onglets : MON ESPACE / CONVERSATIONS / INSTITUTIONNEL
- Section "MES SOURCES EXTERNES" avec cartes connecteurs (Google Drive, Notion, Nextcloud)
  - Connecté : point vert + "connecté · X documents" + icône ⚙
  - Non connecté : point gris + bouton "LIER" bleu outline
- Section "MES ESPACES DOCUMENTAIRES" avec bouton "+ Créer"
  - Chaque espace : icône dossier + nom + nb docs + date mise à jour

**Onboarding modal** (fond overlay semi-transparent, carte centrale 600px)
- Bandeau bleu-primary en tête : "PREMIÈRE CONNEXION · PARCOURS OBLIGATOIRE" + titre
- Corps : question + choix A/B/C avec lettres dans cercle bleu
- Pied : indicateur progression (tirets) + boutons [RETOUR] [ÉTAPE SUIVANTE →]

**Footer** (hauteur 32px, fond blanc, bordure haut gris-200)
```
[Université Sorbonne Nouvelle]  [INTEGRIA · France 2030]   [Ce mois : 12 400 / 500 000 tokens ████░░]  [Recharge disponible sur demande]
```

---

## 4. Architecture de données

### Modèle de données (Prisma)

```prisma
model User {
  id          String   @id @default(cuid())
  email       String   @unique
  name        String
  role        Role     @default(STUDENT)
  groups      Group[]
  onboarded   Boolean  @default(false)
  createdAt   DateTime @default(now())
  conversations Conversation[]
  sessions    SessionParticipant[]
}

enum Role {
  STUDENT
  EC
  ADMIN
}

model Group {
  id              String   @id @default(cuid())
  slug            String   @unique  // "student_m2_traductologie"
  label           String            // "Master Traductologie M2"
  type            GroupType         // UFR | DIPLOME | PROJET | SYSTEME
  quotaTokens     Int               // tokens mensuels
  allowPersonalSources Boolean @default(false)
  allowedAgents   GroupAgent[]
  allowedSources  GroupSource[]
  systemPromptExtra String?         // surcouche prompt Dify
  users           User[]
}

model Agent {
  id          String   @id @default(cuid())
  slug        String   @unique  // "bibliographie"
  label       String            // "Bibliographie annotée"
  icon        String            // "📚"
  description String
  difyAppId   String            // "77c02f51" — éditable par l'admin
  status      AgentStatus @default(ACTIVE)
  groups      GroupAgent[]
}

model Source {
  id            String   @id @default(cuid())
  slug          String   @unique  // "formations-usn"
  label         String
  icon          String
  description   String
  difyDatasetId String            // éditable par l'admin
  docCount      Int?
  access        SourceAccess @default(PUBLIC)
  groups        GroupSource[]
}

model Conversation {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  title     String?
  messages  Message[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Message {
  id             String   @id @default(cuid())
  conversationId String
  role           MessageRole  // USER | ASSISTANT
  content        String
  agentUsed      String?      // slug de l'agent
  sources        Json?        // [{title, url, dataset}]
  tokenCount     Int?
  createdAt      DateTime @default(now())
}

model CourseSession {
  id                String   @id @default(cuid())
  code              String   @unique  // "TRAD-M1-2026"
  ownerId           String
  name              String
  description       String
  difyAppId         String
  systemPromptExtra String?
  allowedAgents     String[]
  allowedSources    String[]
  expiresAt         DateTime
  maxParticipants   Int      @default(30)
  accessMode        AccessMode @default(OPEN)
  status            SessionStatus @default(ACTIVE)
  participants      SessionParticipant[]
  createdAt         DateTime @default(now())
}

model Survey {
  id          String   @id @default(cuid())
  title       String
  questions   Json     // [{text, type, options}]
  tokenReward Int
  targetGroups String[]
  expiresAt   DateTime?
  active      Boolean  @default(true)
  responses   SurveyResponse[]
}
```

---

## 5. API routes à créer

### Authentification
```
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me          → profil + groupes + agents/sources disponibles
```

### Configuration (chargée au login)
```
GET  /api/config/agents    → liste des agents selon les groupes de l'utilisateur
GET  /api/config/sources   → liste des sources selon les groupes
```

### Conversation
```
POST /api/chat             → proxy vers Dify, streaming SSE
GET  /api/conversations    → liste des conversations de l'utilisateur
GET  /api/conversations/:id → messages d'une conversation
DELETE /api/conversations/:id
```

**Détail du POST /api/chat :**
```typescript
// Body
{
  message: string,
  agentSlug?: string,       // si @agent utilisé
  sourceslugs?: string[],   // si #source utilisé
  conversationId?: string,  // pour continuer une conversation
  files?: string[],         // IDs des fichiers uploadés
  responseLength?: "short" | "standard" | "detailed"
}

// Logique interne :
// 1. Récupère l'App Dify selon agentSlug (ou app IIIAAS principale)
// 2. Récupère les Dataset IDs selon sourceslugs
// 3. Appelle POST https://dify/v1/chat-messages
// 4. Stream la réponse au client via SSE
// 5. Sauvegarde en DB avec les sources retournées
```

### Sessions de cours
```
POST /api/sessions         → créer une session (EC uniquement)
GET  /api/sessions         → liste des sessions de l'EC
GET  /api/sessions/:code   → détail d'une session (pour rejoindre)
PATCH /api/sessions/:id    → modifier une session
DELETE /api/sessions/:id   → clore une session
POST /api/sessions/:code/join → rejoindre une session (étudiant)
```

### Upload
```
POST /api/upload           → upload fichier, retourne un fileId
```

### Admin
```
GET  /api/admin/users
POST /api/admin/users
PATCH /api/admin/users/:id

GET  /api/admin/groups
POST /api/admin/groups
PATCH /api/admin/groups/:id

GET  /api/admin/agents
POST /api/admin/agents
PATCH /api/admin/agents/:id    → modifier difyAppId sans redéploiement

GET  /api/admin/sources
POST /api/admin/sources
PATCH /api/admin/sources/:id   → modifier difyDatasetId sans redéploiement

GET  /api/admin/metrics        → usage par user/agent/source/groupe
GET  /api/admin/metrics/export → CSV pour @PPIA ANR

GET  /api/admin/surveys
POST /api/admin/surveys
PATCH /api/admin/surveys/:id
```

### Onboarding
```
POST /api/onboarding/complete  → marquer onboarding terminé + attribuer tokens
POST /api/onboarding/survey    → soumettre réponses à un sondage + tokens
```

---

## 6. Connexion à Dify — détails techniques

### Login et tokens Dify

```typescript
// Le mot de passe Dify doit être envoyé en Base64
const loginDify = async () => {
  const response = await fetch('http://localhost:8090/console/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'transvers.art@gmail.com',
      password: 'TWFzdGVyUG91bGV0UG9sbG9zSGVybWFub3M3NQ==' // base64
    })
  })
  // Token dans les cookies de la réponse : access_token + csrf_token
}
```

### Appel conversation Dify (streaming)

```typescript
// Pour les apps chatbot (mode advanced-chat)
const streamChat = async (appId: string, message: string, conversationId?: string) => {
  const response = await fetch(`http://localhost:8090/v1/chat-messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getAppApiKey(appId)}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      inputs: {},
      query: message,
      response_mode: 'streaming',
      conversation_id: conversationId || '',
      user: currentUserId
    })
  })
  // Lire le stream SSE et parser les events
}
```

### App IDs Dify — table de configuration initiale

```typescript
// Ces valeurs sont en DB, éditables par l'admin
// Valeurs initiales à insérer en seed :
const INITIAL_AGENTS = [
  { slug: 'bibliographie', difyAppId: '77c02f51', label: 'Bibliographie annotée', icon: '📚' },
  { slug: 'fiche-cours',   difyAppId: '8d8d5309', label: 'Fiche de cours ECTS',   icon: '📋' },
  { slug: 'rédaction',     difyAppId: '266a3ed4', label: 'Rédaction administrative', icon: '✍️' },
  { slug: 'module',        difyAppId: '4e61f3d0', label: 'Module pédagogique',    icon: '📖' },
  { slug: 'examen',        difyAppId: '491b85d3', label: 'Sujet d\'examen',        icon: '🎯' },
  { slug: 'traduction',    difyAppId: '00905b14', label: 'Traduction SHS',        icon: '🌍' },
  { slug: 'briefing',      difyAppId: '0c450e08', label: 'Briefing réunion',      icon: '📊' },
  { slug: 'analyse',       difyAppId: 'b5c46c3c', label: 'Analyse de document',   icon: '🔍' },
]

// App principale IIIAAS (sans agent spécifique)
const IIIAAS_APP_ID = 'app-WB1fhqtwl1Msrzov5Ly4ePB2'
const AITUDIANT_APP_ID = 'app-7UhkPSmtgfbe7TXA09ACiBln'
```

### Dataset IDs Dify — sources initiales

```typescript
const INITIAL_SOURCES = [
  { slug: 'formations-usn',   difyDatasetId: 'KB1A_ID', label: 'Formations USN',     icon: '🎓', docCount: 11 },
  { slug: 'services-usn',     difyDatasetId: 'KB1B_ID', label: 'Services USN',        icon: '🏛️', docCount: 17 },
  { slug: 'pédagogie-usn',    difyDatasetId: 'KB1C_ID', label: 'Pédagogie & Outils', icon: '📐', docCount: 12 },
  { slug: 'publications-shs', difyDatasetId: 'KB2_ID',  label: 'Publications académiques SHS', icon: '📰', docCount: 137 },
  { slug: 'integria',         difyDatasetId: 'KB3_ID',  label: 'Documentation INTEGRIA', icon: '🔬', docCount: 20 },
]
// Récupérer les vrais Dataset IDs depuis Dify :
// GET http://localhost:8090/console/api/datasets (avec auth admin)
```

---

## 7. Comportement des palettes `@` et `#`

### Palette `@` — Agents

```
Déclencheur : l'utilisateur tape "@" dans le champ de saisie
Positionnement : au-dessus du champ de saisie, largeur 480px

Comportement :
1. Apparition immédiate au frappe de "@"
2. Filtrage en temps réel sur slug + label + description
3. Navigation : ↑↓ pour naviguer, Entrée pour sélectionner, Échap pour fermer
4. Sélection → insert token coloré "@slug" dans le champ
5. Le message envoyé avec @slug → route vers l'app Dify correspondante

Structure d'un item :
[icône 20px] [@slug en gras bleu] [label]
              [description en gris, 13px]

Pied de palette :
[↑↓ naviguer] [↵ sélectionner] [esc fermer]    "8 agents disponibles"
```

### Palette `#` — Sources

```
Déclencheur : l'utilisateur tape "#" dans le champ de saisie
Positionnement : même que @

Comportement :
1. Apparition immédiate
2. Multi-sélection : plusieurs # peuvent être activés simultanément
3. Source sélectionnée → token vert inséré + reste dans la palette pour en ajouter d'autres
4. Échap → ferme la palette
5. À l'envoi : les Dataset IDs des sources sélectionnées sont passés au RAG

Structure d'un item :
[icône] [#slug en gras vert] [label]           [X docs] [Public]
        [description]

Sans # → NouveLLM sélectionne automatiquement les sources pertinentes
Avec # → uniquement les sources sélectionnées
```

---

## 8. Bloc sources — rendu obligatoire

Sous **chaque** message de NouveLLM, afficher :

```tsx
// Si sources disponibles
<div className="mt-3 pt-3 border-t border-gray-100">
  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
    Sources consultées
  </p>
  {sources.map(source => (
    <a href={source.url} target="_blank" className="flex items-center gap-2 
       text-xs text-gray-600 hover:text-blue-700 mb-1">
      <span>{source.icon}</span>
      <span className="font-medium">{source.title}</span>
      <span className="text-gray-400">→</span>
      <span className="text-blue-600 underline">{source.domain}</span>
    </a>
  ))}
</div>

// Si aucune source (réponse générale)
<div className="mt-2 text-xs text-gray-400 italic">
  Réponse basée sur les connaissances générales — aucune source documentaire consultée
</div>
```

---

## 9. Sprint 1 — Ce que tu dois livrer en premier

**Objectif Sprint 1 :** une interface fonctionnelle permettant une vraie conversation avec Dify, avec le design correct et les sources affichées.

### Étapes dans l'ordre

**1. Setup du projet**
```bash
npx create-next-app@latest nouvellm --typescript --tailwind --app
cd nouvellm
npx shadcn@latest init
npx prisma init
npm install next-auth @auth/prisma-adapter
npm install ai @ai-sdk/openai  # Vercel AI SDK pour streaming
```

**2. Base de données**
- Schéma Prisma (modèles ci-dessus, version simplifiée pour Sprint 1)
- Seed avec les agents et sources initiaux
- Migration

**3. Authentification**
- Page de connexion (email/mdp)
- Session NextAuth
- Middleware de protection des routes

**4. Chargement de la configuration**
- Route GET /api/config/agents → liste depuis DB selon profil
- Route GET /api/config/sources → idem

**5. Interface conversation**
- Layout principal avec header + zone conversation + champ de saisie
- Composant Message (utilisateur + NouveLLM)
- Composant BlocSources (obligatoire sous chaque réponse NouveLLM)
- Streaming des réponses Dify via SSE

**6. Palettes @ et #**
- Composant AgentPalette
- Composant SourcePalette
- Tokens colorés dans le champ de saisie

**7. Test end-to-end**
- Connexion → conversation → @bibliographie → réponse streamée → sources affichées

**À ne pas faire en Sprint 1 :**
- Sidebar EC complète (Sprint 2)
- Onboarding (Sprint 2)
- Panel admin (Sprint 4)
- OAuth connecteurs (Sprint 6)

---

## 10. Structure de fichiers recommandée

```
nouvellm/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx          ← Header + Sidebar
│   │   ├── page.tsx            ← Conversation principale
│   │   ├── onboarding/page.tsx
│   │   └── sessions/
│   │       └── [code]/page.tsx
│   └── admin/
│       ├── layout.tsx
│       ├── page.tsx            ← Dashboard
│       ├── users/page.tsx
│       ├── agents/page.tsx
│       └── sources/page.tsx
├── components/
│   ├── chat/
│   │   ├── MessageList.tsx
│   │   ├── Message.tsx
│   │   ├── SourcesBlock.tsx    ← Obligatoire sous chaque réponse
│   │   ├── MessageActions.tsx  ← Copier, Télécharger, Régénérer
│   │   └── ProcessingState.tsx ← État "En cours"
│   ├── input/
│   │   ├── ChatInput.tsx
│   │   ├── AgentPalette.tsx
│   │   ├── SourcePalette.tsx
│   │   └── TokenBadge.tsx      ← @agent et #source colorés
│   ├── sidebar/
│   │   ├── Sidebar.tsx
│   │   ├── ExternalSources.tsx
│   │   └── DocumentSpaces.tsx
│   ├── onboarding/
│   │   └── OnboardingModal.tsx
│   └── layout/
│       ├── Header.tsx
│       └── Footer.tsx
├── lib/
│   ├── dify.ts                 ← Client Dify (login, chat, datasets)
│   ├── config.ts               ← Chargement agents/sources depuis DB
│   └── auth.ts                 ← Config NextAuth
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
└── api/
    ├── chat/route.ts
    ├── config/
    │   ├── agents/route.ts
    │   └── sources/route.ts
    └── admin/
        ├── agents/route.ts
        └── sources/route.ts
```

---

## 11. Points d'attention critiques

**Ne pas coder les App IDs en dur.** Toujours les lire depuis la DB. L'admin doit pouvoir les changer sans toucher au code.

**Le streaming Dify.** L'API Dify retourne du SSE (Server-Sent Events). Utilise le Vercel AI SDK (`useChat` hook) qui gère le streaming nativement. Attention : Dify a son propre format SSE, vérifier la compatibilité.

**Les sources dans la réponse Dify.** Quand le RAG est activé, Dify retourne dans le stream des events `message_end` qui contiennent les références des chunks utilisés. Capturer ces events et les afficher dans le BlocSources.

**L'authentification Dify.** Le mot de passe doit être envoyé en Base64. Les tokens sont dans les cookies de réponse (pas dans le body). Script de test dans `~/nouvellm/dify/` pour vérifier.

**Jamais de nom de modèle.** Si Dify retourne dans sa réponse le nom du modèle (dans les métadonnées ou les logs), le filtrer avant d'afficher quoi que ce soit.

**Performance.** Le mini PC (Intel N100) a des ressources limitées. Ne pas faire de polling — utiliser le streaming SSE. Limiter les requêtes simultanées.

---

## 12. Ressources disponibles sur le mini PC

```bash
# Dify
http://localhost:8090                    ← Interface admin Dify
http://localhost:8090/console/api/...    ← API console (auth requise)
http://localhost:8090/v1/...             ← API apps (token app requis)

# Reranker TEI
http://localhost:8081                    ← API reranker
http://localhost:8082                    ← Proxy Cohere↔TEI

# Fichiers de référence
~/nouvellm/NOUVELLM_plan-deploiement.md  ← App IDs, Dataset IDs, architecture
~/nouvellm/NOUVELLM_interface-spec.md    ← Spec fonctionnelle complète
~/nouvellm/workflows/*.yml               ← DSL des 8 workflows Dify
~/nouvellm/scripts/                      ← Scripts Python utilitaires

# Apps Dify actives
IIIAAS principal : app-WB1fhqtwl1Msrzov5Ly4ePB2
AItudiant principal : app-7UhkPSmtgfbe7TXA09ACiBln
W1a Module : 4e61f3d0
W2 Bibliographie : 77c02f51
W3 Examen : 491b85d3
W5 Fiche ECTS : 8d8d5309
W8 Traduction : 00905b14
W10 Rédaction : 266a3ed4
W11 Briefing : 0c450e08
W12 Analyse : b5c46c3c
```

---

## 13. Commande de lancement

```bash
mkdir -p ~/nouvellm/frontend
cd ~/nouvellm/frontend
# → Commence ici. Lis d'abord NOUVELLM_interface-spec.md et NOUVELLM_plan-deploiement.md.
# → Sprint 1 : setup + auth + conversation + palettes @ et # + bloc sources.
# → Tu as carte blanche pour travailler sans interruption.
# → Interromps uniquement si tu rencontres un blocage technique réel.
```

---

*Brief Claude Code NouveLLM v1.0 — Diego Le Gallou — Mai 2026*
*À copier dans `~/nouvellm/frontend/CLAUDE_CODE_BRIEF.md` avant de lancer Claude Code*
