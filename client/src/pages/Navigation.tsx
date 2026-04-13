import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import NavigationFormDialog from "@/components/NavigationForm";
import { navigationApi, pagesApi, type NavigationItem, type Page } from "@/lib/api";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, Lock } from "lucide-react";

// ── Recursive Tree Node Component ──────────────────────────────────────────

function TreeNode({
  item,
  level,
  onEdit,
  onDelete,
  onToggleActive,
  isLoading,
}: {
  item: NavigationItem;
  level: number;
  onEdit: (item: NavigationItem) => void;
  onDelete: (item: NavigationItem) => void;
  onToggleActive: (item: NavigationItem) => Promise<void>;
  isLoading: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = (item.children?.length ?? 0) > 0;
  const indent = level * 20;

  const getLevelBadgeColor = (lvl: number) => {
    if (lvl === 1) return "bg-blue-50 text-blue-700";
    if (lvl === 2) return "bg-purple-50 text-purple-700";
    return "bg-green-50 text-green-700";
  };

  const getLevelLabel = (lvl: number) => {
    if (lvl === 1) return "Main";
    if (lvl === 2) return "Sub-Cat";
    return "Child";
  };

  const getLink = () => {
    if (item.pageId) return `Page: ${item.pageId}`;
    if (item.href) return item.href;
    return "-";
  };

  return (
    <div>
      <div
        style={{ marginLeft: `${indent}px` }}
        className="flex items-center gap-3 py-2.5 px-3 bg-white border-b hover:bg-gray-50 transition-colors"
      >
        {/* Expand/Collapse */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-shrink-0 w-5 h-5 flex items-center justify-center"
          disabled={!hasChildren}
        >
          {hasChildren && (
            expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
          )}
        </button>

        {/* Level Badge */}
        <Badge variant="outline" className={getLevelBadgeColor(item.level)}>
          {getLevelLabel(item.level)}
        </Badge>

        {/* System lock badge */}
        {item.isSystem && (
          <span title="System item – cannot be deleted" className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
            <Lock className="w-3 h-3" /> System
          </span>
        )}

        {/* Label & Link */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{item.label}</p>
          <p className="text-xs text-gray-500 truncate">{getLink()}</p>
        </div>

        {/* Active Toggle */}
        <Switch
          checked={item.isActive}
          onCheckedChange={() => onToggleActive(item)}
          disabled={isLoading}
        />

        {/* Icon (if main item) */}
        {item.icon && (
          <span className="text-xs bg-gray-100 px-2 py-1 rounded">{item.icon}</span>
        )}

        {/* Actions */}
        <div className="flex gap-1 flex-shrink-0">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(item)}
            disabled={isLoading}
            className="h-8 w-8 p-0"
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(item)}
            disabled={item.isSystem || isLoading}
            title={item.isSystem ? "System items cannot be deleted" : "Delete"}
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-30"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div className="bg-gray-50">
          {item.children!.map((child) => (
            <TreeNode
              key={child.id}
              item={child}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleActive={onToggleActive}
              isLoading={isLoading}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Navigation() {
  const [items, setItems] = useState<NavigationItem[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<NavigationItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NavigationItem | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const [navRes, pagesRes] = await Promise.all([
        navigationApi.getAll(),
        pagesApi.getAll(),
      ]);
      setItems(navRes.data);
      setPages(pagesRes.data);
    } catch (error) {
      toast.error("Failed to load navigation");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (item: NavigationItem) => {
    setEditing(item);
    setDialogOpen(true);
  };

  const handleSubmit = async (data: any) => {
    setSaving(true);
    try {
      if (editing) {
        await navigationApi.update(editing.id, data);
        toast.success("Navigation item updated");
      } else {
        await navigationApi.create(data);
        toast.success("Navigation item created");
      }
      setDialogOpen(false);
      await load();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to save navigation item");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await navigationApi.delete(deleteTarget.id);
      toast.success("Navigation item deleted");
      setDeleteTarget(null);
      await load();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to delete navigation item");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item: NavigationItem) => {
    setSaving(true);
    try {
      await navigationApi.update(item.id, { isActive: !item.isActive });
      toast.success(item.isActive ? "Item hidden" : "Item shown");
      await load();
    } catch (error: any) {
      toast.error("Failed to update item");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  // Flatten tree for accurate counting
  const flatItems = useMemo(() => {
    const flat: NavigationItem[] = [];
    const collect = (list: NavigationItem[]) => {
      for (const navItem of list) {
        flat.push(navItem);
        if (navItem.children) collect(navItem.children);
      }
    };
    collect(items);
    return flat;
  }, [items]);

  const mainItemCount = flatItems.filter((i) => i.level === 1).length;

  return (
    <AdminLayout title="Navigation Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Navigation Items</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage main nav items (max 6), sub-categories, and child links
            </p>
          </div>
          <Button onClick={openCreate} disabled={isLoading || saving}>
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-xs text-blue-600 font-semibold uppercase">Main Items</p>
            <p className="text-2xl font-bold text-blue-900">{mainItemCount}/6</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-xs text-purple-600 font-semibold uppercase">Sub-Categories</p>
            <p className="text-2xl font-bold text-purple-900">
              {flatItems.filter((i) => i.level === 2).length}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-xs text-green-600 font-semibold uppercase">Child Links</p>
            <p className="text-2xl font-bold text-green-900">
              {flatItems.filter((i) => i.level === 3).length}
            </p>
          </div>
        </div>

        {/* Tree View */}
        <div className="border rounded-lg bg-white overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">No navigation items yet. Create your first one!</p>
              <Button onClick={openCreate} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Create Main Item
              </Button>
            </div>
          ) : (
            <div>
              {items
                .filter((i) => i.level === 1) // Only render main items at root level
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((item) => (
                  <TreeNode
                    key={item.id}
                    item={item}
                    level={0}
                    onEdit={openEdit}
                    onDelete={(item) => setDeleteTarget(item)}
                    onToggleActive={handleToggleActive}
                    isLoading={saving}
                  />
                ))}
            </div>
          )}
        </div>

        {/* How to use */}
        {items.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-blue-900 mb-2">How to use:</p>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>
                <strong>Main Items (Blue):</strong> Add up to 6 main navigation items
              </li>
              <li>
                <strong>Sub-Categories (Purple):</strong> Optional groupings within main items
              </li>
              <li>
                <strong>Child Links (Green):</strong> Actual links to pages or custom URLs (level 3 only)
              </li>
              <li>Click the arrow to expand/collapse items and view children</li>
            </ul>
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <NavigationFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={editing}
        mainItems={items}
        pages={pages}
        onSubmit={handleSubmit}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Navigation Item?</AlertDialogTitle>
          <AlertDialogDescription>
            Deleting "{deleteTarget?.label}" and all its children cannot be undone.
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={saving} className="bg-red-600">
              {saving ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
