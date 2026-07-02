export type UserRole = "general" | "manager" | "admin";

const USER_ROLES: UserRole[] = ["general", "manager", "admin"];

const ROLE_HIERARCHY: Record<UserRole, number> = {
  general: 1,
  manager: 2,
  admin: 3,
};

/** 문서 role이 사용자에게 열람 가능한지 판단 */
export function canAccessDocument(
  userRole: UserRole,
  documentRole: string
): boolean {
  const docRole = (documentRole || "general") as UserRole;
  if (userRole === "admin") return true;
  if (docRole === "general") return true;
  return docRole === userRole;
}

/** 사용자가 특정 역할 이상인지 */
export function hasMinimumRole(
  userRole: UserRole,
  minimum: UserRole
): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimum];
}

/** 업로드 권한: manager 이상 */
export function canUploadDocuments(userRole: UserRole): boolean {
  return hasMinimumRole(userRole, "manager");
}

/** 인덱싱(전체 재동기화) 권한: admin만 */
export function canReindexVault(userRole: UserRole): boolean {
  return userRole === "admin";
}

export function isValidUserRole(role: string): role is UserRole {
  return USER_ROLES.includes(role as UserRole);
}

/** 업로드 시 문서 role 지정 권한 (manager는 admin 문서 지정 불가) */
export function canAssignDocumentRole(
  userRole: UserRole,
  documentRole: UserRole
): boolean {
  if (!isValidUserRole(documentRole)) return false;
  if (userRole === "admin") return true;
  if (userRole === "manager") {
    return documentRole === "general" || documentRole === "manager";
  }
  return false;
}
