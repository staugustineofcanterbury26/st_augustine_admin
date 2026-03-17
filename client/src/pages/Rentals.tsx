import { useEffect, useState } from "react";
import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { rentalsApi, type RentalSpace } from "@/lib/api";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  capacity: z.coerce.number().int().positive().optional(),
  pricePerHour: z.coerce.number().nonnegative().optional(),
  pricePerDay: z.coerce.number().nonnegative().optional(),
  amenities: z.array(z.object({ value: z.string() })),
  bookingEmail: z.string().email("Must be a valid email"),
  bookingPhone: z.string().optional(),
  notes: z.string().optional(),
  isAvailable: z.boolean(),
  imageUrls: z.array(z.object({ value: z.string().url("Must be a valid URL") })),
});

type RentalForm = z.infer<typeof schema>;

function formDefault(r?: RentalSpace): RentalForm {
  return {
    name: r?.name ?? "",
    description: r?.description ?? "",
    capacity: r?.capacity,
    pricePerHour: r?.pricePerHour,
    pricePerDay: r?.pricePerDay,
    amenities: r ? r.amenities.map((v) => ({ value: v })) : [],
    bookingEmail: r?.bookingEmail ?? "",
    bookingPhone: r?.bookingPhone ?? "",
    notes: r?.notes ?? "",
    isAvailable: r?.isAvailable ?? true,
    imageUrls: r ? r.imageUrls.map((v) => ({ value: v })) : [],
  };
}

export default function Rentals() {
  const [spaces, setSpaces] = useState<RentalSpace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RentalSpace | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const form = useForm<RentalForm>({ resolver: zodResolver(schema) as Resolver<RentalForm>, defaultValues: formDefault() });
  const amenitiesField = useFieldArray({ control: form.control, name: "amenities" });
  const imagesField = useFieldArray({ control: form.control, name: "imageUrls" });

  const load = () => {
    setIsLoading(true);
    rentalsApi
      .getAll()
      .then((res) => setSpaces(res.data))
      .catch(() => toast.error("Failed to load rental spaces"))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); form.reset(formDefault()); setDialogOpen(true); };
  const openEdit = (r: RentalSpace) => { setEditing(r); form.reset(formDefault(r)); setDialogOpen(true); };

  const onSubmit = async (data: RentalForm) => {
    setSaving(true);
    const payload = {
      ...data,
      amenities: data.amenities.map((a) => a.value).filter(Boolean),
      imageUrls: data.imageUrls.map((i) => i.value).filter(Boolean),
      bookingPhone: data.bookingPhone || undefined,
      notes: data.notes || undefined,
    };
    try {
      if (editing) {
        await rentalsApi.update(editing.id, payload);
        toast.success("Rental space updated");
      } else {
        await rentalsApi.create(payload);
        toast.success("Rental space created");
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
    if (!confirm("Delete this rental space?")) return;
    setDeletingId(id);
    try {
      await rentalsApi.delete(id);
      setSpaces((prev) => prev.filter((s) => s.id !== id));
      toast.success("Deleted");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const toggleAvailable = async (r: RentalSpace) => {
    try {
      await rentalsApi.update(r.id, { isAvailable: !r.isAvailable });
      setSpaces((prev) => prev.map((s) => (s.id === r.id ? { ...s, isAvailable: !s.isAvailable } : s)));
    } catch {
      toast.error("Failed to update");
    }
  };

  return (
    <AdminLayout
      title="Rentals"
      description="Manage parish spaces available for rent."
    >
      <div className="flex justify-end mb-6">
        <Button onClick={openCreate} className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Add Space
        </Button>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : spaces.length === 0 ? (
        <EmptyState onAdd={openCreate} />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {spaces.map((r) => (
            <Card key={r.id} className={r.isAvailable ? "" : "opacity-60"}>
              <CardHeader className="pb-2 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base font-playfair">{r.name}</CardTitle>
                  <div className="flex gap-2 mt-1">
                    <Badge variant={r.isAvailable ? "success" : "secondary"}>
                      {r.isAvailable ? "Available" : "Unavailable"}
                    </Badge>
                    {r.capacity && <Badge variant="outline">{r.capacity} cap.</Badge>}
                  </div>
                </div>
                <Switch checked={r.isAvailable} onCheckedChange={() => void toggleAvailable(r)} />
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2">{r.description}</p>
                <div className="flex gap-4 text-sm font-medium">
                  {r.pricePerHour != null && <span className="text-primary">${r.pricePerHour}/hr</span>}
                  {r.pricePerDay != null && <span className="text-primary">${r.pricePerDay}/day</span>}
                </div>
                {r.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {r.amenities.map((a) => <Badge key={a} variant="secondary" className="text-xs">{a}</Badge>)}
                  </div>
                )}
                <div className="flex justify-end gap-1 pt-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => void handleDelete(r.id)}
                    disabled={deletingId === r.id}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Rental Space" : "New Rental Space"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input placeholder="e.g. Parish Hall" {...form.register("name")} />
              {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={3} {...form.register("description")} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Capacity</Label>
                <Input type="number" min="0" {...form.register("capacity")} />
              </div>
              <div className="space-y-1.5">
                <Label>Price / Hour (CAD)</Label>
                <Input type="number" min="0" step="0.01" {...form.register("pricePerHour")} />
              </div>
              <div className="space-y-1.5">
                <Label>Price / Day (CAD)</Label>
                <Input type="number" min="0" step="0.01" {...form.register("pricePerDay")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Amenities</Label>
              {amenitiesField.fields.map((field, i) => (
                <div key={field.id} className="flex gap-2">
                  <Input placeholder="e.g. Kitchen, AV, Parking…" {...form.register(`amenities.${i}.value`)} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => amenitiesField.remove(i)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => amenitiesField.append({ value: "" })} className="gap-1">
                <Plus className="h-3 w-3" /> Add Amenity
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Booking Email</Label>
                <Input type="email" {...form.register("bookingEmail")} />
                {form.formState.errors.bookingEmail && <p className="text-xs text-destructive">{form.formState.errors.bookingEmail.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Booking Phone</Label>
                <Input type="tel" {...form.register("bookingPhone")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea rows={2} {...form.register("notes")} />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="isAvailable"
                checked={form.watch("isAvailable")}
                onCheckedChange={(v) => form.setValue("isAvailable", v)}
              />
              <Label htmlFor="isAvailable">Available for booking</Label>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90">
                {saving ? "Saving…" : editing ? "Save Changes" : "Create Space"}
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
        <Building2 className="h-8 w-8 text-primary" />
      </div>
      <h3 className="font-playfair text-lg font-semibold mb-1">No rental spaces yet</h3>
      <p className="text-sm text-muted-foreground mb-6">Add parish spaces available for community rental.</p>
      <Button onClick={onAdd} className="bg-primary hover:bg-primary/90 gap-2">
        <Plus className="h-4 w-4" /> Add First Space
      </Button>
    </div>
  );
}
