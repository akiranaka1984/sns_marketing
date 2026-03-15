import { useState } from "react";
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  Info,
  Zap,
  Trash2,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ---- Types ----

type NotificationCategory = "all" | "unread" | "action" | "alert";

type NotificationType = "action" | "alert" | "info" | "success";

interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
}

// ---- Helpers ----

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case "success":
      return (
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-500/15 shrink-0">
          <CheckCircle className="h-4.5 w-4.5 text-emerald-500" />
        </div>
      );
    case "alert":
      return (
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-yellow-500/15 shrink-0">
          <AlertTriangle className="h-4.5 w-4.5 text-yellow-500" />
        </div>
      );
    case "action":
      return (
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/15 shrink-0">
          <Zap className="h-4.5 w-4.5 text-primary" />
        </div>
      );
    case "info":
    default:
      return (
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500/15 shrink-0">
          <Info className="h-4.5 w-4.5 text-blue-500" />
        </div>
      );
  }
}

function getTypeBadge(type: NotificationType) {
  switch (type) {
    case "success":
      return (
        <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/25 border text-[10px] px-1.5 py-0 font-medium">
          成功
        </Badge>
      );
    case "alert":
      return (
        <Badge className="bg-yellow-500/15 text-yellow-500 border-yellow-500/25 border text-[10px] px-1.5 py-0 font-medium">
          アラート
        </Badge>
      );
    case "action":
      return (
        <Badge className="bg-primary/15 text-primary border-primary/25 border text-[10px] px-1.5 py-0 font-medium">
          アクション
        </Badge>
      );
    case "info":
    default:
      return (
        <Badge className="bg-blue-500/15 text-blue-500 border-blue-500/25 border text-[10px] px-1.5 py-0 font-medium">
          情報
        </Badge>
      );
  }
}

const FILTER_TABS: { key: NotificationCategory; label: string }[] = [
  { key: "all", label: "すべて" },
  { key: "unread", label: "未読" },
  { key: "action", label: "アクション" },
  { key: "alert", label: "アラート" },
];

// ---- Component ----

export default function Notifications() {
  const [activeFilter, setActiveFilter] = useState<NotificationCategory>("all");

  // Local mock data — replace with tRPC query once a notifications router exists
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Derived list based on active filter
  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "unread") return !n.read;
    return n.type === activeFilter;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleDelete = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleMarkRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Page Header */}
      <div className="fade-in-up page-header">
        <div>
          <h1 className="page-title">通知</h1>
          <p className="page-subtitle">システムからの通知とアラート</p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            className="h-8 text-xs font-semibold shrink-0"
          >
            <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
            すべて既読にする
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div
        className="fade-in-up flex items-center gap-1 p-1 bg-muted rounded-lg w-fit"
        style={{ animationDelay: "40ms" }}
      >
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab.key;
          const count =
            tab.key === "unread"
              ? unreadCount
              : tab.key === "all"
              ? notifications.length
              : notifications.filter((n) => n.type === tab.key).length;

          return (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150
                ${
                  isActive
                    ? "bg-card text-foreground shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }
              `}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={`
                    inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[10px] font-semibold
                    ${
                      isActive
                        ? "bg-primary/15 text-primary"
                        : "bg-muted-foreground/20 text-muted-foreground"
                    }
                  `}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Notification List or Empty State */}
      <div
        className="fade-in-up"
        style={{ animationDelay: "80ms" }}
      >
        {filteredNotifications.length > 0 ? (
          <div className="space-y-2">
            {filteredNotifications.map((notification, idx) => (
              <div
                key={notification.id}
                className={`
                  fade-in-up group relative flex items-start gap-3.5 p-4 rounded-xl
                  border border-border bg-card
                  shadow-[var(--shadow-card)]
                  hover:shadow-[var(--shadow-card-hover)]
                  transition-all duration-150
                  ${!notification.read ? "border-l-2 border-l-primary" : ""}
                `}
                style={{ animationDelay: `${(idx + 1) * 40}ms` }}
              >
                {/* Icon */}
                {getNotificationIcon(notification.type)}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground leading-snug">
                        {notification.title}
                      </span>
                      {getTypeBadge(notification.type)}
                      {!notification.read && (
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">
                      {notification.timestamp}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {notification.description}
                  </p>
                </div>

                {/* Action buttons (appear on hover) */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
                  {!notification.read && (
                    <button
                      onClick={() => handleMarkRead(notification.id)}
                      className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                      title="既読にする"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(notification.id)}
                    className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    title="削除"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 px-6 rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mb-5">
              <Bell className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-2">
              新しい通知はありません
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-xs leading-relaxed">
              自律型エージェントの実行結果やシステムアラートがここに表示されます
            </p>

            {/* Hint cards */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg">
              {[
                {
                  icon: <Zap className="h-4 w-4 text-primary" />,
                  bg: "bg-primary/10",
                  label: "エージェント実行結果",
                  desc: "投稿の自動生成・送信の完了通知",
                },
                {
                  icon: <CheckCircle className="h-4 w-4 text-emerald-500" />,
                  bg: "bg-emerald-500/10",
                  label: "承認リクエスト",
                  desc: "コンテンツレビューが必要な投稿",
                },
                {
                  icon: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
                  bg: "bg-yellow-500/10",
                  label: "システムアラート",
                  desc: "エラーや設定が必要な項目",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col items-center gap-2 p-3.5 rounded-lg border border-border bg-muted/50 text-center"
                >
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-lg ${item.bg}`}
                  >
                    {item.icon}
                  </div>
                  <p className="text-[11px] font-semibold text-foreground leading-tight">
                    {item.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
