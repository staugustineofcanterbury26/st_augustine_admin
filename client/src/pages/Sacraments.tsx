import { useEffect, useState } from "react";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { sacramentsApi, type SacramentContent } from "@/lib/api";
import { BookOpen, ChevronDown, ChevronUp } from "lucide-react";

export default function Sacraments() {
  const [sacraments, setSacraments] = useState<SacramentContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [saving, setSaving] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, Partial<SacramentContent>>>({});

  useEffect(() => {
    sacramentsApi
      .getAll()
      .then((res) => setSacraments(res.data))
      .catch(() => toast.error("Failed to load sacraments"))
      .finally(() => setIsLoading(false));
  }, []);

  const getDraft = (s: SacramentContent): SacramentContent => ({
    ...s,
    ...drafts[s.id],
  });

  const setField = (id: number, field: keyof SacramentContent, value: string | boolean) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const save = async (sacrament: SacramentContent) => {
    const draft = drafts[sacrament.id];
    if (!draft || Object.keys(draft).length === 0) return;
    setSaving(sacrament.id);
    try {
      const res = await sacramentsApi.update(sacrament.id, draft);
      setSacraments((prev) => prev.map((s) => (s.id === sacrament.id ? res.data : s)));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[sacrament.id];
        return next;
      });
      toast.success(`${sacrament.name} updated`);
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(null);
    }
  };

  return (
    <AdminLayout
      title="Sacraments"
      description="Edit descriptions and requirements for each sacrament."
    >
      {isLoading ? (
        <div className="space-y-3 max-w-3xl">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-3 max-w-3xl">
          {sacraments.map((s) => {
            const d = getDraft(s);
            const isOpen = expanded === s.id;
            const isDirty = !!drafts[s.id] && Object.keys(drafts[s.id]).length > 0;

            return (
              <Card key={s.id} className={isDirty ? "border-primary/40" : ""}>
                <CardHeader
                  className="cursor-pointer flex flex-row items-center justify-between py-4"
                  onClick={() => setExpanded(isOpen ? null : s.id)}
                >
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base font-playfair font-semibold">{s.name}</CardTitle>
                    {isDirty && (
                      <span className="text-xs text-primary font-medium">• Unsaved changes</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={d.isActive}
                      onCheckedChange={(v) => setField(s.id, "isActive", v)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </CardHeader>

                {isOpen && (
                  <CardContent className="pt-0 space-y-4">
                    <div className="space-y-1.5">
                      <Label>Description</Label>
                      <Textarea
                        rows={4}
                        value={d.description}
                        onChange={(e) => setField(s.id, "description", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Requirements (optional)</Label>
                      <Textarea
                        rows={3}
                        placeholder="What attendees need to prepare or bring…"
                        value={d.requirements ?? ""}
                        onChange={(e) => setField(s.id, "requirements", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Process / Steps (optional)</Label>
                      <Textarea
                        rows={3}
                        placeholder="Steps to register or participate…"
                        value={d.process ?? ""}
                        onChange={(e) => setField(s.id, "process", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Contact Info (optional)</Label>
                      <Input
                        placeholder="e.g. Contact the parish office at …"
                        value={d.contactInfo ?? ""}
                        onChange={(e) => setField(s.id, "contactInfo", e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        onClick={() => void save(s)}
                        disabled={saving === s.id || !isDirty}
                        className="bg-primary hover:bg-primary/90"
                      >
                        {saving === s.id ? "Saving…" : "Save Changes"}
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}
