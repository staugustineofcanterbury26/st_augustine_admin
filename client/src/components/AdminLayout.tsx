import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

interface AdminLayoutProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export default function AdminLayout({ title, description, children }: AdminLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    // Lock body scroll when mobile drawer is open
    if (isSidebarOpen) document.body.classList.add("overflow-hidden");
    else document.body.classList.remove("overflow-hidden");
    return () => document.body.classList.remove("overflow-hidden");
  }, [isSidebarOpen]);

  // Persist mobile drawer state
  useEffect(() => {
    try {
      const raw = localStorage.getItem("admin:sidebarOpen");
      if (raw !== null) setIsSidebarOpen(raw === "1");
    } catch (e) {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("admin:sidebarOpen", isSidebarOpen ? "1" : "0");
    } catch (e) {}
  }, [isSidebarOpen]);

  // collapsed preference for desktop (icon-only)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("admin:sidebarCollapsed");
      if (raw !== null) setIsCollapsed(raw === "1");
    } catch (e) {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("admin:sidebarCollapsed", isCollapsed ? "1" : "0");
    } catch (e) {}
  }, [isCollapsed]);

  // Close drawer on route change (mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} collapsed={isCollapsed} onToggleCollapse={() => setIsCollapsed((s) => !s)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar title={title} description={description} onOpenSidebar={() => setIsSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
