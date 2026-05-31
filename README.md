# NouveLLM

Plateforme IA institutionnelle pour l'enseignement supérieur en
sciences humaines et sociales. Conçue pour être souveraine,
vérifiable et adaptée aux exigences intellectuelles des EC et
de leurs étudiants.

## Pourquoi NouveLLM

Les LLM généralistes posent trois problèmes structurels pour
l'enseignement supérieur :

**Souveraineté des données.** Les conversations, documents et
corpus des enseignants-chercheurs alimentent l'entraînement des
modèles commerciaux. NouveLLM s'auto-héberge sur infrastructure
européenne — vos données ne quittent pas votre périmètre de
confiance et ne servent pas à entraîner un modèle tiers.

**Biais de corpus.** Les grands modèles sont massivement
entraînés sur des données anglophones et occidentales.
Ils reproduisent les cadres dominants de production du savoir
et marginalisent les littératures francophones, les productions
non-occidentales, les traditions intellectuelles hors canon
anglo-saxon. NouveLLM connecte les agents à des bases
documentaires que vous construisez et contrôlez.

**Hallucination non traçable.** Un LLM qui invente des
références bibliographiques ou des positions disciplinaires
est inutilisable dans un contexte académique. NouveLLM impose
un principe d'anti-hallucination strict : toute information
issue du RAG est citée avec son URL source vérifiable.
Ce qui ne peut pas être sourcé est signalé explicitement.

## Ce que ça fait

**Agents spécialisés SHS**
- `@bibliographie` — Bibliographie annotée depuis HAL et OpenAlex,
 sources vérifiables, format APA/Chicago/MLA
- `@examen` — Sujets d'examen ancrés dans le corpus du cours,
 conçus pour résister à la délégation à une IA générative
- `@concepteur-seances` — Séances pédagogiques avec 8 archétypes
 (corpus borné, révélateur de conformisme, mission professionnelle...)
- `@assistant-ec` — Chat généraliste avec RAG académique automatique
 (HAL/OpenAlex) et bases documentaires institutionnelles
- `@redaction` — Rédaction administrative et institutionnelle
- `@briefing` — Synthèse de réunion et compte-rendu
- `@module` — Construction de module pédagogique structuré

**Sessions pédagogiques**
Un EC crée une session avec QR code. Les étudiants rejoignent
via `/session/[code]` sans compte. Les tokens sont imputés
à la session, pas au quota étudiant.

**RAG institutionnel et souverain**
Bases de connaissances par groupe (UFR, diplôme, labo) avec
isolation vectorielle garantie. Architecture à trois niveaux :
sources publiques vérifiables / KB de groupe / documents personnels.

**Gestion des accès**
Rôles EC / BIATSS / ADMIN, quotas tokens par groupe,
conformité RGPD.

## Stack

Next.js 14 · TypeScript · Prisma · PostgreSQL · NextAuth v5
Dify · Weaviate · Docker

Modèle LLM configurable via Dify — compatible tout provider
OpenAI API (Mistral, DeepSeek, Qwen, etc.).
Reranker TEI optionnel (BAAI/bge-reranker-v2-m3).
Proxy académique HAL/OpenAlex inclus.

## Démarrage rapide

```bash
npm install
cp .env.example .env # remplir les variables
npx prisma migrate deploy && npx prisma generate
npx ts-node prisma/seed.ts
npm run dev -- --port 3001
```

Ouvrir http://localhost:3001

Voir `dify/README.md` pour l'import des workflows Dify.

## Comptes de test

| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Administrateur | admin@example.com | demo1234 |
| Enseignant-Chercheur | ec@example.com | demo1234 |
| Étudiant | etudiant@example.com | demo1234 |

## Licence

[Elastic License 2.0](LICENSE) — libre pour usage personnel
et institutionnel non-compétitif.
Contact pour licence commerciale : [votre email]

## Auteur

Diego Le Gallou
