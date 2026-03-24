import { useEffect, useRef, useState } from "react";
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
import { Plus, Pencil, Trash2, Globe, EyeOff, ExternalLink, ImagePlus, X } from "lucide-react";
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
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  canonical: z.string().url().optional().nullable(),
  ogTitle: z.string().optional().nullable(),
  ogDescription: z.string().optional().nullable(),
  ogImage: z.string().url().optional().nullable(),
  robots: z.string().optional(),
  isPublished: z.boolean(),
  showInNav: z.boolean(),
  navLabel: z.string().optional(),
  navPosition: z.enum(["top", "church", "ministries", "sacraments", "sacraments-faith-education"]),
  sortOrder: z.coerce.number().int().min(0),
});

type PageForm = z.infer<typeof pageSchema>;

function formDefault(page?: Page): PageForm {
  return {
    title: page?.title ?? "",
    slug: page?.slug ?? "",
    content: page?.content ?? "",
    excerpt: page?.excerpt ?? "",
    metaTitle: page?.metaTitle ?? "",
    metaDescription: page?.metaDescription ?? "",
    canonical: page?.canonical ?? "",
    ogTitle: page?.ogTitle ?? "",
    ogDescription: page?.ogDescription ?? "",
    ogImage: page?.ogImage ?? "",
    robots: page?.robots ?? "index,follow",
    isPublished: page?.isPublished ?? false,
    showInNav: page?.showInNav ?? false,
    navLabel: page?.navLabel ?? "",
    navPosition: page?.navPosition ?? "top",
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
  const [deleteTarget, setDeleteTarget] = useState<Page | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [bodyImageUrl, setBodyImageUrl] = useState<string | null>(null);
  const [bodyImageCaption, setBodyImageCaption] = useState("");
  const [uploadingBodyImage, setUploadingBodyImage] = useState(false);
  const bodyImageInputRef = useRef<HTMLInputElement>(null);

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
    setImageUrl(null);
    setBodyImageUrl(null);
    setBodyImageCaption("");
    form.reset(formDefault());
    setDialogOpen(true);
  };

  const openEdit = (page: Page) => {
    setEditing(page);
    setImageUrl(page.imageUrl ?? null);
    setBodyImageUrl(page.bodyImageUrl ?? null);
    setBodyImageCaption(page.bodyImageCaption ?? "");
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (!editing) {
      toast.error("Save the page first, then upload an image");
      return;
    }
    setUploadingImage(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await pagesApi.uploadImage(editing.id, formData);
      setImageUrl(res.data.url);
      toast.success("Image uploaded");
      load();
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const handleRemoveImage = async () => {
    if (!editing) return;
    try {
      await pagesApi.update(editing.id, { imageUrl: null });
      setImageUrl(null);
      toast.success("Image removed");
      load();
    } catch {
      toast.error("Failed to remove image");
    }
  };

  const handleBodyImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (!editing) {
      toast.error("Save the page first, then upload an image");
      return;
    }
    setUploadingBodyImage(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await pagesApi.uploadBodyImage(editing.id, formData);
      setBodyImageUrl(res.data.url);
      toast.success("Body image uploaded");
      load();
    } catch {
      toast.error("Failed to upload body image");
    } finally {
      setUploadingBodyImage(false);
      if (bodyImageInputRef.current) bodyImageInputRef.current.value = "";
    }
  };

  const handleRemoveBodyImage = async () => {
    if (!editing) return;
    try {
      await pagesApi.update(editing.id, { bodyImageUrl: null, bodyImageCaption: null });
      setBodyImageUrl(null);
      setBodyImageCaption("");
      toast.success("Body image removed");
      load();
    } catch {
      toast.error("Failed to remove body image");
    }
  };

  const handleBodyCaptionBlur = async () => {
    if (!editing) return;
    try {
      await pagesApi.update(editing.id, { bodyImageCaption: bodyImageCaption || null });
    } catch {
      // silent — non-critical
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await pagesApi.delete(id);
      toast.success("Page deleted");
      load();
    } catch {
      toast.error("Failed to delete page");
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
      setDeleteConfirmText("");
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
                        <span className="ml-1 text-muted-foreground font-normal">
                          ({page.navPosition === "top" ? "Top bar" : page.navPosition === "church" ? "Church menu" : page.navPosition === "ministries" ? "Ministries menu" : page.navPosition === "sacraments" ? "Sacraments menu" : "Sacraments → Faith Education"})
                        </span>
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
                        onClick={() => { setDeleteTarget(page); setDeleteConfirmText(""); }}
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteConfirmText(""); } }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-playfair text-xl text-destructive">
              Delete page
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              This will permanently delete{" "}
              <span className="font-semibold text-foreground">{deleteTarget?.title}</span>{" "}
              and remove it from the public website. This action cannot be undone.
            </p>
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              The page will be immediately unpublished and all content will be lost.
            </div>
            <div className="space-y-1.5">
              <Label>
                To confirm, type{" "}
                <span className="font-mono font-semibold">{deleteTarget?.title}</span>{" "}
                below
              </Label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={deleteTarget?.title ?? ""}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setDeleteTarget(null); setDeleteConfirmText(""); }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteConfirmText !== deleteTarget?.title || deletingId === deleteTarget?.id}
              onClick={() => deleteTarget && handleDelete(deleteTarget.id)}
            >
              {deletingId === deleteTarget?.id ? "Deleting…" : "Delete page"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

            {/* Images row — hero + body side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Hero image */}
              <div className="space-y-2">
                <Label>Hero image <span className="text-muted-foreground font-normal">(full-width banner)</span></Label>
                {imageUrl ? (
                  <div className="relative rounded-lg overflow-hidden border border-input h-32 bg-muted">
                    <img src={imageUrl} alt="Hero" className="w-full h-full object-cover" />
                    {editing && (
                      <button type="button" onClick={handleRemoveImage}
                        className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors" title="Remove">
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-input h-32 flex items-center justify-center bg-muted/30 text-muted-foreground text-xs text-center px-2">
                    {editing ? "No hero image" : "Save page first"}
                  </div>
                )}
                {editing && (
                  <>
                    <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    <Button type="button" variant="outline" size="sm" className="gap-2 w-full" disabled={uploadingImage}
                      onClick={() => imageInputRef.current?.click()}>
                      <ImagePlus className="h-4 w-4" />
                      {uploadingImage ? "Uploading…" : imageUrl ? "Replace" : "Upload hero"}
                    </Button>
                  </>
                )}
              </div>

              {/* Body image */}
              <div className="space-y-2">
                <Label>Body image <span className="text-muted-foreground font-normal">(side layout in content)</span></Label>
                {bodyImageUrl ? (
                  <div className="relative rounded-lg overflow-hidden border border-input h-32 bg-muted">
                    <img src={bodyImageUrl} alt="Body" className="w-full h-full object-cover" />
                    {editing && (
                      <button type="button" onClick={handleRemoveBodyImage}
                        className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors" title="Remove">
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-input h-32 flex items-center justify-center bg-muted/30 text-muted-foreground text-xs text-center px-2">
                    {editing ? "No body image" : "Save page first"}
                  </div>
                )}
                {editing && (
                  <>
                    <input ref={bodyImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleBodyImageUpload} />
                    <Button type="button" variant="outline" size="sm" className="gap-2 w-full" disabled={uploadingBodyImage}
                      onClick={() => bodyImageInputRef.current?.click()}>
                      <ImagePlus className="h-4 w-4" />
                      {uploadingBodyImage ? "Uploading…" : bodyImageUrl ? "Replace" : "Upload body"}
                    </Button>
                  </>
                )}
                {bodyImageUrl && editing && (
                  <Input
                    value={bodyImageCaption}
                    onChange={(e) => setBodyImageCaption(e.target.value)}
                    onBlur={handleBodyCaptionBlur}
                    placeholder="Optional caption…"
                    className="text-sm"
                  />
                )}
              </div>
            </div>

            {/* Settings row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border p-4 bg-muted/30">
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
              <div className="space-y-1.5">
                <Label>Nav position</Label>
                <select
                  {...form.register("navPosition")}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="top">Top bar (standalone link)</option>
                  <option value="church">Home → Church dropdown</option>
                  <option value="ministries">Home → Ministries dropdown</option>
                  <option value="sacraments">Sacraments → Sacraments group</option>
                  <option value="sacraments-faith-education">Sacraments → Faith Education group</option>
                </select>
              </div>
            </div>

            {/* SEO Settings */}
            <div className="rounded-lg border p-4 bg-muted/30 space-y-3">
              <p className="font-medium">SEO Settings</p>
              <div className="space-y-1.5">
                <Label>Meta title <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input {...form.register("metaTitle")} placeholder="Custom meta title for search engines" />
              </div>
              <div className="space-y-1.5">
                <Label>Meta description <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Textarea {...form.register("metaDescription")} rows={3} placeholder="Short description shown in search results" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Canonical URL <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input {...form.register("canonical")} placeholder="https://your-site.com/pages/your-slug" />
                </div>
                <div className="space-y-1.5">
                  <Label>Robots <span className="text-muted-foreground font-normal">(index/noindex)</span></Label>
                  <Input {...form.register("robots")} placeholder="index,follow or noindex,nofollow" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Open Graph title <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input {...form.register("ogTitle")} placeholder="Title used when sharing on social media" />
              </div>
              <div className="space-y-1.5">
                <Label>Open Graph description <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Textarea {...form.register("ogDescription")} rows={2} placeholder="Description for social sharing" />
              </div>
              <div className="space-y-1.5">
                <Label>Open Graph image URL <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input {...form.register("ogImage")} placeholder="https://.../og-image.jpg" />
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
