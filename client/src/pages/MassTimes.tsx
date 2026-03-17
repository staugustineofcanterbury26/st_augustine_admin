import { useEffect, useState } from "react";
import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { massTimesApi, type MassTime } from "@/lib/api";
import { Plus, Pencil, Trash2, GripVertical, Clock } from "lucide-react";

const massTimeSchema = z.object({
  day: z.string().min(1, "Day is required"),
  times: z.array(z.object({ value: z.string().min(1, "Time is required") })).min(1, "At least one time needed"),
  location: z.string().min(1, "Location is required"),
  language: z.string().min(1, "Language is required"),
  notes: z.string().optional(),
  isActive: z.boolean(),
  sortOrder: z.coerce.number().int().min(0),
});

type MassTimeForm = z.infer<typeof massTimeSchema>;

function formDefault(mt?: MassTime): MassTimeForm {
  return {
    day: mt?.day ?? "",
    times: mt ? mt.times.map((v) => ({ value: v })) : [{ value: "" }],
    location: mt?.location ?? "Main Sanctuary",
    language: mt?.language ?? "English",
    notes: mt?.notes ?? "",
    isActive: mt?.isActive ?? true,
    sortOrder: mt?.sortOrder ?? 0,
  };
}

export default function MassTimes() {
  const [massTimes, setMassTimes] = useState<MassTime[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MassTime | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const form = useForm<MassTimeForm>({
    resolver: zodResolver(massTimeSchema) as Resolver<MassTimeForm>,
    defaultValues: formDefault(),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "times",
  });

  const load = () => {
    setIsLoading(true);
    massTimesApi
      .getAll()
      .then((res) => setMassTimes(res.data))
      .catch(() => toast.error("Failed to load mass times"))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    form.reset(formDefault());
    setDialogOpen(true);
  };

  const openEdit = (mt: MassTime) => {
    setEditing(mt);
    form.reset(formDefault(mt));
    setDialogOpen(true);
  };

  const onSubmit = async (data: MassTimeForm) => {
    setSaving(true);
    const payload = { ...data, times: data.times.map((t) => t.value) };
    try {
      if (editing) {
        await massTimesApi.update(editing.id, payload);
        toast.success("Mass time updated");
      } else {
        await massTimesApi.create(payload);
        toast.success("Mass time added");
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
    if (!confirm("Delete this mass time schedule?")) return;
    setDeletingId(id);
    try {
      await massTimesApi.delete(id);
      toast.success("Deleted");
      setMassTimes((prev) => prev.filter((m) => m.id !== id));
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const toggleActive = async (mt: MassTime) => {
    try {
      await massTimesApi.update(mt.id, { isActive: !mt.isActive });
      setMassTimes((prev) =>
        prev.map((m) => (m.id === mt.id ? { ...m, isActive: !m.isActive } : m))
      );
    } catch {
      toast.error("Failed to update");
    }
  };

  return (
    <AdminLayout
      title="Mass Times"
      description="Manage the weekly Mass schedule displayed on the public site."
    >
      <div className="flex justify-end mb-6">
        <Button onClick={openCreate} className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Add Schedule
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : massTimes.length === 0 ? (
        <EmptyState onAdd={openCreate} />
      ) : (
        <div className="space-y-3">
          {massTimes
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((mt) => (
              <Card
                key={mt.id}
                className={`transition-opacity ${mt.isActive ? "" : "opacity-60"}`}
              >
                <CardContent className="flex items-center gap-4 p-5">
                  <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0 cursor-grab" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold font-playfair text-base">{mt.day}</h3>
                      <Badge variant={mt.isActive ? "success" : "secondary"}>
                        {mt.isActive ? "Active" : "Hidden"}
                      </Badge>
                      {mt.language !== "English" && (
                        <Badge variant="outline">{mt.language}</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mb-1">
                      {mt.times.map((t, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 text-sm text-muted-foreground"
                        >
                          <Clock className="h-3 w-3" />
                          {t}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">{mt.location}</p>
                    {mt.notes && (
                      <p className="text-xs text-muted-foreground italic mt-1">{mt.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Switch
                      checked={mt.isActive}
                      onCheckedChange={() => void toggleActive(mt)}
                      aria-label="Toggle visibility"
                    />
                    <Button variant="ghost" size="icon" onClick={() => openEdit(mt)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => void handleDelete(mt.id)}
                      disabled={deletingId === mt.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Mass Schedule" : "New Mass Schedule"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Day / Period</Label>
                <Input placeholder="e.g. Sunday" {...form.register("day")} />
                {form.formState.errors.day && (
                  <p className="text-xs text-destructive">{form.formState.errors.day.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Language</Label>
                <Input placeholder="English" {...form.register("language")} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input placeholder="Main Sanctuary" {...form.register("location")} />
            </div>

            <div className="space-y-2">
              <Label>Service Times</Label>
              {fields.map((field, i) => (
                <div key={field.id} className="flex gap-2">
                  <Input
                    placeholder="e.g. 9:00 AM"
                    {...form.register(`times.${i}.value`)}
                  />
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(i)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ value: "" })}
                className="gap-1"
              >
                <Plus className="h-3 w-3" /> Add Time
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Input placeholder="e.g. Confession available before Mass" {...form.register("notes")} />
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
                {saving ? "Saving…" : editing ? "Save Changes" : "Add Schedule"}
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
        <Clock className="h-8 w-8 text-primary" />
      </div>
      <h3 className="font-playfair text-lg font-semibold mb-1">No mass times yet</h3>
      <p className="text-sm text-muted-foreground mb-6">Add the weekly schedule to display it on the public site.</p>
      <Button onClick={onAdd} className="bg-primary hover:bg-primary/90 gap-2">
        <Plus className="h-4 w-4" /> Add First Schedule
      </Button>
    </div>
  );
}
