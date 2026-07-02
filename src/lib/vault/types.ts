import type { UserRole } from "@/lib/rbac";

export interface VaultDocumentInfo {
  fileName: string;
  relativePath: string;
  folderPath: string;
  role: UserRole;
  title: string;
  fileType: string;
  size: number;
  expires?: string;
}

export interface VaultTreeNode {
  id: string;
  name: string;
  type: "folder" | "file";
  children?: VaultTreeNode[];
  title?: string;
  role?: UserRole;
  fileName?: string;
  fileType?: string;
}
