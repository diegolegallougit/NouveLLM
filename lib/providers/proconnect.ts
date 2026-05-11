import type { OAuthConfig } from 'next-auth/providers'

// ProConnect — La Suite Numérique DINUM
// OIDC provider for French public sector identity federation
// https://proconnect.gouv.fr
export default function ProConnect(options: { clientId: string; clientSecret: string }): OAuthConfig<{
  sub: string
  email: string
  given_name?: string
  usual_name?: string
  family_name?: string
}> {
  return {
    id: 'proconnect',
    name: 'ProConnect',
    type: 'oidc',
    issuer: 'https://app.proconnect.gouv.fr/api/v2',
    wellKnown: 'https://app.proconnect.gouv.fr/api/v2/.well-known/openid-configuration',
    clientId: options.clientId,
    clientSecret: options.clientSecret,
    authorization: {
      params: {
        scope: 'openid email given_name usual_name',
        acr_values: 'eidas1',
      },
    },
    checks: ['pkce', 'state'],
    idToken: true,
    profile(profile) {
      const firstName = profile.given_name ?? ''
      const lastName = profile.usual_name ?? profile.family_name ?? ''
      return {
        id: profile.sub,
        name: `${firstName} ${lastName}`.trim() || profile.email,
        email: profile.email,
      }
    },
  }
}
