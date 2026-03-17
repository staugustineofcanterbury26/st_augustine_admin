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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { parishInfoApi, type ParishInfo } from "@/lib/api";
import { Church, MapPin, Phone, Mail, Clock, Globe } from "lucide-react";

const schema = z.object({
  parishName: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  province: z.string().min(1),
  postalCode: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email("Enter a valid email"),
  officeHours: z.string().min(1),
  facebookUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  youtubeUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  instagramUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  missionStatement: z.string().min(1),
  welcomeMessage: z.string().min(1),
});

type ParishInfoForm = z.infer<typeof schema>;

export default function ParishInfo() {
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const form = useForm<ParishInfoForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      parishName: "",
      address: "",
      city: "",
      province: "",
      postalCode: "",
      phone: "",
      email: "",
      officeHours: "",
      facebookUrl: "",
      youtubeUrl: "",
      instagramUrl: "",
      missionStatement: "",
      welcomeMessage: "",
    },
  });

  useEffect(() => {
    parishInfoApi
      .get()
      .then((res) => {
        form.reset({
          parishName: res.data.parishName,
          address: res.data.address,
          city: res.data.city,
          province: res.data.province,
          postalCode: res.data.postalCode,
          phone: res.data.phone,
          email: res.data.email,
          officeHours: res.data.officeHours,
          facebookUrl: res.data.facebookUrl ?? "",
          youtubeUrl: res.data.youtubeUrl ?? "",
          instagramUrl: res.data.instagramUrl ?? "",
          missionStatement: res.data.missionStatement,
          welcomeMessage: res.data.welcomeMessage,
        });
      })
      .catch(() => toast.error("Failed to load parish info"))
      .finally(() => setIsLoading(false));
  }, [form]);

  const onSubmit = async (data: ParishInfoForm) => {
    setSaving(true);
    try {
      await parishInfoApi.update({
        ...data,
        facebookUrl: data.facebookUrl || undefined,
        youtubeUrl: data.youtubeUrl || undefined,
        instagramUrl: data.instagramUrl || undefined,
      });
      toast.success("Parish info saved");
    } catch {
      toast.error("Failed to save — please try again");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Parish Info">
        <div className="space-y-4 max-w-3xl">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Parish Information"
      description="Update core parish details shown throughout the public website."
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-3xl">

        {/* Contact Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Church className="h-4 w-4 text-primary" />
              Church Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Parish Name</Label>
              <Input {...form.register("parishName")} />
              {form.formState.errors.parishName && (
                <p className="text-xs text-destructive">{form.formState.errors.parishName.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Mission Statement</Label>
              <Textarea rows={2} {...form.register("missionStatement")} />
            </div>
            <div className="space-y-1.5">
              <Label>Welcome Message (shown on homepage)</Label>
              <Textarea rows={4} {...form.register("welcomeMessage")} />
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4 text-primary" />
              Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Street Address</Label>
              <Input {...form.register("address")} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label>City</Label>
                <Input {...form.register("city")} />
              </div>
              <div className="space-y-1.5">
                <Label>Province</Label>
                <Input placeholder="ON" {...form.register("province")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Postal Code</Label>
              <Input placeholder="A1A 1A1" {...form.register("postalCode")} className="max-w-xs" />
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Phone className="h-4 w-4 text-primary" />
              Contact & Hours
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input placeholder="+1 (613) 000-0000" {...form.register("phone")} />
                {form.formState.errors.phone && (
                  <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" {...form.register("email")} />
                {form.formState.errors.email && (
                  <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Office Hours</Label>
              <Input placeholder="Mon–Fri 9:00 AM – 4:00 PM" {...form.register("officeHours")} />
            </div>
          </CardContent>
        </Card>

        {/* Social Media */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4 text-primary" />
              Social Media
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Facebook URL</Label>
              <Input placeholder="https://facebook.com/…" {...form.register("facebookUrl")} />
              {form.formState.errors.facebookUrl && (
                <p className="text-xs text-destructive">{form.formState.errors.facebookUrl.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>YouTube URL</Label>
              <Input placeholder="https://youtube.com/…" {...form.register("youtubeUrl")} />
              {form.formState.errors.youtubeUrl && (
                <p className="text-xs text-destructive">{form.formState.errors.youtubeUrl.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Instagram URL</Label>
              <Input placeholder="https://instagram.com/…" {...form.register("instagramUrl")} />
              {form.formState.errors.instagramUrl && (
                <p className="text-xs text-destructive">{form.formState.errors.instagramUrl.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90 px-8">
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </form>
    </AdminLayout>
  );
}
