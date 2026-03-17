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
import { pastoralUnitApi, type PastoralParish } from "@/lib/api";
import { Plus, Pencil, Trash2, Church, Globe, Facebook } from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().default(""),
  city: z.string().default(""),
  postalCode: z.string().default(""),
  phone: z.string().optional(),
  email: z.string().optional(),
  websiteUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  facebookUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  massTimes: z.string().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

type ParishForm = z.infer<typeof schema>;

function formDefault(p?: PastoralParish): ParishForm {
  return {
    name: p?.name ?? "",
    address: p?.address ?? "",
    city: p?.city ?? "",
    postalCode: p?.postalCode ?? "",
    phone: p?.phone ?? "",
    email: p?.email ?? "",
    websiteUrl: p?.websiteUrl ?? "",
    facebookUrl: p?.facebookUrl ?? "",
    massTimes: p?.massTimes ?? "",
    isActive: p?.isActive ?? true,
    sortOrder: p?.sortOrder ?? 0,
  };
}

export default function PastoralUnit() {
  const [parishes, setParishes] = useState<PastoralParish[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PastoralParish | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const form = useForm<ParishForm>({
    resolver: zodResolver(schema) as Resolver<ParishForm>,
    defaultValues: formDefault(),
  });

  const load = () => {
    setIsLoading(true);
    pastoralUnitApi
      .getAll()
      .then((res) => setParishes(res.data))
      .catch(() => toast.error("Failed to load parishes"))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    form.reset(formDefault());
    setDialogOpen(true);
  };

  const openEdit = (p: PastoralParish) => {
    setEditing(p);
    form.reset(formDefault(p));
    setDialogOpen(true);
  };

  const onSubmit = async (data: ParishForm) => {
    setSaving(true);
    const payload = {
      ...data,
      websiteUrl: data.websiteUrl || undefined,
      facebookUrl: data.facebookUrl || undefined,
      email: data.email || undefined,
      phone: data.phone || undefined,
      massTimes: data.massTimes || undefined,
    };
    try {
      if (editing) {
        await pastoralUnitApi.update(editing.id, payload);
        toast.success("Parish updated");
      } else {
        await pastoralUnitApi.create(payload);
        toast.success("Parish added");
      }
      setDialogOpen(false);
      load();
    } catch {
      toast.error("Failed to save — please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Remove this parish from the pastoral unit list?")) return;
    setDeletingId(id);
    try {
      await pastoralUnitApi.delete(id);
      toast.success("Deleted");
      setParishes((prev) => prev.filter((p) => p.id !== id));
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const toggleActive = async (p: PastoralParish) => {
    try {
      await pastoralUnitApi.update(p.id, { isActive: !p.isActive });
      setParishes((prev) => prev.map((x) => (x.id === p.id ? { ...x, isActive: !x.isActive } : x)));
    } catch {
      toast.error("Failed to update");
    }
  };

  return (
    <AdminLayout
      title="Pastoral Unit"
      description="Manage the six parishes of the Saint John Paul II Pastoral Unit shown on the public site."
    >
      <div className="flex justify-end mb-6">
        <Button onClick={openCreate} className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Add Parish
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : parishes.length === 0 ? (
        <EmptyState onAdd={openCreate} />
      ) : (
        <div className="space-y-3">
          {parishes
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((p) => (
              <Card key={p.id} className={`transition-opacity ${p.isActive ? "" : "opacity-60"}`}>
                <CardContent className="flex items-start gap-4 p-5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold font-playfair text-base">{p.name}</h3>
                      <Badge variant={p.isActive ? "success" : "secondary"}>
                        {p.isActive ? "Visible" : "Hidden"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {[p.address, p.city, p.postalCode].filter(Boolean).join(", ")}
                    </p>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                      {p.phone && <span>{p.phone}</span>}
                      {p.massTimes && <span className="italic">{p.massTimes}</span>}
                      {p.websiteUrl && (
                        <a href={p.websiteUrl} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <Globe className="h-3 w-3" /> Website
                        </a>
                      )}
                      {p.facebookUrl && (
                        <a href={p.facebookUrl} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <Facebook className="h-3 w-3" /> Facebook
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Switch
                      checked={p.isActive}
                      onCheckedChange={() => void toggleActive(p)}
                      aria-label="Toggle visibility"
                    />
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => void handleDelete(p.id)}
                      disabled={deletingId === p.id}
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
            <DialogTitle>{editing ? "Edit Parish" : "Add Parish"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Parish Name</Label>
              <Input placeholder="e.g. Good Shepherd Parish" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Address</Label>
                <Input placeholder="7900 Naples" {...form.register("address")} />
              </div>
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input placeholder="Brossard" {...form.register("city")} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Postal Code</Label>
                <Input placeholder="J4Y 1Z9" {...form.register("postalCode")} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input placeholder="450-000-0000" {...form.register("phone")} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" {...form.register("email")} />
            </div>

            <div className="space-y-1.5">
              <Label>Website URL (optional)</Label>
              <Input placeholder="https://..." {...form.register("websiteUrl")} />
              {form.formState.errors.websiteUrl && (
                <p className="text-xs text-destructive">{form.formState.errors.websiteUrl.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Facebook URL (optional)</Label>
              <Input placeholder="https://facebook.com/..." {...form.register("facebookUrl")} />
              {form.formState.errors.facebookUrl && (
                <p className="text-xs text-destructive">{form.formState.errors.facebookUrl.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Mass Times (optional display text)</Label>
              <Textarea
                rows={2}
                placeholder="e.g. Sat 5:00 PM · Sun 9:00 AM"
                {...form.register("massTimes")}
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="isActive"
                checked={form.watch("isActive")}
                onCheckedChange={(v) => form.setValue("isActive", v)}
              />
              <Label htmlFor="isActive">Show on public site</Label>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90">
                {saving ? "Saving…" : editing ? "Save Changes" : "Add Parish"}
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
        <Church className="h-8 w-8 text-primary" />
      </div>
      <h3 className="font-playfair text-lg font-semibold mb-1">No parishes yet</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Add the sister parishes of the Saint John Paul II Pastoral Unit.
      </p>
      <Button onClick={onAdd} className="bg-primary hover:bg-primary/90 gap-2">
        <Plus className="h-4 w-4" /> Add First Parish
      </Button>
    </div>
  );
}
