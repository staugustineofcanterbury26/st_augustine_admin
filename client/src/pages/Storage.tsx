import { useEffect, useState } from "react";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { storageApi, type BlobFile, type StorageInfo } from "@/lib/api";
import { Trash2, RefreshCw, HardDrive, ExternalLink } from "lucide-react";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function UsageBar({ usedBytes, limitBytes }: { usedBytes: number; limitBytes: number }) {
  const pct = Math.min((usedBytes / limitBytes) * 100, 100);
  const color = pct > 85 ? "bg-red-500" : pct > 60 ? "bg-yellow-500" : "bg-green-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{formatBytes(usedBytes)} used</span>
        <span>{formatBytes(limitBytes)} limit</span>
      </div>
      <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">{pct.toFixed(1)}% of free tier used</p>
    </div>
  );
}

export default function Storage() {
  const [info, setInfo] = useState<StorageInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null);
  const [confirmDeleteUrl, setConfirmDeleteUrl] = useState<string | null>(null);
  const [confirmDeleteOrphans, setConfirmDeleteOrphans] = useState(false);
  const [deletingOrphans, setDeletingOrphans] = useState(false);
  const [filter, setFilter] = useState<"all" | "orphans">("all");

  const load = () => {
    setIsLoading(true);
    storageApi
      .getInfo()
      .then((res) => setInfo(res.data))
      .catch(() => toast.error("Failed to load storage info"))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDeleteFile = async (url: string) => {
    setDeletingUrl(url);
    try {
      await storageApi.deleteFile(url);
      setInfo((prev) =>
        prev
          ? {
              ...prev,
              blobs: prev.blobs.filter((b) => b.url !== url),
              usedBytes: prev.usedBytes - (prev.blobs.find((b) => b.url === url)?.size ?? 0),
            }
          : prev
      );
      toast.success("File deleted");
    } catch {
      toast.error("Failed to delete file");
    } finally {
      setDeletingUrl(null);
      setConfirmDeleteUrl(null);
    }
  };

  const handleDeleteOrphans = async () => {
    setDeletingOrphans(true);
    try {
      const res = await storageApi.deleteOrphans();
      const count = res.data.deleted as number;
      toast.success(`Deleted ${count} orphaned file${count !== 1 ? "s" : ""}`);
      load();
    } catch {
      toast.error("Failed to delete orphaned files");
    } finally {
      setDeletingOrphans(false);
      setConfirmDeleteOrphans(false);
    }
  };

  const blobs = info?.blobs ?? [];
  const orphans = blobs.filter((b) => b.isOrphan);
  const displayed = filter === "orphans" ? orphans : blobs;

  return (
    <AdminLayout title="Storage" description="Manage files stored in Vercel Blob">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Storage</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage files stored in Vercel Blob. Delete unused files to stay within the 1 GB free tier.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Usage card */}
        <div className="rounded-lg border p-5 space-y-3">
          <div className="flex items-center gap-2 font-medium">
            <HardDrive className="h-4 w-4" />
            Blob Storage Usage
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-full" />
          ) : !info?.available ? (
            <p className="text-sm text-muted-foreground">
              Blob storage is not configured. Set{" "}
              <code className="text-xs bg-muted px-1 rounded">BLOB_READ_WRITE_TOKEN</code> in Vercel project settings.
            </p>
          ) : (
            <UsageBar usedBytes={info.usedBytes} limitBytes={info.limitBytes} />
          )}
        </div>

        {/* Actions + filter */}
        {info?.available && (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex gap-2">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("all")}
              >
                All files
                <Badge variant="secondary" className="ml-2">{blobs.length}</Badge>
              </Button>
              <Button
                variant={filter === "orphans" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("orphans")}
              >
                Orphaned
                <Badge variant={orphans.length > 0 ? "destructive" : "secondary"} className="ml-2">
                  {orphans.length}
                </Badge>
              </Button>
            </div>
            {orphans.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmDeleteOrphans(true)}
                disabled={deletingOrphans}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete all orphans ({orphans.length})
              </Button>
            )}
          </div>
        )}

        {/* File table */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : !info?.available ? null : displayed.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            {filter === "orphans" ? "No orphaned files found." : "No files stored yet."}
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayed.map((blob: BlobFile) => (
                  <TableRow key={blob.url}>
                    <TableCell className="max-w-[300px]">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-mono" title={blob.pathname}>
                          {blob.pathname.split("/").pop()}
                        </span>
                        <a
                          href={blob.url}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{blob.pathname}</p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {blob.ext.toUpperCase() || "—"}
                    </TableCell>
                    <TableCell className="text-sm">{formatBytes(blob.size)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(blob.uploadedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {blob.isOrphan ? (
                        <Badge variant="destructive">Orphaned</Badge>
                      ) : (
                        <Badge variant="outline">In use</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        disabled={deletingUrl === blob.url}
                        onClick={() => setConfirmDeleteUrl(blob.url)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Confirm single delete */}
      <AlertDialog open={!!confirmDeleteUrl} onOpenChange={(o: boolean) => !o && setConfirmDeleteUrl(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete file?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the file from Vercel Blob. If it is still referenced somewhere on the
              site, it will show as a broken image or missing PDF.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDeleteUrl && handleDeleteFile(confirmDeleteUrl)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm orphan bulk delete */}
      <AlertDialog open={confirmDeleteOrphans} onOpenChange={setConfirmDeleteOrphans}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {orphans.length} orphaned files?</AlertDialogTitle>
            <AlertDialogDescription>
              These files are not referenced in the database. Deleting them frees up storage and is safe to do.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteOrphans}
            >
              Delete all orphans
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
