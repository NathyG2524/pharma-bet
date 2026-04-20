"use client";

import { notificationsApi } from "@/lib/api";
import type { NotificationDto } from "@drug-store/shared";
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, cn } from "@drug-store/ui";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const formatTimestamp = (value: string) => new Date(value).toLocaleString();

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await notificationsApi.listNotifications();
      setNotifications(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const markRead = async (id: string) => {
    setError(null);
    try {
      const updated = await notificationsApi.markNotificationRead(id);
      setNotifications((prev) => prev.map((item) => (item.id === id ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark notification as read");
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <p className="text-sm text-gray-500 mt-1">Stay on top of approvals and workflow tasks.</p>
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle>Notification inbox</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-sm text-on_surface_variant">Loading notifications…</div>
          ) : notifications.length ? (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "rounded-lg border px-4 py-3 shadow-sm",
                    notification.isRead
                      ? "bg-surface_container_lowest text-on_surface_variant"
                      : "bg-surface text-on_surface",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold">{notification.title}</div>
                      <div className="text-sm text-on_surface_variant">{notification.body}</div>
                      <div className="text-xs text-on_surface_variant">
                        {formatTimestamp(notification.createdAt)}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {notification.link && (
                        <Link
                          href={notification.link}
                          className="text-xs font-medium text-primary underline"
                        >
                          View
                        </Link>
                      )}
                      {!notification.isRead && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => markRead(notification.id)}
                        >
                          Mark read
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-on_surface_variant">
              No notifications yet. Approval alerts will show up here.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
