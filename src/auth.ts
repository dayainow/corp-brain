import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { findUserByEmail } from "@/lib/auth/users";
import { resolveRoleFromSSO, isAllowedDomain } from "@/lib/auth/role-mapping";
import type { UserRole } from "@/lib/rbac";

declare module "next-auth" {
  interface User {
    role: UserRole;
    department: string;
    title: string;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      department: string;
      title: string;
    };
  }
}

const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "NovaPay SSO (Demo)",
    credentials: {
      email: { label: "이메일", type: "email" },
      password: { label: "비밀번호", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null;

      const user = findUserByEmail(credentials.email as string);
      if (!user) return null;

      const valid = await bcrypt.compare(
        credentials.password as string,
        user.passwordHash
      );
      if (!valid) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        title: user.title,
      };
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          hd: "novapay.kr",
          prompt: "select_account",
        },
      },
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email || !isAllowedDomain(user.email)) return false;
        const existing = findUserByEmail(user.email);
        const role = existing?.role ?? resolveRoleFromSSO(user.email);
        if (!role) return false;
        user.role = role;
        user.department = existing?.department ?? "";
        user.title = existing?.title ?? "";
        if (existing?.name) user.name = existing.name;
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.role = user.role;
        token.department = user.department;
        token.title = user.title;
      }
      if (account?.provider === "google" && token.email && !token.role) {
        const existing = findUserByEmail(token.email);
        token.role = existing?.role ?? resolveRoleFromSSO(token.email) ?? "general";
        token.department = existing?.department ?? "";
        token.title = existing?.title ?? "";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as UserRole) ?? "general";
        session.user.department = (token.department as string) ?? "";
        session.user.title = (token.title as string) ?? "";
      }
      return session;
    },
  },
  trustHost: true,
});
