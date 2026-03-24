import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X } from "lucide-react";

interface ImageUploadProps {
  /** Label for the form field */
  label: string;
  /** Current image URL (if any) */
  currentUrl?: string | null;
  /** Callback when file is selected for upload */
  onUpload: (file: File) => Promise<{ imageUrl: string }>;
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
  onDelete,
  maxSizeMb = 1,
  helpText,
  showPreview = true,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentUrl);
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

        {helpText && <p className="text-xs text-muted-foreground mt-2">{helpText}</p>}
        <p className="text-xs text-muted-foreground mt-1">Max {maxSizeMb}MB</p>
      </CardContent>
    </Card>
  );
}
