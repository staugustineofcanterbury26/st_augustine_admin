import { useEffect, useMemo, useRef, useState } from "react";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { pagesApi, type Page, galleryApi, type GalleryImage, navigationApi, type NavigationItem, type PageImage } from "@/lib/api";
import { Plus, Pencil, Trash2, Globe, EyeOff, ExternalLink, ImagePlus, X, Images, ChevronUp, ChevronDown } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { ImageGallerySelector } from "@/components/uploads/ImageGallerySelector";

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ── Zod schema ────────────────────────────────────────────────────────────────

const pageSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and hyphens only"),
  content: z.string(),
  excerpt: z.string().nullish().transform(val => val || null),
  metaTitle: z.string().nullish().transform(val => val || null),
  metaDescription: z.string().nullish().transform(val => val || null),
  canonical: z.union([z.literal(""), z.string().url()]).nullish().transform(val => (val && val.length > 0 ? val : null)),
  ogTitle: z.string().nullish().transform(val => val || null),
  ogDescription: z.string().nullish().transform(val => val || null),
  ogImage: z.union([z.literal(""), z.string().url()]).nullish().transform(val => (val && val.length > 0 ? val : null)),
  robots: z.string().nullish().transform(val => val || undefined),
  bodyImageTemplate: z.enum(["single", "grid", "sequential", "carousel"]).default("single"),
  gridColumns: z.coerce.number().int().min(1).max(4).default(3),
  imageShape: z.enum(["circle", "square", "rounded"]).default("circle"),
  imageSize: z.enum(["small", "medium", "large"]).default("medium"),
  isPublished: z.boolean(),
  showInNav: z.boolean(),
  navLabel: z.string().nullish().transform(val => val || null),
  navPosition: z.string().default("none"),
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
    canonical: page?.canonical ?? null,
    ogTitle: page?.ogTitle ?? "",
    ogDescription: page?.ogDescription ?? "",
    ogImage: page?.ogImage ?? null,
    robots: page?.robots ?? "index,follow",
    bodyImageTemplate: (page?.bodyImageTemplate ?? "single") as any,
    gridColumns: page?.gridColumns ?? 3,
    imageShape: (page?.imageShape ?? "circle") as any,
    imageSize: (page?.imageSize ?? "medium") as any,
    isPublished: page?.isPublished ?? false,
    showInNav: page?.showInNav ?? false,
    navLabel: page?.navLabel ?? "",
    navPosition: page?.navPosition ?? "none",
    sortOrder: page?.sortOrder ?? 0,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Flatten the nav items tree into { value, label } options for the navPosition
 * dropdown. Only L1 and L2 items are shown — pages slot into a section, not
 * under a leaf link.
 */
function flattenNavOptions(
  items: NavigationItem[],
  depth = 0
): { value: string; label: string }[] {
  if (depth > 1) return []; // stop after L2
  const result: { value: string; label: string }[] = [];
  for (const item of items) {
    const indent = depth === 1 ? "    ↳ " : "";
    result.push({ value: item.slug, label: `${indent}${item.label}` });
    if (item.children && item.children.length > 0) {
      result.push(...flattenNavOptions(item.children, depth + 1));
    }
  }
  return result;
}

// ── Nav section view types ───────────────────────────────────────────────────

type NavSectionEntry =
  | { kind: "navItem"; navItem: NavigationItem; parentNavId: number }
  | { kind: "page"; page: Page; groupSlug: string };

type NavSubGroup = {
  navItem: NavigationItem;
  entries: NavSectionEntry[];
  pageCount: number;
};

type NavSection = {
  slug: string;
  label: string;
  isStandalone: boolean;
  directEntries: NavSectionEntry[];
  subGroups: NavSubGroup[];
  totalPageCount: number;
};

export default function Pages() {
  const [pages, setPages] = useState<Page[]>([]);
  const [navItems, setNavItems] = useState<NavigationItem[]>([]);
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
  const [galleryOpenImage, setGalleryOpenImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [bodyImageUrl, setBodyImageUrl] = useState<string | null>(null);
  const [bodyImageCaption, setBodyImageCaption] = useState("");
  const [uploadingBodyImage, setUploadingBodyImage] = useState(false);
  const [galleryOpenBody, setGalleryOpenBody] = useState(false);
  const bodyImageInputRef = useRef<HTMLInputElement>(null);
  const [bodyImageTemplate, setBodyImageTemplate] = useState<"single" | "grid" | "sequential" | "carousel">("single");
  const [bodyImages, setBodyImages] = useState<PageImage[]>([]);
  const [uploadingBodyImages, setUploadingBodyImages] = useState(false);
  const bodyImagesInputRef = useRef<HTMLInputElement>(null);

  // ── Sorted flat list (used in "All Pages" tab) ────────────────────────────
  const sortedPages = useMemo(
    () =>
      [...pages].sort((a, b) => {
        const orderDiff = a.sortOrder - b.sortOrder;
        if (orderDiff !== 0) return orderDiff;
        const titleDiff = a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
        if (titleDiff !== 0) return titleDiff;
        return a.id - b.id;
      }),
    [pages]
  );

  // ── pages keyed by navPosition slug (move handler + grouped view) ───────────
  const pagesByNavSlug = useMemo(() => {
    const sortFn = (a: Page, b: Page) => {
      const od = a.sortOrder - b.sortOrder;
      if (od !== 0) return od;
      return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    };
    const map = new Map<string, Page[]>();
    for (const page of pages) {
      const key =
        !page.showInNav || !page.navPosition || page.navPosition === "none"
          ? "__standalone__"
          : page.navPosition;
      const list = map.get(key) ?? [];
      list.push(page);
      map.set(key, list);
    }
    for (const [k, list] of Array.from(map)) {
      map.set(k, [...list].sort(sortFn));
    }
    return map;
  }, [pages]);

  // ── Grouped sections — mirrors the full frontend nav structure ────────────
  // Each L1 section contains its L3 direct nav children + pages tagged to L1,
  // plus L2 sub-groups each with their L3 nav children + pages tagged to L2.
  // Nav items and pages are interleaved by sortOrder so pages can appear between nav items.
  const groupedSections = useMemo((): NavSection[] => {
    const sections: NavSection[] = [];
    const l1Items = [...navItems]
      .filter((i) => i.level === 1)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const interleave = (navs: NavigationItem[], pgs: Page[], parentNavId: number, groupSlug: string): NavSectionEntry[] => {
      const entries: NavSectionEntry[] = [
        ...navs.map((ni) => ({ kind: "navItem" as const, navItem: ni, parentNavId })),
        ...pgs.map((page) => ({ kind: "page" as const, page, groupSlug })),
      ];
      entries.sort((a, b) => {
        const aSort = a.kind === "navItem" ? a.navItem.sortOrder : a.page.sortOrder;
        const bSort = b.kind === "navItem" ? b.navItem.sortOrder : b.page.sortOrder;
        return aSort - bSort;
      });
      return entries;
    };

    for (const l1 of l1Items) {
      const l1Pages = pagesByNavSlug.get(l1.slug) ?? [];
      const l3Direct = (l1.children ?? [])
        .filter((c) => c.level === 3 && c.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      const l2Children = (l1.children ?? [])
        .filter((c) => c.level === 2)
        .sort((a, b) => a.sortOrder - b.sortOrder);

      const directEntries = interleave(l3Direct, l1Pages, l1.id, l1.slug);

      const subGroups: NavSubGroup[] = l2Children.map((l2) => {
        const l2Pages = pagesByNavSlug.get(l2.slug) ?? [];
        const l3Children = (l2.children ?? []).filter((c) => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
        const entries = interleave(l3Children, l2Pages, l2.id, l2.slug);
        return { navItem: l2, entries, pageCount: l2Pages.length };
      });

      const totalPageCount =
        l1Pages.length + subGroups.reduce((sum, sg) => sum + sg.pageCount, 0);

      if (directEntries.length > 0 || subGroups.some((sg) => sg.entries.length > 0)) {
        sections.push({
          slug: l1.slug,
          label: l1.label,
          isStandalone: false,
          directEntries,
          subGroups,
          totalPageCount,
        });
      }
    }

    const standalone = pagesByNavSlug.get("__standalone__") ?? [];
    if (standalone.length > 0) {
      sections.push({
        slug: "__standalone__",
        label: "Standalone",
        isStandalone: true,
        directEntries: standalone.map((page) => ({
          kind: "page" as const,
          page,
          groupSlug: "__standalone__",
        })),
        subGroups: [],
        totalPageCount: standalone.length,
      });
    }

    return sections;
  }, [navItems, pagesByNavSlug]);

  // ── Optimistically patch nav item sortOrders in the nested state tree ────
  const patchNavItemSortOrders = (updates: { id: number; sortOrder: number }[]) => {
    const updateMap = new Map(updates.map((u) => [u.id, u.sortOrder]));
    const patch = (items: NavigationItem[]): NavigationItem[] =>
      items.map((item) => ({
        ...item,
        sortOrder: updateMap.has(item.id) ? updateMap.get(item.id)! : item.sortOrder,
        children: item.children ? patch(item.children) : item.children,
      }));
    setNavItems((prev) => patch(prev));
  };

  // ── Move any entry (nav item or page) up/down within its unified list ─────
  const handleMoveEntry = async (
    entries: NavSectionEntry[],
    moveIndex: number,
    direction: "up" | "down"
  ) => {
    const swapIndex = direction === "up" ? moveIndex - 1 : moveIndex + 1;
    if (swapIndex < 0 || swapIndex >= entries.length) return;

    // Swap and renumber sequentially
    const newOrder = [...entries];
    [newOrder[moveIndex], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[moveIndex]];

    // Collect updates
    const navUpdates: { id: number; sortOrder: number }[] = [];
    const pageUpdates: { id: number; sortOrder: number }[] = [];
    for (let i = 0; i < newOrder.length; i++) {
      const e = newOrder[i];
      if (e.kind === "navItem") {
        if (e.navItem.sortOrder !== i) navUpdates.push({ id: e.navItem.id, sortOrder: i });
      } else {
        if (e.page.sortOrder !== i) pageUpdates.push({ id: e.page.id, sortOrder: i });
      }
    }

    // Optimistic state updates
    if (navUpdates.length > 0) patchNavItemSortOrders(navUpdates);
    if (pageUpdates.length > 0) {
      const pageMap = new Map(pageUpdates.map((u) => [u.id, u.sortOrder]));
      setPages((prev) => prev.map((p) => pageMap.has(p.id) ? { ...p, sortOrder: pageMap.get(p.id)! } : p));
    }

    // Persist
    try {
      const promises: Promise<unknown>[] = [];
      if (navUpdates.length > 0) {
        // Use the parentNavId from the first nav item in the list
        const parentNavId = newOrder.find((e) => e.kind === "navItem")?.parentNavId;
        if (parentNavId != null) {
          const navPositions = newOrder
            .map((e, i) => e.kind === "navItem" ? { id: e.navItem.id, sortOrder: i } : null)
            .filter((x): x is { id: number; sortOrder: number } => x !== null);
          promises.push(navigationApi.reorder(parentNavId, navPositions));
        }
      }
      for (const { id, sortOrder } of pageUpdates) {
        promises.push(pagesApi.update(id, { sortOrder }));
      }
      await Promise.all(promises);
    } catch {
      toast.error("Failed to reorder items");
      load();
    }
  };

  const form = useForm<PageForm>({
    resolver: zodResolver(pageSchema) as any,
    defaultValues: formDefault(),
  });

  const load = () => {
    setIsLoading(true);
    Promise.all([
      pagesApi.getAll(),
      navigationApi.getAll(),
    ])
      .then(([pagesRes, navRes]) => {
        setPages(pagesRes.data);
        setNavItems(navRes.data);
      })
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
    setBodyImageTemplate("single");
    setBodyImages([]);
    form.reset(formDefault());
    setDialogOpen(true);
  };

  const openEdit = async (page: Page) => {
    setEditing(page);
    setImageUrl(page.imageUrl ?? null);
    setBodyImageUrl(page.bodyImageUrl ?? null);
    setBodyImageCaption(page.bodyImageCaption ?? "");
    setBodyImageTemplate(page.bodyImageTemplate as any);
    form.reset(formDefault(page));
    
    // Load images for multi-template pages
    if (page.bodyImageTemplate !== "single") {
      try {
        const res = await pagesApi.getPageImages(page.id);
        setBodyImages(res.data);
      } catch {
        // silent — will load when clicking upload
      }
    } else {
      setBodyImages([]);
    }
    
    setDialogOpen(true);
  };

  const onSubmit = async (values: PageForm) => {
    setSaving(true);
    try {
      // Auto-generate canonical URL from slug if not provided
      const canonical = values.canonical || `${frontendBase}/${values.slug}`;
      
      // Auto-generate OG image from hero image if not provided
      const ogImage = values.ogImage || (imageUrl ?? null);
      
      if (editing) {
        await pagesApi.update(editing.id, { 
          ...values, 
          canonical, 
          ogImage,
          excerpt: values.excerpt || null, 
          navLabel: values.navLabel || null 
        });
        toast.success("Page updated");
      } else {
        await pagesApi.create({ 
          ...values, 
          canonical, 
          ogImage,
          excerpt: values.excerpt || null, 
          navLabel: values.navLabel || null 
        });
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
      setImageUrl(res.data.imageUrl ?? null);
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
      setBodyImageUrl(res.data.bodyImageUrl ?? null);
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

  const handleHeroImageGallerySelect = async (galleryImage: GalleryImage) => {
    if (!editing) return;
    setUploadingImage(true);
    try {
      await pagesApi.update(editing.id, { imageUrl: galleryImage.url });
      setImageUrl(galleryImage.url);
      setGalleryOpenImage(false);
      toast.success("Hero image selected from gallery");
      load();
    } catch {
      toast.error("Failed to set hero image from gallery");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleBodyImageGallerySelect = async (galleryImage: GalleryImage) => {
    if (!editing) return;
    
    // If multi-template, add as a new card
    if (bodyImageTemplate !== "single") {
      try {
        const res = await pagesApi.addBodyImage(editing.id, galleryImage.url, "");
        setBodyImages(res.data);
        setGalleryOpenBody(false);
        toast.success("Card added from gallery");
      } catch {
        toast.error("Failed to add card from gallery");
      }
      return;
    }
    
    // Single template: set as body image
    setUploadingBodyImage(true);
    try {
      await pagesApi.update(editing.id, { bodyImageUrl: galleryImage.url });
      setBodyImageUrl(galleryImage.url);
      setGalleryOpenBody(false);
      toast.success("Body image selected from gallery");
      load();
    } catch {
      toast.error("Failed to set body image from gallery");
    } finally {
      setUploadingBodyImage(false);
    }
  };

  // Multi-image template handlers
  const handleTemplateChange = async (newTemplate: "single" | "grid" | "sequential" | "carousel") => {
    // For new pages (not yet saved), just update state
    if (!editing) {
      setBodyImageTemplate(newTemplate);
      form.setValue("bodyImageTemplate", newTemplate);
      return;
    }

    // For existing pages, save to API
    setBodyImageTemplate(newTemplate);
    form.setValue("bodyImageTemplate", newTemplate);
    
    try {
      // Save template change
      await pagesApi.update(editing.id, { bodyImageTemplate: newTemplate });
      
      // If switching from single to multi, create initial image from body_image_url if it exists
      if (newTemplate !== "single" && bodyImageUrl && bodyImages.length === 0) {
        setUploadingBodyImages(true);
        const newImages = await pagesApi.addBodyImage(editing.id, bodyImageUrl, bodyImageCaption || "");
        setBodyImages(newImages.data);
        toast.success(`Switched to ${newTemplate} template. Your existing image was added.`);
      } else if (newTemplate === "single" && newTemplate !== bodyImageTemplate) {
        // Switching to single from multi - keep existing single image
        toast.success(`Switched to single template`);
      } else {
        toast.success(`Switched to ${newTemplate} template`);
      }
    } catch (error) {
      toast.error("Failed to change template");
      setBodyImageTemplate(editing.bodyImageTemplate as any);
    } finally {
      setUploadingBodyImages(false);
    }
  };

  const handleAddBodyImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const imageFiles = Array.from(files).filter(file => file.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      toast.error("Please select image files");
      return;
    }
    if (imageFiles.length !== files.length) {
      toast.warning(`${files.length - imageFiles.length} non-image file(s) were skipped`);
    }
    if (!editing) {
      toast.error("Save the page first, then upload images");
      return;
    }
    
    setUploadingBodyImages(true);
    try {
      let allImages = [...bodyImages];
      for (const file of imageFiles) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await pagesApi.uploadBodyImageMulti(editing.id, formData);
        allImages = res.data;
      }
      setBodyImages(allImages);
      toast.success(`${imageFiles.length} image${imageFiles.length !== 1 ? "s" : ""} added`);
    } catch {
      toast.error("Failed to upload images");
    } finally {
      setUploadingBodyImages(false);
      if (bodyImagesInputRef.current) bodyImagesInputRef.current.value = "";
    }
  };

  const handleDeleteBodyImage = async (imageId: number) => {
    if (!editing) return;
    
    try {
      const res = await pagesApi.deleteBodyImage(editing.id, imageId);
      setBodyImages(res.data);
      toast.success("Image removed");
    } catch {
      toast.error("Failed to delete image");
    }
  };

  const handleUpdateBodyImageCaption = async (imageId: number, caption: string) => {
    if (!editing) return;
    
    try {
      const res = await pagesApi.updateBodyImage(editing.id, imageId, { caption });
      setBodyImages(bodyImages.map(img => img.id === imageId ? res.data : img));
    } catch {
      toast.error("Failed to update caption");
    }
  };

  const handleUpdateCardField = async (imageId: number, field: "title" | "subtitle" | "description" | "caption", value: string) => {
    if (!editing) return;
    
    try {
      const res = await pagesApi.updateBodyImage(editing.id, imageId, { [field]: value || null });
      setBodyImages(bodyImages.map(img => img.id === imageId ? res.data : img));
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleMoveCardUp = async (idx: number) => {
    if (idx === 0 || !editing) return;
    const arr = [...bodyImages];
    [arr[idx], arr[idx - 1]] = [arr[idx - 1], arr[idx]];
    setBodyImages(arr);
    // Persist new sort order
    try {
      await Promise.all([
        pagesApi.updateBodyImage(editing.id, arr[idx].id, { sortOrder: idx }),
        pagesApi.updateBodyImage(editing.id, arr[idx - 1].id, { sortOrder: idx - 1 }),
      ]);
    } catch {
      toast.error("Failed to reorder");
    }
  };

  const handleMoveCardDown = async (idx: number) => {
    if (idx >= bodyImages.length - 1 || !editing) return;
    const arr = [...bodyImages];
    [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
    setBodyImages(arr);
    // Persist new sort order
    try {
      await Promise.all([
        pagesApi.updateBodyImage(editing.id, arr[idx].id, { sortOrder: idx }),
        pagesApi.updateBodyImage(editing.id, arr[idx + 1].id, { sortOrder: idx + 1 }),
      ]);
    } catch {
      toast.error("Failed to reorder");
    }
  };

  const handleAddBodyImageFromGallery = async (galleryImage: GalleryImage) => {
    if (!editing) return;
    
    try {
      const res = await pagesApi.addBodyImage(editing.id, galleryImage.url, "");
      setBodyImages(res.data);
      setGalleryOpenBody(false);
      toast.success("Image added from gallery");
    } catch {
      toast.error("Failed to add image from gallery");
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

  const [frontendBase, setFrontendBase] = useState<string>(() => {
    const env = import.meta.env.VITE_FRONTEND_URL as string | undefined;
    if (env && env.length > 0) return env;
    if (typeof window === "undefined") return "https://st-augustine-frontend.vercel.app";
    // optimistic default while we probe common dev ports
    return window.location.origin;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const env = import.meta.env.VITE_FRONTEND_URL as string | undefined;
    if (env && env.length > 0) {
      setFrontendBase(env);
      return;
    }

    const proto = window.location.protocol;
    const host = window.location.hostname;

    // Only probe common dev ports when admin is running locally
    if (host !== "localhost" && host !== "127.0.0.1") {
      setFrontendBase(window.location.origin);
      return;
    }

    const ports = [3000, 5173, 5174, 5175, 8080];

    let cancelled = false;

    async function probe() {
      const timeoutMs = 700;
      for (const port of ports) {
        const url = `${proto}//${host}:${port}/index.html`;
        try {
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), timeoutMs);
          // mode 'no-cors' lets us detect that a server answered without requiring CORS
          await fetch(url, { mode: "no-cors", signal: controller.signal });
          clearTimeout(id);
          if (cancelled) return;
          setFrontendBase(`${proto}//${host}:${port}`);
          return;
        } catch {
          // try next port
        }
      }
      if (!cancelled) setFrontendBase(`${proto}//${host}:3000`); // fallback to 3000
    }

    probe();

    return () => { cancelled = true; };
  }, []);

  return (
    <AdminLayout
      title="Pages"
      description="Create and manage custom pages that appear on the public website."
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
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

      {/* Loading skeleton */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => <Skeleton key={n} className="h-12 w-full" />)}
        </div>
      ) : pages.length === 0 ? (
        /* Empty state */
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
        /* Tabbed view */
        <Tabs defaultValue="all">
          <TabsList className="mb-4">
            <TabsTrigger value="all">All Pages</TabsTrigger>
            <TabsTrigger value="by-nav">By Nav Section</TabsTrigger>
          </TabsList>

          {/* ── BY NAV SECTION tab ─────────────────────────────────────── */}
          <TabsContent value="by-nav" className="space-y-4">
            {groupedSections.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No navigation sections found. Add items in the Navigation page first.
              </p>
            ) : (
              groupedSections.map((section) => {
                // Helper: render one entry row — nav item (read-only) or custom page (sortable)
                const renderEntry = (entry: NavSectionEntry, idx: number, entries: NavSectionEntry[]) => {
                  if (entry.kind === "navItem") {
                    const { navItem: ni } = entry;
                    const dest = ni.href ?? null;
                    return (
                      <TableRow key={`ni-${ni.id}`} className="bg-muted/20">
                        <TableCell className="text-sm text-muted-foreground italic">{ni.label}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {dest && <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{dest}</code>}
                        </TableCell>
                        <TableCell />
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            {dest && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Open link"
                                onClick={() => window.open(
                                  dest.startsWith("http") ? dest : `${frontendBase}${dest}`,
                                  "_blank", "noopener,noreferrer"
                                )}>
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7"
                              disabled={idx === 0}
                              onClick={() => handleMoveEntry(entries, idx, "up")}>
                              <ChevronUp className="h-3.5 w-3.5" />
                            </Button>
                            <span className="text-[10px] text-muted-foreground tabular-nums w-4 text-center">{ni.sortOrder}</span>
                            <Button variant="ghost" size="icon" className="h-7 w-7"
                              disabled={idx === entries.length - 1}
                              onClick={() => handleMoveEntry(entries, idx, "down")}>
                              <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }
                  const { page } = entry;
                  return (
                    <TableRow key={`pg-${page.id}`}>
                      <TableCell className="font-medium">
                        {page.navLabel && page.navLabel !== page.title ? (
                          <><span>{page.navLabel}</span><span className="ml-1.5 text-xs text-muted-foreground font-normal">({page.title})</span></>
                        ) : page.title}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">/pages/{page.slug}</code>
                      </TableCell>
                      <TableCell>
                        <button onClick={() => handlePublishToggle(page)}>
                          {page.isPublished
                            ? <Badge className="bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer gap-1"><Globe className="h-3 w-3" /> Published</Badge>
                            : <Badge variant="outline" className="text-muted-foreground cursor-pointer gap-1"><EyeOff className="h-3 w-3" /> Draft</Badge>}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Preview page"
                            onClick={async () => {
                              try {
                                const res = await pagesApi.getPreviewToken(page.slug);
                                const url = `${frontendBase}/pages/${page.slug}?previewToken=${encodeURIComponent(res.data.previewToken)}`;
                                window.open(url, "_blank", "noopener,noreferrer");
                              } catch { toast.error("Failed to get preview token"); }
                            }}>
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(page)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => { setDeleteTarget(page); setDeleteConfirmText(""); }}
                            disabled={deletingId === page.id}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7"
                            disabled={idx === 0}
                            onClick={() => handleMoveEntry(entries, idx, "up")}>
                            <ChevronUp className="h-3.5 w-3.5" />
                          </Button>
                          <span className="text-[10px] text-muted-foreground tabular-nums w-4 text-center">{page.sortOrder}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7"
                            disabled={idx === entries.length - 1}
                            onClick={() => handleMoveEntry(entries, idx, "down")}>
                            <ChevronDown className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                };

                return (
                  <div key={section.slug} className="rounded-lg border overflow-hidden">
                    {/* L1 section header */}
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b">
                      {section.isStandalone
                        ? <Badge variant="outline" className="text-xs text-muted-foreground">Standalone</Badge>
                        : <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">Main</Badge>}
                      <span className="font-medium text-sm">{section.label}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {section.totalPageCount} page{section.totalPageCount !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Direct entries under L1: L3 nav items + pages tagged to L1 */}
                    {section.directEntries.length > 0 && (
                      <Table><TableBody>
                        {section.directEntries.map((entry, idx) => renderEntry(entry, idx, section.directEntries))}
                      </TableBody></Table>
                    )}

                    {/* L2 sub-groups */}
                    {section.subGroups.map((sg) => (
                      <div key={sg.navItem.slug}>
                        <div className="flex items-center gap-2 px-4 py-1.5 bg-muted/20 border-t border-b">
                          <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">Sub-Cat</Badge>
                          <span className="text-sm font-medium">{sg.navItem.label}</span>
                          {sg.pageCount > 0 && (
                            <span className="ml-auto text-xs text-muted-foreground">
                              {sg.pageCount} page{sg.pageCount !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                        <Table><TableBody>
                          {sg.entries.map((entry, idx) => renderEntry(entry, idx, sg.entries))}
                        </TableBody></Table>
                      </div>
                    ))}
                  </div>
                );
              })
            )}
          </TabsContent>

          {/* ── ALL PAGES tab ──────────────────────────────────────────── */}
          <TabsContent value="all">
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
                  {sortedPages.map((page) => (
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
                            {page.navPosition && page.navPosition !== "none" && (
                              <span className="ml-1 text-muted-foreground font-normal">
                                ({flattenNavOptions(navItems).find((o) => o.value === page.navPosition)?.label ?? page.navPosition})
                              </span>
                            )}
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
                            title="Preview page"
                            onClick={async () => {
                              try {
                                const res = await pagesApi.getPreviewToken(page.slug);
                                const token = res.data.previewToken;
                                const url = `${frontendBase}/pages/${page.slug}?previewToken=${encodeURIComponent(
                                  token
                                )}`;
                                window.open(url, "_blank", "noopener,noreferrer");
                              } catch {
                                toast.error("Failed to get preview token");
                              }
                            }}
                          >
                            <ExternalLink className="h-4 w-4" />
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
          </TabsContent>
        </Tabs>
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
            {/* TEMPLATE SELECTOR — FIRST */}
            <div className="space-y-2 rounded-lg border p-4 bg-muted/20">
              <Label className="text-base font-semibold">Page Template</Label>
              <Tabs value={bodyImageTemplate} onValueChange={(v) => handleTemplateChange(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="single">Single</TabsTrigger>
                  <TabsTrigger value="sequential">Sequential</TabsTrigger>
                  <TabsTrigger value="grid">Grid</TabsTrigger>
                  <TabsTrigger value="carousel">Carousel</TabsTrigger>
                </TabsList>
              </Tabs>
              <p className="text-xs text-muted-foreground">
                {bodyImageTemplate === "single" && "📷 Classic layout — one image beside your text content"}
                {bodyImageTemplate === "sequential" && "📚 Cards stacked vertically — image + name + role + description per card (like a team/bio page)"}
                {bodyImageTemplate === "grid" && "🎨 Cards in a configurable grid (1–4 columns) — image + name + role + description per card"}
                {bodyImageTemplate === "carousel" && "🎠 Swipeable card slider — image + name + role + description per card"}
              </p>

              {/* Image Shape & Size — only for multi-image templates */}
              {bodyImageTemplate !== "single" && (
                <div className="grid grid-cols-3 gap-4 pt-3 border-t mt-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Image Shape</Label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      {...form.register("imageShape")}
                    >
                      <option value="circle">Circle</option>
                      <option value="rounded">Rounded</option>
                      <option value="square">Square</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Image Size</Label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      {...form.register("imageSize")}
                    >
                      <option value="small">Small (96px)</option>
                      <option value="medium">Medium (160px)</option>
                      <option value="large">Large (224px)</option>
                    </select>
                  </div>
                  {bodyImageTemplate === "grid" && (
                    <div className="space-y-1.5">
                      <Label className="text-sm">Grid Columns</Label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        {...form.register("gridColumns")}
                      >
                        <option value="1">1 Column</option>
                        <option value="2">2 Columns</option>
                        <option value="3">3 Columns</option>
                        <option value="4">4 Columns</option>
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>

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

            {/* Hero image */}
            <div className="space-y-2">
              <Label>Hero image <span className="text-muted-foreground font-normal">(full-width banner at top of page)</span></Label>
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
                <div className="rounded-lg border border-dashed border-input h-24 flex items-center justify-center bg-muted/30 text-muted-foreground text-xs">
                  {editing ? "No hero image" : "Save page first, then upload"}
                </div>
              )}
              {editing && (
                <div className="flex gap-2">
                  <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  <Button type="button" variant="outline" size="sm" className="gap-2" disabled={uploadingImage}
                    onClick={() => imageInputRef.current?.click()}>
                    <ImagePlus className="h-4 w-4" />
                    {uploadingImage ? "Uploading…" : "Upload"}
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="gap-2"
                    onClick={() => setGalleryOpenImage(true)}>
                    <Images className="h-4 w-4" />
                    From Gallery
                  </Button>
                </div>
              )}
            </div>

            {/* Content field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Content {bodyImageTemplate !== "single" && <span className="text-muted-foreground font-normal">(intro text above cards)</span>}</Label>
                <span className="text-xs text-muted-foreground">
                  Use <code># Heading</code>, <code>## Sub-heading</code>, blank lines for paragraphs
                </span>
              </div>
              <Textarea
                {...form.register("content")}
                rows={bodyImageTemplate === "single" ? 14 : 6}
                className="font-mono text-sm resize-y"
                placeholder={bodyImageTemplate === "single"
                  ? "# Welcome\n\nWrite your page content here. The body image will appear alongside this text.\n\n## Section Title\n\nMore content..."
                  : "# Page Title\n\nIntroductory text that appears above the cards section."}
              />
            </div>

            {/* ═══ SINGLE TEMPLATE: body image ═══ */}
            {bodyImageTemplate === "single" && (
              <div className="space-y-2">
                <Label>Body image <span className="text-muted-foreground font-normal">(displays beside content)</span></Label>
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
                  <div className="rounded-lg border border-dashed border-input h-24 flex items-center justify-center bg-muted/30 text-muted-foreground text-xs">
                    {editing ? "No body image" : "Save page first"}
                  </div>
                )}
                {editing && (
                  <div className="flex gap-2">
                    <input ref={bodyImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleBodyImageUpload} />
                    <Button type="button" variant="outline" size="sm" className="gap-2" disabled={uploadingBodyImage}
                      onClick={() => bodyImageInputRef.current?.click()}>
                      <ImagePlus className="h-4 w-4" />
                      {uploadingBodyImage ? "Uploading…" : "Upload"}
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="gap-2"
                      onClick={() => setGalleryOpenBody(true)}>
                      <Images className="h-4 w-4" />
                      From Gallery
                    </Button>
                  </div>
                )}
                {bodyImageUrl && editing && (
                  <Input
                    value={bodyImageCaption}
                    onChange={(e) => setBodyImageCaption(e.target.value)}
                    onBlur={handleBodyCaptionBlur}
                    placeholder="Optional caption… (e.g., 'Photo by John Smith')"
                    className="text-sm"
                  />
                )}
              </div>
            )}

            {/* ═══ MULTI TEMPLATES: Card Editor ═══ */}
            {bodyImageTemplate !== "single" && (
              <div className="space-y-4 rounded-lg border p-4 bg-muted/10">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold">Cards ({bodyImages.length})</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Each card has an image, title, subtitle, and description.
                    </p>
                  </div>
                  {editing && (
                    <div className="flex gap-2">
                      <input ref={bodyImagesInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleAddBodyImages} />
                      <Button type="button" variant="outline" size="sm" className="gap-1"
                        onClick={() => bodyImagesInputRef.current?.click()} disabled={uploadingBodyImages}>
                        <ImagePlus className="h-4 w-4" />
                        {uploadingBodyImages ? "Uploading…" : "Add Card"}
                      </Button>
                      <Button type="button" variant="outline" size="sm" className="gap-1"
                        onClick={() => setGalleryOpenBody(true)}>
                        <Images className="h-4 w-4" />
                        From Gallery
                      </Button>
                    </div>
                  )}
                </div>

                {!editing && bodyImages.length === 0 && (
                  <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
                    Save the page first, then add cards with images and details.
                  </div>
                )}

                {/* Card List */}
                <div className="space-y-4">
                  {bodyImages.map((card, idx) => (
                    <div key={card.id} className="rounded-lg border bg-background p-4 space-y-3">
                      <div className="flex gap-4">
                        {/* Image thumbnail */}
                        <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border bg-muted">
                          <img src={card.imageUrl} alt={card.title || `Card ${idx + 1}`} className="w-full h-full object-cover" />
                        </div>
                        {/* Fields */}
                        <div className="flex-1 space-y-2">
                          <Input
                            value={card.title || ""}
                            onChange={(e) => {
                              setBodyImages(bodyImages.map(c => c.id === card.id ? { ...c, title: e.target.value } : c));
                            }}
                            onBlur={() => handleUpdateCardField(card.id, "title", card.title || "")}
                            placeholder="Name / Title (e.g., Lisa Shimmer)"
                            className="text-sm font-medium"
                          />
                          <Input
                            value={card.subtitle || ""}
                            onChange={(e) => {
                              setBodyImages(bodyImages.map(c => c.id === card.id ? { ...c, subtitle: e.target.value } : c));
                            }}
                            onBlur={() => handleUpdateCardField(card.id, "subtitle", card.subtitle || "")}
                            placeholder="Role / Subtitle (e.g., Director)"
                            className="text-sm"
                          />
                        </div>
                        {/* Action buttons */}
                        {editing && (
                          <div className="flex flex-col gap-1">
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                              onClick={() => handleMoveCardUp(idx)} disabled={idx === 0} title="Move up">
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                              onClick={() => handleMoveCardDown(idx)} disabled={idx === bodyImages.length - 1} title="Move down">
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteBodyImage(card.id)} title="Delete card">
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      {/* Description - full width below */}
                      <Textarea
                        value={card.description || ""}
                        onChange={(e) => {
                          setBodyImages(bodyImages.map(c => c.id === card.id ? { ...c, description: e.target.value } : c));
                        }}
                        onBlur={() => handleUpdateCardField(card.id, "description", card.description || "")}
                        placeholder="Description text (e.g., Lisa is a forward thinker when it comes to women's empowerment...)"
                        rows={3}
                        className="text-sm resize-y"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
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
            </div>

            {/* Navigation Settings - only shown when Show in Nav is enabled */}
            {form.watch("showInNav") && (
              <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
                <div className="space-y-1.5">
                  <Label>Nav position</Label>
                  <select
                    {...form.register("navPosition")}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="none">None (standalone / no dropdown)</option>
                    {flattenNavOptions(navItems).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">Select which navigation item this page appears under.</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Nav label</Label>
                  <Input {...form.register("navLabel")} placeholder="Leave blank to use page title" />
                  <p className="text-xs text-muted-foreground">Custom text for navigation menu</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Sort order</Label>
                  <Input {...form.register("sortOrder")} type="number" min={0} className="w-32" />
                  <p className="text-xs text-muted-foreground">Lower numbers appear first</p>
                </div>
              </div>
            )}

            {/* Settings row - Sort order (always visible) */}
            {!form.watch("showInNav") && (
              <div className="rounded-lg border p-4 bg-muted/30">
                <div className="space-y-1.5">
                  <Label>Sort order <span className="text-muted-foreground font-normal">(for other listings)</span></Label>
                  <Input {...form.register("sortOrder")} type="number" min={0} className="w-32" />
                  <p className="text-xs text-muted-foreground">Lower numbers appear first in page lists</p>
                </div>
              </div>
            )}

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
                  <Input {...form.register("canonical")} placeholder={`Auto-generated as: ${frontendBase}/${form.watch("slug") || "your-slug"}`} />
                  <p className="text-xs text-muted-foreground">Leave empty to auto-generate from the page slug</p>
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
                <Input {...form.register("ogImage")} placeholder={imageUrl ? `Auto-generated as: ${imageUrl}` : "Leave empty to use hero image"} />
                <p className="text-xs text-muted-foreground">Leave empty to auto-generate from the hero image</p>
              </div>
            </div>

            {/* Gallery selectors */}
            <ImageGallerySelector 
              open={galleryOpenImage} 
              onClose={() => setGalleryOpenImage(false)}
              onSelect={handleHeroImageGallerySelect}
            />
            <ImageGallerySelector 
              open={galleryOpenBody} 
              onClose={() => setGalleryOpenBody(false)}
              onSelect={handleBodyImageGallerySelect}
            />

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
