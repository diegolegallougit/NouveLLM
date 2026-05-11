# Déploiement NouveLLM — qualification SecNumCloud

Guide de déploiement pour un hébergement qualifié SecNumCloud (HDS/SecNum niveau 2+),
applicable aux offres souveraines françaises compatibles (Outscale / OVHcloud / Clever Cloud / Scaleway).

---

## Prérequis infrastructure

| Composant | Exigence SecNum | Solution recommandée |
|-----------|-----------------|----------------------|
| Hébergeur | Qualifié SecNumCloud ou HDS | OVHcloud SecNumCloud / Outscale |
| Base de données | PostgreSQL chiffré au repos | RDS PostgreSQL ou Managed DB souveraine |
| Fichiers / blobs | Stockage chiffré, clé client | S3 souverain (OVHcloud Object Storage) |
| Réseau | VPN ou VPC privé | VPC dédié, zéro accès Internet direct |
| TLS | TLS 1.3, certificats internes | PKI interne ou Let's Encrypt via DNS challenge |
| Logs | Rétention 1 an, accès RSSI | Centralisation ELK / Loki souverain |

---

## Variables d'environnement à durcir

```bash
# Authentification
AUTH_SECRET=<256 bits entropy — généré via: openssl rand -base64 32>
NEXTAUTH_URL=https://nouvellm.votre-domaine.fr

# Base de données PostgreSQL (remplace SQLite en prod)
DATABASE_URL=postgresql://nouvellm:<password>@db-host:5432/nouvellm?sslmode=require&sslcert=/certs/client.crt

# Dify — connexion interne VPC uniquement
DIFY_BASE_URL=http://dify-internal.vpc:5001
DIFY_WEBHOOK_SECRET=<secret fort>

# ProConnect (DINUM) — optionnel selon périmètre
PROCONNECT_CLIENT_ID=<fourni par DINUM>
PROCONNECT_CLIENT_SECRET=<fourni par DINUM>

# Désactiver télémétrie Next.js
NEXT_TELEMETRY_DISABLED=1
```

---

## Migration SQLite → PostgreSQL

```bash
# 1. Migrer le schéma Prisma
# Dans prisma/schema.prisma, remplacer :
#   provider = "sqlite"
# par :
#   provider = "postgresql"
# et supprimer @db.Text si présent (non supporté en SQLite)

# 2. Appliquer les migrations
npx prisma migrate deploy

# 3. (Optionnel) Importer données existantes via pg_restore ou script custom
npx tsx scripts/migrate-to-postgres.ts
```

---

## Build et déploiement Docker

```dockerfile
# Dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --frozen-lockfile
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

```yaml
# docker-compose.prod.yml
services:
  nouvellm:
    image: nouvellm:latest
    restart: unless-stopped
    environment:
      - AUTH_SECRET=${AUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - DATABASE_URL=${DATABASE_URL}
      - DIFY_BASE_URL=${DIFY_BASE_URL}
      - NEXT_TELEMETRY_DISABLED=1
    ports:
      - "3000:3000"
    networks:
      - internal
    depends_on:
      - postgres

  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: nouvellm
      POSTGRES_USER: nouvellm
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pg_data:/var/lib/postgresql/data
    networks:
      - internal

volumes:
  pg_data:

networks:
  internal:
    driver: bridge
    internal: true
```

---

## Hardening applicatif

### En-têtes HTTP de sécurité (next.config.ts)

Les en-têtes `Content-Security-Policy`, `X-Frame-Options`, `Strict-Transport-Security`
sont à configurer dans `next.config.ts` → `headers()` selon la politique de sécurité de l'établissement.

Exemple minimal :

```ts
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      ],
    },
  ]
},
```

### Rotation des secrets

- `AUTH_SECRET` : rotation annuelle (ou en cas de compromission)
- `DIFY_WEBHOOK_SECRET` : rotation semestrielle
- Mots de passe BDD : gestion via vault (HashiCorp Vault ou équivalent souverain)

---

## Conformité RGPD

| Obligation | Implémentation |
|------------|----------------|
| Art. 17 — droit à l'effacement | `DELETE /api/admin/users/:id` (soft-delete via `deletedAt`) |
| Art. 20 — portabilité | `GET /api/user/export` — archive ZIP (conversations MD, méta-prompts, espaces) |
| Art. 13/14 — information | Page `/legal` — mentions légales et politique de confidentialité |
| Journalisation accès | Logs applicatifs Next.js + logs PostgreSQL (rétention 1 an) |
| DPA / sous-traitants | Dify auto-hébergé : aucun envoi vers infrastructure tierce hors périmètre |

---

## Checklist avant mise en production

- [ ] `AUTH_SECRET` généré avec `openssl rand -base64 32` (jamais la valeur dev)
- [ ] `DATABASE_URL` pointe vers PostgreSQL (SQLite interdit en prod)
- [ ] TLS activé sur toutes les connexions (app, BDD, Dify)
- [ ] `NEXT_TELEMETRY_DISABLED=1` positionné
- [ ] En-têtes CSP/HSTS configurés
- [ ] Logs centralisés et rétention configurée
- [ ] Sauvegardes BDD testées (restore vérifié)
- [ ] Accès admin restreint par IP ou VPN
- [ ] Analyse DPIA déposée au DPD de l'établissement
- [ ] Homologation RGS/SecNum validée par la RSSI

---

## Contact et support

Équipe NouveLLM — Université Sorbonne Nouvelle
Projet INTEGRIA · ANR France 2030
