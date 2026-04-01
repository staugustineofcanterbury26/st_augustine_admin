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
import { galleryApi, type GalleryImage } from "@/lib/api";
import { CheckCircle2, Search, Play } from "lucide-react";

interface VideoGallerySelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (image: GalleryImage) => void;
}

export function VideoGallerySelector({ open, onClose, onSelect }: VideoGallerySelectorProps) {
  const [videos, setVideos] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;

    setIsLoading(true);
    galleryApi
      .getAll({ includeHidden: true })
      .then((res) => {
        // Filter for video files (simplistic check based on URL)
        const videoExtensions = [".mp4", ".webm", ".ogv", ".mov"];
        const vids = res.data.filter((img) =>
          videoExtensions.some((ext) => img.url.toLowerCase().endsWith(ext))
        );
        setVideos(vids);
      })
      .catch(() => toast.error("Failed to load gallery"))
      .finally(() => setIsLoading(false));
  }, [open]);

  const filtered = videos.filter(
    (vid) =>
      vid.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vid.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = () => {
    if (selectedId === null) return;
    const selected = videos.find((vid) => vid.id === selectedId);
    if (selected) {
      onSelect(selected);
      onClose();
      setSelectedId(null);
      setSearchQuery("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Select Video from Gallery</DialogTitle>
          <DialogDescription>
            Choose a video from your existing gallery
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>

          {/* Gallery Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-video rounded-md" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {videos.length === 0 ? "No videos in gallery" : "No videos match your search"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
              {filtered.map((video) => (
                <button
                  key={video.id}
                  onClick={() => setSelectedId(video.id)}
                  className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
                    selectedId === video.id
                      ? "border-blue-500 ring-2 ring-blue-200"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="w-full aspect-video bg-black flex items-center justify-center">
                    <Play className="h-8 w-8 text-white opacity-50" />
                  </div>
                  {selectedId === video.id && (
                    <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                      <CheckCircle2 className="h-8 w-8 text-blue-600" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-end">
                    <div className="w-full p-2 bg-gradient-to-t from-black to-transparent text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      {video.title}
                    </div>
                  </div>
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
          <Button onClick={handleSelect} disabled={selectedId === null || isLoading}>
            Select Video
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
