import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FolderInput, Library, Search } from "lucide-react";
import type { SkillNavigationSnapshot } from "../shared/types";
import { buildCategoryTree, type CategoryTreeNode } from "./categoryTree";
import {
  COLLECTED_KIND_GROUPS,
  getNavigationCategoryKey,
  getSidebarScope,
  groupExternalSourcesByKind,
  NAV_ALL,
  NAV_BUILTIN_ALL,
  NAV_EXTERNAL_ALL,
} from "../shared/skillNavigation";

interface CategorySidebarProps {
  navigation: SkillNavigationSnapshot;
  activeNavigationKey: string;
  onSelectNavigation: (navigationKey: string) => void;
  onOpenProjects?: () => void;
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

export default function CategorySidebar({
  navigation,
  activeNavigationKey,
  onSelectNavigation,
  onOpenProjects,
}: CategorySidebarProps) {
  const [filter, setFilter] = useState("");
  const scope = getSidebarScope(activeNavigationKey);
  const builtinTotal = navigation.totalCount - navigation.externalTotal;
  const builtinTree = useMemo(() => buildCategoryTree(navigation.builtinCategories), [navigation.builtinCategories]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

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

  const groupedExternalSources = useMemo(
    () => groupExternalSourcesByKind(filteredExternalSources),
    [filteredExternalSources],
  );

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
        <span>浏览范围</span>
        <small>内置预装与项目收录分开查看</small>
      </div>

      <div className="category-scope-switch" role="tablist" aria-label="Skill 浏览范围">
        <button
          type="button"
          role="tab"
          aria-selected={scope === "all"}
          className={scope === "all" ? "category-scope-segment active" : "category-scope-segment"}
          onClick={() => onSelectNavigation(NAV_ALL)}
        >
          全部
          <span className="category-scope-segment-count">{navigation.totalCount}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={scope === "builtin"}
          className={scope === "builtin" ? "category-scope-segment active" : "category-scope-segment"}
          onClick={() => onSelectNavigation(NAV_BUILTIN_ALL)}
        >
          内置
          <span className="category-scope-segment-count">{builtinTotal}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={scope === "collected"}
          className={scope === "collected" ? "category-scope-segment active" : "category-scope-segment"}
          onClick={() => onSelectNavigation(NAV_EXTERNAL_ALL)}
        >
          收录
          <span className="category-scope-segment-count">{navigation.externalTotal}</span>
        </button>
      </div>

      <label className="category-filter-box">
        <Search size={14} />
        <input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder={scope === "collected" ? "筛选收录来源" : scope === "builtin" ? "筛选内置分类" : "筛选分类或来源"}
        />
      </label>

      <div className="category-tree">
        {scope === "all" && (
          <div className="category-scope-overview">
            <button
              type="button"
              className="category-scope-card"
              onClick={() => onSelectNavigation(NAV_BUILTIN_ALL)}
            >
              <span className="category-scope-card-icon" aria-hidden="true">
                <Library size={14} />
              </span>
              <span className="category-scope-card-copy">
                <strong>内置技能</strong>
                <small>SkillForge 预装部门分类</small>
              </span>
              <span className="category-tree-count">{builtinTotal}</span>
            </button>
            <button
              type="button"
              className="category-scope-card"
              onClick={() => onSelectNavigation(NAV_EXTERNAL_ALL)}
            >
              <span className="category-scope-card-icon collected" aria-hidden="true">
                <FolderInput size={14} />
              </span>
              <span className="category-scope-card-copy">
                <strong>收录到库</strong>
                <small>项目管理收录 · GitHub · 本地导入</small>
              </span>
              <span className="category-tree-count">{navigation.externalTotal}</span>
            </button>
            <p className="category-scope-hint">选择上方卡片进入对应分类；收录 Skill 需在项目管理中扫描后保存到库。</p>
          </div>
        )}

        {scope === "builtin" && (
          <>
            <div className="category-section-intro">
              <span className="category-section-icon" aria-hidden="true">
                <Library size={12} />
              </span>
              <div className="category-section-intro-copy">
                <strong>内置技能</strong>
                <span>随应用预装，按部门分类浏览</span>
              </div>
            </div>
            {filteredBuiltinTree.length === 0 ? (
              <div className="category-sidebar-empty">没有匹配的内置分类。</div>
            ) : filteredBuiltinTree.map((node) => (
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
          </>
        )}

        {scope === "collected" && (
          <div className="category-collected-panel">
            <div className="category-section-intro collected">
              <span className="category-section-icon" aria-hidden="true">
                <FolderInput size={12} />
              </span>
              <div className="category-section-intro-copy">
                <strong>收录到库</strong>
                <span>在项目管理中扫描收录，或通过 GitHub / 本地导入添加</span>
              </div>
              <span className="category-section-count">{navigation.externalTotal}</span>
            </div>

            {navigation.externalTotal === 0 ? (
              <div className="category-sidebar-empty">
                <p>还没有收录 Skill。</p>
                <p>前往项目管理，扫描本地项目后将 Skill 收录保存到库。</p>
                {onOpenProjects && (
                  <button type="button" className="outline-button compact-button" onClick={onOpenProjects}>
                    前往项目管理
                  </button>
                )}
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className={activeNavigationKey === NAV_EXTERNAL_ALL ? "category-tree-item category-tree-external-root active" : "category-tree-item category-tree-external-root"}
                  onClick={() => onSelectNavigation(NAV_EXTERNAL_ALL)}
                >
                  <span className="category-tree-label">全部收录</span>
                  <span className="category-tree-count">{navigation.externalTotal}</span>
                </button>

                {COLLECTED_KIND_GROUPS.map((group) => {
                  const sources = groupedExternalSources.get(group.kind) ?? [];
                  if (sources.length === 0) return null;
                  const groupCount = sources.reduce((sum, source) => sum + source.count, 0);
                  return (
                    <div key={group.kind} className="category-kind-group">
                      <div className="category-kind-label">
                        <span>{group.label}</span>
                        <small>{group.hint}</small>
                        <span className="category-kind-count">{groupCount}</span>
                      </div>
                      {sources.map((source) => (
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
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
