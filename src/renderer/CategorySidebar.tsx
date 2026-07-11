import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FolderTree, Globe2, Search } from "lucide-react";
import type { SkillNavigationSnapshot } from "../shared/types";
import { buildCategoryTree, type CategoryTreeNode } from "./categoryTree";
import { getNavigationCategoryKey, NAV_ALL, NAV_EXTERNAL_ALL } from "../shared/skillNavigation";

interface CategorySidebarProps {
  navigation: SkillNavigationSnapshot;
  activeNavigationKey: string;
  onSelectNavigation: (navigationKey: string) => void;
}

function CategoryTreeItem({
  node,
  depth,
  activeNavigationKey,
  expandedIds,
  onToggleExpand,
  onSelectNavigation,
}: {
  node: CategoryTreeNode;
  depth: number;
  activeNavigationKey: string;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onSelectNavigation: (navigationKey: string) => void;
}) {
  const navigationKey = getNavigationCategoryKey(node.id);
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isActive = activeNavigationKey === navigationKey;

  return (
    <>
      <div className="category-tree-row" style={{ paddingLeft: `${10 + depth * 14}px` }}>
        {hasChildren ? (
          <button
            type="button"
            className="category-tree-toggle"
            onClick={() => onToggleExpand(node.id)}
            aria-label={isExpanded ? "收起分类" : "展开分类"}
          >
            {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
        ) : (
          <span className="category-tree-toggle-spacer" />
        )}
        <button
          type="button"
          className={isActive ? "category-tree-item active" : "category-tree-item"}
          onClick={() => onSelectNavigation(navigationKey)}
        >
          <span className="category-tree-label">{node.label}</span>
          <span className="category-tree-count">{node.totalCount}</span>
        </button>
      </div>
      {hasChildren && isExpanded && node.children.map((child) => (
        <CategoryTreeItem
          key={child.id}
          node={child}
          depth={depth + 1}
          activeNavigationKey={activeNavigationKey}
          expandedIds={expandedIds}
          onToggleExpand={onToggleExpand}
          onSelectNavigation={onSelectNavigation}
        />
      ))}
    </>
  );
}

export default function CategorySidebar({ navigation, activeNavigationKey, onSelectNavigation }: CategorySidebarProps) {
  const [filter, setFilter] = useState("");
  const builtinTree = useMemo(() => buildCategoryTree(navigation.builtinCategories), [navigation.builtinCategories]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(builtinTree.map((node) => node.id)));

  const filteredBuiltinTree = useMemo(() => {
    const keyword = filter.trim().toLowerCase();
    if (!keyword) return builtinTree;

    function filterNodes(nodes: CategoryTreeNode[]): CategoryTreeNode[] {
      return nodes.flatMap((node) => {
        const filteredChildren = filterNodes(node.children);
        const matches = node.label.toLowerCase().includes(keyword) || node.id.toLowerCase().includes(keyword);
        if (!matches && filteredChildren.length === 0) return [];
        return [{ ...node, children: filteredChildren }];
      });
    }

    return filterNodes(builtinTree);
  }, [builtinTree, filter]);

  const filteredExternalSources = useMemo(() => {
    const keyword = filter.trim().toLowerCase();
    if (!keyword) return navigation.externalSources;
    return navigation.externalSources.filter((source) =>
      source.label.toLowerCase().includes(keyword)
      || source.description?.toLowerCase().includes(keyword)
      || source.kind.toLowerCase().includes(keyword),
    );
  }, [filter, navigation.externalSources]);

  const externalSectionActive = activeNavigationKey === NAV_EXTERNAL_ALL
    || navigation.externalSources.some((source) => source.id === activeNavigationKey);

  function toggleExpand(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <aside className="category-sidebar">
      <div className="category-sidebar-header">
        <span>分类筛选</span>
      </div>
      <label className="category-filter-box">
        <Search size={14} />
        <input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="筛选分类或来源"
        />
      </label>
      <div className="category-tree">
        <button
          type="button"
          className={activeNavigationKey === NAV_ALL ? "category-tree-item category-tree-all active" : "category-tree-item category-tree-all"}
          onClick={() => onSelectNavigation(NAV_ALL)}
        >
          <span className="category-tree-label">全部</span>
          <span className="category-tree-count">{navigation.totalCount}</span>
        </button>

        <div className="category-section-label">
          <FolderTree size={12} />
          <span>内置 Skill</span>
        </div>
        {filteredBuiltinTree.map((node) => (
          <CategoryTreeItem
            key={node.id}
            node={node}
            depth={0}
            activeNavigationKey={activeNavigationKey}
            expandedIds={expandedIds}
            onToggleExpand={toggleExpand}
            onSelectNavigation={onSelectNavigation}
          />
        ))}

        <div className={`category-section-external${externalSectionActive ? " active" : ""}`}>
          <div className="category-section-label category-section-label-external">
            <Globe2 size={12} />
            <span>外部 Skill</span>
            <span className="category-section-count">{navigation.externalTotal}</span>
          </div>
          <button
            type="button"
            className={activeNavigationKey === NAV_EXTERNAL_ALL ? "category-tree-item category-tree-external-root active" : "category-tree-item category-tree-external-root"}
            onClick={() => onSelectNavigation(NAV_EXTERNAL_ALL)}
          >
            <span className="category-tree-label">全部外部 Skill</span>
            <span className="category-tree-count">{navigation.externalTotal}</span>
          </button>
          {filteredExternalSources.map((source) => (
            <button
              key={source.id}
              type="button"
              className={activeNavigationKey === source.id ? "category-tree-item category-tree-source active" : "category-tree-item category-tree-source"}
              onClick={() => onSelectNavigation(source.id)}
            >
              <span className="category-tree-source-copy">
                <strong>{source.label}</strong>
                {source.description && <small>{source.description}</small>}
              </span>
              <span className="category-tree-count">{source.count}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
