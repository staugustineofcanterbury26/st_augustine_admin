import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { contactMessagesApi, ContactMessageRecord } from "@/lib/api";
import { toast } from "sonner";

export default function ContactMessages() {
  const [messages, setMessages] = useState<ContactMessageRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await contactMessagesApi.getAll();
      setMessages(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleRead = async (id: number, isRead: boolean) => {
    try {
      await contactMessagesApi.update(id, { isRead: !isRead });
      setMessages((m) => m.map((it) => (it.id === id ? { ...it, isRead: !isRead } : it)));
    } catch (err) {
      console.error(err);
      toast.error("Failed to update message");
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this message?")) return;
    try {
      await contactMessagesApi.delete(id);
      setMessages((m) => m.filter((it) => it.id !== id));
      toast.success("Deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Contact Messages</h1>
      {loading ? (
        <p>Loading…</p>
      ) : messages.length === 0 ? (
        <p>No messages yet.</p>
      ) : (
        <div className="space-y-4">
          {messages.map((m) => (
            <div key={m.id} className={`p-4 border rounded ${m.isRead ? "bg-gray-50" : "bg-white"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-gray-600">{new Date(m.createdAt).toLocaleString()}</div>
                  <div className="font-medium text-lg">{m.name} — {m.subject}</div>
                  <div className="text-sm text-gray-700">{m.email} {m.phone ? ` • ${m.phone}` : ""}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => toggleRead(m.id, m.isRead)}>
                    {m.isRead ? "Mark Unread" : "Mark Read"}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => remove(m.id)}>Delete</Button>
                </div>
              </div>
              <div className="mt-3 whitespace-pre-wrap text-sm text-gray-800">{m.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
