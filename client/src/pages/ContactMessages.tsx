import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { contactMessagesApi, type ContactMessageRecord } from "@/lib/api";
import {
  Mail,
  Trash2,
  Search,
  Inbox,
  MailOpen,
  Calendar,
  X,
} from "lucide-react";

type ReadFilter = "all" | "unread" | "read";
type DateFilter = "all" | "today" | "week" | "month";

export default function ContactMessages() {
  const [messages, setMessages] = useState<ContactMessageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  const load = useCallback(() => {
    setIsLoading(true);
    contactMessagesApi
      .getAll()
      .then((res) => setMessages(res.data))
      .catch(() => toast.error("Failed to load messages"))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-mark as read when selected
  useEffect(() => {
    if (selectedId) {
      const msg = messages.find((m) => m.id === selectedId);
      if (msg && !msg.isRead) {
        contactMessagesApi.update(selectedId, { isRead: true }).then(() => {
          setMessages((prev) =>
            prev.map((m) => (m.id === selectedId ? { ...m, isRead: true } : m))
          );
        });
      }
    }
  }, [selectedId, messages]);

  const toggleRead = async (id: number, isRead: boolean) => {
    try {
      await contactMessagesApi.update(id, { isRead: !isRead });
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, isRead: !isRead } : m))
      );
    } catch {
      toast.error("Failed to update message");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this message permanently?")) return;
    setDeletingId(id);
    try {
      await contactMessagesApi.delete(id);
      setMessages((prev) => prev.filter((m) => m.id !== id));
      if (selectedId === id) setSelectedId(null);
      toast.success("Message deleted");
    } catch {
      toast.error("Failed to delete message");
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered messages
  const filtered = useMemo(() => {
    let result = [...messages];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (m) =>
          m.subject.toLowerCase().includes(term) ||
          m.name.toLowerCase().includes(term) ||
          m.email.toLowerCase().includes(term)
      );
    }

    // Read status filter
    if (readFilter === "unread") {
      result = result.filter((m) => !m.isRead);
    } else if (readFilter === "read") {
      result = result.filter((m) => m.isRead);
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      let startDate: Date;
      if (dateFilter === "today") {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (dateFilter === "week") {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      result = result.filter((m) => new Date(m.createdAt) >= startDate);
    }

    // Sort newest first
    result.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return result;
  }, [messages, searchTerm, readFilter, dateFilter]);

  const selectedMessage = useMemo(
    () => messages.find((m) => m.id === selectedId) ?? null,
    [messages, selectedId]
  );

  const unreadCount = messages.filter((m) => !m.isRead).length;

  return (
    <AdminLayout
      title="Contact Messages"
      description="View and manage messages submitted through the contact form."
    >
      <div className="flex h-[calc(100vh-180px)] border rounded-lg overflow-hidden bg-background">
        {/* Left Pane - Message List */}
        <div className="w-[380px] flex-shrink-0 border-r flex flex-col">
          {/* Filters Header */}
          <div className="p-3 border-b space-y-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Quick Filters Row */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Read Status */}
              <FilterPill
                active={readFilter === "all"}
                onClick={() => setReadFilter("all")}
                label={`All (${messages.length})`}
              />
              <FilterPill
                active={readFilter === "unread"}
                onClick={() => setReadFilter("unread")}
                label={`Unread (${unreadCount})`}
              />
              <FilterPill
                active={readFilter === "read"}
                onClick={() => setReadFilter("read")}
                label={`Read (${messages.length - unreadCount})`}
              />

              <Separator orientation="vertical" className="h-5 mx-1" />

              {/* Date Filters */}
              <FilterPill
                active={dateFilter === "today"}
                onClick={() =>
                  setDateFilter(dateFilter === "today" ? "all" : "today")
                }
                icon={<Calendar className="h-3 w-3" />}
                label="Today"
              />
              <FilterPill
                active={dateFilter === "week"}
                onClick={() =>
                  setDateFilter(dateFilter === "week" ? "all" : "week")
                }
                icon={<Calendar className="h-3 w-3" />}
                label="7d"
              />
              <FilterPill
                active={dateFilter === "month"}
                onClick={() =>
                  setDateFilter(dateFilter === "month" ? "all" : "month")
                }
                icon={<Calendar className="h-3 w-3" />}
                label="30d"
              />
            </div>
          </div>

          {/* Message List */}
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-md" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <Inbox className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {searchTerm || readFilter !== "all" || dateFilter !== "all"
                    ? "No messages match your filters"
                    : "No messages yet"}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedId(m.id)}
                    className={`w-full text-left p-3 hover:bg-muted/50 transition-colors ${
                      selectedId === m.id
                        ? "bg-primary/5 border-l-2 border-l-primary"
                        : ""
                    } ${m.isRead ? "opacity-70" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          {!m.isRead && (
                            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                          )}
                          <span
                            className={`text-sm truncate ${
                              m.isRead
                                ? "font-normal text-muted-foreground"
                                : "font-semibold text-foreground"
                            }`}
                          >
                            {m.name}
                          </span>
                        </div>
                        <p
                          className={`text-sm truncate ${
                            m.isRead
                              ? "text-muted-foreground"
                              : "font-medium text-foreground"
                          }`}
                        >
                          {m.subject}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {m.message.slice(0, 60)}
                          {m.message.length > 60 ? "…" : ""}
                        </p>
                      </div>
                      <time className="text-[11px] text-muted-foreground flex-shrink-0 pt-0.5">
                        {formatDate(m.createdAt)}
                      </time>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* List Footer */}
          <div className="border-t px-3 py-2">
            <p className="text-xs text-muted-foreground">
              {filtered.length} of {messages.length} messages
            </p>
          </div>
        </div>

        {/* Right Pane - Message Detail */}
        <div className="flex-1 flex flex-col">
          {selectedMessage ? (
            <>
              {/* Detail Header */}
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base">
                      {selectedMessage.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {new Date(selectedMessage.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      toggleRead(selectedMessage.id, selectedMessage.isRead)
                    }
                  >
                    {selectedMessage.isRead ? (
                      <>
                        <Mail className="h-4 w-4 mr-1.5" />
                        Mark Unread
                      </>
                    ) : (
                      <>
                        <MailOpen className="h-4 w-4 mr-1.5" />
                        Mark Read
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(selectedMessage.id)}
                    disabled={deletingId === selectedMessage.id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Detail Content */}
              <ScrollArea className="flex-1 p-6">
                <div className="max-w-2xl">
                  {/* Subject */}
                  <h2 className="text-xl font-semibold mb-4">
                    {selectedMessage.subject}
                  </h2>

                  {/* Contact Info */}
                  <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-muted-foreground">
                    <a
                      href={`mailto:${encodeURIComponent(selectedMessage.email)}`}
                      className="hover:text-primary inline-flex items-center gap-1.5"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      {selectedMessage.email}
                    </a>
                    {selectedMessage.phone && (
                      <a
                        href={`tel:${encodeURIComponent(selectedMessage.phone)}`}
                        className="hover:text-primary inline-flex items-center gap-1.5"
                      >
                        📞 {selectedMessage.phone}
                      </a>
                    )}
                  </div>

                  <Separator className="mb-6" />

                  {/* Message Body */}
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap text-foreground leading-relaxed">
                      {selectedMessage.message}
                    </p>
                  </div>

                  {/* Quick Reply */}
                  <div className="mt-8 pt-6 border-t">
                    <a
                      href={`mailto:${encodeURIComponent(selectedMessage.email)}?subject=Re: ${encodeURIComponent(selectedMessage.subject)}`}
                      className="inline-flex"
                    >
                      <Button variant="outline" size="sm">
                        <Mail className="h-4 w-4 mr-2" />
                        Reply via Email
                      </Button>
                    </a>
                  </div>
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <Inbox className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className="font-medium text-muted-foreground mb-1">
                Select a message
              </h3>
              <p className="text-sm text-muted-foreground/70">
                Choose a message from the list to view its contents
              </p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

// ── Helper Components ─────────────────────────────────────────────────────────

function FilterPill({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return d.toLocaleDateString([], { weekday: "short" });
  } else {
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }
}
