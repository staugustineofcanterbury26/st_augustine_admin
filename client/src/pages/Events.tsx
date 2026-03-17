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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { eventsApi, type Event } from "@/lib/api";
import { Plus, Pencil, Trash2, Calendar, CalendarDays } from "lucide-react";
import { formatDate } from "@/lib/utils";

const CATEGORIES = ["Mass", "Prayer", "Community", "Learning", "Sacraments", "Special", "Youth", "Other"];

const eventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  date: z.string().min(1, "Date is required"),
  endDate: z.string().optional(),
  time: z.string().min(1, "Time is required"),
  location: z.string().min(1, "Location is required"),
  category: z.string().min(1, "Category is required"),
  imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  isRecurring: z.boolean(),
  recurringPattern: z.string().optional(),
  isPublished: z.boolean(),
});

type EventForm = z.infer<typeof eventSchema>;

function formDefault(event?: Event): EventForm {
  return {
    title: event?.title ?? "",
    description: event?.description ?? "",
    date: event?.date ?? "",
    endDate: event?.endDate ?? "",
    time: event?.time ?? "",
    location: event?.location ?? "",
    category: event?.category ?? "Mass",
    imageUrl: event?.imageUrl ?? "",
    isRecurring: event?.isRecurring ?? false,
    recurringPattern: event?.recurringPattern ?? "",
    isPublished: event?.isPublished ?? true,
  };
}

const categoryColor: Record<string, string> = {
  Mass: "bg-orange-100 text-orange-700",
  Prayer: "bg-blue-100 text-blue-700",
  Community: "bg-green-100 text-green-700",
  Learning: "bg-purple-100 text-purple-700",
  Sacraments: "bg-yellow-100 text-yellow-700",
  Special: "bg-pink-100 text-pink-700",
  Youth: "bg-cyan-100 text-cyan-700",
  Other: "bg-gray-100 text-gray-700",
};

export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const form = useForm<EventForm>({
    resolver: zodResolver(eventSchema),
    defaultValues: formDefault(),
  });

  const load = () => {
    setIsLoading(true);
    eventsApi
      .getAll()
      .then((res) => setEvents(res.data))
      .catch(() => toast.error("Failed to load events"))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = events.filter((e) => {
    if (filter === "published") return e.isPublished;
    if (filter === "draft") return !e.isPublished;
    return true;
  });

  const openCreate = () => {
    setEditing(null);
    form.reset(formDefault());
    setDialogOpen(true);
  };

  const openEdit = (event: Event) => {
    setEditing(event);
    form.reset(formDefault(event));
    setDialogOpen(true);
  };

  const onSubmit = async (data: EventForm) => {
    setSaving(true);
    const payload = { ...data, imageUrl: data.imageUrl || undefined, endDate: data.endDate || undefined };
    try {
      if (editing) {
        await eventsApi.update(editing.id, payload);
        toast.success("Event updated");
      } else {
        await eventsApi.create(payload);
        toast.success("Event created");
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
    if (!confirm("Delete this event permanently?")) return;
    setDeletingId(id);
    try {
      await eventsApi.delete(id);
      toast.success("Event deleted");
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const togglePublished = async (event: Event) => {
    try {
      await eventsApi.update(event.id, { isPublished: !event.isPublished });
      setEvents((prev) =>
        prev.map((e) => (e.id === event.id ? { ...e, isPublished: !e.isPublished } : e))
      );
    } catch {
      toast.error("Failed to update");
    }
  };

  return (
    <AdminLayout
      title="Events"
      description="Create and manage parish events and activities."
    >
      <div className="flex items-center justify-between mb-6">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList>
            <TabsTrigger value="all">All ({events.length})</TabsTrigger>
            <TabsTrigger value="published">Published ({events.filter((e) => e.isPublished).length})</TabsTrigger>
            <TabsTrigger value="draft">Drafts ({events.filter((e) => !e.isPublished).length})</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button onClick={openCreate} className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Add Event
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState onAdd={openCreate} />
      ) : (
        <div className="grid gap-3">
          {filtered.map((event) => (
            <Card key={event.id} className={event.isPublished ? "" : "opacity-70 border-dashed"}>
              <CardContent className="flex items-start gap-4 p-5">
                <div className={`mt-1 rounded-lg px-2.5 py-1 text-xs font-semibold flex-shrink-0 ${categoryColor[event.category] ?? "bg-gray-100 text-gray-700"}`}>
                  {event.category}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold font-playfair">{event.title}</h3>
                    {!event.isPublished && <Badge variant="warning">Draft</Badge>}
                    {event.isRecurring && <Badge variant="outline">Recurring</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1 mb-2">{event.description}</p>
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {event.isRecurring ? event.date : formatDate(event.date)}
                    </span>
                    <span>{event.time}</span>
                    <span>{event.location}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Switch
                    checked={event.isPublished}
                    onCheckedChange={() => void togglePublished(event)}
                    aria-label="Toggle published"
                  />
                  <Button variant="ghost" size="icon" onClick={() => openEdit(event)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => void handleDelete(event.id)}
                    disabled={deletingId === event.id}
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
            <DialogTitle>{editing ? "Edit Event" : "New Event"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input placeholder="e.g. Youth Group Meeting" {...form.register("title")} />
              {form.formState.errors.title && (
                <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={3} placeholder="Brief description of the event…" {...form.register("description")} />
              {form.formState.errors.description && (
                <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" {...form.register("date")} />
                {form.formState.errors.date && (
                  <p className="text-xs text-destructive">{form.formState.errors.date.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>End Date (optional)</Label>
                <Input type="date" {...form.register("endDate")} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Time</Label>
                <Input placeholder="e.g. 7:00 PM" {...form.register("time")} />
                {form.formState.errors.time && (
                  <p className="text-xs text-destructive">{form.formState.errors.time.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Location</Label>
                <Input placeholder="e.g. Parish Hall" {...form.register("location")} />
                {form.formState.errors.location && (
                  <p className="text-xs text-destructive">{form.formState.errors.location.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={form.watch("category")}
                onValueChange={(v) => form.setValue("category", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Image URL (optional)</Label>
              <Input placeholder="https://…" {...form.register("imageUrl")} />
              {form.formState.errors.imageUrl && (
                <p className="text-xs text-destructive">{form.formState.errors.imageUrl.message}</p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Switch
                  id="isRecurring"
                  checked={form.watch("isRecurring")}
                  onCheckedChange={(v) => form.setValue("isRecurring", v)}
                />
                <Label htmlFor="isRecurring">Recurring event</Label>
              </div>
              {form.watch("isRecurring") && (
                <Input
                  placeholder="e.g. Every Sunday, Weekly on Fridays…"
                  {...form.register("recurringPattern")}
                />
              )}
              <div className="flex items-center gap-3">
                <Switch
                  id="isPublished"
                  checked={form.watch("isPublished")}
                  onCheckedChange={(v) => form.setValue("isPublished", v)}
                />
                <Label htmlFor="isPublished">Publish to public site</Label>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90">
                {saving ? "Saving…" : editing ? "Save Changes" : "Create Event"}
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
        <CalendarDays className="h-8 w-8 text-primary" />
      </div>
      <h3 className="font-playfair text-lg font-semibold mb-1">No events yet</h3>
      <p className="text-sm text-muted-foreground mb-6">Add parish events to display them on the public site.</p>
      <Button onClick={onAdd} className="bg-primary hover:bg-primary/90 gap-2">
        <Plus className="h-4 w-4" /> Add First Event
      </Button>
    </div>
  );
}
