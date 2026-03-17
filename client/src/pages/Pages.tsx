import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { pagesApi, type Page } from "@/lib/api";
import { Plus, Pencil, Trash2, Globe, EyeOff, ExternalLink } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ── Zod schema ────────────────────────────────────────────────────────────────

const pageSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and hyphens only"),
  content: z.string(),
  excerpt: z.string().optional(),
  isPublished: z.boolean(),
  showInNav: z.boolean(),
  navLabel: z.string().optional(),
  sortOrder: z.coerce.number().int().min(0),
});

type PageForm = z.infer<typeof pageSchema>;

function formDefault(page?: Page): PageForm {
  return {
    title: page?.title ?? "",
    slug: page?.slug ?? "",
    content: page?.content ?? "",
    excerpt: page?.excerpt ?? "",
    isPublished: page?.isPublished ?? false,
    showInNav: page?.showInNav ?? false,
    navLabel: page?.navLabel ?? "",
    sortOrder: page?.sortOrder ?? 0,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Pages() {
  const [pages, setPages] = useState<Page[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Page | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);

  const form = useForm<PageForm>({
    resolver: zodResolver(pageSchema) as any,
    defaultValues: formDefault(),
  });

  const load = () => {
    setIsLoading(true);
    pagesApi
      .getAll()
      .then((res) => setPages(res.data))
      .catch(() => toast.error("Failed to load pages"))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Auto-generate slug from title when creating a new page
  const titleValue = form.watch("title");
  useEffect(() => {
    if (!editing) {
      form.setValue("slug", slugify(titleValue ?? ""), { shouldValidate: false });
    }
  }, [titleValue, editing]);

  const openCreate = () => {
    setEditing(null);
    form.reset(formDefault());
    setDialogOpen(true);
  };

  const openEdit = (page: Page) => {
    setEditing(page);
    form.reset(formDefault(page));
    setDialogOpen(true);
  };

  const onSubmit = async (values: PageForm) => {
    setSaving(true);
    try {
      if (editing) {
        await pagesApi.update(editing.id, { ...values, excerpt: values.excerpt || null, navLabel: values.navLabel || null });
        toast.success("Page updated");
      } else {
        await pagesApi.create({ ...values, excerpt: values.excerpt || null, navLabel: values.navLabel || null });
        toast.success("Page created");
      }
      setDialogOpen(false);
      load();
    } catch {
      toast.error("Failed to save page");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this page? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await pagesApi.delete(id);
      toast.success("Page deleted");
      load();
    } catch {
      toast.error("Failed to delete page");
    } finally {
      setDeletingId(null);
    }
  };

  const handlePublishToggle = async (page: Page) => {
    try {
      await pagesApi.update(page.id, { isPublished: !page.isPublished });
      load();
    } catch {
      toast.error("Failed to update");
    }
  };

  const frontendBase =
    (import.meta.env.VITE_FRONTEND_URL as string | undefined) ?? "http://localhost:3000";

  return (
    <AdminLayout
      title="Pages"
      description="Create and manage custom pages that appear on the public website."
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">
          {pages.length} page{pages.length !== 1 ? "s" : ""}
          {" · "}
          {pages.filter((p) => p.isPublished).length} published
        </p>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          New Page
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => <Skeleton key={n} className="h-12 w-full" />)}
        </div>
      ) : pages.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Globe className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-playfair text-lg font-semibold text-foreground mb-1">No pages yet</p>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first custom page — it will be accessible at{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">/pages/your-slug</code> on the site.
          </p>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            New Page
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Nav</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.map((page) => (
                <TableRow key={page.id}>
                  <TableCell className="font-medium">{page.title}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                      /pages/{page.slug}
                    </code>
                  </TableCell>
                  <TableCell>
                    <button onClick={() => handlePublishToggle(page)}>
                      {page.isPublished ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer gap-1">
                          <Globe className="h-3 w-3" /> Published
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground cursor-pointer gap-1">
                          <EyeOff className="h-3 w-3" /> Draft
                        </Badge>
                      )}
                    </button>
                  </TableCell>
                  <TableCell>
                    {page.showInNav ? (
                      <span className="text-xs text-green-700 font-medium">
                        {page.navLabel || page.title}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">–</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateTime(page.updatedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        title="Preview page"
                      >
                        <a
                          href={`${frontendBase}/pages/${page.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(page)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(page.id)}
                        disabled={deletingId === page.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-playfair text-xl">
              {editing ? "Edit Page" : "New Page"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-2">
            {/* Title + Slug row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Title *</Label>
                <Input {...form.register("title")} placeholder="About the Heritage Project" />
                {form.formState.errors.title && (
                  <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Slug *</Label>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground shrink-0">/pages/</span>
                  <Input {...form.register("slug")} placeholder="heritage-project" className="font-mono text-sm" />
                </div>
                {form.formState.errors.slug && (
                  <p className="text-xs text-destructive">{form.formState.errors.slug.message}</p>
                )}
              </div>
            </div>

            {/* Excerpt */}
            <div className="space-y-1.5">
              <Label>Excerpt <span className="text-muted-foreground font-normal">(optional — shown in previews)</span></Label>
              <Input {...form.register("excerpt")} placeholder="A short summary of this page..." />
            </div>

            {/* Content */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Content</Label>
                <span className="text-xs text-muted-foreground">
                  Tip: Use <code># Heading</code>, <code>## Sub-heading</code>, blank lines for paragraphs
                </span>
              </div>
              <Textarea
                {...form.register("content")}
                rows={18}
                className="font-mono text-sm resize-y"
                placeholder={"# Welcome\n\nWrite your page content here.\n\n## Section Title\n\nMore content..."}
              />
            </div>

            {/* Settings row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-lg border p-4 bg-muted/30">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="isPublished" className="cursor-pointer">Published</Label>
                <Switch
                  id="isPublished"
                  checked={form.watch("isPublished")}
                  onCheckedChange={(v) => form.setValue("isPublished", v)}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="showInNav" className="cursor-pointer">Show in nav</Label>
                <Switch
                  id="showInNav"
                  checked={form.watch("showInNav")}
                  onCheckedChange={(v) => form.setValue("showInNav", v)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Sort order</Label>
                <Input {...form.register("sortOrder")} type="number" min={0} className="w-20" />
              </div>
            </div>

            {/* Nav label (show only if showInNav is on) */}
            {form.watch("showInNav") && (
              <div className="space-y-1.5">
                <Label>Nav label <span className="text-muted-foreground font-normal">(defaults to title)</span></Label>
                <Input {...form.register("navLabel")} placeholder={form.watch("title")} />
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : editing ? "Save Changes" : "Create Page"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
