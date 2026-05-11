import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import ProConnect from '@/lib/providers/proconnect'

const proConnectEnabled = !!(process.env.PROCONNECT_CLIENT_ID && process.env.PROCONNECT_CLIENT_SECRET)

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  callbacks: {
    async signIn({ user, account }) {
      // For OAuth providers (ProConnect), find or create user in DB
      if (account?.provider === 'proconnect' && user.email) {
        const existing = await prisma.user.findUnique({ where: { email: user.email } })
        if (existing) {
          if (existing.deletedAt) return false
          user.id = existing.id
          ;(user as { role?: string }).role = existing.role
        } else {
          const created = await prisma.user.create({
            data: {
              email: user.email,
              name: user.name ?? user.email.split('@')[0],
              role: 'EC',
              password: null,
            },
          })
          user.id = created.id
          ;(user as { role?: string }).role = created.role
        }
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role
        token.name = user.name
        token.email = user.email
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        ;(session.user as { role?: string }).role = token.role as string
      }
      return session
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })
        if (!user || !user.password || user.deletedAt) return null
        const valid = await bcrypt.compare(credentials.password as string, user.password)
        if (!valid) return null
        return { id: user.id, email: user.email, name: user.name, role: user.role }
      },
    }),
    ...(proConnectEnabled
      ? [
          ProConnect({
            clientId: process.env.PROCONNECT_CLIENT_ID!,
            clientSecret: process.env.PROCONNECT_CLIENT_SECRET!,
          }),
        ]
      : []),
  ],
})

export { proConnectEnabled }
