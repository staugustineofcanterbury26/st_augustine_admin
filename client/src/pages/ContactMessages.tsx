import { useEffect, useState } from "react";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { contactMessagesApi, type ContactMessageRecord } from "@/lib/api";
import { Mail, Trash2, MessageCircle } from "lucide-react";

export default function ContactMessages() {
  const [messages, setMessages] = useState<ContactMessageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = () => {
    setIsLoading(true);
    contactMessagesApi
      .getAll()
      .then((res) => setMessages(res.data))
      .catch(() => toast.error("Failed to load messages"))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { load(); }, []);

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
      toast.success("Message deleted");
    } catch {
      toast.error("Failed to delete message");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AdminLayout
      title="Contact Messages"
      description="View and manage messages submitted through the contact form."
    >
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">{messages.length} messages total</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : messages.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {messages
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((m) => (
              <Card key={m.id} className={m.isRead ? "opacity-60" : ""}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-base truncate">{m.name}</h3>
                        <Badge variant={m.isRead ? "secondary" : "default"}>
                          {m.isRead ? "Read" : "Unread"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <Mail className="h-3 w-3" />
                        <a href={`mailto:${m.email}`} className="hover:underline">{m.email}</a>
                        {m.phone && (
                          <>
                            <span>•</span>
                            <a href={`tel:${m.phone}`} className="hover:underline">{m.phone}</a>
                          </>
                        )}
                        <span>•</span>
                        <time>{new Date(m.createdAt).toLocaleString()}</time>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-medium mb-2">
                        <MessageCircle className="h-4 w-4 text-primary" />
                        {m.subject}
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{m.message}</p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleRead(m.id, m.isRead)}
                      >
                        {m.isRead ? "Mark Unread" : "Mark Read"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(m.id)}
                        disabled={deletingId === m.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </AdminLayout>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-16 w-16 rounded-full bg-orange-50 flex items-center justify-center mb-4">
        <Mail className="h-8 w-8 text-primary" />
      </div>
      <h3 className="font-playfair text-lg font-semibold mb-1">No messages yet</h3>
      <p className="text-sm text-muted-foreground">Messages from the contact form will appear here.</p>
    </div>
  );
}
