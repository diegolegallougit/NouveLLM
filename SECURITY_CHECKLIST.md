# NouveLLM — Security & Quality Checklist

Audit panoramique v0.4.2 — 2026-05-13
Sprint de corrections v0.4.3 — 2026-05-13

## Légende

- ✅ Corrigé
- ⚠ Suivi requis (contrainte externe ou migration dédiée)
- 🔲 À faire

---

## Dimension 1 — Sécurité

| # | Problème | Sévérité | Fichier(s) | Statut | Date |
|---|----------|----------|------------|--------|------|
| 1 | **CSRF OAuth GDrive** — state = userId prédictible | CRITIQUE | `app/api/connectors/gdrive/init/route.ts`, `callback/route.ts` | ✅ Corrigé | 2026-05-13 |
| 2 | **0 validation Zod** — 38 routes trusting raw req.json() | HAUTE | Tout `app/api/` | 🔲 À faire | — |
| 3 | **Rate limiting incomplet** — upload et HIL illimités | HAUTE | `documents/route.ts`, `hil/request/route.ts` | ✅ Corrigé | 2026-05-13 |
| 4 | **PII dans logs HIL** — nom + message en clair | HAUTE | `app/api/hil/request/route.ts:36-39` | ✅ Corrigé | 2026-05-13 |
| 5 | **xlsx Prototype Pollution** — CVE SheetJS < 0.20.3 | HAUTE | `package.json` | ✅ Corrigé (0.20.3) | 2026-05-13 |
| 6 | **Middleware bypass /api/** — toutes les routes API sans token check | MOYENNE | `middleware.ts` | 🔲 À faire | — |
| 7 | **Webhook Dify sans timingSafeEqual** | FAIBLE | `app/api/admin/webhook/dify/route.ts` | 🔲 À faire | — |
| 8 | **CSP connect-src 'self'** — Dify/Cortecs côté serveur uniquement | FAIBLE | `next.config.ts` | ⚠ À documenter | — |

### Notes

- **#2 (Zod)** : Priorité lors du prochain sprint architecture. Commencer par les routes d'écriture admin (`POST /api/admin/groups`, `POST /api/admin/diplomes`).
- **#6 (Middleware)** : Ajouter une whitelist explicite `/api/auth`, `/api/docs`, `/api/session/*/guest-chat`, `/api/connectors/gdrive/callback`, `/api/admin/webhook/dify`, puis rejeter avec 401 par défaut.

---

## Dimension 2 — Architecture / Maintenabilité

| # | Problème | Sévérité | Fichier(s) | Statut | Date |
|---|----------|----------|------------|--------|------|
| 9 | **SpacesPageClient.tsx — 1 157 lignes** monolithique | HAUTE | `app/spaces/SpacesPageClient.tsx` | 🔲 Sprint dédié | — |
| 10 | **92 `const session = await auth()` dupliqués** | MOYENNE | Tout `app/api/` | 🔲 À faire | — |
| 11 | **Multi-writes sans `$transaction`** | MOYENNE | `app/api/admin/users/[id]/route.ts`, `groups/[id]/route.ts` | ⚠ Après migration PostgreSQL | — |
| 12 | **sessions/new/page.tsx — 634 lignes** | MOYENNE | `app/sessions/new/page.tsx` | 🔲 Prochain touch | — |
| 13 | **console.log en production** | FAIBLE | `app/api/hil/request/route.ts` | ✅ Corrigé | 2026-05-13 |

### Notes

- **#11** : Les transactions Prisma sur SQLite sont moins critiques (file lock), mais deviendront importantes après migration PostgreSQL (sprint septembre 2026 post-prise de poste USN).
- **#9** : Extraction en `<DocumentList>`, `<BatchActionsBar>`, `<VisibilityBadge>`, hook `useDocuments(spaceId)`. Planifier en sprint dédié.

---

## Dimension 3 — UX / Accessibilité

| # | Problème | Sévérité | Fichier(s) | Statut | Date |
|---|----------|----------|------------|--------|------|
| 14 | **Aucun error.tsx / not-found.tsx / loading.tsx** | HAUTE | `app/` | ✅ Corrigé | 2026-05-13 |
| 15 | **123 boutons sans aria-label** | HAUTE | `app/spaces/`, `app/admin/` | ✅ Partiel (boutons icône prioritaires) | 2026-05-13 |
| 16 | **Tableaux admin non scrollables sur mobile** | MOYENNE | `app/admin/*/page.tsx` | 🔲 À faire | — |
| 17 | **Confirmations destructives absentes** | MOYENNE | `app/admin/`, `app/spaces/SpacesPageClient.tsx` | 🔲 À faire | — |
| 18 | **Pas d'état optimistic sur visibilité** | FAIBLE | `app/spaces/SpacesPageClient.tsx` | 🔲 Nice to have | — |

### Notes

- **#15** : Pass complet aria-labels fait sur tous les boutons icône (✓ ✕ ✏ + fermetures modale). Il reste les boutons texte dans les formulaires complexes — moins critique RGAA.
- **#16** : `<div className="overflow-x-auto">` autour de chaque `<table>` dans les pages admin. Quick win (15 min).
- **#17** : Créer un composant `<ConfirmDialog>` réutilisable. Priorité : DELETE espace, DELETE dossier, ARCHIVER.

---

## Suivi par sprint

| Sprint | Items couverts |
|--------|---------------|
| v0.4.3 | #1, #3, #4, #5, #13, #14, #15 (partiel) |
| À planifier | #2, #6, #7, #9, #10, #15 (complet), #16, #17 |
| Post-PostgreSQL | #11 |
