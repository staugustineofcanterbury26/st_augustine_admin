import { useEffect, useState } from "react";
import { useFieldArray, useForm, type Resolver } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { homepageApi, type HomepageData } from "@/lib/api";
import { ImageUpload } from "@/components/uploads/ImageUpload";
import { VideoUpload } from "@/components/uploads/VideoUpload";
import LinkTargetSelect from "@/components/LinkTargetSelect";
import { Image, Video, Grid, GripVertical, Trash2 } from "lucide-react";

// Icon options for featured sections
const ICON_OPTIONS = [
  { name: "mass", label: "Mass/Book" },
  { name: "hands", label: "Hands/Community" },
  { name: "cross", label: "Cross/Heart" },
  { name: "users", label: "Users/People" },
  { name: "heart", label: "Heart/Love" },
  { name: "other", label: "Other" },
];

const heroSchema = z.object({
  heroTitle: z.string().min(1, "Title is required"),
  heroSubtitle: z.string(),
  heroDescription: z.string(),
});

const sectionSchema = z.object({
  id: z.number(),
  sectionNumber: z.number(),
  icon: z.string(),
  title: z.string().min(1, "Title is required"),
  description: z.string(),
  linkTarget: z.string().min(1, "Link target is required"),
  isActive: z.boolean(),
  sortOrder: z.number(),
});

const formSchema = z.object({
  heroTitle: z.string().min(1, "Title is required"),
  heroSubtitle: z.string(),
  heroDescription: z.string(),
  sections: z.array(sectionSchema),
});

type FormData = z.infer<typeof formSchema>;

export default function Homepage() {
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<HomepageData | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema) as Resolver<FormData>,
    defaultValues: {
      heroTitle: "",
      heroSubtitle: "",
      heroDescription: "",
      sections: [],
    },
  });

  const { fields, append, remove, swap } = useFieldArray({
    control: form.control,
    name: "sections",
  });

  useEffect(() => {
    homepageApi
      .getAdmin()
      .then((res) => {
        setData(res.data);
        form.reset({
          heroTitle: res.data.hero.heroTitle,
          heroSubtitle: res.data.hero.heroSubtitle,
          heroDescription: res.data.hero.heroDescription,
          sections: res.data.sections,
        });
      })
      .catch(() => toast.error("Failed to load homepage content"))
      .finally(() => setIsLoading(false));
  }, [form]);

  const onSubmit = async (formData: FormData) => {
    setSaving(true);
    try {
      // Update hero text content
      await homepageApi.updateHero({
        heroTitle: formData.heroTitle,
        heroSubtitle: formData.heroSubtitle,
        heroDescription: formData.heroDescription,
      });

      // Update featured sections
      await homepageApi.updateSections(formData.sections);

      toast.success("Homepage updated");
    } catch (err) {
      toast.error("Failed to save — please try again");
    } finally {
      setSaving(false);
    }
  };

  const handleHeroImageUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await homepageApi.uploadImage(formData);
    setData((prev) => (prev ? { ...prev, hero: res.data } : null));
    return { imageUrl: res.data.heroImageUrl };
  };

  const handleHeroImageDelete = async () => {
    await homepageApi.deleteImage();
    setData((prev) =>
      prev
        ? {
            ...prev,
            hero: { ...prev.hero, heroImageUrl: "" },
          }
        : null
    );
  };

  const handleHeroVideoUpload = async (file: File): Promise<{ heroVideoUrl: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await homepageApi.uploadVideo(formData);
    setData((prev) => (prev ? { ...prev, hero: res.data } : null));
    return { heroVideoUrl: res.data.heroVideoUrl ?? "" };
  };

  const handleHeroVideoDelete = async () => {
    await homepageApi.deleteVideo();
    setData((prev) =>
      prev
        ? {
            ...prev,
            hero: { ...prev.hero, heroVideoUrl: null },
          }
        : null
    );
  };

  if (isLoading) {
    return (
      <AdminLayout title="Homepage">
        <div className="space-y-4 max-w-4xl">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Homepage Content"
      description="Customize the hero section and featured cards on the public homepage."
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-4xl">
        {/* ── Hero Section ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Image className="h-4 w-4 text-primary" />
              Hero Banner
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Hero Text Content */}
            <div className="space-y-3 pb-4 border-b">
              <div className="space-y-1">
                <Label className="text-xs">Hero Title</Label>
                <Input
                  {...form.register("heroTitle")}
                  className="h-8 text-sm"
                />
                {form.formState.errors.heroTitle && (
                  <p className="text-xs text-destructive">{form.formState.errors.heroTitle.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Hero Subtitle</Label>
                <Textarea
                  rows={2}
                  {...form.register("heroSubtitle")}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Hero Description</Label>
                <Textarea
                  rows={2}
                  {...form.register("heroDescription")}
                  className="text-sm"
                />
              </div>
            </div>

            {/* Hero Image & Video */}
            <div className="grid grid-cols-2 gap-4">
              <ImageUpload
                label="Fallback Image (Hero)"
                currentUrl={data?.hero.heroImageUrl}
                onUpload={handleHeroImageUpload}
                onDelete={handleHeroImageDelete}
                maxSizeMb={1}
                helpText="Required. Shown when video is unavailable."
                showPreview
              />

              <VideoUpload
                label="Hero Video"
                currentUrl={data?.hero.heroVideoUrl}
                onUpload={handleHeroVideoUpload}
                onDelete={handleHeroVideoDelete}
                maxSizeMb={5}
                helpText="Optional. Plays on the hero banner with fallback image."
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Featured Sections ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Grid className="h-4 w-4 text-primary" />
                  Featured Sections ({fields.length})
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  Customize cards shown below the hero banner. Add up to 6 sections.
                </p>
              </div>
              {fields.length < 6 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const nextOrder = Math.max(...fields.map((f) => f.sortOrder || 0), 0) + 1;
                    append({
                      id: Date.now(),
                      sectionNumber: fields.length + 1,
                      icon: "cross",
                      title: "",
                      description: "",
                      linkTarget: "/",
                      isActive: true,
                      sortOrder: nextOrder,
                    });
                  }}
                >
                  + Add Section
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No sections yet. Add one to get started.
              </p>
            )}
            {fields.map((field, index) => (
              <Card key={field.id} className="bg-slate-50/50 border shadow-none">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 pt-1 text-sm font-medium text-muted-foreground">
                      <GripVertical className="h-4 w-4" />
                      Section {index + 1}
                    </div>
                    <div className="flex gap-1">
                      {index > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => swap(index, index - 1)}
                          title="Move up"
                        >
                          ↑
                        </Button>
                      )}
                      {index < fields.length - 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => swap(index, index + 1)}
                          title="Move down"
                        >
                          ↓
                        </Button>
                      )}
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => remove(index)}
                          title="Remove section"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Icon</Label>
                      <Select
                        defaultValue={field.icon}
                        onValueChange={(val) =>
                          form.setValue(`sections.${index}.icon`, val)
                        }
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ICON_OPTIONS.map((opt) => (
                            <SelectItem key={opt.name} value={opt.name}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Title</Label>
                      <Input
                        {...form.register(`sections.${index}.title`)}
                        className="h-8 text-sm"
                      />
                      {form.formState.errors.sections?.[index]?.title && (
                        <p className="text-xs text-destructive">
                          {form.formState.errors.sections[index]?.title?.message}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Textarea
                      rows={2}
                      {...form.register(`sections.${index}.description`)}
                      className="text-sm"
                    />
                  </div>
                  
                  <LinkTargetSelect
                    value={form.watch(`sections.${index}.linkTarget`)}
                    onChange={(value) => form.setValue(`sections.${index}.linkTarget`, value)}
                    label="Link Target (URL)"
                  />
                  {form.formState.errors.sections?.[index]?.linkTarget && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.sections[index]?.linkTarget?.message}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90 px-6 h-9 text-sm">
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </form>
    </AdminLayout>
  );
}
