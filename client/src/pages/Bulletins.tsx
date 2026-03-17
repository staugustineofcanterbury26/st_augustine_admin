import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { bulletinsApi, type Bulletin } from "@/lib/api";
import { Upload, Trash2, Pencil, FileText, ExternalLink } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function Bulletins() {
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingBulletin, setEditingBulletin] = useState<Bulletin | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setIsLoading(true);
    bulletinsApi
      .getAll()
      .then((res) => setBulletins(res.data))
      .catch(() => toast.error("Failed to load bulletins"))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are accepted");
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    // Default title from filename, date from today
    formData.append("title", file.name.replace(/\.pdf$/i, ""));
    formData.append("date", new Date().toISOString().split("T")[0]);
    try {
      const res = await bulletinsApi.upload(formData);
      setBulletins((prev) => [res.data, ...prev]);
      toast.success("Bulletin uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const openEdit = (b: Bulletin) => {
    setEditingBulletin(b);
    setEditTitle(b.title);
    setEditDate(b.date);
    setEditDialogOpen(true);
  };

  const saveEdit = async () => {
    if (!editingBulletin) return;
    setSaving(true);
    try {
      const res = await bulletinsApi.update(editingBulletin.id, {
        title: editTitle,
        date: editDate,
      });
      setBulletins((prev) => prev.map((b) => (b.id === editingBulletin.id ? res.data : b)));
      toast.success("Bulletin updated");
      setEditDialogOpen(false);
    } catch {
      toast.error("Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const togglePublished = async (b: Bulletin) => {
    try {
      await bulletinsApi.update(b.id, { isPublished: !b.isPublished });
      setBulletins((prev) =>
        prev.map((bul) => (bul.id === b.id ? { ...bul, isPublished: !bul.isPublished } : bul))
      );
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this bulletin permanently?")) return;
    setDeletingId(id);
    try {
      await bulletinsApi.delete(id);
      setBulletins((prev) => prev.filter((b) => b.id !== id));
      toast.success("Deleted");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AdminLayout
      title="Bulletins & Documents"
      description="Upload and manage Sunday bulletins and parish PDFs."
    >
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">{bulletins.length} bulletins uploaded</p>
        <div className="flex items-center gap-3">
          {uploading && (
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <span className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              Uploading…
            </span>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            <Upload className="h-4 w-4" />
            Upload PDF
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : bulletins.length === 0 ? (
        <EmptyState onUpload={() => fileInputRef.current?.click()} />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Published</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bulletins
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium text-sm">{b.title}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(b.date)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {b.fileSize ? `${(b.fileSize / 1024).toFixed(0)} KB` : "—"}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={b.isPublished}
                        onCheckedChange={() => void togglePublished(b)}
                        aria-label="Toggle published"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <a href={b.fileUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" title="View PDF">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </a>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(b)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => void handleDelete(b.id)}
                          disabled={deletingId === b.id}
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

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Bulletin</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
            </div>
          </div>
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
        <FileText className="h-8 w-8 text-primary" />
      </div>
      <h3 className="font-playfair text-lg font-semibold mb-1">No bulletins yet</h3>
      <p className="text-sm text-muted-foreground mb-6">Upload Sunday bulletins as PDFs to display them on the public site.</p>
      <Button onClick={onUpload} className="bg-primary hover:bg-primary/90 gap-2">
        <Upload className="h-4 w-4" /> Upload First Bulletin
      </Button>
    </div>
  );
}
