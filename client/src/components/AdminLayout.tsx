import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

interface AdminLayoutProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export default function AdminLayout({ title, description, children }: AdminLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar title={title} description={description} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
