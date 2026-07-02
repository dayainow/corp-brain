import type { VaultDocumentInfo, VaultTreeNode } from "./types";

function sortNodes(nodes: VaultTreeNode[]): VaultTreeNode[] {
  return nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name, "ko");
  });
}

export function buildVaultTree(documents: VaultDocumentInfo[]): VaultTreeNode {
  const root: VaultTreeNode = {
    id: "/",
    name: "vault",
    type: "folder",
    children: [],
  };

  const folderMap = new Map<string, VaultTreeNode>([["/", root]]);

  function ensureFolder(folderPath: string): VaultTreeNode {
    const normalized = folderPath === "" ? "/" : folderPath;
    const existing = folderMap.get(normalized);
    if (existing) return existing;

    const segments = normalized.split("/").filter(Boolean);
    let currentPath = "/";
    let current = root;

    for (const segment of segments) {
      currentPath = currentPath === "/" ? `/${segment}` : `${currentPath}/${segment}`;
      let folder = folderMap.get(currentPath);
      if (!folder) {
        folder = {
          id: currentPath,
          name: segment,
          type: "folder",
          children: [],
        };
        current.children = current.children ?? [];
        current.children.push(folder);
        folderMap.set(currentPath, folder);
      }
      current = folder;
    }

    return current;
  }

  for (const doc of documents) {
    const parent = ensureFolder(doc.folderPath);
    parent.children = parent.children ?? [];
    parent.children.push({
      id: doc.relativePath,
      name: doc.fileName,
      type: "file",
      title: doc.title,
      role: doc.role,
      fileName: doc.fileName,
      fileType: doc.fileType,
    });
  }

  function pruneAndSort(node: VaultTreeNode): VaultTreeNode | null {
    if (node.type === "file") return node;

    const children = (node.children ?? [])
      .map(pruneAndSort)
      .filter((child): child is VaultTreeNode => child !== null);

    if (node.id !== "/" && children.length === 0) return null;

    return {
      ...node,
      children: sortNodes(children),
    };
  }

  const pruned = pruneAndSort(root);
  return pruned ?? { ...root, children: [] };
}
