type UserProfile = {
  name?: string | null
  roleExact?: string | null
  discipline?: string | null
  ufr?: string | null
  niveauxEnseignement?: string | null
  languesTravail?: string | null
}

export function buildUserContext(user: UserProfile): string {
  const parts: string[] = []

  if (user.roleExact || user.discipline) {
    if (user.roleExact && user.discipline) {
      parts.push(`${user.roleExact} en ${user.discipline}`)
    } else if (user.roleExact) {
      parts.push(user.roleExact)
    } else if (user.discipline) {
      parts.push(user.discipline)
    }
  }

  if (user.ufr) parts.push(`UFR ${user.ufr}`)

  if (user.niveauxEnseignement) {
    const niveaux = user.niveauxEnseignement
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean)
    if (niveaux.length > 0) parts.push(`niveaux ${niveaux.join('/')}`)
  }

  if (user.languesTravail) {
    const langues = user.languesTravail
      .split(',')
      .map((l) => l.trim())
      .filter(Boolean)
    if (langues.length > 0) parts.push(`langues : ${langues.join(', ')}`)
  }

  return parts.join(', ')
}
