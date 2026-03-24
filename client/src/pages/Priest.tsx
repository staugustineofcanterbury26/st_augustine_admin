import { useEffect, useRef, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { priestApi, galleryApi, type PriestProfile, type GalleryImage } from "@/lib/api";
import { Upload, UserCircle, Images } from "lucide-react";

const schema = z.object({
  name: z.string().min(1),
  title: z.string().min(1),
  bio: z.string().min(1),
  shortBio: z.string().min(1),
  ordainedYear: z.coerce.number().int().min(1900).max(new Date().getFullYear()).optional(),
  email: z.string().email("Must be a valid email").optional().or(z.literal("")),
  phone: z.string().optional(),
});

type PriestForm = z.infer<typeof schema>;

export default function Priest() {
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [selectingFromGallery, setSelectingFromGallery] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<PriestForm>({
    resolver: zodResolver(schema) as Resolver<PriestForm>,
    defaultValues: {
      name: "",
      title: "Pastor",
      bio: "",
      shortBio: "",
      email: "",
      phone: "",
    },
  });

  useEffect(() => {
    priestApi
      .get()
      .then((res) => {
        const p = res.data;
        setPhotoUrl(p.photoUrl ?? null);
        form.reset({
          name: p.name,
          title: p.title,
          bio: p.bio,
          shortBio: p.shortBio,
          ordainedYear: p.ordainedYear,
          email: p.email ?? "",
          phone: p.phone ?? "",
        });
      })
      .catch(() => toast.error("Failed to load priest profile"))
      .finally(() => setIsLoading(false));
  }, [form]);

  const onSubmit = async (data: PriestForm) => {
    setSaving(true);
    try {
      await priestApi.update({
        ...data,
        email: data.email || undefined,
        phone: data.phone || undefined,
      });
      toast.success("Profile saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await priestApi.uploadPhoto(formData);
      setPhotoUrl(res.data.photoUrl);
      toast.success("Photo updated");
    } catch {
      toast.error("Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const loadGalleryImages = async () => {
    setLoadingGallery(true);
    try {
      const res = await galleryApi.getAll();
      setGalleryImages(res.data);
    } catch {
      toast.error("Failed to load gallery images");
    } finally {
      setLoadingGallery(false);
    }
  };

  const handleSelectFromGallery = async (galleryImage: GalleryImage) => {
    setSelectingFromGallery(true);
    try {
      const res = await priestApi.setPhotoFromGallery(galleryImage.id);
      setPhotoUrl(res.data.photoUrl);
      setShowGalleryModal(false);
      toast.success("Photo updated from gallery");
    } catch {
      toast.error("Failed to set photo from gallery");
    } finally {
      setSelectingFromGallery(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Parish Priest — Profile">
        <div className="max-w-3xl space-y-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Parish Priest — Profile"
      description="Manage the priest profile displayed on the Meet Parish Priest page."
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-3xl">
        {/* Photo Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserCircle className="h-4 w-4 text-primary" />
              Profile Photo
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <div className="h-28 w-28 rounded-full overflow-hidden border-4 border-primary/20 flex-shrink-0 bg-orange-50 flex items-center justify-center">
              {photoUrl ? (
                <img src={photoUrl} alt="Priest" className="object-cover w-full h-full" />
              ) : (
                <UserCircle className="h-14 w-14 text-primary/40" />
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                Upload a photo. It will be stored on Vercel Blob and served as WebP.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {uploadingPhoto ? "Uploading…" : "Upload Photo"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowGalleryModal(true);
                    if (galleryImages.length === 0) {
                      loadGalleryImages();
                    }
                  }}
                  disabled={selectingFromGallery}
                  className="gap-2"
                >
                  <Images className="h-4 w-4" />
                  {selectingFromGallery ? "Selecting…" : "From Gallery"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input placeholder="Fr. Manus Daly" {...form.register("name")} />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input placeholder="Pastor" {...form.register("title")} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Short Bio (shown on homepage)</Label>
              <Textarea rows={2} placeholder="One or two sentences…" {...form.register("shortBio")} />
              {form.formState.errors.shortBio && (
                <p className="text-xs text-destructive">{form.formState.errors.shortBio.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Full Biography</Label>
              <Textarea rows={8} placeholder="Full bio for the Meet Parish Priest page…" {...form.register("bio")} />
              {form.formState.errors.bio && (
                <p className="text-xs text-destructive">{form.formState.errors.bio.message}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Year Ordained</Label>
                <Input type="number" placeholder="1998" {...form.register("ordainedYear")} />
              </div>
              <div className="space-y-1.5">
                <Label>Email (optional)</Label>
                <Input type="email" {...form.register("email")} />
                {form.formState.errors.email && (
                  <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Phone (optional)</Label>
                <Input type="tel" {...form.register("phone")} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90 px-8">
            {saving ? "Saving…" : "Save Profile"}
          </Button>
        </div>
      </form>

      {/* Gallery Selection Modal */}
      {showGalleryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col">
            <CardHeader>
              <CardTitle className="text-base">Select Photo from Gallery</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              {loadingGallery ? (
                <div className="text-center text-muted-foreground">Loading images…</div>
              ) : galleryImages.length === 0 ? (
                <div className="text-center text-muted-foreground">No gallery images available</div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {galleryImages.map((image) => (
                    <div
                      key={image.id}
                      className="relative group cursor-pointer overflow-hidden rounded-lg border border-border hover:border-primary transition-colors"
                      onClick={() => handleSelectFromGallery(image)}
                    >
                      <img
                        src={image.thumbnailUrl || image.url}
                        alt={image.title}
                        className="w-full aspect-square object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-colors">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={selectingFromGallery}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Select
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <div className="border-t p-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowGalleryModal(false)}>
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </AdminLayout>
  );
}
