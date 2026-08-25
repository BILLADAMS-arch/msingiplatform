"use client";
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";

type Notification = { id: string; type: string; payload: Record<string, unknown>; readAt: string | null; createdAt: string };

function describe(n: Notification): { icon: string; text: string } {
  switch (n.type) {
    case "achievement": return { icon: String(n.payload.icon ?? "🏆"), text: `Achievement unlocked: ${n.payload.label}` };
    case "streak_milestone": return { icon: "🔥", text: `${n.payload.days}-day streak! Keep it up.` };
    case "assignment": return { icon: "📋", text: `New assignment: ${n.payload.testTitle}${n.payload.dueAt ? ` (due ${new Date(n.payload.dueAt as string).toLocaleDateString()})` : ""}` };
    case "test_result": return { icon: "✅", text: `Test result: ${n.payload.score}%` };
    default: return { icon: "🔔", text: "New notification" };
  }
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const load = () => fetch("/api/notifications").then((r) => r.json()).then((d) => { setNotifications(d.notifications); setUnreadCount(d.unreadCount); });
  useEffect(() => { load(); }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    load();
  }
  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    load();
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="tap relative w-8 h-8 rounded-full flex items-center justify-center border" style={{ borderColor: "var(--slate)" }} title="Notifications">
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center" style={{ background: "var(--coral)" }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white rounded-2xl border shadow-lg z-30" style={{ borderColor: "var(--slate)" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--stone-2)" }}>
            <span className="font-semibold text-sm">Notifications</span>
            {unreadCount > 0 && <button onClick={markAllRead} className="text-xs font-semibold text-[--primary]">Mark all read</button>}
          </div>
          {!notifications || notifications.length === 0 ? (
            <p className="text-sm text-[--ink-soft] px-4 py-6 text-center">Nothing yet.</p>
          ) : (
            notifications.map((n) => {
              const { icon, text } = describe(n);
              return (
                <button key={n.id} onClick={() => !n.readAt && markRead(n.id)} className="tap w-full text-left flex items-start gap-2 px-4 py-3 border-b last:border-0" style={{ borderColor: "var(--stone-2)", background: n.readAt ? "white" : "var(--primary-soft)" }}>
                  <span>{icon}</span>
                  <span className="text-xs">{text}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
