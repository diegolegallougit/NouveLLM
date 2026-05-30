# AUDIT UX/UI — NouveLLM Desktop

> Audit complet de l'état actuel des interfaces desktop.
> Lecture seule — rien n'a été modifié.
> Date : 2026-05-24

---

## Table des matières

1. [Routes et pages](#étape-1--routes-et-pages)
2. [Page Login (/login)](#étape-2--page-login-login)
3. [Page Mes dossiers (/spaces)](#étape-3--page-mes-dossiers-spaces)
4. [Page Séances (/sessions)](#étape-4--page-séances-sessions)
5. [Dashboard séance (/sessions/[id])](#étape-5--dashboard-séance-sessionsid)
6. [Page étudiant (/session/[code])](#étape-6--page-étudiant-sessioncode)
7. [Header desktop](#étape-7--header-desktop)
8. [Sidebar desktop](#étape-8--sidebar-desktop)
9. [Admin (/admin)](#étape-9--admin-admin)
10. [Composants partagés](#étape-10--composants-partagés)
11. [Incohérences globales](#étape-11--incohérences-globales)

---

## ÉTAPE 1 — Routes et pages

### Routes statiques

| Route | Fichier | Type | État |
|---|---|---|---|
| `/` | `app/page.tsx` | Client | ✅ Redirige vers ConversationPage |
| `/login` | `app/login/page.tsx` + `LoginClient.tsx` | Client | ✅ |
| `/spaces` | `app/spaces/page.tsx` + `SpacesPageClient.tsx` | SSR + Client | ✅ |
| `/sessions` | `app/sessions/page.tsx` | Client | ✅ |
| `/sessions/new` | `app/sessions/new/page.tsx` | Client | ✅ |
| `/sessions/loading` | `app/sessions/loading.tsx` | Client | ✅ Loading skeleton |
| `/responsable` | `app/responsable/page.tsx` | Client | ✅ |
| `/apropos` | `app/apropos/page.tsx` | ? | ✅ |
| `/legal` | `app/legal/page.tsx` | ? | ✅ |
| `/admin` | `app/admin/page.tsx` + `AdminDashboardClient.tsx` | SSR + Client | ✅ |
| `/admin/agents` | `app/admin/agents/page.tsx` | Client | ✅ |
| `/admin/diplomes` | `app/admin/diplomes/page.tsx` | Client | ✅ |
| `/admin/groups` | `app/admin/groups/page.tsx` | Client | ✅ |
| `/admin/integrations` | `app/admin/integrations/page.tsx` | Client | ✅ |
| `/admin/knowledge-bases` | `app/admin/knowledge-bases/page.tsx` | Client | ✅ |
| `/admin/routing` | `app/admin/routing/page.tsx` | Client | ✅ |
| `/admin/sources` | `app/admin/sources/page.tsx` | Client | ✅ |
| `/admin/users` | `app/admin/users/page.tsx` | Client | ✅ |
| `/admin/workflows` | `app/admin/workflows/page.tsx` | Client | ✅ |

### Routes dynamiques

| Route | Fichier | Usage |
|---|---|---|
| `/c/[id]` | `app/c/[id]/page.tsx` | Conversation existante (reprise) |
| `/session/[code]` | `app/session/[code]/page.tsx` | Rejoindre séance (étudiant/guest) |
| `/sessions/[id]` | `app/sessions/[id]/page.tsx` | Dashboard séance (EC) |
| `/responsable/[groupId]/members` | `app/responsable/[groupId]/members/page.tsx` | Gestion membres responsable |

---

## ÉTAPE 2 — Page Login (/login)

**Fichier :** `app/login/LoginClient.tsx`

### Structure du layout

```
min-h-screen flex flex-col
background: #F2F2F2

├── Header
│   ├── Logo "NouveLLM" (Gilroy 800, 1.25rem, #00068D)
│   ├── | séparateur (w-px h-4 bg-[#D8D8D8])
│   └── "UNIVERSITÉ SORBONNE NOUVELLE" (Gilroy 300, 0.75rem, #8A8A8A, uppercase)
│
├── Main (flex-1 flex items-center justify-center px-4 py-12)
│   └── Card (max-w-md)
│       ├── Logo section
│       │   ├── Croix SVG (w-16 h-16 rounded-2xl bg-[#00068D] shadow-lg)
│       │   ├── "Bienvenue sur NouveLLM" (Gilroy 800, 1.75rem, #0D0D0D)
│       │   └── "Service IA institutionnel · Sorbonne Nouvelle"
│       │
│       └── Formulaire (bg-white rounded-2xl shadow-sm border p-8)
│           ├── Bouton CAS (désactivé : {false && ...})
│           ├── Bouton ProConnect (optionnel, border-[#003189])
│           ├── Séparateur "Accès pilote"
│           ├── Email input (rounded-lg border border-[#D8D8D8], focus ring #2B2EB8)
│           ├── Password input (idem)
│           ├── Error banner (bg-red-50 border-red-200)
│           └── Submit button (bg-[#00068D], w-full py-3, flèche →)
│
└── Footer (bg-white border-t py-4 px-8)
    ├── "Université Sorbonne Nouvelle"
    ├── | "INTEGRIA · ANR France 2030"
    └── | "Données hébergées en France"
```

### Détails de formulaire

- **Labels** : `Gilroy 300`, `font-size: text-xs` (Tailwind, ≈12px), `uppercase`, `tracking-wider`, `color-[#8A8A8A]`
- **Inputs** : `w-full px-4 py-2.5 rounded-lg border border-[#D8D8D8]`, `font-family: Source Serif Pro`, `font-size: text-sm`
- **Focus** : `focus:ring-2 focus:ring-[#2B2EB8] focus:border-transparent`
- **Placeholder** : "prenom.nom@sorbonne-nouvelle.fr"
- **Bouton** : `bg-[#00068D]`, `rounded-lg`, `py-3`, Gilroy 800, `font-size: 0.875rem`, `letter-spacing: 0.04em`

### Problèmes identifiés

- `font-size: '0.75rem'` hardcodé pour le sous-titre du header (vs `var(--text-xs)` = 11px ailleurs)
- `font-size: '0.875rem'` hardcodé pour le bouton (vs `var(--text-sm)` = 14px)
- Pas de design token pour le gris fond `#F2F2F2` (pourtant `--color-nl-off-white` existe)
- Le bouton CAS est retiré du DOM via `{false && ...}` — pas de placeholder visible, commentaire "Juin 2026 — non déployé"
- `rounded-2xl` sur le logo (16px) vs `rounded-xl` (12px) utilisé ailleurs
- `shadow-lg` sur le logo vs `shadow-md` sur l'EmptyState

---

## ÉTAPE 3 — Page Mes dossiers (/spaces)

**Fichier :** `app/spaces/page.tsx` (Server Component) + `app/spaces/SpacesPageClient.tsx`

### Server Component (SSR)

```typescript
// Requêtes Prisma :
// 1. documentSpace.findMany({ where: { ownerId: user.id }, include: { folders, _count } })
// 2. documentSpace.findMany({ where: { ownerId: { not: user.id } }, filter: isVisible(audience, role) })
// → Rend <SpacesPageClient initialSpaces sharedSpaces userRole />
```

### Contenu visible

- **Grille d'espaces** : cards avec icône, nom, description
- **Dossiers imbriqués** : hiérarchie par space → parent folder → children
- **Compteurs** : documents, membres (userMembers + groupMembers)
- **Actions** : créer espace, créer dossier, upload document, supprimer
- **Espaces partagés** : section séparée, filtrés par `isVisible()`

### Défauts visuels

- Design très utilitaire — pas de palette NouveLLM cohérente
- Utilise `border-[#D8D8D8]` standard mais manque de polish
- Pas de variante "empty state" stylisée avec illustration
- Pas de chargement squelettique (loading.tsx ?)
- Pas de pagination ou virtualisation pour les listes de documents

---

## ÉTAPE 4 — Page Séances (/sessions)

**Fichier :** `app/sessions/page.tsx` (Client Component)

### Structure du layout

```
min-h-screen bg-[#FAFAFA] p-3 sm:p-6
  div.max-w-4xl.mx-auto.space-y-4
```

### Header

```
flex items-start sm:items-center justify-between gap-3 flex-wrap
├── Titre
│   ├── "Mes Séances" (Gilroy 800, clamp(1.1rem, 4vw, 1.3rem), #0D0D0D)
│   └── "X séance(s) active(s)" (Source Serif Pro, 0.82rem, #8A8A8A)
│
└── Actions
    ├── ← Retour
    │   (rounded-lg, bg-[#E8E9F8], color-[#00068D], hover:bg-[#D0D2F0])
    │   (font-size: var(--text-xs), minHeight: 40, borderRadius: 8)
    │
    ├── NOUVELLE SÉANCE
    │   (bg-[#00068D], color-white, rounded-xl, min-h-[44px])
    │   (text-sm Tailwind, Gilroy 800)
    │   → mobile : texte "Nouvelle"
    │
    └── IMPORTER
        (border border-[#D8D8D8], rounded-xl, color-[#5A5A5A])
        (hover:bg-[#F2F2F2], text-sm)
        (input file .json caché)
```

### Empty state (quand `sessions.length === 0`)

```
bg-white rounded-xl border border-[#D8D8D8] px-8 py-14 text-center
├── SVG illustration (88×72, bleu/blanc — document + personnes)
├── h2 "Créez votre première Séance IA"
│   (Gilroy 800, 1.15rem, #0D0D0D, marginBottom: 0.6rem)
├── p description
│   (Source Serif Pro, 0.88rem, #5A5A5A, maxWidth: 28rem, lineHeight: 1.6)
├── Bouton "Nouvelle Séance"
│   (bg-[#00068D], rounded-xl, min-h-[44px], font-size: 0.85rem)
└── Lien "Voir les scénarios disponibles →"
    (Gilroy 300, 0.78rem, color-[#2B2EB8])
```

### Session cards

#### SessionCard component (inline dans le même fichier)

```
div (bg-white rounded-xl border border-[#D8D8D8] p-3 sm:p-5)
  └── flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3
      │
      ├── Info (flex-1 min-w-0)
      │   ├── Nom (Gilroy 800, 0.95rem, #0D0D0D)
      │   ├── Row: status badge + expirée badge + code
      │   │   ├── Status badges (text-[10px], px-2 py-0.5, rounded-full, border)
      │   │   │   ACTIVE   → bg-[#E8F5E9] text-[#2E7D32] border-[#A5D6A7]
      │   │   │   SUSPENDED→ bg-[#FFF8E1] text-[#F57F17] border-[#FFD54F]
      │   │   │   CLOSED   → bg-[#F2F2F2] text-[#8A8A8A] border-[#D8D8D8]
      │   │   └── Expirée → bg-red-50 text-red-500 border-red-200
      │   │   └── Code → font-mono text-xs bg-[#F2F2F2] px-2 py-0.5 rounded text-[#5A5A5A]
      │   ├── Métadonnées
      │   │   (Source Serif Pro, 0.75rem, #8A8A8A)
      │   │   • X participant(s) • X tokens • Expire le date
      │   └── Agent/Source badges (flex-wrap gap-1)
      │       ├── Agent : text-[10px] px-2 py-0.5 rounded bg-[#E8E9F8] text-[#00068D]
      │       └── Source : text-[10px] px-2 py-0.5 rounded bg-[#F2F2F2] text-[#5A5A5A]
      │
      └── Actions (flex items-center gap-2 flex-wrap flex-shrink-0 mt-2 sm:mt-0)
          ├── Dashboard
          │   (border border-[#2B2EB8], bg-[#E8E9F8], hover:bg-[#D4D5F5])
          │   (text-[11px], Gilroy 800, color-[#00068D])
          ├── Lien (copie)
          │   (border border-[#D8D8D8], text-[11px], Gilroy 300)
          │   (copié → checkmark + "Copié")
          ├── SUSPENDRE / RÉACTIVER
          │   (border, text-[11px], Gilroy 800, color-[#5A5A5A])
          ├── DUPLIQUER
          │   (idem SUSPENDRE)
          └── FERMER
              (border-red-200, text-red-500, text-[11px], Gilroy 800)
```

**CLOSED sessions** : `opacity-60`, uniquement bouton DUPLIQUER.

### Toast

```
fixed bottom-6 left-1/2 -translate-x-1/2 z-50
flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-md
text-[12px] whitespace-nowrap
Gilroy 800

├── Success : bg-[#E8F5E9] border-[#A5D6A7] text-[#2E7D32]
└── Error   : bg-red-50 border-red-200 text-red-700
```

### Tri et filtrage

- **Actives** = ACTIVE + SUSPENDED (par ordre décroissant de création ? — pas de sort explicite)
- **Fermées** = CLOSED
- Séparateur : label "Séances fermées" (Gilroy 800, `0.65rem`, uppercase, `#C8C8C8`)

### Incohérences identifiées

| Valeur | Usage | Token existant |
|--------|-------|----------------|
| `0.65rem` | Label "Séances fermées" | `--text-2xs: 11px` |
| `0.75rem` | Métadonnées session | `--text-xs: 13px` |
| `0.78rem` | Lien empty state | `--text-xs: 13px` |
| `0.82rem` | Sous-titre "X séances actives" | `--text-sm: 14px` |
| `0.85rem` | Bouton empty state | `--text-sm: 14px` |
| `0.88rem` | Description empty state | `--text-sm: 14px` |
| `0.95rem` | Nom session card | `--text-base: 16px` |
| `1.15rem` | Titre empty state | `--text-md: 18px` |
| `clamp(1.1rem, 4vw, 1.3rem)` | Titre page | `--text-lg: 22px` |
| `text-[11px]` | Boutons actions | `--text-2xs: 11px` ✅ mais pas la variable |
| `text-[12px]` | Toast | `--text-2xs: 11px` ou `--text-xs: 13px` |
| `font-size: text-sm` | Boutons header | Mélange Tailwind + inline |

**Autres :**
- `bg-[#D0D2F0]` hover bouton Retour → unique dans l'app (ailleurs `#F0F1FB`, `#D4D5F5`, `#E8E9F8`)
- `border-radius: 8` sur Retour → `rounded-xl` (12px) partout ailleurs
- Les badges agents utilisent `text-[10px]` vs `.nl-token-agent` (CSS class, même valeur)
- CLOSED sessions opacité 60% → pas de composant disabled global

---

## ÉTAPE 5 — Dashboard séance (/sessions/[id])

**Fichier :** `app/sessions/[id]/page.tsx` (Client Component)

### Structure

```
min-h-screen bg-[#FAFAFA] p-6
  div.max-w-3xl.mx-auto.space-y-5
```

### Header

```
flex items-center gap-3
├── ← (p-2 rounded-lg hover:bg-[#F2F2F2])
├── div.flex-1
│   ├── flex items-center gap-2
│   │   ├── h1 : Nom (Gilroy 800, 1.3rem, #0D0D0D)
│   │   ├── Status badge (identique page séances)
│   │   └── Expirée badge (si applicable)
│   └── p légende
│       (Source Serif Pro, 0.8rem, #8A8A8A)
│       "Code : [code] · Créée le [date]"
└── Export JSON
    (border border-[#D8D8D8], text-[11px], Gilroy 800, color-[#5A5A5A])
```

### Stats cards

```
grid grid-cols-4 gap-3
  └── Card (bg-white rounded-xl border border-[#D8D8D8] p-4 text-center)
      ├── Valeur (Gilroy 800, 1.4rem, #0D0D0D)
      └── Label (Source Serif Pro, 0.72rem, #8A8A8A)
```

Stats : Connectés (X/Y) | Conversations | Messages | Tokens
Disclaimer : "Les participants invités... ne sont pas comptabilisés" (0.7rem, #C8C8C8, italic)

### Analytics block (visibility ≥ 1)

```
bg-white rounded-xl border border-[#D8D8D8] p-5
├── Titre "📊 Activité de la session (anonyme)"
│   (Gilroy 800, 0.7rem, uppercase, #5A5A5A)
├── Grid 3 colonnes stats
│   └── Étudiants actifs / Messages / Durée moyenne
├── Mots-clés (flex-wrap gap-1.5 tags)
└── Blocages (warning si analytics.blockingMoments > 0)
```

### Signal Phase 2

Bouton rouge (bg-red-600) — seulement pour scénarios avec `hasBroadcast` (ex: "Le miroir des lacunes").

### Infrastructure cards (grid 2 colonnes)

```
grid grid-cols-1 sm:grid-cols-2 gap-4
├── Scénario card
│   (bg-white rounded-xl border border-[#D8D8D8] p-5)
│   ├── icône + label
│   └── agents badges
│
└── Visibilité card
    (bg-white rounded-xl border border-[#D8D8D8] p-5)
    ├── icône + label + description
    └── statut confidentiel (si visibilité = 0)
```

### Sections texte

- **Consigne étudiants** (optionnelle) : Source Serif Pro `0.85rem`, `#3A3A3A`, `lineHeight 1.6`
- **Prompt pédagogique** : collapsible (chevron SVG rotatif), contenu `<pre>` fond `#FAFAFA`

### Lien de session

```
bg-[#E8E9F8] rounded-xl p-4
├── Titre "Lien de la session" (Gilroy 800, 0.68rem, uppercase, #00068D)
└── URL font-mono text-[12px] text-[#00068D]
```

### Incohérences

| Valeur | Où |
|--------|-----|
| `0.68rem` | Titre lien session |
| `0.7rem` | Titre analytics, disclaimer |
| `0.72rem` | Labels stats |
| `0.8rem` | Légende header |
| `0.82rem` | (ailleurs dans l'app) |
| `0.85rem` | Consigne étudiants |
| `1.3rem` | Titre |
| `1.4rem` | Valeurs stats |
| `text-[11px]` | Bouton export (ailleurs dans l'app c'est 0.85rem) |
| `text-[12px]` | Lien session (ailleurs 0.65rem) |

- Bouton ← : `p-2` sans fond ≠ bouton Retour sessions (`px-4 bg-[#E8E9F8]`)
- `max-w-3xl` (768px) ≠ `max-w-4xl` sessions (896px)
- `p-6` ≠ `p-3 sm:p-6` sessions

---

## ÉTAPE 6 — Page étudiant (/session/[code])

**Fichier :** `app/session/[code]/page.tsx` (Client Component)

### Structure générale

```
min-h-screen bg-[#FAFAFA] flex flex-col
```

### États d'écran

#### 1. Loading

```
Spinner centré : border-2 border-[#00068D] border-t-transparent rounded-full animate-spin
```

#### 2. Erreur (fermée / pleine / introuvable)

```
bg-white rounded-2xl border border-[#D8D8D8] p-8 max-w-sm
├── Icône SVG (cadenas / users / cercle-info)
├── Titre (Gilroy 800, 1rem, #0D0D0D)
└── Description (Source Serif Pro, 0.85rem, #8A8A8A)
```

#### 3. Guest landing (pas connecté)

```
bg-white rounded-2xl border border-[#D8D8D8] p-8 max-w-md w-full space-y-6
├── Logo NouveLLM (étoile SVG)
├── Titre séance (Gilroy 800, 1.3rem)
├── Description / consigne (Source Serif Pro, 0.78rem)
├── Banner visibilité (px-4 py-3 rounded-xl, couleurs par niveau)
├── Champs prénom + nom
│   (w-full px-4 py-3 rounded-xl border border-[#D8D8D8], bg-[#FAFAFA])
├── Bouton "REJOINDRE L'ACTIVITÉ"
│   (bg-[#00068D], rounded-xl, w-full py-3)
└── Lien "Se connecter" (#2B2EB8)
```

#### 4. Join gate (connecté)

Idem guest mais sans formulaire prénom/nom, avec détails séance + banner visibilité.

#### 5. Chat session

```
h-screen flex flex-col
├── Banner séance
│   (bg-white border-b border-[#D8D8D8] px-5 py-2.5)
│   ├── Nom + code
│   └── Export MD (guest only)
│
├── Agent selector (si > 1 agent)
│   (flex gap-2 px-5 py-2 border-b bg-white overflow-x-auto)
│   ├── Actif : bg-[#00068D] text-white
│   └── Inactif : bg-[#F2F2F2] text-[#5A5A5A] hover:bg-[#E8E9F8]
│
├── Messages (flex-1 overflow-y-auto px-5 py-6 space-y-6)
│   ├── Empty → "Posez votre première question…"
│   │   (Source Serif Pro, 0.9rem, #C8C8C8)
│   └── Utilise <Message> composant
│
├── Input (border-t border-[#D8D8D8] bg-white px-5 py-4)
│   └── max-w-3xl mx-auto
│       ├── textarea (rounded-xl border, bg-[#FAFAFA])
│       │   (font-family: Source Serif Pro, min-height: 44px, max-height: 160px)
│       │   (focus:ring-2 focus:ring-[#2B2EB8])
│       └── bouton envoi (w-11 h-11 rounded-xl bg-[#00068D])
│
└── Visibility banner (footer)
    (px-5 py-1.5, fond par niveau + border-t)
    + disclaimer "Cette séance ne donne pas lieu à une notation"
```

### Export Markdown

Construit manuellement en JS (blob → download). Disponible seulement pour les guests. Inclut : titre, date, nom, messages. Pas disponible pour les étudiants connectés.

### Incohérences

| Valeur | Où | Token |
|--------|-----|-------|
| `0.7rem` | Banner infos | `--text-2xs` |
| `0.78rem` | Description séance | `--text-xs` |
| `0.85rem` | Description erreur | `--text-sm` |
| `0.9rem` | Empty messages | `--text-base` |
| `min-height: 44px` | Textarea | `--input-min-h: 80px` |

- **L'input textarea du session chat n'utilise PAS `<ChatInput>`** — c'est un `<textarea>` brut avec logique send/streaming entièrement dupliquée
- Les styles `bg-[#FAFAFA]` (fond input session) diffèrent de `bg-white` (chat area principale)
- `max-w-3xl mx-auto` ≠ `max-w-[760px]` chat area
- `rounded-2xl` (16px) sur les cards du guest landing ≠ `rounded-xl` (12px) partout ailleurs
- Pas de `md:` préfixe — l'interface semble principalement mobile-first, sans adaptation desktop spécifique
- Le `h-screen` sans footer diffère de l'app principale qui a un layout `flex flex-col h-screen` avec Header + Footer

---

## ÉTAPE 7 — Header desktop

**Fichier :** `components/layout/Header.tsx` (Client Component)

### Structure desktop

```
header (bg-white border-b border-[#D8D8D8] z-10 flex-shrink-0)
  (quand !mobileConversationMode → flex items-center justify-between px-6 h-[56px] md:h-[60px])

├── Gauche (flex items-center gap-2)
│   ├── Croix SVG (bg-[#00068D] w-8 h-8 rounded-lg)
│   ├── "NouveLLM" (Gilroy 800, var(--text-md)=18px, #00068D)
│   ├── | séparateur (w-px h-4 bg-[#D8D8D8])
│   └── "UNIVERSITÉ SORBONNE NOUVELLE"
│       (Gilroy 300, var(--text-xs)=11px, #8A8A8A, uppercase)
│
└── Droite (flex items-center gap-2)
    ├── ADMIN badge (si role=ADMIN)
    │   (Gilroy 800, var(--text-xs), bg-[#00068D], text-white, rounded-lg px-2.5 py-1)
    │
    └── User chip (flex items-center gap-2)
        (rounded-lg bg-[#F2F2F2] border-[#D8D8D8] px-2.5 py-1.5)
        (cursor:pointer → ouvre settings modal)
        ├── Avatar (w-7 h-7 bg-[#00068D] rounded-full text-white flex items-center justify-center)
        │   = initiales (Gilroy 800, var(--text-2xs))
        ├── User info (hidden md:block)
        │   ├── Nom (Source Serif Pro, var(--text-sm)=13px, #0D0D0D)
        │   └── Rôle (Gilroy 300, var(--text-xs)=11px, uppercase, #8A8A8A)
        └── Chevron down SVG (hidden md:block)
```

### Structure mobile (conversation mode)

```
header (h-[56px])
├── Hamburger (w-11 h-11 -ml-2)
├── Centre
│   ├── Agent badge (bg-[#E8E9F8] border-[#C5C7F0]) si agent actif
│   └── "★ NouveLLM" (fontSize: 14 étoile + var(--text-sm) nom)
└── ··· menu options (w-11 h-11 -mr-2)
    → ouvre mobileCtxOpen dropdown
    → settings / déconnexion
```

### Settings modal

```
fixed inset-0 z-50 flex items-center justify-center
bg-black/40 backdrop-blur-sm
  └── div (max-w-[560px] w-[95vw] bg-white rounded-2xl shadow-xl)
      (max-h-[88vh] flex flex-col)
      ├── Header
      │   ├── Bouton ← (mobile only)
      │   └── "Paramètres" (Gilroy 800, var(--text-lg)=22px)
      ├── Tabs
      │   ├── MÉTA-PROMPTS
      │   ├── MON PROFIL
      │   │   → Formulaire : discipline, rôle exact, UFR, niveaux, langues
      │   ├── MES SOURCES
      │   │   → Checkbox sources académiques, connecteurs (Notion)
      │   └── MES DONNÉES
      │       → Supprimer conversations, supprimer compte
      └── Footer "Mentions légales"
```

### Logo incohérent

| Contexte | Visuel | Taille | Couleur |
|---|---|---|---|
| Desktop header | **Croix SVG** (6 paths) | w-8 h-8 | bg-[#00068D] |
| Mobile header | **★ étoile** (texte unicode) | fontSize: 14 | #00068D |
| Empty state | **Croix SVG** (identique desktop) | w-16 h-16 | bg-[#00068D] |
| Messages assistant | **Croix SVG** (identique) | w-8 h-8 | bg-[#00068D] |

→ **Deux marques différentes** selon le contexte : croix (desktop) vs étoile (mobile).

### Points notables

- Le component gère **tout** le state settings (profile, sources, meta-prompts, data) dans un seul fichier de **900+ lignes**
- `backdrop-blur-sm` et `bg-black/40` (Tailwind) mélangés avec des styles inline
- `max-w-[560px]` ≠ `max-w-md` (login) ≠ `max-w-xl` (empty state)
- `--header-h: 60px` cohérent avec les variables CSS ✅

---

## ÉTAPE 8 — Sidebar desktop

**Fichier :** `components/sidebar/Sidebar.tsx` (Client Component)

### Structure desktop (mode `!inDrawer`)

```
div (border-r border-[#D8D8D8] bg-[#FAFAFA] flex-shrink-0)
  width: var(--sidebar-w) = 288px
  flex flex-col

├── New conversation (p-2.5 border-b border-[#D8D8D8])
│   └── Bouton (justify-center, padding: 8px 12px, border, bg-white)
│       (Gilroy 800, var(--text-xs), letter-spacing 0.05em, color: #0D0D0D)
│       (icône + "NOUVELLE CONVERSATION")
│
├── Conversations list (flex-1 overflow-y-auto nl-scroll py-1)
│   └── Pour chaque conversation :
│       a href=/c/[id]
│       (border-l-2, px-3 py-3, display: flex flex-col)
│       ├── Actif : bg-[#E8E9F8], border-l-[#00068D]
│       ├── Inactif : border-l-transparent, hover bg-[#F2F2F2], hover border-l-[#D8D8D8]
│       ├── Titre (Source Serif Pro, var(--text-base)=16px, #0D0D0D, line-clamp-2)
│       ├── Badge agent + date (flex-wrap gap-1.5)
│       │   ├── Badge : var(--text-2xs), bg/couleur par slug (Record AGENT_BADGE_COLORS)
│       │   └── Date : Gilroy 300, var(--text-2xs), #8A8A8A
│       └── Hover → bouton supprimer (w-5 h-5, SVG poubelle)
│           → Confirm : "Supprimer ?" + Oui/Non (bg-red-50)
│
└── Footer links (border-t border-[#C8C8C8] px-2 py-2 flex flex-col gap-1)
    ├── "Mes dossiers"
    │   (bg-[#E8E9F8], hover:bg-[#00068D], hover:text-white, minHeight: 52px)
    │   (Gilroy 800, var(--text-xs), icône dossier SVG)
    └── "Séances"
        (idem — icône calendrier SVG)
```

### Mode drawer mobile (`inDrawer=true`)

```
width: 280
├── Search bar (height: 36, bg-[#F2F2F2])
├── New conversation (bg-[#00068D], color white)
├── Nav links : Mes dossiers / Séances
├── Conversations groupées
│   Aujourd'hui / Hier / Cette semaine / Plus ancien
└── Paramètres (fixed bottom)
```

### AGENT_BADGE_COLORS

```javascript
const AGENT_BADGE_COLORS = {
  analyse:       { bg: '#E8E9F8', color: '#00068D' },
  redaction:     { bg: '#E8F5E9', color: '#2E7D32' },
  traduction:    { bg: '#FFF8E1', color: '#F57F17' },
  bibliographie: { bg: '#F3E5F5', color: '#7B1FA2' },
  examen:        { bg: '#FBE9E7', color: '#BF360C' },
}
// fallback : { bg: '#E8E9F8', color: '#00068D' }
```

### Incohérences

- `border-[#C8C8C8]` sur le footer — **seul endroit** de l'app qui utilise ce gris (partout ailleurs : `#D8D8D8`)
- Le bouton "NOUVELLE CONVERSATION" n'est **pas** stylé comme "NOUVELLE SÉANCE" (border + bg-white vs bg-[#00068D])
- `minHeight: 52px` hardcodé pour les links footer — aucune variable CSS
- La sidebar desktop n'a **pas** de barre de recherche (contrairement à la version drawer mobile)
- Les "Paramètres" sont accessibles depuis le header (user chip) mais pas depuis la sidebar desktop → divergence d'accès
- Mode drawer étudiant : uniquement Paramètres, pas de conversations list

---

## ÉTAPE 9 — Admin (/admin)

### Dashboard admin

**Fichiers :** `app/admin/page.tsx` (Server) + `AdminDashboardClient.tsx` (Client)

#### Server Component

```typescript
// Requêtes Prisma :
// - indexingJob counts (queued, processing, completed today, failed)
// - conversation count (month)
// - user count (total)
// - messages → tokens, agentStats, feedback
// - userGroups → tokensByGroup
```

#### Client Component

```
space-y-6 max-w-5xl
├── Header
│   ├── "Tableau de bord" (Gilroy 800, 1.3rem, #0D0D0D)
│   ├── "Métriques agrégées · [mois]" (Source Serif Pro, 0.82rem, #8A8A8A)
│   └── EXPORT CSV ANR
│       (border, bg-white, hover:bg-[#F0F1FB] hover:border-[#2B2EB8])
│
├── 4 KPI cards (grid-cols-2 sm:grid-cols-4)
│   └── StatCard (bg-white rounded-xl border p-5)
│       ├── Label (Gilroy 300, 0.65rem, uppercase, #8A8A8A)
│       ├── Value (Gilroy 800, 1.8rem, #00068D, letter-spacing -0.02em)
│       └── Sub (Source Serif Pro, 0.75rem, #8A8A8A)
│
├── Top 5 agents (table)
│   ├── Agent | Sessions | Tokens | 👍 / 👎
│   └── badge agent + stats
│
└── Tokens par groupe
    (barres horizontales, div width %)
```

### Sous-pages admin

- `/admin/agents`, `/admin/users`, `/admin/groups`, `/admin/routing`
- `/admin/sources`, `/admin/integrations`, `/admin/knowledge-bases`
- `/admin/diplomes`, `/admin/workflows`

**Aucune** n'a de layout admin commun — chaque page gère son propre header et sa navigation.

### Incohérences

| Valeur | Usage |
|--------|-------|
| `0.65rem` | Labels StatCard |
| `0.75rem` | Sub StatCard |
| `0.82rem` | Sous-titre |
| `1.3rem` | Titre |
| `1.8rem` | Valeur KPI |

- Pas de sidebar admin — chaque page fait son propre layout
- `StatCard` défini en inline dans `AdminDashboardClient.tsx` — pas réutilisable
- `max-w-5xl` (1024px) ≠ `max-w-4xl` (sessions) ≠ `max-w-3xl` (dashboard séance)
- `bg-[#FAFAFA]` sur les pages séances mais pas sur admin (dashboard admin n'a pas de fond de page explicite — hérité du `min-h-screen` ?)

---

## ÉTAPE 10 — Composants partagés

### Librairies installées

| Librairie | Version | Usage réel |
|---|---|---|
| shadcn | 4.7.0 | Installé mais **aucun composant importé** dans les pages |
| @radix-ui | — | Non installé |
| framer-motion | — | Non installé |
| react-aria | — | Non installé |
| Icônes | — | **Aucune librairie** — tout est SVG inline |

### Composants UI shadcn (inutilisés)

Dans `components/ui/` :
- `badge.tsx`, `button.tsx`, `input.tsx`, `separator.tsx`, `textarea.tsx`

Aucun importé dans les pages réelles — tout est en style inline ou classes Tailwind.

### Composants customs

#### ProcessingState

**Fichier :** `components/chat/ProcessingState.tsx`

```typescript
// Steps animés :
// - 1400ms intervalle par défaut
// - 2000ms pour web, 2500ms pour academic, 3000ms pour all
// - Steps par agent (bibliographie, module, fiche-cours, examen, traduction, briefing)
// - Steps par sourceMode (academic, web, all)
// - Notes temporelles optionnelles

space-y-2 py-1
├── Step vérifié : checkmark SVG (stroke #2B2EB8)
├── Step en cours : nl-spinner + texte (#3A3A3A)
│   (font-family: Source Serif Pro, font-size: 0.8rem)
└── Note : font-size: 11, color: #5A5A6A
```

**Problèmes :** `font-size: 0.8rem` hardcodé, `font-size: 11` hardcodé (pas en `px` ou `rem`).

#### SourcesBlock

**Fichier :** `components/chat/SourcesBlock.tsx`

```
mt-3 pt-3 border-t border-[#D8D8D8]
├── États vides
│   ├── Document : "📄 Réponse basée sur le document fourni"
│   ├── Académique (aucune) : "🔬 Recherche académique — aucune source trouvée"
│   ├── Académique (trouvée) : "🎓 Sources académiques consultées"
│   ├── Web : "🌐 Réponse basée sur le web"
│   ├── All : "⚡ Sources combinées consultées"
│   └── Générique : "Réponse basée sur les connaissances générales"
│
└── Liste sources
    ├── Badge numéro (w-5 h-5 rounded, bg-[#E8E9F8], #00068D)
    ├── Icône (🌐 si web, sinon icône source)
    ├── Tag (if present : bg-[#E8E9F8] border-[#2B2EB8])
    ├── Titre (Source Serif Pro, var(--text-sm), hover #00068D)
    ├── Domaine (lien ↗, #2B2EB8 underline)
    └── Hover tooltip (excerpt, max-width 320px, shadow, border, pointeur CSS)
```

**✅ Utilise `var(--text-xs)`, `var(--text-sm)`, `var(--text-2xs)`** — un des rares composants cohérents.

### Patterns d'events

Communication inter-composants via `window.dispatchEvent(new CustomEvent(...))` :

| Event | Émetteur | Récepteur |
|---|---|---|
| `chat:insert-source` | Sidebar (folder click) | ChatInput (add source token) |
| `nl:open-file-picker` | RoutingPanel / SourceModeSheet | ChatInput (click file input) |
| `nl:open-settings` | Sidebar / Mobile menu | Header (open settings modal) |
| `hil:open` | Message (HIL suggestion) | HILContactPanel |

**Problème :** pas de typage, pas de visibilité sur les payloads.

---

## ÉTAPE 11 — Incohérences globales

### 1. Typographie — 15+ valeurs hardcodées

Les tokens `--text-*` (2xs=11px, xs=13px, sm=14px, base=16px, md=18px, lg=22px, xl=28px) sont disponibles mais **ignorés** dans la plupart des pages.

| Valeur hardcodée (rem) | Usage | Token existant |
|---|---|---|
| `0.65rem` (10.4px) | Labels séances fermées, admin | `--text-2xs: 11px` |
| `0.68rem` (10.9px) | Titre lien session | `--text-2xs: 11px` |
| `0.7rem` (11.2px) | Analytics, disclaimer dashboard | `--text-2xs: 11px` |
| `0.72rem` (11.5px) | Labels stats dashboard | `--text-xs: 13px` |
| `0.75rem` (12px) | Métadonnées session | `--text-xs: 13px` |
| `0.78rem` (12.5px) | Liens divers | `--text-xs: 13px` |
| `0.8rem` (12.8px) | Légendes | `--text-xs: 13px` |
| `0.82rem` (13.1px) | Sous-titres | `--text-sm: 14px` |
| `0.85rem` (13.6px) | Boutons, consignes | `--text-sm: 14px` |
| `0.88rem` (14px) | Descriptions | `--text-sm: 14px` |
| `0.9rem` (14.4px) | Empty messages session | `--text-base: 16px` |
| `0.95rem` (15.2px) | Nom session card | `--text-base: 16px` |
| `1.15rem` (18.4px) | Titre empty state sessions | `--text-md: 18px` |
| `1.3rem` (20.8px) | Titres dashboard | `--text-lg: 22px` |
| `1.4rem` (22.4px) | Stats values dashboard | `--text-lg: 22px` |
| `1.5rem` (24px) | Titre empty state chat | `--text-xl: 28px` |
| `1.75rem` (28px) | Titre login | `--text-xl: 28px` |
| `1.8rem` (28.8px) | Valeur KPI admin | `--text-xl: 28px` |

**Seuls** ces composants utilisent `var(--text-*)` :
- `Message.tsx` ✅ (timestamps, labels, noms)
- `Header.tsx` ✅ (noms, rôles, labels)
- `Sidebar.tsx` ✅ (conversations, badges, dates)
- `SourcesBlock.tsx` ✅ (sources list)
- `ChatInput.tsx` ✅ (boutons)
- `ConversationPage.tsx` ✅ (EmptyState)

### 2. Couleurs — 3+ versions d'un même gris

| Sémantique | Valeurs différentes | Où |
|---|---|---|
| **Fond de page** | `#FAFAFA` / `#F2F2F2` | Sessions vs Login |
| **Texte secondaire** | `#8A8A8A` / `#5A5A5A` / `#6B6B6B` | 3 nuances |
| **Bordure** | `#D8D8D8` / `#C8C8C8` / `#E8E8E8` / `#F0F0F0` | 4 valeurs |
| **Hover bleu** | `#D0D2F0` / `#D4D5F5` / `#F0F1FB` / `#F4F4F8` | Non uniforme |
| **Texte gris pâle** | `#C8C8C8` / `#D8D8D8` | Disclaimer vs bordures |
| **Code session** | `#5A5A5A` / `#00068D` | Sessions vs Dashboard |
| **Bleu ProConnect** | `#003189` | Login seulement |

Les tokens `--color-nl-*` existent (deep, mid, light, subtle, dark, mid, light, off-white, green) mais ne sont **pas utilisés en variables** — uniquement en hex inline.

### 3. Max-widths incohérents

| Page | Valeur | Équivalent |
|---|---|---|
| Messages chat | `max-w-[760px]` | — |
| Input session | `max-w-3xl` | 768px |
| Page séances | `max-w-4xl` | 896px |
| Dashboard séance | `max-w-3xl` | 768px |
| Admin dashboard | `max-w-5xl` | 1024px |
| Login card | `max-w-md` | 448px |
| Settings modal | `max-w-[560px]` | — |

### 4. Composants dupliqués

| Fonctionnalité | Implémentation A | Implémentation B |
|---|---|---|
| **Input zone de chat** | `<ChatInput>` complet (textarea + toolbar + @ + # + 4 modes) | Session : `<textarea>` brut avec gestion manuelle |
| **Streaming messages** | `<Message>` avec actions, sources, feedback | Session : même `<Message>` mais layout différent |
| **Toast/notification** | Sessions : composant local `fixed bottom-6` avec timeout 3.5s | Chat area : pas de toast |
| **Bouton retour ←** | Sessions : `rounded-lg bg-[#E8E9F8] px-4` | Dashboard : `p-2 rounded-lg hover:bg-[#F2F2F2]` |
| **Export** | Dashboard : JSON structuré (version 1) | Session guest : Markdown manuel |
| **Stats cards** | Admin : `StatCard` inline (label/value/sub) | Dashboard séance : grid inline (même structure) |
| **Badges** | `.nl-token-agent` (CSS class) / `text-[10px] px-2 py-0.5 rounded` (inline) | 2 implémentations parallèles |

### 5. Avatar utilisateur — 3 tailles

| Contexte | Taille | Fond |
|---|---|---|
| Header desktop | `w-7 h-7` | `bg-[#00068D]` |
| Messages desktop | `w-8 h-8` | User: `bg-[#E8E9F8]` / Assistant: `bg-[#00068D]` |
| Sidebar settings | `w-10 h-10` | `bg-[#00068D]` |

### 6. Placeholders et incomplet

1. **Bouton CAS login** : retiré du DOM (`{false && ...}`), commentaire "Juin 2026 — non déployé"
2. **Logo** : croix (desktop) ≠ étoile (mobile) — deux marques
3. **Dark mode** : aucune variable CSS `@media (prefers-color-scheme: dark)`
4. **Responsive >1440px** : tout en max-width fixe — rien pour larges écrans
5. **Librairie d'icônes** : 30+ SVG inline différents, pas de composant `<Icon>` partagé
6. **Layout admin** : chaque sous-page gère son propre header/navigation
7. **Animations** : uniquement `transition-all` basique — pas de framer-motion, pas d'entrée/sortie
8. **Police Gilroy** : utilisée partout mais sans `@font-face` visible dans `globals.css` — importée comment ?
9. **Duplication streaming** : la logique SSE (`reader.read()`, parsing `data:` events) est écrite **3 fois** (ConversationPage, SessionPage, et potentiellement ailleurs)

---

*Fin du rapport d'audit UX/UI.*
*24 mai 2026 — NouveLLM Desktop.*
