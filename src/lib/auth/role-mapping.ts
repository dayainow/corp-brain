import type { UserRole } from "@/lib/rbac";
import { findUserByEmail } from "./users";

/** 이메일 도메인 → 기본 Role (SSO 신규 사용자용) */
const DOMAIN_DEFAULT_ROLE: Record<string, UserRole> = {
  "novapay.kr": "general",
};

/** 부서 키워드 → Role 자동 매핑 (Google Workspace 그룹 시뮬레이션) */
const DEPARTMENT_ROLE_MAP: Record<string, UserRole> = {
  "법무": "admin",
  "legal": "admin",
  "컴플라이언스": "admin",
  "재무": "manager",
  "finance": "manager",
  "인사": "manager",
  "hr": "manager",
};

/**
 * SSO 로그인 시 이메일·부서 정보로 Role 결정
 * 1. 시드 계정 DB에 있으면 해당 Role
 * 2. 부서 키워드 매칭
 * 3. 도메인 기본 Role
 */
export function resolveRoleFromSSO(
  email: string,
  department?: string
): UserRole | null {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain || !DOMAIN_DEFAULT_ROLE[domain]) {
    return null; // 허용되지 않은 도메인
  }

  const existing = findUserByEmail(email);
  if (existing) return existing.role;

  if (department) {
    const deptLower = department.toLowerCase();
    for (const [keyword, role] of Object.entries(DEPARTMENT_ROLE_MAP)) {
      if (deptLower.includes(keyword)) return role;
    }
  }

  return DOMAIN_DEFAULT_ROLE[domain];
}

export function isAllowedDomain(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return !!domain && domain in DOMAIN_DEFAULT_ROLE;
}
