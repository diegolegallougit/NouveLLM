# Migration SQLite → PostgreSQL

## Prérequis

- PostgreSQL 15+ accessible depuis le serveur Next.js
- `DATABASE_URL` valide (ex : `postgresql://user:pass@host:5432/nouvellm`)
- Node.js 20+, npm, npx

---

## Étape 1 — Installer le pilote PostgreSQL

```bash
npm install pg
npm uninstall better-sqlite3 @prisma/adapter-better-sqlite3
```

---

## Étape 2 — Modifier `prisma/schema.prisma`

Changer le bloc `datasource` :

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Et supprimer `previewFeatures = ["driverAdapters"]` du générateur client.

---

## Étape 3 — Modifier `prisma.config.ts`

Remplacer le contenu par :

```ts
import { defineConfig } from 'prisma/config'

export default defineConfig({})
```

---

## Étape 4 — Modifier `lib/prisma.ts`

Remplacer le contenu par :

```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

---

## Étape 5 — Ajouter `DATABASE_URL` dans `.env`

```env
DATABASE_URL="postgresql://nouvellm:password@localhost:5432/nouvellm"
```

Supprimer (ou commenter) les variables SQLite si présentes.

---

## Étape 6 — Créer les tables en PostgreSQL

```bash
npx prisma migrate deploy
```

> Cette commande applique toutes les migrations existantes dans `prisma/migrations/`.
> Si c'est une base vide, toutes les tables seront créées depuis zéro.

---

## Étape 7 — Régénérer le client Prisma

```bash
npx prisma generate
```

---

## Étape 8 — (Optionnel) Migrer les données existantes

Si vous avez des données en SQLite à conserver :

```bash
# Exporter depuis SQLite (adapter le chemin)
npx ts-node scripts/export-sqlite.ts > data-export.json

# Importer dans PostgreSQL
npx ts-node scripts/import-postgres.ts < data-export.json
```

> Ces scripts sont à écrire selon les besoins. Pour les utilisateurs, conversations
> et messages, un export/import JSON ligne par ligne est suffisant.

---

## Étape 9 — Redémarrer l'application

```bash
npm run build
npm start
```

---

## Notes

- Les enums Prisma (`Role`, `MessageRole`, `AgentStatus`, `SourceAccess`, `SessionAccess`, `SessionStatus`) sont nativement supportés par PostgreSQL.
- SQLite stocke les dates comme texte ISO — PostgreSQL les stocke comme `TIMESTAMPTZ`. Les migrations Prisma gèrent cette conversion automatiquement lors d'un `migrate deploy`.
- En production, utiliser `migrate deploy` (pas `migrate dev`) — cela n'interagit pas avec le shadow database.
