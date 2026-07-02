import type { UserRole } from "@/lib/rbac";

export interface CorpBrainUser {
  id: string;
  email: string;
  name: string;
  department: string;
  title: string;
  role: UserRole;
  passwordHash: string;
}

/**
 * NovaPay(노바페이) 데모 계정
 * 공통 비밀번호: novapay2026
 */
export const NOVAPAY_USERS: CorpBrainUser[] = [
  {
    id: "np-001",
    email: "kim.junho@novapay.kr",
    name: "김준호",
    department: "엔지니어링",
    title: "백엔드 개발자",
    role: "general",
    passwordHash:
      "$2b$10$VPCX01cgeozaxmUsCl4QQOiZ8fPJEz9TyXGjG7bViwk5Gy6GmB6TS",
  },
  {
    id: "np-002",
    email: "park.suyeon@novapay.kr",
    name: "박수연",
    department: "재무회계",
    title: "재무팀장",
    role: "manager",
    passwordHash:
      "$2b$10$VPCX01cgeozaxmUsCl4QQOiZ8fPJEz9TyXGjG7bViwk5Gy6GmB6TS",
  },
  {
    id: "np-003",
    email: "lee.minho@novapay.kr",
    name: "이민호",
    department: "법무·컴플라이언스",
    title: "CSO",
    role: "admin",
    passwordHash:
      "$2b$10$VPCX01cgeozaxmUsCl4QQOiZ8fPJEz9TyXGjG7bViwk5Gy6GmB6TS",
  },
  {
    id: "np-004",
    email: "choi.yuna@novapay.kr",
    name: "최유나",
    department: "인사",
    title: "HR 매니저",
    role: "manager",
    passwordHash:
      "$2b$10$VPCX01cgeozaxmUsCl4QQOiZ8fPJEz9TyXGjG7bViwk5Gy6GmB6TS",
  },
  {
    id: "np-005",
    email: "jung.haein@novapay.kr",
    name: "정해인",
    department: "고객지원",
    title: "CS 리드",
    role: "general",
    passwordHash:
      "$2b$10$VPCX01cgeozaxmUsCl4QQOiZ8fPJEz9TyXGjG7bViwk5Gy6GmB6TS",
  },
];

export function findUserByEmail(email: string): CorpBrainUser | undefined {
  return NOVAPAY_USERS.find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );
}
