import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { ministriesApi, type Ministry } from "@/lib/api";
import { Plus, Pencil, Trash2, HandHeart } from "lucide-react";

const MINISTRY_CATEGORIES = ["Liturgy", "Education", "Youth", "Social", "Prayer", "Music", "Outreach", "Other"];

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  meetingTime: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email("Must be a valid email").optional().or(z.literal("")),
  imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  category: z.string().min(1),
  isActive: z.boolean(),
  sortOrder: z.coerce.number().int().min(0),
});

type MinistryForm = z.infer<typeof schema>;

function formDefault(m?: Ministry): MinistryForm {
  return {
    name: m?.name ?? "",
    description: m?.description ?? "",
    meetingTime: m?.meetingTime ?? "",
    contactName: m?.contactName ?? "",
    contactEmail: m?.contactEmail ?? "",
    imageUrl: m?.imageUrl ?? "",
    category: m?.category ?? "Other",
    isActive: m?.isActive ?? true,
    sortOrder: m?.sortOrder ?? 0,
  };
}

export default function Ministries() {
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Ministry | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const form = useForm<MinistryForm>({ resolver: zodResolver(schema) as Resolver<MinistryForm>, defaultValues: formDefault() });

  const load = () => {
    setIsLoading(true);
    ministriesApi
      .getAll()
      .then((res) => setMinistries(res.data))
      .catch(() => toast.error("Failed to load ministries"))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); form.reset(formDefault()); setDialogOpen(true); };
  const openEdit = (m: Ministry) => { setEditing(m); form.reset(formDefault(m)); setDialogOpen(true); };

  const onSubmit = async (data: MinistryForm) => {
    setSaving(true);
    const payload = {
      ...data,
      contactEmail: data.contactEmail || undefined,
      imageUrl: data.imageUrl || undefined,
      meetingTime: data.meetingTime || undefined,
      contactName: data.contactName || undefined,
    };
    try {
      if (editing) {
        await ministriesApi.update(editing.id, payload);
        toast.success("Ministry updated");
      } else {
        await ministriesApi.create(payload);
        toast.success("Ministry added");
      }
      setDialogOpen(false);
      load();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this ministry?")) return;
    setDeletingId(id);
    try {
      await ministriesApi.delete(id);
      setMinistries((prev) => prev.filter((m) => m.id !== id));
      toast.success("Deleted");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const toggleActive = async (m: Ministry) => {
    try {
      await ministriesApi.update(m.id, { isActive: !m.isActive });
      setMinistries((prev) => prev.map((min) => (min.id === m.id ? { ...min, isActive: !min.isActive } : min)));
    } catch {
      toast.error("Failed to update");
    }
  };

  return (
    <AdminLayout
      title="Get Involved"
      description="Manage parish ministries and volunteer opportunities."
    >
      <div className="flex justify-end mb-6">
        <Button onClick={openCreate} className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Add Ministry
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : ministries.length === 0 ? (
        <EmptyState onAdd={openCreate} />
      ) : (
        <div className="space-y-3">
          {ministries
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((m) => (
              <Card key={m.id} className={m.isActive ? "" : "opacity-60 border-dashed"}>
                <CardContent className="flex items-start gap-4 p-5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold font-playfair">{m.name}</h3>
                      <Badge variant="outline">{m.category}</Badge>
                      {!m.isActive && <Badge variant="secondary">Hidden</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{m.description}</p>
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      {m.meetingTime && <span>🕐 {m.meetingTime}</span>}
                      {m.contactName && <span>👤 {m.contactName}</span>}
                      {m.contactEmail && <span>✉️ {m.contactEmail}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Switch checked={m.isActive} onCheckedChange={() => void toggleActive(m)} />
                    <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => void handleDelete(m.id)}
                      disabled={deletingId === m.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Ministry" : "New Ministry"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input placeholder="e.g. Choir, Youth Group…" {...form.register("name")} />
              {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={3} {...form.register("description")} />
              {form.formState.errors.description && <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...form.register("category")}
                >
                  {MINISTRY_CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Meeting Time</Label>
                <Input placeholder="e.g. Sundays after Mass" {...form.register("meetingTime")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Contact Name</Label>
                <Input {...form.register("contactName")} />
              </div>
              <div className="space-y-1.5">
                <Label>Contact Email</Label>
                <Input type="email" {...form.register("contactEmail")} />
                {form.formState.errors.contactEmail && <p className="text-xs text-destructive">{form.formState.errors.contactEmail.message}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="ministryActive"
                checked={form.watch("isActive")}
                onCheckedChange={(v) => form.setValue("isActive", v)}
              />
              <Label htmlFor="ministryActive">Show on public site</Label>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90">
                {saving ? "Saving…" : editing ? "Save Changes" : "Add Ministry"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-16 w-16 rounded-full bg-orange-50 flex items-center justify-center mb-4">
        <HandHeart className="h-8 w-8 text-primary" />
      </div>
      <h3 className="font-playfair text-lg font-semibold mb-1">No ministries yet</h3>
      <p className="text-sm text-muted-foreground mb-6">Add ministries and volunteer groups to the Get Involved page.</p>
      <Button onClick={onAdd} className="bg-primary hover:bg-primary/90 gap-2">
        <Plus className="h-4 w-4" /> Add First Ministry
      </Button>
    </div>
  );
}
