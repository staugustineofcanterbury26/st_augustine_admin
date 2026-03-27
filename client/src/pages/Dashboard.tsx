import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { dashboardApi, type DashboardStats, contactMessagesApi, type ContactMessagesStats } from "@/lib/api";
import {
  CalendarDays,
  Images,
  FileText,
  Clock,
  TrendingUp,
  AlertCircle,
  Mail,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { Link } from "wouter";

const quickLinks = [
  { href: "/events", label: "Add Event", icon: CalendarDays, color: "text-blue-600 bg-blue-50" },
  { href: "/gallery", label: "Upload Photos", icon: Images, color: "text-purple-600 bg-purple-50" },
  { href: "/bulletins", label: "Upload Bulletin", icon: FileText, color: "text-green-600 bg-green-50" },
  { href: "/mass-times", label: "Edit Mass Times", icon: Clock, color: "text-orange-600 bg-orange-50" },
];

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [msgStats, setMsgStats] = useState<ContactMessagesStats | null>(null);

  useEffect(() => {
    Promise.all([dashboardApi.getStats(), contactMessagesApi.getStats()])
      .then(([dRes, mRes]) => {
        setStats(dRes.data);
        setMsgStats(mRes.data);
      })
      .catch(() => setError(true))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <AdminLayout
      title="Dashboard"
      description="Welcome back — here's a snapshot of your parish content."
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))
          : error
          ? (
            <div className="col-span-4 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              Could not load stats — backend may be offline.
            </div>
          )
          : (
            <>
              <StatCard
                title="Total Events"
                value={stats?.totalEvents ?? 0}
                sub={`${stats?.upcomingEvents ?? 0} upcoming`}
                icon={<CalendarDays className="h-5 w-5 text-blue-600" />}
                iconBg="bg-blue-50"
              />
              <StatCard
                title="Gallery Images"
                value={stats?.totalGalleryImages ?? 0}
                sub="across all albums"
                icon={<Images className="h-5 w-5 text-purple-600" />}
                iconBg="bg-purple-50"
              />
              <StatCard
                title="Bulletins"
                value={stats?.totalBulletins ?? 0}
                sub="archived PDFs"
                icon={<FileText className="h-5 w-5 text-green-600" />}
                iconBg="bg-green-50"
              />
              <StatCard
                title="Unread Messages"
                value={msgStats?.unread ?? 0}
                sub={`${msgStats?.total ?? 0} total`}
                icon={<Mail className="h-5 w-5 text-rose-600" />}
                iconBg="bg-rose-50"
              />
              <StatCard
                title="Last Updated"
                value="—"
                sub={stats?.lastUpdated ? formatDateTime(stats.lastUpdated) : "No activity yet"}
                icon={<TrendingUp className="h-5 w-5 text-orange-600" />}
                iconBg="bg-orange-50"
              />
            </>
          )}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-base font-semibold text-foreground mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 border-border">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className={`rounded-lg p-2 ${link.color}`}>
                    <link.icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium">{link.label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Welcome banner */}
      <Card className="border-primary/20 bg-gradient-to-r from-orange-50 to-orange-100/50">
        <CardContent className="flex items-start gap-4 p-6">
          <div className="rounded-full h-10 w-10 flex items-center justify-center bg-primary/10 flex-shrink-0">
            <span className="text-primary text-lg">✝</span>
          </div>
          <div>
            <p className="font-playfair text-lg font-semibold text-foreground mb-1">
              St. Augustine of Canterbury Parish
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Use this admin portal to manage all content on the public parish website — mass times, events, gallery, bulletins, and more. Changes made here are immediately reflected on the live site once saved.
            </p>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}

interface StatCardProps {
  title: string;
  value: number | string;
  sub: string;
  icon: React.ReactNode;
  iconBg: string;
}

function StatCard({ title, value, sub, icon, iconBg }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`rounded-lg p-1.5 ${iconBg}`}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground mb-1">{value}</div>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}
