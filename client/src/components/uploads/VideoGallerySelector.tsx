import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { storageApi, type BlobFile } from "@/lib/api";
import { CheckCircle2, Download, Play, Search } from "lucide-react";

const VIDEO_EXTS = ["mp4", "webm", "ogv", "mov"];

interface VideoGallerySelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (video: { url: string }) => void;
}

export function VideoGallerySelector({ open, onClose, onSelect }: VideoGallerySelectorProps) {
  const [videos, setVideos] = useState<BlobFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setIsLoading(true);
    storageApi
      .getInfo()
      .then((res) => {
        const vids = res.data.blobs.filter((b) =>
          VIDEO_EXTS.includes(b.ext.toLowerCase())
        );
        setVideos(vids);
      })
      .catch(() => toast.error("Failed to load videos"))
      .finally(() => setIsLoading(false));
  }, [open]);

  const filtered = videos.filter((vid) =>
    vid.pathname.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDownload = async (url: string, filename: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!/^https?:\/\//i.test(url)) return;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objUrl);
    } catch {
      toast.error("Download failed");
    }
  };

  const handleSelect = () => {
    if (!selectedUrl) return;
    onSelect({ url: selectedUrl });
    onClose();
    setSelectedUrl(null);
    setSearchQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Select Video from Storage</DialogTitle>
          <DialogDescription>
            Choose a previously uploaded video file
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by filename..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-video rounded-md" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {videos.length === 0
                  ? "No uploaded videos found. Upload a video first."
                  : "No videos match your search"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
              {filtered.map((video) => (
                <button
                  key={video.url}
                  onClick={() => setSelectedUrl(video.url)}
                  className={`relative group rounded-lg overflow-hidden border-2 transition-all text-left ${
                    selectedUrl === video.url
                      ? "border-blue-500 ring-2 ring-blue-200"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="w-full aspect-video bg-gray-900 flex items-center justify-center">
                    <Play className="h-8 w-8 text-white opacity-50" />
                  </div>
                  {selectedUrl === video.url && (
                    <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                      <CheckCircle2 className="h-8 w-8 text-blue-600" />
                    </div>
                  )}
                  <button
                    onClick={(e) => handleDownload(video.url, video.pathname.split("/").pop() ?? "video", e)}
                    className="absolute top-1 left-1 z-10 bg-black/60 hover:bg-black/80 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Download"
                  >
                    <Download className="h-3 w-3" />
                  </button>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-end">
                    <div className="w-full p-2 bg-gradient-to-t from-black to-transparent text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity truncate">
                      {video.pathname.split("/").pop()}
                    </div>
                  </div>
                  <span className="absolute top-1 right-1 bg-black/60 text-white text-[9px] px-1 rounded uppercase">
                    {video.ext}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSelect} disabled={!selectedUrl || isLoading}>
            Select Video
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


