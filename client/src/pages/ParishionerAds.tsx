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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Plus, Trash2, Pencil, Upload, ImagePlus, X, Images } from "lucide-react";
import { ImageGallerySelector } from "@/components/uploads/ImageGallerySelector";
import { adsApi, type ParishionerAd, type GalleryImage } from "@/lib/api";

const adSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().max(500).optional(),
  parishionerName: z.string().max(100).optional(),
  linkUrl: z.string().optional(),
  isActive: z.boolean(),
  expiresAt: z.string().optional(),
});

type AdFormData = z.infer<typeof adSchema>;

export default function ParishionerAds() {
  const [ads, setAds] = useState<ParishionerAd[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<ParishionerAd | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Image upload state
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<AdFormData>({
    resolver: zodResolver(adSchema),
    defaultValues: {
      title: "",
      description: "",
      parishionerName: "",
      linkUrl: "",
      isActive: true,
      expiresAt: "",
    },
  });

  useEffect(() => {
    loadAds();
  }, []);

  const loadAds = async () => {
    try {
      setIsLoading(true);
      const response = await adsApi.getAll();
      setAds((response.data || []).sort((a, b) => a.displayOrder - b.displayOrder));
    } catch (error) {
      console.error("Failed to load ads:", error);
      toast.error("Failed to load ads");
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: AdFormData) => {
    setSaving(true);
    try {
      const submitData = {
        ...data,
        imageUrl: imageUrl || "",
        description: data.description || "",
        parishionerName: data.parishionerName || "",
        linkUrl: (data.linkUrl && data.linkUrl !== "") ? data.linkUrl : null,
        expiresAt: (data.expiresAt && data.expiresAt !== "") ? data.expiresAt : null,
      };

      if (editingAd) {
        await adsApi.update(editingAd.id, submitData);
        toast.success("Ad updated successfully");
      } else {
        const res = await adsApi.create(submitData);
        setEditingAd(res.data);
        toast.success("Ad created! Now you can upload an image.");
      }
      form.reset();
      setImageUrl(null);
      loadAds();
    } catch (error) {
      console.error("Failed to save ad:", error);
      toast.error("Failed to save ad");
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (ad: ParishionerAd) => {
    setEditingAd(ad);
    setImageUrl(ad.imageUrl || null);
    form.reset({
      title: ad.title,
      description: ad.description,
      parishionerName: ad.parishionerName,
      linkUrl: ad.linkUrl || "",
      isActive: ad.isActive,
      expiresAt: ad.expiresAt?.split("T")[0] || "",
    });
    setDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (!editingAd) {
      toast.error("Save the ad first, then upload an image");
      return;
    }
    setUploadingImage(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await adsApi.uploadImage(editingAd.id, formData);
      setImageUrl(res.data.imageUrl);
      toast.success("Image uploaded");
      loadAds();
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const handleRemoveImage = async () => {
    if (!editingAd) return;
    try {
      await adsApi.update(editingAd.id, { imageUrl: "" } as never);
      setImageUrl(null);
      toast.success("Image removed");
      loadAds();
    } catch {
      toast.error("Failed to remove image");
    }
  };

  const handleGalleryImageSelect = async (galleryImage: GalleryImage) => {
    if (!editingAd) return;
    setUploadingImage(true);
    try {
      await adsApi.update(editingAd.id, { imageUrl: galleryImage.url } as never);
      setImageUrl(galleryImage.url);
      setGalleryOpen(false);
      toast.success("Image selected from gallery");
      loadAds();
    } catch {
      toast.error("Failed to set image from gallery");
    } finally {
      setUploadingImage(false);
    }
  };

  const [togglingId, setTogglingId] = useState<number | null>(null);

  const handleToggleActive = async (ad: ParishionerAd) => {
    setTogglingId(ad.id);
    try {
      await adsApi.update(ad.id, { isActive: !ad.isActive } as never);
      setAds((prev) =>
        prev.map((a) => (a.id === ad.id ? { ...a, isActive: !a.isActive } : a))
      );
      toast.success(ad.isActive ? "Ad deactivated" : "Ad activated");
    } catch {
      toast.error("Failed to update status");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: number) => {    if (!confirm("Delete this ad permanently?")) return;
    setDeletingId(id);
    try {
      await adsApi.delete(id);
      setAds((prev) => prev.filter((a) => a.id !== id));
      toast.success("Ad deleted");
    } catch (error) {
      console.error("Failed to delete ad:", error);
      toast.error("Failed to delete ad");
    } finally {
      setDeletingId(null);
    }
  };

  const openNewDialog = () => {
    setEditingAd(null);
    setImageUrl(null);
    form.reset();
    setDialogOpen(true);
  };

  return (
    <AdminLayout
      title="Parishioner Ads"
      description="Manage advertisements from parishioners and community partners."
    >
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">{ads.length} advertisements</p>
        <Button onClick={openNewDialog} className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Create Ad
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : ads.length === 0 ? (
        <EmptyState onCreate={openNewDialog} />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Parishioner Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Order</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ads.map((ad) => (
                <TableRow key={ad.id}>
                  <TableCell>
                    {ad.imageUrl ? (
                      <img
                        src={ad.imageUrl}
                        alt={ad.title}
                        className="h-10 w-10 rounded object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center">
                        <ImagePlus className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-sm">{ad.title}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {ad.parishionerName}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={ad.isActive}
                        disabled={togglingId === ad.id}
                        onCheckedChange={() => handleToggleActive(ad)}
                        aria-label={ad.isActive ? "Deactivate ad" : "Activate ad"}
                      />
                      <span className={`text-xs font-medium ${ad.isActive ? "text-green-700" : "text-gray-400"}`}>
                        {ad.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {ad.expiresAt ? new Date(ad.expiresAt).toLocaleDateString() : "Never"}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {ad.displayOrder}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(ad)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(ad.id)}
                        disabled={deletingId === ad.id}
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAd ? "Edit Advertisement" : "Create New Advertisement"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit((data) => onSubmit(data))} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                placeholder="e.g., John's Plumbing Services"
                {...form.register("title")}
              />
              {form.formState.errors.title && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Parishioner/Business Name</Label>
              <Input
                placeholder="e.g., John Smith"
                {...form.register("parishionerName")}
              />
              {form.formState.errors.parishionerName && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.parishionerName.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="Brief description of the service or product"
                {...form.register("description")}
                rows={3}
              />
              {form.formState.errors.description && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.description.message}
                </p>
              )}
            </div>

            {/* Image Upload Section */}
            <div className="space-y-1.5">
              <Label>Ad Image <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
              <div className="border rounded-lg p-3 space-y-3">
                {imageUrl ? (
                  <div className="relative w-full h-40 rounded overflow-hidden bg-gray-100">
                    <img src={imageUrl} alt="Ad" className="w-full h-full object-cover" />
                    {editingAd && (
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
                        title="Remove image"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 rounded bg-gray-50 border-dashed border border-gray-200">
                    <div className="text-center text-muted-foreground">
                      <ImagePlus className="h-8 w-8 mx-auto mb-1 opacity-40" />
                      <p className="text-xs">{editingAd ? "Upload or select from gallery" : "Create ad to upload image"}</p>
                    </div>
                  </div>
                )}
                {editingAd && (
                  <Tabs defaultValue="upload" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 h-auto mb-3">
                      <TabsTrigger value="upload" className="flex items-center gap-1.5 text-xs">
                        <ImagePlus className="h-3.5 w-3.5" />
                        Upload
                      </TabsTrigger>
                      <TabsTrigger value="gallery" className="flex items-center gap-1.5 text-xs">
                        <Images className="h-3.5 w-3.5" />
                        Gallery
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="upload" className="space-y-2 mt-3">
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={uploadingImage}
                        onClick={() => imageInputRef.current?.click()}
                      >
                        <ImagePlus className="h-4 w-4 mr-1.5" />
                        {uploadingImage ? "Uploading…" : imageUrl ? "Replace Image" : "Upload Image"}
                      </Button>
                    </TabsContent>
                    <TabsContent value="gallery" className="space-y-2 mt-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={uploadingImage}
                        onClick={() => setGalleryOpen(true)}
                      >
                        <Images className="h-4 w-4 mr-1.5" />
                        Browse Gallery
                      </Button>
                    </TabsContent>
                  </Tabs>
                )}
              </div>
              <ImageGallerySelector
                open={galleryOpen}
                onClose={() => setGalleryOpen(false)}
                onSelect={handleGalleryImageSelect}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Website/Contact Link (Optional)</Label>
              <Input
                placeholder="https://example.com"
                {...form.register("linkUrl")}
              />
              {form.formState.errors.linkUrl && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.linkUrl.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Expiration Date (Optional)</Label>
              <Input type="date" {...form.register("expiresAt")} />
              <p className="text-xs text-muted-foreground">
                Leave blank for no expiration
              </p>
            </div>

            <div className="flex items-center justify-between py-2">
              <Label>Active</Label>
              <Switch {...form.register("isActive")} />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-primary hover:bg-primary/90"
              >
                {saving ? "Saving…" : editingAd ? "Update Ad" : "Create Ad"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-16 w-16 rounded-full bg-orange-50 flex items-center justify-center mb-4">
        <Upload className="h-8 w-8 text-primary" />
      </div>
      <h3 className="font-playfair text-lg font-semibold mb-1">
        No advertisements yet
      </h3>
      <p className="text-sm text-muted-foreground mb-6">
        Create your first parishioner advertisement to get started.
      </p>
      <Button onClick={onCreate} className="bg-primary hover:bg-primary/90 gap-2">
        <Plus className="h-4 w-4" /> Create First Ad
      </Button>
    </div>
  );
}
