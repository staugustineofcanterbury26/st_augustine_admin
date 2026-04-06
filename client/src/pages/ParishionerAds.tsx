import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Pencil, Upload } from "lucide-react";
import axios from "axios";

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:5000";
const apiClient = axios.create({ baseURL: BASE_URL });

interface ParishionerAd {
  id: number;
  title: string;
  description: string;
  parishionerName: string;
  imageUrl: string;
  linkUrl: string | null;
  isActive: boolean;
  displayOrder: number;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const adSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().min(1, "Description is required").max(500),
  parishionerName: z.string().min(1, "Parishioner name is required").max(100),
  imageUrl: z.string().min(1, "Image URL is required"),
  linkUrl: z.string().optional(),
  isActive: z.boolean(),
  expiresAt: z.string().optional(),
});

type AdFormData = z.infer<typeof adSchema>;

export default function ParishionerAds() {
  const [ads, setAds] = useState<ParishionerAd[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<ParishionerAd | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const form = useForm<AdFormData>({
    resolver: zodResolver(adSchema),
    defaultValues: {
      title: "",
      description: "",
      parishionerName: "",
      imageUrl: "",
      linkUrl: "",
      isActive: true,
      expiresAt: "",
    },
  });

  useEffect(() => {
    loadAds();
  }, []);

  const loadAds = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get("/ads");
      // Load all ads (active and inactive) for admin view
      const allAds = await apiClient.get("/ads", { headers: { "X-Include-Inactive": "true" } }).catch(() => response);
      setAds((allAds.data || response.data || []).sort((a: ParishionerAd, b: ParishionerAd) => a.displayOrder - b.displayOrder));
    } catch (error) {
      console.error("Failed to load ads:", error);
      toast.error("Failed to load ads");
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: AdFormData) => {
    setSaving(true);
    try {
      const submitData = {
        ...data,
        linkUrl: (data.linkUrl && data.linkUrl !== "") ? data.linkUrl : null,
        expiresAt: (data.expiresAt && data.expiresAt !== "") ? data.expiresAt : null,
      };
      
      if (editingAd) {
        // Update existing ad
        const response = await apiClient.put(`/ads/${editingAd.id}`, submitData);
        setAds((prev) => prev.map((a) => (a.id === editingAd.id ? response.data : a)));
        toast.success("Ad updated successfully");
      } else {
        // Create new ad
        const response = await apiClient.post("/ads", submitData);
        setAds((prev) => [...prev, response.data].sort((a: ParishionerAd, b: ParishionerAd) => a.displayOrder - b.displayOrder));
        toast.success("Ad created successfully");
      }
      setDialogOpen(false);
      form.reset();
      setEditingAd(null);
    } catch (error) {
      console.error("Failed to save ad:", error);
      toast.error("Failed to save ad");
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (ad: ParishionerAd) => {
    setEditingAd(ad);
    form.reset({
      title: ad.title,
      description: ad.description,
      parishionerName: ad.parishionerName,
      imageUrl: ad.imageUrl,
      linkUrl: ad.linkUrl || "",
      isActive: ad.isActive,
      expiresAt: ad.expiresAt?.split("T")[0] || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this ad permanently?")) return;
    setDeletingId(id);
    try {
      await apiClient.delete(`/ads/${id}`);
      setAds((prev) => prev.filter((a) => a.id !== id));
      toast.success("Ad deleted");
    } catch (error) {
      console.error("Failed to delete ad:", error);
      toast.error("Failed to delete ad");
    } finally {
      setDeletingId(null);
    }
  };

  const openNewDialog = () => {
    setEditingAd(null);
    form.reset();
    setDialogOpen(true);
  };

  return (
    <AdminLayout
      title="Parishioner Ads"
      description="Manage advertisements from parishioners and community partners."
    >
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">{ads.length} advertisements</p>
        <Button onClick={openNewDialog} className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Create Ad
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : ads.length === 0 ? (
        <EmptyState onCreate={openNewDialog} />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Parishioner Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Order</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ads.map((ad) => (
                <TableRow key={ad.id}>
                  <TableCell>
                    <span className="font-medium text-sm">{ad.title}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {ad.parishionerName}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={ad.isActive ? "default" : "secondary"}
                      className={ad.isActive ? "bg-green-100 text-green-800" : ""}
                    >
                      {ad.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {ad.expiresAt ? new Date(ad.expiresAt).toLocaleDateString() : "Never"}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {ad.displayOrder}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(ad)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(ad.id)}
                        disabled={deletingId === ad.id}
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAd ? "Edit Advertisement" : "Create New Advertisement"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit((data) => onSubmit(data))} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                placeholder="e.g., John's Plumbing Services"
                {...form.register("title")}
              />
              {form.formState.errors.title && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Parishioner/Business Name</Label>
              <Input
                placeholder="e.g., John Smith"
                {...form.register("parishionerName")}
              />
              {form.formState.errors.parishionerName && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.parishionerName.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="Brief description of the service or product"
                {...form.register("description")}
                rows={3}
              />
              {form.formState.errors.description && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.description.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Image URL</Label>
              <Input
                placeholder="https://example.com/image.jpg"
                {...form.register("imageUrl")}
              />
              {form.formState.errors.imageUrl && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.imageUrl.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Website/Contact Link (Optional)</Label>
              <Input
                placeholder="https://example.com"
                {...form.register("linkUrl")}
              />
              {form.formState.errors.linkUrl && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.linkUrl.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Expiration Date (Optional)</Label>
              <Input type="date" {...form.register("expiresAt")} />
              <p className="text-xs text-muted-foreground">
                Leave blank for no expiration
              </p>
            </div>

            <div className="flex items-center justify-between py-2">
              <Label>Active</Label>
              <Switch {...form.register("isActive")} />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-primary hover:bg-primary/90"
              >
                {saving ? "Saving…" : editingAd ? "Update Ad" : "Create Ad"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-16 w-16 rounded-full bg-orange-50 flex items-center justify-center mb-4">
        <Upload className="h-8 w-8 text-primary" />
      </div>
      <h3 className="font-playfair text-lg font-semibold mb-1">
        No advertisements yet
      </h3>
      <p className="text-sm text-muted-foreground mb-6">
        Create your first parishioner advertisement to get started.
      </p>
      <Button onClick={onCreate} className="bg-primary hover:bg-primary/90 gap-2">
        <Plus className="h-4 w-4" /> Create First Ad
      </Button>
    </div>
  );
}
