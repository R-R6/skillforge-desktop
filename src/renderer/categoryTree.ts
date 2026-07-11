import type { SkillCategoryCount } from "../shared/types";

const CATEGORY_SEPARATOR = " / ";

export interface CategoryTreeNode {
  id: string;
  label: string;
  count: number;
  totalCount: number;
  children: CategoryTreeNode[];
}

export function buildCategoryTree(categories: SkillCategoryCount[]): CategoryTreeNode[] {
  const roots: CategoryTreeNode[] = [];

  function findOrCreateChild(nodes: CategoryTreeNode[], id: string, label: string): CategoryTreeNode {
    const existing = nodes.find((node) => node.id === id);
    if (existing) return existing;
    const created: CategoryTreeNode = { id, label, count: 0, totalCount: 0, children: [] };
    nodes.push(created);
    return created;
  }

  for (const item of categories) {
    const segments = item.category.split(CATEGORY_SEPARATOR).map((segment) => segment.trim()).filter(Boolean);
    if (segments.length === 0) continue;

    let currentNodes = roots;
    let currentPath = "";
    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index];
      currentPath = currentPath ? `${currentPath}${CATEGORY_SEPARATOR}${segment}` : segment;
      const node = findOrCreateChild(currentNodes, currentPath, segment);
      if (index === segments.length - 1) node.count += item.count;
      currentNodes = node.children;
    }
  }

  const sortNodes = (nodes: CategoryTreeNode[]) => {
    nodes.sort((left, right) => left.label.localeCompare(right.label, "zh-CN"));
    nodes.forEach((node) => sortNodes(node.children));
  };

  const applyTotals = (node: CategoryTreeNode): number => {
    const childTotal = node.children.reduce((sum, child) => sum + applyTotals(child), 0);
    node.totalCount = node.count + childTotal;
    return node.totalCount;
  };

  sortNodes(roots);
  roots.forEach(applyTotals);
  return roots;
}

export function getTotalSkillCount(categories: SkillCategoryCount[]): number {
  return categories.reduce((sum, item) => sum + item.count, 0);
}

export function getTopLevelCategoryLabel(category: string): string {
  return category.split(CATEGORY_SEPARATOR)[0]?.trim() || category;
}
