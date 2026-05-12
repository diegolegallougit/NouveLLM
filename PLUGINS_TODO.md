# Plugins & Connecteurs — Roadmap

## Implémentés (v0.3.1)

| Connecteur | Méthode | Routes | Statut |
|---|---|---|---|
| Notion | Token d'intégration | `/api/connectors/notion/*` | ✅ Complet |
| Google Drive | OAuth 2.0 | `/api/connectors/gdrive/*` | ✅ Complet |

## En attente

### OneDrive / SharePoint
- **Auth**: Microsoft OAuth 2.0 (MSAL), scopes `Files.Read` + `Sites.Read.All`
- **SDK**: `@microsoft/microsoft-graph-client`
- **Routes**: `/api/connectors/onedrive/{init,callback,connect,files,import}`
- **Notes**: Requiert une app Azure AD, redirect URI `https://host/api/connectors/onedrive/callback`
- **Schéma Prisma**: `msAccessToken String?`, `msRefreshToken String?`, `msTokenExpiry DateTime?`

### Nextcloud USN
- **Auth**: WebDAV (Basic auth) ou OAuth2 (si instance USN le supporte)
- **SDK**: `webdav` npm ou requêtes fetch WebDAV brutes
- **Routes**: `/api/connectors/nextcloud/{connect,files,import}`
- **Notes**: URL instance à fixer dans `.env` (`NEXTCLOUD_URL`), token chiffré avec `lib/encryption.ts`
- **Schéma Prisma**: `nextcloudToken String?`

## Architecture commune

Tous les connecteurs suivent ce pattern :
1. **Token chiffré** en DB via `lib/encryption.ts` (AES-256-GCM)
2. **Vérification live** du token lors du `connect` (pas de token invalide stocké)
3. **Import → Dify** : fichier → `POST /v1/files/upload` → `SpaceDocument` en DB
4. **Sidebar** : bouton LIER → modal (token) ou redirect OAuth → état "Lié" + bouton ✕ déconnexion

## Sécurité

- Tokens jamais exposés dans les réponses API
- Routes connecteurs toutes protégées par `auth()` (401 si non authentifié)
- Champ `googleTokenExpiry` pour détecter expiration avant appel Google
- Auto-refresh via `oauth2.on('tokens', ...)` persisté en DB
