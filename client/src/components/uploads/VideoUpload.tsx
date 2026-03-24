import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X, Play } from "lucide-react";

interface VideoUploadProps {
  /** Label for the form field */
  label: string;
  /** Current video URL (if any) */
  currentUrl?: string | null;
  /** Callback when file is selected for upload */
  onUpload: (file: File) => Promise<{ heroVideoUrl: string }>;
  /** Callback when delete is clicked */
  onDelete?: () => Promise<void>;
  /** Max file size in MB */
  maxSizeMb?: number;
  /** Help text */
  helpText?: string;
}

export function VideoUpload({
  label,
  currentUrl,
  onUpload,
  onDelete,
  maxSizeMb = 5,
  helpText,
}: VideoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

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
    const videoMimeTypes = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"];
    if (!videoMimeTypes.includes(file.type)) {
      toast.error("Please select a valid video file (MP4, WebM, Ogg, or QuickTime)");
      return;
    }

    // Get video duration
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.onloadedmetadata = () => {
      setVideoDuration(Math.round(video.duration));
      URL.revokeObjectURL(url);
    };
    video.src = url;

    // Upload
    setUploading(true);
    try {
      const res = await onUpload(file);
      toast.success("Video uploaded");
    } catch (err) {
      toast.error("Failed to upload video");
      setVideoDuration(null);
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!confirm("Delete this video?")) return;

    setDeleting(true);
    try {
      await onDelete();
      setVideoDuration(null);
      toast.success("Video deleted");
    } catch (err) {
      toast.error("Failed to delete video");
    } finally {
      setDeleting(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Card className="border-dashed">
      <CardContent className="pt-6">
        <Label className="block mb-3">{label}</Label>

        {currentUrl && (
          <div className="mb-4 relative">
            <div className="bg-black rounded-md aspect-video flex items-center justify-center">
              <div className="text-white text-center">
                <Play className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Video Uploaded</p>
              </div>
            </div>
            <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
              Current
            </div>
          </div>
        )}

        {videoDuration && !currentUrl && (
          <div className="mb-4 p-3 rounded-md bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-900">
              Video ready to upload • Duration: {formatDuration(videoDuration)}
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
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
            {uploading ? "Uploading..." : "Choose Video"}
          </Button>

          {currentUrl && onDelete && (
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
        <p className="text-xs text-muted-foreground mt-1">Max {maxSizeMb}MB (H.264 MP4 recommended)</p>
      </CardContent>
    </Card>
  );
}
