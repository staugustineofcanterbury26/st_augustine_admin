import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ImagePlus, Images, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { navigationApi, type NavigationItem, pagesApi, type Page, galleryApi, type GalleryImage } from "@/lib/api";
import { ImageGallerySelector } from "@/components/uploads/ImageGallerySelector";

// ── Validation Schema ──────────────────────────────────────────────────────────

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const navigationSchema = z.object({
  label: z.string().min(1, "Label is required").max(100),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and hyphens only"),
  href: z.string().min(1).optional().or(z.literal("")),
  pageId: z.number().int().optional().or(z.literal(0)),
  icon: z.string().optional().or(z.literal("")),
  parentId: z.number().int().optional().or(z.literal(0)),
  level: z.number().int().min(1).max(3),
  sortOrder: z.number().int().min(0),
  isActive: z.boolean(),
  isSystem: z.boolean(),
  megaImage: z.string().optional().or(z.literal("")),
  megaCaption: z.string().max(300).optional().or(z.literal("")),
  megaCtaHref: z.string().optional().or(z.literal("")),
});

type NavigationForm = z.infer<typeof navigationSchema>;

interface NavigationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: NavigationItem | null;
  mainItems: NavigationItem[]; // For parent selector
  pages: Page[];
  onSubmit: (data: NavigationForm) => Promise<void>;
}

const ICON_OPTIONS = [
  "home", "book", "calendar", "building", "image", "users", "gift", "mail",
  "clock", "map", "phone", "info", "star", "heart", "check", "menu"
];

export default function NavigationFormDialog({
  open,
  onOpenChange,
  item,
  mainItems,
  pages,
  onSubmit,
}: NavigationFormProps) {
  const [saving, setSaving] = useState(false);
  const [selectedLinkType, setSelectedLinkType] = useState<"page" | "url">("page");
  const [megaGalleryOpen, setMegaGalleryOpen] = useState(false);
  const [megaUploading, setMegaUploading] = useState(false);
  const megaImageInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<NavigationForm>({
    resolver: zodResolver(navigationSchema),
    defaultValues: {
      label: "",
      slug: "",
      href: undefined,
      pageId: undefined,
      icon: undefined,
      parentId: undefined,
      level: 1,
      sortOrder: 0,
      isActive: true,
      isSystem: false,
      megaImage: undefined,
      megaCaption: undefined,
      megaCtaHref: undefined,
    },
  });

  // Reset form when item changes
  useEffect(() => {
    if (item) {
      const linkType = item.pageId ? "page" : "url";
      setSelectedLinkType(linkType);
      form.reset({
        label: item.label,
        slug: item.slug,
        href: item.href || undefined,
        pageId: item.pageId || undefined,
        icon: item.icon || undefined,
        parentId: item.parentId || undefined,
        level: item.level,
        sortOrder: item.sortOrder,
        isActive: item.isActive,
        isSystem: item.isSystem,
        megaImage: item.megaImage || undefined,
        megaCaption: item.megaCaption || undefined,
        megaCtaHref: item.megaCtaHref || undefined,
      });
    } else {
      setSelectedLinkType("page");
      form.reset({
        label: "",
        slug: "",
        href: undefined,
        pageId: undefined,
        icon: undefined,
        parentId: undefined,
        level: 1,
        sortOrder: 0,
        isActive: true,
        isSystem: false,
        megaImage: undefined,
        megaCaption: undefined,
        megaCtaHref: undefined,
      });
    }
  }, [item, form, open]);

  // Auto-generate slug from label (only when creating)
  const labelValue = form.watch("label");
  useEffect(() => {
    if (!item && labelValue) {
      form.setValue("slug", slugify(labelValue), { shouldValidate: false });
    }
  }, [labelValue, item, form]);

  // Flatten tree for parent lookups
  const allFlatItems = useMemo(() => {
    const flat: NavigationItem[] = [];
    const collect = (list: NavigationItem[]) => {
      for (const navItem of list) {
        flat.push(navItem);
        if (navItem.children) collect(navItem.children);
      }
    };
    collect(mainItems);
    return flat;
  }, [mainItems]);

  // Auto-determine level based on parent
  const parentIdValue = form.watch("parentId");
  useEffect(() => {
    if (parentIdValue) {
      const parent = allFlatItems.find((m) => m.id === parentIdValue);
      if (parent) {
        form.setValue("level", Math.min(parent.level + 1, 3), { shouldValidate: false });
      }
    } else {
      form.setValue("level", 1, { shouldValidate: false });
    }
  }, [parentIdValue, allFlatItems, form]);

  const handleMegaImageUpload = async (file: File) => {
    if (!item?.id) {
      toast.error("Save the navigation item first before uploading an image.");
      return;
    }
    setMegaUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const { data } = await navigationApi.uploadImage(item.id, formData);
      form.setValue("megaImage", data.megaImage ?? "");
      toast.success("Image uploaded");
    } catch {
      toast.error("Image upload failed");
    } finally {
      setMegaUploading(false);
    }
  };

  const handleMegaGallerySelect = (image: GalleryImage) => {
    form.setValue("megaImage", image.url);
    setMegaGalleryOpen(false);
  };

  const handleSubmit = async (values: NavigationForm) => {
    setSaving(true);
    try {
      // Validate: for level 3, require href or pageId
      if (values.level === 3 && !values.href && !values.pageId) {
        toast.error("Level 3 items must have a link (page or URL)");
        setSaving(false);
        return;
      }

      // Prepare data: clear href if using pageId, vice versa
      const submitData: any = { ...values };
      if (values.pageId && values.pageId !== 0) {
        submitData.href = null; // Clear URL if using page link
      } else {
        submitData.pageId = null; // Clear page if using URL
      }

      // Clean up optional empty strings
      if (!submitData.href) submitData.href = null;
      if (!submitData.pageId || submitData.pageId === 0) submitData.pageId = null;
      if (!submitData.icon) submitData.icon = null;
      if (!submitData.parentId || submitData.parentId === 0) submitData.parentId = null;
      if (!submitData.megaImage) submitData.megaImage = null;
      if (!submitData.megaCaption) submitData.megaCaption = null;
      if (!submitData.megaCtaHref) submitData.megaCtaHref = null;

      await onSubmit(submitData);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {item ? "Edit Navigation Item" : "Add Navigation Item"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Label */}
          <div>
            <Label>Label *</Label>
            <Input
              placeholder="e.g., 'About Parish'"
              {...form.register("label")}
            />
            {form.formState.errors.label && (
              <p className="text-xs text-red-500 mt-1">{form.formState.errors.label.message}</p>
            )}
          </div>

          {/* Slug */}
          <div>
            <Label>Slug *</Label>
            <Input
              placeholder="e.g., 'about-parish'"
              {...form.register("slug")}
            />
            {form.formState.errors.slug && (
              <p className="text-xs text-red-500 mt-1">{form.formState.errors.slug.message}</p>
            )}
          </div>

          {/* Level indicator */}
          <div className="p-3 bg-blue-50 rounded text-sm">
            <strong>Level:</strong> {form.watch("level")} {form.watch("level") === 1 ? "(Main Item)" : form.watch("level") === 2 ? "(Sub-Category)" : "(Child Link)"}
          </div>

          {/* Link — required for L3, optional for L2 */}
          {(form.watch("level") === 3 || form.watch("level") === 2) && (
            <div className="space-y-3">
              {form.watch("level") === 3 && <Label>Link Type</Label>}
              {form.watch("level") === 3 && (
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="page"
                      checked={selectedLinkType === "page"}
                      onChange={(e) => {
                        setSelectedLinkType(e.target.value as "page" | "url");
                        form.setValue("href", undefined, { shouldValidate: false });
                        form.setValue("pageId", undefined, { shouldValidate: false });
                      }}
                    />
                    Link to Page
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="url"
                      checked={selectedLinkType === "url"}
                      onChange={(e) => {
                        setSelectedLinkType(e.target.value as "page" | "url");
                        form.setValue("pageId", undefined, { shouldValidate: false });
                        form.setValue("href", "", { shouldValidate: false });
                      }}
                    />
                    Custom URL
                  </label>
                </div>
              )}

              {form.watch("level") === 3 && selectedLinkType === "page" ? (
                <div>
                  <Label>Select Page</Label>
                  <Select
                    value={form.watch("pageId")?.toString() ?? ""}
                    onValueChange={(v) => form.setValue("pageId", v ? parseInt(v, 10) : undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a page..." />
                    </SelectTrigger>
                    <SelectContent>
                      {pages.map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.title} ({p.slug})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div>
                  <Label>{form.watch("level") === 2 ? "URL / Path (optional)" : "Custom URL"}</Label>
                  <Input
                    type="text"
                    placeholder="/events or https://example.com"
                    {...form.register("href")}
                  />
                  {form.formState.errors.href && (
                    <p className="text-xs text-red-500 mt-1">{form.formState.errors.href.message}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Relative paths like /events are fine.</p>
                </div>
              )}
            </div>
          )}

          {/* Icon (only for level 1) */}
          {form.watch("level") === 1 && (
            <div>
              <Label>Icon (Optional)</Label>
              <Select value={form.watch("icon") ?? "none"} onValueChange={(v) => form.setValue("icon", v === "none" ? undefined : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an icon..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {ICON_OPTIONS.map((icon) => (
                    <SelectItem key={icon} value={icon}>
                      {icon}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Mega-menu fields (only for level 1) */}
          {form.watch("level") === 1 && (
            <div className="space-y-3 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Mega-menu Feature Panel</p>
              <div>
                <Label>Feature Image</Label>

                {/* Hidden file input */}
                <input
                  ref={megaImageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleMegaImageUpload(file);
                    e.target.value = "";
                  }}
                />

                {/* Current image preview */}
                {form.watch("megaImage") && (
                  <div className="relative inline-block mt-1 mb-2">
                    <img
                      src={form.watch("megaImage")}
                      alt="Feature preview"
                      className="h-24 rounded border object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => form.setValue("megaImage", "")}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
                      title="Remove image"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}

                <Tabs defaultValue="upload" className="mt-1">
                  <TabsList className="h-8">
                    <TabsTrigger value="upload" className="text-xs px-3 h-7">
                      <ImagePlus className="h-3 w-3 mr-1" />
                      Upload
                    </TabsTrigger>
                    <TabsTrigger value="gallery" className="text-xs px-3 h-7">
                      <Images className="h-3 w-3 mr-1" />
                      From Gallery
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="upload" className="mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={megaUploading || !item?.id}
                      onClick={() => megaImageInputRef.current?.click()}
                    >
                      {megaUploading ? "Uploading…" : "Choose Image File"}
                    </Button>
                    {!item?.id && (
                      <p className="text-xs text-amber-600 mt-1">Save this item first to enable file upload.</p>
                    )}
                  </TabsContent>
                  <TabsContent value="gallery" className="mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setMegaGalleryOpen(true)}
                    >
                      Browse Gallery
                    </Button>
                  </TabsContent>
                </Tabs>

                <p className="text-xs text-gray-500 mt-1">Displayed on the left side of the dropdown panel.</p>
              </div>
              <div>
                <Label>Image Caption</Label>
                <Input
                  type="text"
                  placeholder="Our heritage church — built 1967"
                  {...form.register("megaCaption")}
                />
              </div>
              <div>
                <Label>"Read More" Link</Label>
                <Input
                  type="text"
                  placeholder="/pages/heritage-project"
                  {...form.register("megaCtaHref")}
                />
                <p className="text-xs text-gray-500 mt-1">Where the "Read more" button in the panel links to.</p>
              </div>
            </div>
          )}

          {/* Parent Item */}
          <div>
            <Label>Parent Item</Label>
            <Select
              value={form.watch("parentId")?.toString() ?? "none"}
              onValueChange={(v) => {
                if (v === "none") {
                  form.setValue("parentId", undefined);
                } else {
                  form.setValue("parentId", parseInt(v, 10));
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select parent..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Main Nav Item)</SelectItem>
                {mainItems.filter((m) => m.level === 1).map((m) => (
                  <SelectItem key={`l1-${m.id}`} value={m.id.toString()}>
                    ↳ {m.label}
                  </SelectItem>
                ))}
                {mainItems
                  .filter((m) => m.level === 1)
                  .flatMap((parent) =>
                    (parent.children || [])
                      .filter((c) => c.level === 2)
                      .map((sub) => (
                        <SelectItem key={`l2-${sub.id}`} value={sub.id.toString()}>
                          &nbsp;&nbsp;&nbsp;&nbsp;↳ {parent.label} → {sub.label}
                        </SelectItem>
                      ))
                  )}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              No parent = Main nav item. Select a parent to create a sub-category or child link.
            </p>
          </div>

          {/* Sort Order */}
          <div>
            <Label>Sort Order</Label>
            <Input type="number" {...form.register("sortOrder", { valueAsNumber: true })} min="0" />
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <Label>Active</Label>
            <Switch
              checked={form.watch("isActive")}
              onCheckedChange={(v) => form.setValue("isActive", v)}
            />
          </div>

          {/* System Toggle */}
          <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded">
            <div>
              <Label className="text-amber-800">System Item</Label>
              <p className="text-xs text-amber-700 mt-0.5">System items cannot be deleted from the admin panel</p>
            </div>
            <Switch
              checked={form.watch("isSystem")}
              onCheckedChange={(v) => form.setValue("isSystem", v)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <ImageGallerySelector
      open={megaGalleryOpen}
      onClose={() => setMegaGalleryOpen(false)}
      onSelect={handleMegaGallerySelect}
    />
    </>
  );
}
