# AUDIT UX/UI — Zone de chat desktop

> Audit de la zone de chat desktop NouveLLM.
> Lecture seule — rien n'a été modifié.
> Date : 2026-05-24

---

## Table des matières

1. [ChatInput desktop](#-1--chatinput-desktop)
2. [EmptyState desktop](#-2--emptystate-desktop)
3. [ConversationPage — Layout principal](#-3--conversationpage--layout-principal)
4. [Messages desktop](#-4--messages-desktop)
5. [Footer desktop](#-5--footer-desktop)
6. [Variables CSS et design tokens](#-6--variables-css-et-design-tokens)
7. [SourcesBlock](#-7--sourcesblock)
8. [ProcessingState](#-8--processingstate)
9. [Incohérences identifiées](#-9--incohérences-identifiées)

---

## 🏠 ÉTAPE 1 — ChatInput desktop

**Fichier :** `components/input/ChatInput.tsx`

### Container principal

```tsx
<div className="relative bg-white md:border-t md:border-[#D8D8D8] md:px-6 md:pb-4 flex-shrink-0">
```

Classes CSS appliquées :
- `relative` — pour le positionnement des popovers/palettes
- `bg-white`
- `md:border-t md:border-[#D8D8D8]` — trait de séparation avec la zone de messages
- `md:px-6` — padding horizontal 24px
- `md:pb-4` — padding bas 16px
- `flex-shrink-0` — empêche le rétrécissement dans le flex layout

### Conteneur textarea + toolbar

```tsx
<div className="hidden md:block">
  // ← invisible sur mobile, visible desktop
  <div className="mt-3 flex flex-col rounded-xl border border-[#D8D8D8] bg-white
                md:focus-within:ring-2 md:focus-within:ring-[#2B2EB8]
                md:focus-within:border-transparent transition-all overflow-hidden">
```

Structure :
```
rounded-xl (12px)
border border-[#D8D8D8]
focus-within:ring-2 ring-[#2B2EB8]
focus-within:border-transparent
transition-all overflow-hidden
```

### Textarea

```tsx
<textarea
  ref={textareaRef}
  value={text}
  onChange={(e) => handleTextChange(e.target.value)}
  onKeyDown={handleKeyDown}
  placeholder="Posez votre question…"
  rows={1}
  disabled={disabled}
  className="w-full px-4 pt-3 pb-2 bg-transparent resize-none
             text-[#0D0D0D] placeholder:text-[#8A8A8A]
             focus:outline-none disabled:opacity-50 leading-relaxed"
  style={{
    fontFamily: 'Source Serif Pro, Georgia, serif',
    fontSize: 'var(--text-base)',
    minHeight: 'var(--input-min-h)',
    maxHeight: 200,
  }}
/>
```

- `rows={1}` — auto-resize via JS
- `min-height: var(--input-min-h)` = **80px**
- `max-height: 200px`
- `font-size: var(--text-base)` = **16px**
- `font-family: Source Serif Pro`
- Padding : `px-4 pt-3 pb-2`

### Toolbar (📎 @ # actions)

```tsx
<div className="flex items-center justify-between px-3 pb-2">
  ├── Gauche : flex items-center gap-1
  │   ├── 📎 Attacher fichier
  │   │   w-8 h-8 rounded-lg text-[#8A8A8A]
  │   │   hover:bg-[#FFF8E1] hover:text-[#F57F17]
  │   │   disabled:opacity-30
  │   │   accept: .pdf,.doc,.docx,.txt,.md,.csv,.xls,.xlsx,.ppt,.pptx
  │   │
  │   ├── @ Agent
  │   │   w-8 h-8 rounded-lg text-[#8A8A8A]
  │   │   hover:bg-[#E8E9F8] hover:text-[#00068D]
  │   │
  │   ├── # Source
  │   │   w-8 h-8 rounded-lg text-[#8A8A8A]
  │   │   hover:bg-[#e8f5e9] hover:text-[#2e7d32]
  │   │
  │   └── ✕ Effacer (visible si hasContent)
  │       w-8 h-8 rounded-lg text-[#8A8A8A]
  │       hover:bg-red-50 hover:text-red-500
  │
  └── Droite : flex items-center gap-2
      ├── Compteur meta-prompts (si popoverOpen)
      └── STOP / ENVOYER
```

#### Bouton ENVOYER / STOP

```tsx
// STOP (quand disabled = streaming)
bg-[#EF4444]
px-4 py-2 rounded-lg text-white
Gilroy 800, font-size: var(--text-xs), letter-spacing: 0.04em
// Icône carré rouge

// ENVOYER (quand !disabled)
px-4 py-2 rounded-lg text-white
font-weight: semibold → 600
Gilroy 800, font-size: var(--text-xs), letter-spacing: 0.04em
├── Actif (hasContent=true) : bg-[#00068D]
└── Désactivé : bg-[#D8D8D8], opacity-40, cursor-not-allowed
```

### Barre de mode source

```tsx
<div className="border-t border-[#F0F0F0] px-3 py-2">
  <div className="flex items-center overflow-x-auto" style={{ gap: 5 }}>
    └── 5 boutons : Mes docs 📂 | USN 🏛️ | Académique 🎓 | Web 🌐 | Tout ⚡

        Chaque bouton :
        height: 26px
        padding: 0 8px
        border-radius: 13px
        border: 0.5px solid
        mode actif → border = MODE_COLORS[mode].border, bg = MODE_COLORS[mode].bg
        mode inactif → border = #D8D8D8, bg = transparent, color = #8A8A8A
        font-family: Gilroy
        font-weight: 800 (actif) / 300 (inactif)
        font-size: var(--text-2xs)
        white-space: nowrap
        flex-shrink: 0
```

### Couleurs des modes source

```javascript
const MODE_COLORS = {
  docs:     { bg: '#E8E9F8', color: '#00068D', border: '#2B2EB8' },
  usn:      { bg: '#FFF8E1', color: '#E65100', border: '#E65100' },
  academic: { bg: '#E8F5E9', color: '#2E7D32', border: '#2E7D32' },
  web:      { bg: '#E3F2FD', color: '#1565C0', border: '#1565C0' },
  all:      { bg: '#F3E5F5', color: '#6A1B9A', border: '#6A1B9A' },
}
```

### Bouton "+" (attacher)

```tsx
const plusButtonClasses = selectedFile
  ? 'bg-yellow-100 text-yellow-600'
  : ({ docs: 'bg-indigo-100 text-indigo-600', ... })[sourceMode]
```

Couleur du bouton 📎 change selon le mode source (ou devient jaune si fichier attaché).

### Tokens row (badges sélectionnés)

```tsx
// Visibles si : metaPrompt actif OU agent sélectionné OU sources > 0 OU fichier
<div className="flex flex-wrap items-center gap-2 pt-3 pb-1 px-4 md:px-0">
  ├── Meta-prompt badge
  ├── Agent badge
  │   rounded-lg bg-[#E8E9F8] border border-[#2B2EB8]
  │   nl-token-agent, font-size: var(--text-xs)
  │   ✕ pour retirer (w-8 h-8 rounded-full)
  ├── Source badge
  │   bg-[#e8f5e9] border border-[#a5d6a7]
  │   nl-token-source
  ├── File badge
  │   bg-[#FFF8E1] border border-[#FFD54F]
  └── ✕ retirer fichier
```

---

## 🏠 ÉTAPE 2 — EmptyState desktop

**Fichier :** `app/ConversationPage.tsx` (composant inline, pas de fichier séparé)

### Structure

```tsx
<div className="flex flex-col items-center justify-center min-h-full py-16 px-8">
```

### Logo central

```tsx
<div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#00068D] mb-6 shadow-md">
  └── Croix SVG (stroke white, strokeWidth 2.4)
      <path d="M12 3v18M3 12h18" />
      <path d="M5.6 5.6l12.8 12.8M5.6 18.4l12.8-12.8" />
</div>
```

Dimensions : `w-16 h-16` (64×64), `rounded-2xl` (16px), `shadow-md`.

### Titre

```tsx
<h2 style={{
  fontFamily: 'Gilroy, sans-serif',
  fontWeight: 800,
  fontSize: '1.5rem',       // 24px
  letterSpacing: '-0.02em',
  color: '#0D0D0D',
}}>
  Bonjour, comment puis-je vous aider ?
</h2>
```

### Sous-titre

```tsx
<p className="mt-2 text-sm text-[#8A8A8A]"
   style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}>
  Posez une question, ou utilisez un agent <span className="nl-token-agent">@</span>
  pour des tâches structurées
</p>
```

`text-sm` = Tailwind 14px, `color: #8A8A8A`.

### Bouton "Vue guidée"

```tsx
// Optionnel (visible si onRoutingMode fourni)
mb-4, px-3 py-1.5 rounded-lg
font-size: text-xs, Gilroy 800, letter-spacing 0.03em
color: #8A8A8A
hover: text-[#00068D] hover:bg-[#E8E9F8]
← SVG flèche retour
"Vue guidée"
```

### Cards de suggestions

```tsx
<div className="grid grid-cols-2 gap-3 max-w-xl w-full">
  └── Pour chaque suggestion (4 maximum) :
      <button className="flex items-start gap-3 p-4 rounded-xl
                        border border-[#D8D8D8] bg-white
                        hover:bg-[#F0F1FB] hover:border-[#2B2EB8]
                        transition-all text-left">
        ├── Icône (text-xl, flex-shrink-0)
        ├── div
        │   ├── Texte (text-xs, #3A3A3A, Source Serif Pro, leading-relaxed)
        │   └── Badge agent (mt-1.5, nl-token-agent, text-[10px])
        └── (contenu : "@agent")
      </button>
</div>
```

Suggestions par défaut :

| Texte | Agent | Icône |
|---|---|---|
| Créer une bibliographie sur l'IA en enseignement supérieur | bibliographie | 📚 |
| Rédiger une fiche de cours ECTS pour un module Licence | fiche-cours | 📋 |
| Concevoir un module pédagogique sur la sociolinguistique | module | 📖 |
| Préparer un sujet d'examen sur la traductologie | examen | 🎯 |

---

## 🏠 ÉTAPE 3 — ConversationPage — Layout principal

**Fichier :** `app/ConversationPage.tsx`

### Structure du layout

```tsx
// Layout racine
<div className="flex flex-col h-screen bg-white overflow-hidden">
  ├── <Header /> (h-[60px], flex-shrink-0)
  │
  ├── div.flex.flex-1.min-h-0
  │   ├── Sidebar desktop (hidden md:flex)
  │   │   width: var(--sidebar-w) = 288px
  │   │   <Sidebar />
  │   │
  │   └── Zone principale (flex flex-col flex-1 min-w-0)
  │       ├── Zone de messages (flex-1 overflow-y-auto nl-scroll pb-20 md:pb-0)
  │       │   └── max-w-[760px] mx-auto px-4 md:px-8 py-4 md:py-8
  │       │       └── space-y-4 md:space-y-7
  │       │           └── Pour chaque message : <Message />
  │       │       └── <div ref={bottomRef} />
  │       │
  │       └── <ChatInput /> (fixed bottom-0 md:static md:flex-shrink-0)
  │
  └── <Footer /> (height: var(--footer-h) = 40px, flex-shrink-0)
```

### Détails du layout

- **`h-screen`** : hauteur = 100% viewport
- **`flex flex-col`** : colonne verticale (header → main → footer)
- **`flex-1 min-h-0`** : prend tout l'espace disponible, `min-h-0` critique pour le scroll
- **Zone messages** : `overflow-y-auto nl-scroll` avec scroll personnalisé (6px, thumb `#D8D8D8`)
- **`pb-20 md:pb-0`** : padding bas pour éviter que le dernier message soit caché par ChatInput sur mobile
- **`max-w-[760px]`** : largeur max du contenu des messages
- **ChatInput** : `fixed bottom-0` sur mobile, `static` sur desktop avec `flex-shrink-0`

### Gestion de l'état

```typescript
// États principaux
const [messages, setMessages] = useState<MessageData[]>([])
const [conversationId, setConversationId] = useState<string | undefined>()
const [isStreaming, setIsStreaming] = useState(false)
const [sourceMode, setSourceMode] = useState<'docs' | 'usn' | 'academic' | 'web' | 'all'>('usn')
const [activeMetaPrompt, setActiveMetaPrompt] = useState<{ id: string; title: string } | null>(null)
const [showRoutingPanel, setShowRoutingPanel] = useState(false)
const [pendingAgent, setPendingAgent] = useState<string | null | undefined>(undefined)
```

### Zones mobiles

```tsx
<div className="md:hidden flex flex-col flex-1">
  ├── <MobileHome /> (quand pas en conversation)
  ├── <RoutingPanel /> (quand showRoutingPanel)
  └── Chat area (quand mobileConversationMode)
```

---

## 🏠 ÉTAPE 4 — Messages desktop

**Fichier :** `components/chat/Message.tsx`

### Message utilisateur (desktop)

```tsx
<div className="hidden md:flex gap-4 items-start">
  ├── Avatar (w-8 h-8 rounded-full, bg-[#E8E9F8], color-[#00068D], flex-shrink-0, mt-1)
  │   (Gilroy 800, var(--text-2xs), initiales)
  │
  └── div.flex-1.min-w-0.pt-1
      ├── Header (flex items-center gap-2 mb-1.5)
      │   ├── Nom : Gilroy 800, var(--text-xs), #0D0D0D, uppercase
      │   └── Timestamp : Gilroy 300, var(--text-2xs), #8A8A8A
      └── Contenu .nl-prose (white-space: pre-wrap)
```

### Message assistant (desktop)

```tsx
<div className="hidden md:flex gap-4 items-start group">
  ├── Avatar (w-8 h-8 rounded-full, bg-[#00068D], flex-shrink-0, mt-1)
  │   └── Croix SVG (stroke white, strokeWidth 2.5)
  │       <path d="M12 3v18M3 12h18" />
  │       <path d="M5.6 5.6l12.8 12.8M5.6 18.4l12.8-12.8" />
  │
  └── div.flex-1.min-w-0.pt-1
      ├── Header (flex items-center gap-2 mb-1.5 flex-wrap)
      │   ├── "NouveLLM" (Gilroy 800, var(--text-xs), #0D0D0D, uppercase)
      │   ├── Timestamp (Gilroy 300, var(--text-2xs), #8A8A8A)
      │   ├── · séparateur
      │   ├── "agent" (Gilroy 300, var(--text-2xs), #8A8A8A)
      │   └── @agentSlug (.nl-token-agent)
      │
      ├── ProcessingState (si streaming et pas de contenu)
      │
      ├── Contenu .nl-prose (si contenu)
      │
      ├── HIL suggestion block (optionnel)
      │   mt-3, bg-[#E8E9F8], border border-[#C5C7F0], px-3 py-2.5 rounded-xl
      │   "💡 Vous pourriez bénéficier d'un accompagnement humain..."
      │   Bouton "Contacter →"
      │
      ├── SourcesBlock
      │
      ├── Disclaimer
      │   font-family: Source Serif Pro
      │   font-size: var(--text-2xs), color: #C8C8C8, italic
      │   "NouveLLM peut faire des erreurs — vérifiez les informations importantes."
      │
      └── Action bar (hidden md:flex, opacity-0 group-hover:opacity-100, mt-3)
          ├── Copier (flex items-center gap-1.5 px-2.5 py-1.5 rounded-md)
          │   text-[#8A8A8A], hover:bg-[#F2F2F2], hover:text-[#0D0D0D]
          │   Gilroy 300, font-size: var(--text-xs)
          │   SVG clipboard + "Copier" / checkmark + "Copié"
          │
          ├── Export .md (idem)
          │   SVG download + ".md"
          │
          ├── Régénérer (si onRegenerate)
          │   SVG sync + "Régénérer"
          │
          ├── Thumbs up (like)
          │   SVG, hover green
          │   (feedback === 'positive' → bg-green-50 text-green-600)
          │
          └── Thumbs down (dislike)
              SVG, hover red
              (feedback === 'negative' → bg-red-50 text-red-500)
```

### Prose CSS (classes partagées)

Définies dans `globals.css` :

```css
.nl-prose {
  font-family: 'Source Serif Pro', Georgia, serif;
  font-size: var(--text-base);  /* 16px */
  line-height: 1.7;
  color: #1a1a2e;
}

.nl-prose p     { margin: 0 0 0.9rem; }
.nl-prose p:last-child { margin-bottom: 0; }
.nl-prose strong { font-weight: 700; }
.nl-prose em     { font-style: italic; color: #3A3A3A; }
.nl-prose ul, .nl-prose ol { margin: 0 0 0.9rem; padding-left: 1.4rem; }
.nl-prose li     { margin-bottom: 0.25rem; }
.nl-prose h1, .nl-prose h2, .nl-prose h3 {
  font-family: 'Gilroy', sans-serif;
  font-weight: 800;
  margin: 1.2rem 0 0.5rem;
  color: #00068D;
}
.nl-prose h1 { font-size: var(--text-lg); }  /* 22px */
.nl-prose h2 { font-size: var(--text-md); }  /* 18px */
.nl-prose h3 { font-size: var(--text-sm); }  /* 14px */
```

### Streaming cursor

```css
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
.nl-cursor::after {
  content: '▊';
  animation: blink 1s step-end infinite;
  /* défini dans le CSS */
}
```

### Token badges

```css
.nl-token-agent {
  font-family: 'Gilroy', sans-serif;
  font-weight: 800;
  font-size: var(--text-2xs);  /* 11px */
  color: #00068D;
  background: #E8E9F8;
  padding: 2px 6px;
  border-radius: 6px;
  border: 0.5px solid #C5C7F0;
  letter-spacing: 0.02em;
}

.nl-token-source {
  /* même structure mais vert */
  color: #2E7D32;
  background: #E8F5E9;
  border: 0.5px solid #A5D6A7;
}
```

### Citation markers

```javascript
// Dans la fonction formatContent() :
.replace(/\[(\d{1,2})\](?!\])/g, (_, n) =>
  `<a href="#source-${n}" class="nl-cite">[${n}]</a>`)
```

### Formatage du contenu

```javascript
function formatContent(text) {
  // Ordre :
  // 1. HTML escape (&, <, >)
  // 2. Markdown links [label](url) → <a href>
  // 3. Citation markers [N] → <a href="#source-N">
  // 4. **bold** → <strong>
  // 5. *italic* → <em>
  // 6. ### → <h3>, ## → <h2>, # → <h1>
  // 7. - list → <li> → wrap <ul>
  // 8. \n\n → </p><p>
  // 9. \n → <br>
  // 10. Fallback → wrap <p>
}
```

---

## 🏠 ÉTAPE 5 — Footer desktop

**Fichier :** `components/layout/Footer.tsx`

### Structure

```tsx
<footer className="hidden md:flex items-center justify-between px-6
                   bg-white border-t border-[#D8D8D8] flex-shrink-0"
        style={{ height: 'var(--footer-h)' }}>  <!-- 40px -->
```

### Partie gauche

```tsx
<div className="flex items-center gap-4">
  ├── "Université Sorbonne Nouvelle"
  │   Gilroy 300, var(--text-2xs), #8A8A8A, uppercase, letter-spacing 0.06em
  ├── | (w-px h-3 bg-[#D8D8D8])
  ├── "INTEGRIA · France 2030"
  │   (idem)
  ├── | séparateur
  ├── Lien "Mentions légales" → /legal
  │   (idem, hover: text-[#00068D])
  ├── | séparateur
  └── Lien "À propos" → /apropos
      (idem)
```

### Partie droite

```tsx
<div className="flex items-center gap-3">
  ├── Sondage badge (étudiants seulement, si sondages en attente)
  │   rounded-full, bg-[#E8E9F8], color-[#00068D]
  │   Gilroy 800, var(--text-xs)
  │   "SONDAGE EN ATTENTE"
  │   + badge compteur (w-4 h-4 rounded-full bg-[#00068D] text-white)
  │
  ├── Crédit (étudiants) :
  │   ├── "Crédit disponible ce mois :"
  │   │   Gilroy 300, var(--text-xs), #8A8A8A
  │   ├── XX%
  │   │   Gilroy 800, var(--text-xs)
  │   │   couleurs : >40% #2E7D32 | >15% #f97316 | ≤15% #dc2626
  │   └── Barre (w-16 h-1.5 rounded-full bg-[#D8D8D8])
  │       └── Fill (même couleur conditionnelle)
  │
  └── Tokens (EC) :
      ├── "Ce mois : Xk / 2 000k tokens"
      │   Gilroy 300, var(--text-xs), #8A8A8A
      └── Barre (idem, fill #00068D / orange / rouge)
```

### Bandeau quota étudiant

```tsx
// Visible si étudiant ET crédit utilisé ≥ 80%
<div className="hidden md:flex items-center justify-between
                px-6 py-1.5 bg-orange-50 border-t border-orange-200 flex-shrink-0">
  ├── Icône warning (stroke #ea580c)
  └── "Vous avez utilisé XX% de votre crédit ce mois."
      Source Serif Pro, var(--text-xs), #9a3412
  └── Lien "En savoir plus →" (#ea580c, Gilroy 800)
```

---

## 🏠 ÉTAPE 6 — Variables CSS et design tokens

**Fichier :** `app/globals.css`

### Couleurs NouveLLM

```css
--color-nl-blue-deep:    #00068D;
--color-nl-blue-mid:     #2B2EB8;
--color-nl-blue-light:   #E8E9F8;
--color-nl-blue-subtle:  #F0F1FB;
--color-nl-grey-dark:    #3A3A3A;
--color-nl-grey-mid:     #6B6B6B;
--color-nl-grey-light:   #D8D8D8;
--color-nl-off-white:    #F2F2F2;
--color-nl-green:        #2e7d32;
--color-nl-green-light:  #e8f5e9;
--color-nl-green-border: #a5d6a7;
```

### Typographie

```css
--font-display: 'Gilroy', sans-serif;
--font-body:    'Source Serif Pro', Georgia, serif;

--text-2xs: 11px;  /* timestamps, badges */
--text-xs:  13px;  /* labels sidebar, métadonnées */
--text-sm:  14px;  /* corps secondaire, descriptions */
--text-base: 16px; /* corps principal, messages */
--text-md:  18px;  /* titres de section */
--text-lg:  22px;  /* titres de page */
--text-xl:  28px;  /* titres principaux */
```

### Layout

```css
--header-h:   60px;
--sidebar-w: 288px;
--footer-h:   40px;
--input-min-h: 80px;
```

### Thème shadcn (déclinaison)

```css
--background:     #ffffff;
--foreground:     #0D0D0D;
--card:           #ffffff;
--card-foreground:#0D0D0D;
--popover:        #ffffff;
--popover-foreground:#0D0D0D;
--primary:        #00068D;  /* → bleu NouveLLM */
--primary-foreground:#ffffff;
--secondary:      #F0F1FB;
--secondary-foreground:#00068D;
--muted:          #F2F2F2;
--muted-foreground:#6B6B6B;
--accent:         #E8E9F8;
```

### Scrollbar personnalisée

```css
.nl-scroll::-webkit-scrollbar {
  width: 6px;
}
.nl-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.nl-scroll::-webkit-scrollbar-thumb {
  background: #D8D8D8;
  border-radius: 3px;
}
.nl-scroll::-webkit-scrollbar-thumb:hover {
  background: #6B6B6B;
}
```

---

## 🏠 ÉTAPE 7 — SourcesBlock

**Fichier :** `components/chat/SourcesBlock.tsx`

### États vides

```tsx
if (!sources || sources.length === 0) {
  // Document fourni :
  → "📄 Réponse basée sur le document fourni"
    (Gilroy 300, var(--text-xs), #8A8A8A, italic)

  // Mode academique (aucune source) :
  → "🔬 Recherche académique — aucune source vérifiée trouvée pour cette requête"
    (bg-[#F5F5F5], color: #5A5A6A, padding: 4px 8px, borderRadius: 6, italic)

  // Mode academique (sources trouvées) :
  → "🎓 Sources académiques consultées"
    (bg-[#E8F5E9], color: #2E7D32, px-4 py-0.5, borderRadius: 6, italic)

  // Mode web :
  → "🌐 Réponse basée sur le web"
    (bg-[#E3F2FD], color: #1565C0, px-4 py-0.5, borderRadius: 6)

  // Mode all :
  → "⚡ Sources combinées consultées"
    (bg-[#F3E5F5], color: #6A1B9A, px-4 py-0.5, borderRadius: 6)

  // Générique (aucune source) :
  → "Réponse basée sur les connaissances générales — aucune source documentaire consultée"
    (Gilroy 300, var(--text-xs), #8A8A8A, italic)
}
```

### Liste des sources

```tsx
<div className="mt-3 pt-3 border-t border-[#D8D8D8]">
  <p className="text-[#8A8A8A] uppercase tracking-wider mb-2"
     style={{ Gilroy 800, var(--text-xs), letter-spacing 0.1em }}>
    Sources consultées
  </p>

  <div className="space-y-1">
    └── Pour chaque source (i) :
        <a href={source.url} target="_blank" rel="noopener noreferrer"
           className="flex items-center gap-2 group relative">
          ├── Badge numéro (w-5 h-5 rounded)
          │   bg-[#E8E9F8], color-[#00068D], var(--text-2xs)
          │
          ├── Icône (🌐 si web, sinon source.icon)
          │
          ├── Tag (optionnel)
          │   px-1.5 py-0.5 rounded, bg-[#E8E9F8], border-[#2B2EB8]
          │
          ├── Titre (truncate)
          │   Source Serif Pro, var(--text-sm), #3A3A3A
          │   hover: #00068D
          │
          └── Domaine (+ ↗)
              color: #8A8A8A, hover: #2B2EB8
              underline, var(--text-xs)
        </a>

        // Hover tooltip (si excerpt)
        └── <div> (position absolute, z-50, pointer-events-none)
            ├── <div> (rounded-xl, shadow-lg, border, bg-white)
            │   px-3 py-2.5, max-width: 320px
            │   var(--text-xs), color: #3A3A3A, line-height 1.55
            └── Triangle CSS (border-left, border-right, border-top)
```

---

## 🏠 ÉTAPE 8 — ProcessingState

**Fichier :** `components/chat/ProcessingState.tsx`

### Structure

```tsx
<div className="space-y-2 py-1">
  └── Steps animés (currentStep + 1 affichés à la fois)
      ├── Checkmark SVG (vérifié)
      │   stroke #2B2EB8, strokeWidth 2.5
      │   w-13 h-13
      │
      └── Spinner + texte (en cours)
          nl-spinner (w-13 h-13)
          Source Serif Pro, 0.8rem
          i < currentStep → color #8A8A8A (gris)
          i === currentStep → color #3A3A3A (foncé)

  └── Note temporelle (optionnelle, selon sourceMode)
      Source Serif Pro, font-size: 11, color: #5A5A6A
      Ex: "La recherche dans les bases académiques prend 8 à 15 secondes..."
```

### Steps par agent

| Agent | Steps (intervalle 1400ms) |
|---|---|
| bibliographie | Analyse du sujet → Recherche → Filtrage → Formatage |
| module | Analyse syllabus → Structuration → Alignement → Rédaction |
| fiche-cours | Analyse ECTS → Structuration → Vérification → Rédaction |
| examen | Analyse compétences → Conception → Calibrage → Finalisation |
| traduction | Analyse texte source → Traduction → Révision |
| briefing | Collecte info → Analyse contexte → Rédaction |
| (défaut) | Analyse question → Recherche sources → Synthèse → Rédaction |

### Steps par mode source

| Mode | Steps | Intervalle | Note |
|---|---|---|---|
| academic | HAL → OpenAlex/Semantic Scholar → Analyse → Synthèse | 2500ms | "8 à 15 secondes" |
| web | Lecture page → Extraction → Analyse | 2000ms | — |
| all | USN → Académique → HAL/OpenAlex → Fusion | 3000ms | "15 à 20 secondes" |

---

## 🏠 ÉTAPE 9 — Incohérences identifiées

### Typographie

| Usage | Valeur actuelle | Token correspondant |
|---|---|---|
| Titre EmptyState | `1.5rem` (24px) | `--text-xl: 28px` |
| Sous-titre EmptyState | `text-sm` Tailwind (14px) | `--text-sm: 14px` ✅ |
| Texte suggestions | `text-xs` Tailwind (13px) | `--text-xs: 13px` ✅ |
| Badge agent suggestion | `text-[10px]` | `--text-2xs: 11px` |
| Timestamps messages | `var(--text-2xs)` | ✅ |
| Noms messages | `var(--text-xs)` | ✅ |
| Corps messages | `var(--text-base)` | ✅ |
| Footer labels | `var(--text-2xs)` | ✅ |
| Disclaimer | `var(--text-2xs)` | ✅ |
| SourcesBlock | `var(--text-xs)`, `var(--text-sm)` | ✅ |
| ProcessingState steps | `0.8rem` hardcodé | `--text-sm` |
| ProcessingState note | `11` hardcodé (sans unité) | `--text-2xs: 11px` |
| Bouton ENVOYER | `var(--text-xs)` | ✅ |
| Mode source boutons | `var(--text-2xs)` | ✅ |

**Résultat :** La zone de chat est **la mieux alignée** avec les design tokens. Seul ProcessingState a des valeurs hardcodées.

### Couleurs

La zone de chat utilise `--color-nl-*` de façon cohérente :
- Bleu profond : `#00068D` ✅ (primary, avatars, boutons)
- Bleu moyen : `#2B2EB8` ✅ (borders, focus rings)
- Bleu clair : `#E8E9F8` ✅ (badges, fonds)
- Gris clair : `#D8D8D8` ✅ (bordures)
- Texte : `#0D0D0D` ✅ (primary text), `#8A8A8A` ✅ (secondary), `#3A3A3A` ✅ (body)
- Fond page : `bg-white` ✅

Exceptions :
- `var(--color-nl-off-white) = #F2F2F2` n'est **pas utilisé** dans la zone de chat (pourtant défini)
- `hover:bg-[#FFF8E1]` pour 📎 — valeur unique, pas de token
- `hover:bg-[#e8f5e9]` pour # — valeur unique, pas de token
- `.nl-prose` utilise `color: #1a1a2e` — légèrement différent du `#0D0D0D` standard (très subtil)

### Layout

- Messages container : `max-w-[760px]` — pas de variable CSS
- ChatInput : pas de `max-width` — s'étend sur toute la largeur
- Le padding `md:px-8` sur les messages vs `md:px-6` sur le ChatInput → **décalage horizontal de 2px** de chaque côté
- La toolbar utilise `border-[#F0F0F0]` pour le séparateur de la barre de mode — seul endroit qui utilise ce gris

### Composant manquant

- **Pas de composant `<Icon>` partagé** : 4 icônes SVG différentes de la croix NouveLLM (header desktop, header mobile, empty state, message assistant) — copiées-collées
- Le logo croix apparaît **4 fois** en SVG inline dans 3 fichiers différents (Header.tsx, ConversationPage.tsx, Message.tsx)
- **Gilroy** : importé comment ? Aucun `@font-face` dans globals.css. Si pas chargé → fallback sans-serif

---

*Fin du rapport d'audit UX/UI — Zone de chat desktop.*
*24 mai 2026 — NouveLLM.*
