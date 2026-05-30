# NouveLLM

Plateforme IA pour l'enseignement supérieur en sciences humaines
et sociales. Connecte les enseignants-chercheurs à des agents IA
spécialisés via une interface institutionnelle sécurisée.

## Agents disponibles

- **@bibliographie** — Bibliographie annotée depuis HAL et OpenAlex
- **@examen** — Sujets d'examen ancrés dans le corpus du cours,
 résistants à l'IA générative
- **@concepteur-seances** — Conception de séances pédagogiques
 avec scénarios importables
- **@redaction** — Rédaction administrative
- **@briefing** — Briefing et synthèse de réunion
- **@module** — Module de cours structuré
- **@assistant-ec** — Assistant généraliste avec RAG académique

## Stack

Next.js 14 · TypeScript · Prisma · PostgreSQL · NextAuth v5
Dify (orchestration LLM) · Weaviate (vectorstore) · Docker

## Démarrage rapide

```bash
npm install
cp .env.example .env # puis remplir les variables
npx prisma migrate deploy && npx prisma generate
npx ts-node prisma/seed.ts
npm run dev -- --port 3001
```

Ouvrir http://localhost:3001

## Comptes de test

| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Administrateur | admin@example.com | demo1234 |
| Enseignant-Chercheur | ec@example.com | demo1234 |
| Étudiant | etudiant@example.com | demo1234 |

## Configuration

Voir `.env.example` pour toutes les variables requises.
Voir `dify/README.md` pour l'import des workflows Dify.

## Licence

Elastic License 2.0 (ELv2) — libre pour usage personnel
et institutionnel non-compétitif.
Contact pour licence commerciale : [votre email]

## Auteur

Diego Le Gallou
[votre email ou site]
