import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { galleryApi, type GalleryImage } from "@/lib/api";
import { Upload, Trash2, Pencil, Images, X } from "lucide-react";

export default function Gallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [albums, setAlbums] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [columns, setColumns] = useState<number>(4);
  const [showHidden, setShowHidden] = useState<boolean>(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [albumFilter, setAlbumFilter] = useState<string>("all");
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAlbum, setEditAlbum] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setIsLoading(true);
    Promise.all([galleryApi.getAll({ includeHidden: showHidden }), galleryApi.getAlbums(showHidden)])
      .then(([imagesRes, albumsRes]) => {
        setImages(imagesRes.data);
        setAlbums(albumsRes.data);
      })
      .catch(() => toast.error("Failed to load gallery"))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { load(); }, [showHidden]);

  const filtered = albumFilter === "all"
    ? images
    : images.filter((img) => img.album === albumFilter);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const results: GalleryImage[] = [];

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name.replace(/\.[^.]+$/, ""));
      try {
        const res = await galleryApi.upload(formData);
        results.push(res.data);
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (results.length > 0) {
      toast.success(`Uploaded ${results.length} image${results.length > 1 ? "s" : ""}`);
      setImages((prev) => [...results, ...prev]);
    }
    setUploading(false);
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openEdit = (img: GalleryImage) => {
    setEditingImage(img);
    setEditTitle(img.title);
    setEditDescription(img.description ?? "");
    setEditAlbum(img.album ?? "");
    setEditDialogOpen(true);
  };

  const saveEdit = async () => {
    if (!editingImage) return;
    setSaving(true);
    try {
      const res = await galleryApi.update(editingImage.id, {
        title: editTitle,
        description: editDescription,
        album: editAlbum,
      });
      setImages((prev) => prev.map((img) => (img.id === editingImage.id ? res.data : img)));
      toast.success("Image updated");
      setEditDialogOpen(false);
    } catch {
      toast.error("Failed to update image");
    } finally {
      setSaving(false);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const clearSelection = () => setSelectedIds([]);

  const bulkSetPublished = async (publish: boolean) => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to ${publish ? "publish" : "hide"} ${selectedIds.length} image(s)?`)) return;
    try {
      await Promise.all(selectedIds.map((id) => galleryApi.update(id, { isPublished: publish })));
      setImages((prev) => prev.map((img) => (selectedIds.includes(img.id) ? { ...img, isPublished: publish } : img)));
      toast.success("Bulk update complete");
      clearSelection();
    } catch {
      toast.error("Bulk update failed");
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} image(s) permanently?`)) return;
    try {
      await Promise.all(selectedIds.map((id) => galleryApi.delete(id)));
      setImages((prev) => prev.filter((img) => !selectedIds.includes(img.id)));
      toast.success("Deleted selected images");
      clearSelection();
    } catch {
      toast.error("Bulk delete failed");
    }
  };

  const togglePublished = async (img: GalleryImage) => {
    try {
      await galleryApi.update(img.id, { isPublished: !img.isPublished });
      setImages((prev) =>
        prev.map((i) => (i.id === img.id ? { ...i, isPublished: !i.isPublished } : i))
      );
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this image permanently from Vercel Blob?")) return;
    setDeletingId(id);
    try {
      await galleryApi.delete(id);
      setImages((prev) => prev.filter((i) => i.id !== id));
      toast.success("Image deleted");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AdminLayout
      title="Photo Gallery"
      description="Upload and organize images for the public gallery."
    >
      <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          <strong>Note:</strong> Use the toggle switch on each photo to hide/show it in the public gallery. Hidden photos will not appear on the frontend gallery page.
        </p>
      </div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Label>View</Label>
          <div className="flex items-center gap-1">
            <Button variant={viewMode === 'grid' ? undefined : 'ghost'} onClick={() => setViewMode('grid')} className="px-2">Grid</Button>
            <Button variant={viewMode === 'list' ? undefined : 'ghost'} onClick={() => setViewMode('list')} className="px-2">List</Button>
          </div>
          <Label className="ml-3">Columns</Label>
          <select value={columns} onChange={(e) => setColumns(parseInt(e.target.value, 10))} className="rounded border px-2 py-1">
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
            <option value={5}>5</option>
          </select>
          <div className="ml-4 flex items-center gap-2">
            <Switch checked={showHidden} onCheckedChange={(v) => setShowHidden(Boolean(v))} />
            <span className="text-sm">Include hidden</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {uploading && (
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <span className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              Uploading…
            </span>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            <Upload className="h-4 w-4" />
            Upload Images
          </Button>
        </div>
      </div>
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <>
              <Button onClick={() => bulkSetPublished(true)} className="bg-primary/90">Publish</Button>
              <Button onClick={() => bulkSetPublished(false)} className="bg-orange-500/90">Hide</Button>
              <Button onClick={bulkDelete} className="bg-red-500/90">Delete</Button>
              <Button variant="ghost" onClick={clearSelection}>Clear</Button>
            </>
          )}
        </div>
        <div className="text-sm text-muted-foreground">Showing {images.length} images{showHidden ? ' (including hidden)' : ''}</div>
      </div>
        <Tabs value={albumFilter} onValueChange={setAlbumFilter}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="all">All ({images.length})</TabsTrigger>
            {albums.map((album) => (
              <TabsTrigger key={album} value={album}>{album}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

      {isLoading ? (
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState onUpload={() => fileInputRef.current?.click()} />
      ) : viewMode === "grid" ? (
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {filtered.map((img) => (
            <div key={img.id} className="group relative rounded-lg overflow-hidden border bg-card aspect-square">
              <input
                type="checkbox"
                checked={selectedIds.includes(img.id)}
                onChange={() => toggleSelect(img.id)}
                className="absolute top-2 left-2 z-20 h-4 w-4"
              />
              <img
                src={img.thumbnailUrl ?? img.url}
                alt={img.title}
                className="object-cover w-full h-full transition-transform group-hover:scale-105"
                loading="lazy"
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                <div className="flex justify-end gap-1">
                  <button
                    onClick={() => openEdit(img)}
                    className="rounded-md bg-white/20 hover:bg-white/40 p-1.5 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5 text-white" />
                  </button>
                  <button
                    onClick={() => void handleDelete(img.id)}
                    disabled={deletingId === img.id}
                    className="rounded-md bg-red-500/80 hover:bg-red-500 p-1.5 transition-colors"
                    title="Delete"
                  >
                    {deletingId === img.id ? (
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin inline-block" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5 text-white" />
                    )}
                  </button>
                </div>
                <div>
                  <p className="text-white text-xs font-medium truncate">{img.title}</p>
                  {img.album && (
                    <span className="text-white/70 text-xs">{img.album}</span>
                  )}
                </div>
              </div>
              {/* Published toggle */}
              <div className="absolute top-2 right-2">
                <Switch
                  checked={img.isPublished}
                  onCheckedChange={() => void togglePublished(img)}
                  className="scale-75"
                />
              </div>
              {!img.isPublished && (
                <Badge variant="warning" className="absolute bottom-2 right-2 text-xs px-1.5 py-0.5">
                  Hidden
                </Badge>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((img) => (
            <div key={img.id} className="flex items-center gap-3 rounded border bg-card p-3">
              <input type="checkbox" checked={selectedIds.includes(img.id)} onChange={() => toggleSelect(img.id)} />
              <img src={img.thumbnailUrl ?? img.url} alt={img.title} className="h-20 w-20 object-cover rounded" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{img.title}</h4>
                  <div className="flex items-center gap-2">
                    <Switch checked={img.isPublished} onCheckedChange={() => void togglePublished(img)} className="scale-75" />
                    <Button variant="ghost" onClick={() => openEdit(img)}><Pencil /></Button>
                    <Button variant="ghost" onClick={() => void handleDelete(img.id)}><Trash2 /></Button>
                  </div>
                </div>
                {img.album && <div className="text-sm text-muted-foreground">{img.album}</div>}
                {img.description && <div className="text-sm mt-2">{img.description}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Image</DialogTitle>
          </DialogHeader>
          {editingImage && (
            <div className="space-y-4">
              <img
                src={editingImage.thumbnailUrl ?? editingImage.url}
                alt={editingImage.title}
                className="w-full h-40 object-cover rounded-lg"
              />
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Description (optional)</Label>
                <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Album (optional)</Label>
                <Input
                  value={editAlbum}
                  onChange={(e) => setEditAlbum(e.target.value)}
                  placeholder="e.g. Christmas 2025"
                  list="album-suggestions"
                />
                <datalist id="album-suggestions">
                  {albums.map((a) => <option key={a} value={a} />)}
                </datalist>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={saving} className="bg-primary hover:bg-primary/90">
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-16 w-16 rounded-full bg-orange-50 flex items-center justify-center mb-4">
        <Images className="h-8 w-8 text-primary" />
      </div>
      <h3 className="font-playfair text-lg font-semibold mb-1">No photos yet</h3>
      <p className="text-sm text-muted-foreground mb-6">Upload images to populate the parish photo gallery.</p>
      <Button onClick={onUpload} className="bg-primary hover:bg-primary/90 gap-2">
        <Upload className="h-4 w-4" /> Upload First Images
      </Button>
    </div>
  );
}
