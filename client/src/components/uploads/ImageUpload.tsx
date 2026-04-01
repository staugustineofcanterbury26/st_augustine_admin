import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, X, Images } from "lucide-react";
import { ImageGallerySelector } from "./ImageGallerySelector";
import { type GalleryImage } from "@/lib/api";

interface ImageUploadProps {
  /** Label for the form field */
  label: string;
  /** Current image URL (if any) */
  currentUrl?: string | null;
  /** Callback when file is selected for upload */
  onUpload: (file: File) => Promise<{ imageUrl: string }>;
  /** Callback when gallery image is selected */
  onGallerySelect?: (url: string) => Promise<{ imageUrl: string }>;
  /** Callback when delete is clicked */
  onDelete?: () => Promise<void>;
  /** Max file size in MB */
  maxSizeMb?: number;
  /** Help text */
  helpText?: string;
  /** Whether to show preview */
  showPreview?: boolean;
}

export function ImageUpload({
  label,
  currentUrl,
  onUpload,
  onGallerySelect,
  onDelete,
  maxSizeMb = 1,
  helpText,
  showPreview = true,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentUrl);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    const fileSizeMb = file.size / (1024 * 1024);
    if (fileSizeMb > maxSizeMb) {
      toast.error(`File size must be less than ${maxSizeMb}MB`);
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    try {
      const res = await onUpload(file);
      setPreviewUrl(res.imageUrl || previewUrl);
      toast.success("Image uploaded");
    } catch (err) {
      toast.error("Failed to upload image");
      // Revert preview on error
      setPreviewUrl(currentUrl);
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!confirm("Delete this image?")) return;

    setDeleting(true);
    try {
      await onDelete();
      setPreviewUrl(null);
      toast.success("Image deleted");
    } catch (err) {
      toast.error("Failed to delete image");
    } finally {
      setDeleting(false);
    }
  };

  const handleGallerySelect = async (image: GalleryImage) => {
    if (onGallerySelect) {
      setUploading(true);
      try {
        const res = await onGallerySelect(image.url);
        setPreviewUrl(res.imageUrl);
        toast.success("Image updated from gallery");
      } catch (err) {
        toast.error("Failed to select image from gallery");
      } finally {
        setUploading(false);
      }
    } else {
      // Fallback: just set the preview URL
      setPreviewUrl(image.url);
      toast.success("Image selected from gallery");
    }
  };

  return (
    <Card className="border-dashed">
      <CardContent className="pt-6">
        <Label className="block mb-3">{label}</Label>

        {showPreview && previewUrl && (
          <div className="mb-4 relative group">
            <img
              src={previewUrl}
              alt="preview"
              className="w-full max-h-64 object-cover rounded-md border"
            />
            {previewUrl === currentUrl && (
              <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                Current
              </div>
            )}
          </div>
        )}

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="gallery" className="flex items-center gap-2">
              <Images className="h-4 w-4" />
              From Gallery
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-3">
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFile}
                disabled={uploading}
                className="hidden"
              />
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? "Uploading..." : "Choose Image"}
              </Button>

              {(previewUrl || currentUrl) && onDelete && (
                <Button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  variant="destructive"
                  size="sm"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
            <p className="text-xs text-muted-foreground">Max {maxSizeMb}MB</p>
          </TabsContent>

          <TabsContent value="gallery" className="space-y-3">
            <Button
              type="button"
              onClick={() => setGalleryOpen(true)}
              disabled={uploading}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <Images className="h-4 w-4 mr-2" />
              Browse Gallery
            </Button>
            {previewUrl && previewUrl !== currentUrl && (
              <p className="text-xs text-green-600">Selected from gallery</p>
            )}
            {(previewUrl || currentUrl) && onDelete && (
              <Button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                variant="destructive"
                size="sm"
                className="w-full"
              >
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </TabsContent>
        </Tabs>

        <ImageGallerySelector
          open={galleryOpen}
          onClose={() => setGalleryOpen(false)}
          onSelect={handleGallerySelect}
        />
      </CardContent>
    </Card>
  );
}
