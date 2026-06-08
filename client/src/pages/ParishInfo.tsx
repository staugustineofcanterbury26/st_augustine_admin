import { useEffect, useState } from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { parishInfoApi, type ParishInfo } from "@/lib/api";
import { Church, MapPin, Phone, Mail, Clock, Globe, Heart } from "lucide-react";

const schema = z.object({
  parishName: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  province: z.string().min(1),
  postalCode: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email("Enter a valid email"),
  officeHours: z.string().min(1),
  facebookUrl: z.union([z.literal(""), z.string().url()]).nullish().transform(val => (val && val.length > 0 ? val : null)),
  youtubeUrl: z.union([z.literal(""), z.string().url()]).nullish().transform(val => (val && val.length > 0 ? val : null)),
  instagramUrl: z.union([z.literal(""), z.string().url()]).nullish().transform(val => (val && val.length > 0 ? val : null)),
  donationUrl: z.union([z.literal(""), z.string().url()]).nullish().transform(val => (val && val.length > 0 ? val : null)),
  donationButtonText: z.string().min(1).max(50),
  donationOpenNewTab: z.boolean(),
  missionStatement: z.string().min(1),
  welcomeMessage: z.string().min(1),
  missionTagline: z.string().min(1),
  missionDescription: z.string().min(1),
});

type ParishInfoForm = z.infer<typeof schema>;

export default function ParishInfo() {
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const form = useForm<ParishInfoForm>({
    resolver: zodResolver(schema) as Resolver<ParishInfoForm>,
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
      donationUrl: "",
      donationButtonText: "Donate Now",
      donationOpenNewTab: true,
      missionStatement: "",
      welcomeMessage: "",
      missionTagline: "",
      missionDescription: "",
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
          donationUrl: res.data.donationUrl ?? "",
          donationButtonText: res.data.donationButtonText,
          donationOpenNewTab: res.data.donationOpenNewTab,
          missionStatement: res.data.missionStatement,
          welcomeMessage: res.data.welcomeMessage,
          missionTagline: res.data.missionTagline,
          missionDescription: res.data.missionDescription,
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
        donationUrl: data.donationUrl || undefined,
        donationButtonText: data.donationButtonText,
        donationOpenNewTab: data.donationOpenNewTab,
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

        {/* Church Details & Mission */}
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
              <Label>Mission Statement (brief statement)</Label>
              <Textarea rows={2} {...form.register("missionStatement")} />
            </div>
            <div className="space-y-1.5">
              <Label>Welcome Message (shown on homepage hero)</Label>
              <Textarea rows={2} {...form.register("welcomeMessage")} />
            </div>
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Mission Section (Footer) ✨</h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Mission Tagline</Label>
                  <p className="text-xs text-muted-foreground mb-2">Main tagline shown in italics</p>
                  <Textarea rows={1} placeholder="To do the work of Jesus Christ our Saviour." {...form.register("missionTagline")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Mission Description</Label>
                  <p className="text-xs text-muted-foreground mb-2">Longer description paragraph</p>
                  <Textarea rows={4} placeholder="In all that we do, we strive to embody the love..." {...form.register("missionDescription")} />
                </div>
              </div>
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

        {/* Donation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Heart className="h-4 w-4 text-primary" />
              Donation Button
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Donation URL</Label>
              <p className="text-xs text-muted-foreground">The destination link for the donation button in the navigation bar. Leave empty to hide the button.</p>
              <Input placeholder="https://example.com/donate" {...form.register("donationUrl")} />
              {form.formState.errors.donationUrl && (
                <p className="text-xs text-destructive">{form.formState.errors.donationUrl.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Button Text</Label>
              <Input placeholder="Donate Now" {...form.register("donationButtonText")} />
              {form.formState.errors.donationButtonText && (
                <p className="text-xs text-destructive">{form.formState.errors.donationButtonText.message}</p>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Open in new tab</Label>
                <p className="text-xs text-muted-foreground">When enabled, the link opens in a new browser tab.</p>
              </div>
              <Controller
                control={form.control}
                name="donationOpenNewTab"
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
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
