# NouveLLM — Spécification Interface
## Service IA institutionnel · Université Sorbonne Nouvelle · INTEGRIA ANR France 2030

**Version : 0.2 — Mai 2026**
**Statut : Spécification validée — maquettes phase 2 en cours**
**Domaine cible : nouveLLM.fr**

---

## 1. Vision

NouveLLM est une interface IA institutionnelle construite **par-dessus Dify** — Dify est le moteur invisible, NouveLLM est la surface utilisateur. Aucun utilisateur ne voit jamais Dify, les noms de modèles LLM (Mistral, DeepSeek), ni les identifiants techniques internes.

Le service est accessible à trois types d'utilisateurs avec la **même interface** mais des **droits configurables dynamiquement** :
- **Enseignants-chercheurs (EC)** — usage professionnel, agents pédagogiques et administratifs, espaces documentaires personnels, création de sessions de cours
- **Étudiants** — usage académique encadré, agents selon groupe, quota mensuel configurable, onboarding éthique obligatoire
- **Administrateurs** — gestion complète de la plateforme, configuration des droits, monitoring

---

## 2. Architecture technique

### Stack frontend

```
NouveLLM Frontend (Next.js 14 + TailwindCSS + Shadcn/ui)
    ↕ API REST + streaming SSE
NouveLLM Backend (API Node.js — couche métier)
    ↕ API REST
Dify Backend (localhost:8090 → nouveLLM.fr en prod)
    ↕ Providers LLM
Cortecs.ai (souverain français)
    ├── mistral-small-2503
    ├── deepseek-v4-flash
    └── qwen3-embedding-8b + reranker BGE
```

### Couche de configuration dynamique

Tous les agents `@` et sources `#` sont stockés en base de données et éditables depuis le panel admin **sans redéploiement du code**. Le frontend charge la configuration au login.

```typescript
// Structure Agent (stockée en DB, éditée par l'admin)
interface Agent {
  slug: string          // "bibliographie"
  label: string         // "Bibliographie annotée"
  icon: string          // "📚"
  description: string   // "Construire et formater une bibliographie sourcée"
  difyAppId: string     // "77c02f51" — modifiable par l'admin
  allowedProfiles: Profile[]  // ["ec", "student_m2", "student_recherche"]
  status: "active" | "beta" | "disabled"
}

// Structure Source (stockée en DB, éditée par l'admin)
interface Source {
  slug: string          // "formations-usn"
  label: string         // "Formations USN"
  icon: string          // "🎓"
  description: string
  difyDatasetId: string // "KB1A_ID" — modifiable par l'admin
  docCount: number
  allowedProfiles: Profile[]
  access: "public" | "restricted"
}
```

### Système de groupes et droits (RBAC institutionnel)

Un utilisateur appartient à un ou plusieurs **groupes**. Chaque groupe hérite de droits cumulatifs.

```
Groupes système :
├── ec_base          → agents EC de base, sources institutionnelles
├── ec_[ufr]         → sources spécifiques à l'UFR
├── student_base     → agents étudiants limités, quota standard
├── student_[ufr]    → sources de l'UFR
├── student_[diplome]→ quota et sources spécifiques au diplôme
├── student_m2_recherche → quota étendu, accès publications SHS
└── admin            → tout

Exemples :
- Étudiant L1 Langues : [student_base, student_llcse, student_licence]
- Étudiant M2 Traductologie : [student_base, student_esit, student_m2_recherche]
- EC UFR Arts : [ec_base, ec_arts_medias]
- EC chercheur INTEGRIA : [ec_base, ec_llcse, ec_integria]
```

**Tout ce qui est "peut / ne peut pas"** (connexion sources perso, agents disponibles, quota) est un paramètre de groupe éditable depuis le panel admin.

---

## 3. Agents `@` disponibles

### Agents EC (configurables par l'admin)

| Slug | Label | App Dify actuel | Profils |
|------|-------|-----------------|---------|
| `bibliographie` | Bibliographie annotée | `77c02f51` | ec_base |
| `fiche-cours` | Fiche de cours ECTS | `8d8d5309` | ec_base |
| `rédaction` | Rédaction administrative | `266a3ed4` | ec_base |
| `module` | Module pédagogique | `4e61f3d0` | ec_base |
| `examen` | Sujet d'examen | `491b85d3` | ec_base |
| `traduction` | Traduction SHS | `00905b14` | ec_base |
| `briefing` | Briefing réunion | `0c450e08` | ec_base |
| `analyse` | Analyse de document | `b5c46c3c` | ec_base |

### Agents Étudiants (sous-ensemble configurable)

| Slug | Label | Profils par défaut | Configurable |
|------|-------|-------------------|--------------|
| `recherche` | Recherche documentaire | student_base | ✅ |
| `rédaction` | Aide à la rédaction | student_base | ✅ |
| `traduction` | Traduction | student_base | ✅ |
| `admin-usn` | Questions administratives | student_base | ✅ |
| `session-cours` | Rejoindre une session | student_base | — |
| `bibliographie` | Bibliographie (M2 recherche) | student_m2_recherche | ✅ |

### Surcouche de prompt par groupe

Chaque groupe peut avoir un **system prompt additionnel** configuré dans Dify qui s'ajoute au prompt de base de l'agent. Géré dans Dify (variantes d'App), déclenché par le frontend selon le groupe de l'utilisateur.

Exemples :
- `student_l1` → prompt plus guidant, plus pédagogique, vocabulaire simplifié
- `student_m2_recherche` → prompt académique avancé, citations obligatoires
- `ec_integria` → prompt contextualisant INTEGRIA et l'ANR

---

## 4. Sources `#` disponibles

### Sources institutionnelles (configurables par l'admin)

| Slug | Label | Dataset Dify actuel | Profils |
|------|-------|---------------------|---------|
| `formations-usn` | Formations USN | KB1a | tous |
| `services-usn` | Services USN | KB1b | tous |
| `pédagogie-usn` | Pédagogie & Outils | KB1c | tous |
| `publications-shs` | Publications académiques SHS | KB2 | ec_base, student_m2_recherche |
| `integria` | Documentation INTEGRIA | KB3 | ec_integria |

### Sources personnelles EC

Créées par l'EC dans son espace, stockées dans Dify (datasets privés). Accessibles uniquement par leur créateur sauf partage explicite.

### Sources personnelles Étudiants

**Désactivées par défaut.** Activables par groupe depuis le panel admin (ex: activer pour `student_m2_recherche`).

---

## 5. Surfaces de l'application

### 5.1 Page de connexion

- Logo NouveLLM + "Université Sorbonne Nouvelle"
- Bouton principal : "Se connecter avec mon compte USN" (SSO CAS/LDAP — juin 2026)
- Bouton secondaire : "Connexion email / mot de passe" (pilote pré-SSO)
- Pied de page : "INTEGRIA · ANR France 2030 · Données hébergées en France"

**Logique post-login :**
- Récupère le profil + groupes de l'utilisateur
- Si étudiant + onboarding non complété → redirige vers onboarding
- Si EC + première connexion → redirige vers onboarding EC (non bloquant)
- Sinon → redirige vers la conversation principale

---

### 5.2 Onboarding Étudiant

Parcours conversationnel intégré dans l'interface. Obligatoire avant tout accès.

**Structure des 4 étapes :**
- Étape 1/4 : Ce qu'est NouveLLM (et ce qu'il n'est pas) — informatif
- Étape 2/4 : Intégrité académique — quiz 3 questions (score ≥ 2/3 requis)
- Étape 3/4 : RGPD et données personnelles — informatif + validation explicite
- Étape 4/4 : Démonstration interactive `@` et `#`

**Mécanisme tokens :**
- Completion onboarding → déblocage quota standard
- Chaque étape optionnelle complétée (sondage, évaluation) → +X tokens configurables par l'admin

**Sondages en échange de tokens :**
L'onboarding est un point d'entrée pour des sondages institutionnels courts (2-3 questions max, jamais bloquants). L'admin peut créer des sondages depuis le panel. Un sondage a :
- Un titre
- 2-3 questions (QCM ou échelle)
- Un nombre de tokens offerts en contrepartie
- Une date d'expiration
- Un groupe cible (ex: student_m2_recherche uniquement)

Les données sont anonymisées et exportables pour les indicateurs ANR (I3, I6) et la recherche sur les usages IA en contexte universitaire.

---

### 5.3 Onboarding EC (non bloquant)

- Présentation des 8 agents avec démonstration
- Connexion optionnelle des sources externes (voir section 7)
- Création guidée du premier espace documentaire
- Accessible ultérieurement via `/aide`

---

### 5.4 Interface principale — Conversation

#### Header

```
[Logo NouveLLM] | Université Sorbonne Nouvelle    [?] [🔔] [⚙] [CD Camille Daniaux · ENSEIGNANT — UFR LANGUES ▾]
```

#### Zone de conversation

- Messages horodatés, avatar initiales
- Messages NouveLLM identifiés "NOUVELLM · À L'INSTANT · AGENT @[nom]"
- **Bloc sources obligatoire sous chaque réponse** :
  ```
  SOURCES CONSULTÉES
  📄 Charte des examens USN 2023-2024 → sorbonne-nouvelle.fr [lien]
  📰 Joussemet, F. (2025). InitIAtion... → hal.science [lien]
  📑 Publications académiques — 2 extraits
  ```
- **Barre d'actions sur chaque message NouveLLM (au survol)** :
  - 📋 Copier le texte
  - 📥 Télécharger (DOCX/PDF si fichier généré par kurokobo/file_tools)
  - 🔄 Régénérer
  - 👍 / 👎 Feedback qualité (anonymisé, remonte dans le monitoring admin)

#### État "En cours de traitement"

```
NOUVELLM · AGENT @MODULE · EN COURS ████░░ Étape 2/4
✓ Analyse du syllabus fourni
✓ Consultation de #pédagogie-usn — 8 extraits
⟳ Recherche dans #publications-shs...
```

Notification discrète si l'utilisateur quitte l'onglet pendant le traitement.

#### Champ de saisie

```
[zone de texte — "Posez une question ou tapez @ pour un agent, # pour une source · Cmd+Entrée"]
[@] [#] [📎] [🗑]                                                         [ENVOYER →]
```

**Comportement `@` :** palette agents filtrée en temps réel, tokens colorés insérés dans le message.

**Comportement `#` :** palette sources avec nombre de docs et statut, multi-sélection possible. Sans `#` → sources pertinentes sélectionnées automatiquement.

**Contrôle de longueur (EC uniquement) :** [Courte] [Standard ✓] [Détaillée] avant envoi.

**Raccourci Cmd+Entrée** pour envoyer.

---

### 5.5 Sidebar droite EC (rétractable)

#### Onglet "Mon espace"

```
MES SOURCES EXTERNES
├── Google Drive     ● connecté · 1 248 documents  [⚙]
├── Notion           ○ non connecté                [LIER]
├── Nextcloud USN    ● connecté · 312 documents    [⚙]
├── OneDrive         ○ non connecté                [LIER]
├── Moodle USN       ○ disponible juin 2026        [grisé]
└── Obsidian         → importer un vault (.md)     [IMPORTER]

MES ESPACES DOCUMENTAIRES                          [+ Créer]
├── 📁 Cours L2 — Sociolinguistique    14 docs · maj. il y a 2j
├── 📁 Mémoires M2 — direction 2025-26 28 docs · maj. il y a 6j
└── 📁 Veille — politiques linguistiques 63 docs
```

**Note Obsidian :** pas d'API cloud native — l'EC importe son vault comme dossier de fichiers MD dans son espace documentaire NouveLLM. L'intégration native Obsidian Sync est "prévue" dans la roadmap.

**Connecteurs avec statuts** : chaque connecteur affiche clairement son état (connecté / non connecté / disponible prochainement). Les connecteurs à venir sont visibles mais grisés — pas de fausse promesse, mais roadmap transparente.

#### Onglet "Conversations"

- Champ de recherche dans l'historique
- Liste groupée par période (aujourd'hui / semaine / mois / archives)
- Chaque entrée : date + agent utilisé + extrait
- Clic → rouvre la conversation

#### Onglet "Institutionnel"

- Espaces documentaires USN partagés (lecture seule)
- Espaces partagés par d'autres EC

---

### 5.6 Sessions de cours (EC)

#### Création d'une session

L'EC crée une session depuis son interface NouveLLM (bouton dans le header ou commande `/nouvelle-session`). Formulaire guidé :

| Champ | Détail |
|-------|--------|
| Nom | "Analyse de texte source — CM4" |
| Description | Visible par les étudiants à la connexion |
| Agents disponibles | Sélection parmi ses agents autorisés |
| Sources activées | Ses espaces + sources institutionnelles |
| Prompt d'accompagnement | Surcouche optionnelle pour guider les étudiants pendant la session |
| Durée de validité | Date d'expiration du lien |
| Capacité | Nombre max d'étudiants simultanés |
| Mode accès | Ouvert (tout étudiant USN) / Fermé (liste ou code) |

#### Tableau de bord de la session (EC)

- Code court généré : `TRAD-M1-2026`
- Lien direct + QR code téléchargeable
- Étudiants connectés en ce moment (anonymisés)
- Tokens consommés par la session
- Boutons : [Suspendre] [Clore] [Dupliquer]

#### Mode session côté étudiant

- Bandeau contextuel en haut : "SESSION · [Nom cours] — [Nom EC] · [Description activité]  [Quitter]"
- Palette `@` remplacée par les outils définis par l'EC
- Quota individuel suspendu (porté par l'EC)
- Historique de session non sauvegardé dans l'espace étudiant (configurable par l'EC)

#### Architecture technique d'une session

Une Session est un objet en base de données :
```typescript
interface Session {
  id: string
  code: string              // "TRAD-M1-2026"
  ownerId: string           // ID de l'EC
  difyAppId: string         // App Dify configurée pour cette session
  systemPromptOverride: string  // Surcouche prompt EC
  allowedAgents: string[]   // Slugs des agents autorisés
  allowedSources: string[]  // Slugs des sources
  expiresAt: Date
  maxParticipants: number
  accessMode: "open" | "closed"
  status: "active" | "suspended" | "closed"
}
```

---

### 5.7 Panel Administrateur (`/admin`)

#### Tableau de bord

- Métriques temps réel : utilisateurs connectés, tokens consommés aujourd'hui
- Alertes : quota dépassé, erreur workflow, espace documentaire volumineux
- Graphiques : usage par agent, par source, par groupe, par période

#### Gestion des utilisateurs

- Liste EC / étudiants avec statut et groupes
- Créer / désactiver / modifier des comptes
- Assigner des groupes et quotas personnalisés
- Voir l'historique d'usage par utilisateur

#### Gestion des groupes

- Créer / modifier des groupes (UFR, diplôme, projet)
- Configurer pour chaque groupe :
  - Agents `@` autorisés
  - Sources `#` accessibles
  - Quota tokens mensuel
  - Sources personnelles autorisées (oui/non)
  - Prompt d'accompagnement additionnel (→ variante App Dify)
  - Sondages actifs

#### Gestion des agents

- Activer / désactiver des agents par profil
- **Modifier l'App ID Dify** d'un agent sans redéploiement
- Créer un nouvel agent (slug + label + App ID + profils)
- Tester un agent depuis le panel

#### Gestion des sources

- Activer / désactiver des sources par profil
- **Modifier le Dataset ID Dify** d'une source sans redéploiement
- Voir les statistiques d'indexation de chaque source

#### Gestion des sessions de cours

- Vue globale de toutes les sessions actives
- Clore une session d'urgence
- Statistiques d'usage par session

#### Sondages

- Créer / modifier / archiver des sondages
- Configurer les tokens offerts en contrepartie
- Cibler un groupe
- Exporter les résultats (CSV, JSON) pour les indicateurs ANR

#### Monitoring

Métriques croisées sur 5 axes :
- Par **utilisateur** (tokens, agents utilisés, sources consultées)
- Par **agent** `@` (nombre d'appels, tokens moyens, feedback 👍/👎)
- Par **source** `#` (nombre de consultations, scores RAG moyens)
- Par **diplôme** (agrégation par groupe student_[diplome])
- Par **UFR** (agrégation par groupe ec_[ufr] et student_[ufr])

Export CSV/JSON pour rapports @PPIA ANR (indicateurs I3, I5, I6).

#### Configuration système

- Gérer les credentials OAuth des connecteurs (Google Drive, OneDrive, Notion, Nextcloud)
- Quotas par défaut par type de groupe
- Paramètres RGPD : durée de rétention des conversations (obligations légales + sobriété)
- Bannière d'information globale

---

## 6. Connecteurs sources externes EC

| Connecteur | Statut | Mode d'intégration |
|-----------|--------|-------------------|
| Google Drive | ✅ Plugin Dify installé | OAuth — credentials à configurer en juin |
| OneDrive / SharePoint | ✅ Plugin Dify installé | OAuth Azure AD — juin |
| Notion | ✅ Plugin Dify installé | Token d'intégration — juin |
| Nextcloud USN | ✅ Plugin Dify installé | URL + credentials DSI USN — juin |
| Moodle USN | 🔜 Prévu | API Moodle — après prise de poste |
| Obsidian | 🔜 Prévu | Import vault MD (court terme) / Obsidian Sync (long terme) |

**Architecture :** chaque connecteur est visible dans la sidebar EC avec son statut. Les connecteurs non encore disponibles sont visibles mais grisés avec "Disponible prochainement". Pas de surprise, roadmap transparente.

---

## 7. Politique de données et RGPD

**Principe directeur** : obligations légales + sobriété maximale. Double objectif — exemplarité institutionnelle et adhésion des EC (méfiance légitime du flicage).

- Conversations : rétention selon obligations légales françaises, supprimables par l'utilisateur à tout moment
- Données d'usage (tokens, agents) : anonymisées pour le monitoring agrégé
- Sondages : données anonymisées, finalité déclarée dans le registre de traitement DPO
- Aucun log du contenu des conversations dans le monitoring admin — seulement les métadonnées (agent utilisé, source consultée, tokens)
- Politique visible dans les paramètres utilisateur, pas enfouie dans des CGU

**À soumettre au DPO USN avant ouverture aux étudiants :** registre de traitement, DPIA si nécessaire.

---

## 8. Roadmap de développement

### Sprint 1 — Interface de base
- [ ] Setup Next.js + TailwindCSS + Shadcn/ui
- [ ] Page de connexion (email/mdp pour le pilote)
- [ ] Interface conversation principale avec streaming Dify
- [ ] Bloc sources cliquables sous chaque réponse
- [ ] Header + sidebar EC basique

### Sprint 2 — Agents et Sources
- [ ] Palette `@` avec autocomplétion et tokens colorés
- [ ] Palette `#` avec multi-sélection
- [ ] Upload de fichiers dans la conversation
- [ ] État de traitement en temps réel
- [ ] Configuration dynamique agents/sources depuis DB (pas en dur)

### Sprint 3 — Profils et groupes
- [ ] Système RBAC groupes
- [ ] Droits différenciés EC / étudiant / admin
- [ ] Sidebar EC complète avec connecteurs
- [ ] Onboarding étudiant conversationnel
- [ ] Mécanisme sondages → tokens

### Sprint 4 — Sessions de cours
- [ ] Formulaire création session EC
- [ ] Tableau de bord session EC
- [ ] Mode session côté étudiant
- [ ] QR code et lien partageable

### Sprint 5 — Panel admin
- [ ] Tableau de bord métriques
- [ ] Gestion utilisateurs et groupes
- [ ] Gestion agents et sources (édition App ID / Dataset ID)
- [ ] Monitoring 5 axes + export ANR
- [ ] Gestion sondages

### Sprint 6 — Intégrations (post prise de poste, juin 2026)
- [ ] SSO CAS/LDAP USN
- [ ] OAuth Google Drive, OneDrive, Notion
- [ ] Nextcloud USN
- [ ] Déploiement nouveLLM.fr

### Sprint 7 — Migration production
- [ ] Migration mini PC → infrastructure USN
- [ ] Nom de domaine nouveLLM.fr
- [ ] Configuration SSL, reverse proxy
- [ ] Tests de charge pilote EC

---

## 9. Export Claude design → Claude Code

**Exports attendus des maquettes :**
1. PNG haute résolution desktop 1440px (5 états : conversation, palette @, palette #, session cours, panel admin)
2. PNG mobile 390px (interface étudiante)
3. Palette de couleurs exacte (hex)
4. Typographie (famille, tailles, graisses)
5. Composants identifiés : boutons, badges, cartes, palettes, bloc sources, états de chargement, barre d'actions message

**Brief pour Claude Code :**
- Ce document (NOUVELLM_interface-spec.md)
- Maquettes PNG
- NOUVELLM_plan-deploiement.md (App IDs, Dataset IDs, URL Dify)
- Credentials Dify admin pour les appels API

---

*Document de spécification NouveLLM v0.2 — Diego Le Gallou — Mai 2026*
*Classification : PILOT-SPEC-ACT-202605_nouvellm-interface-spec.md*
