import type { VaultTreeNode } from "./types";

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

function fileMatches(node: VaultTreeNode, q: string): boolean {
  if (node.type !== "file") return false;
  const label = (node.title ?? node.name).toLowerCase();
  const fileName = (node.fileName ?? node.name).toLowerCase();
  const stem = fileName.replace(/\.(md|markdown|pdf|docx)$/i, "");
  return label.includes(q) || fileName.includes(q) || stem.includes(q);
}

/** 검색어에 맞는 하위 트리만 남깁니다. */
export function filterVaultTree(
  node: VaultTreeNode,
  query: string
): VaultTreeNode | null {
  const q = normalizeQuery(query);
  if (!q) return node;

  if (node.type === "file") {
    return fileMatches(node, q) ? node : null;
  }

  const children =
    node.children
      ?.map((child) => filterVaultTree(child, q))
      .filter((child): child is VaultTreeNode => child !== null) ?? [];

  if (children.length === 0) return null;
  return { ...node, children };
}

export function countVaultFiles(node: VaultTreeNode): number {
  if (node.type === "file") return 1;
  return node.children?.reduce((sum, child) => sum + countVaultFiles(child), 0) ?? 0;
}

export function collectFolderIds(node: VaultTreeNode, ids: string[] = []): string[] {
  if (node.type === "folder" && node.id !== "/") {
    ids.push(node.id);
  }
  node.children?.forEach((child) => collectFolderIds(child, ids));
  return ids;
}
