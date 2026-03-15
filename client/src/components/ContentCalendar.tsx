import { useState, useMemo, useCallback } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  FileEdit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ViewMode = "month" | "week" | "day";

type PostStatus = "scheduled" | "published" | "failed" | "draft";

export type CalendarPost = {
  id: number;
  content: string;
  scheduledAt: string;
  status: PostStatus;
  accountId: number;
};

type ContentCalendarProps = {
  posts: CalendarPost[];
  isLoading?: boolean;
};

const STATUS_CONFIG: Record<
  PostStatus,
  { color: string; bgColor: string; borderColor: string; label: string; icon: React.ReactNode }
> = {
  scheduled: {
    color: "text-blue-300",
    bgColor: "bg-blue-900/30",
    borderColor: "border-blue-800",
    label: "予定",
    icon: <Clock className="h-3 w-3" />,
  },
  published: {
    color: "text-green-300",
    bgColor: "bg-green-900/30",
    borderColor: "border-green-800",
    label: "公開済み",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  failed: {
    color: "text-red-300",
    bgColor: "bg-red-900/30",
    borderColor: "border-red-800",
    label: "失敗",
    icon: <XCircle className="h-3 w-3" />,
  },
  draft: {
    color: "text-neutral-400",
    bgColor: "bg-neutral-800/50",
    borderColor: "border-neutral-700",
    label: "下書き",
    icon: <FileEdit className="h-3 w-3" />,
  },
};

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

export default function ContentCalendar({
  posts,
  isLoading,
}: ContentCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const today = useMemo(() => new Date(), []);

  // Group posts by date string for quick lookup
  const postsByDate = useMemo(() => {
    const map = new Map<string, CalendarPost[]>();
    posts.forEach((post) => {
      const d = new Date(post.scheduledAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(post);
    });
    return map;
  }, [posts]);

  const getPostsForDate = useCallback(
    (date: Date): CalendarPost[] => {
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      return postsByDate.get(key) || [];
    },
    [postsByDate]
  );

  // Navigation
  const navigate = useCallback(
    (direction: -1 | 1) => {
      setCurrentDate((prev) => {
        const next = new Date(prev);
        if (viewMode === "month") {
          next.setMonth(next.getMonth() + direction);
        } else if (viewMode === "week") {
          next.setDate(next.getDate() + 7 * direction);
        } else {
          next.setDate(next.getDate() + direction);
        }
        return next;
      });
    },
    [viewMode]
  );

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const handleDayClick = useCallback((date: Date) => {
    setSelectedDate(date);
    setIsDialogOpen(true);
  }, []);

  // Get calendar grid days for month view
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: Date[] = [];

    // Add days from previous month to fill the first week
    const startDayOfWeek = firstDay.getDay();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push(d);
    }

    // Add days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    // Add days from next month to fill the last week
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        days.push(new Date(year, month + 1, i));
      }
    }

    return days;
  }, [currentDate]);

  // Get week days for week view
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentDate]);

  // Get hours for day view
  const dayHours = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => i);
  }, []);

  // Header title
  const headerTitle = useMemo(() => {
    if (viewMode === "month") {
      return currentDate.toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
      });
    } else if (viewMode === "week") {
      const start = new Date(currentDate);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return `${start.toLocaleDateString("ja-JP", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("ja-JP", { month: "short", day: "numeric", year: "numeric" })}`;
    } else {
      return formatDate(currentDate);
    }
  }, [currentDate, viewMode]);

  // Selected date posts
  const selectedDatePosts = useMemo(() => {
    if (!selectedDate) return [];
    return getPostsForDate(selectedDate).sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );
  }, [selectedDate, getPostsForDate]);

  const renderPostChip = (post: CalendarPost, compact = false) => {
    const config = STATUS_CONFIG[post.status];
    return (
      <div
        key={post.id}
        className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium truncate ${config.bgColor} ${config.color} border ${config.borderColor}`}
      >
        {config.icon}
        {!compact && (
          <span className="truncate">
            {formatTime(new Date(post.scheduledAt))}
          </span>
        )}
      </div>
    );
  };

  // Month view
  const renderMonthView = () => (
    <div className="grid grid-cols-7">
      {/* Weekday headers */}
      {WEEKDAY_LABELS.map((label, i) => {
        let weekdayColor = "text-neutral-500";
        if (i === 0) weekdayColor = "text-red-400";
        else if (i === 6) weekdayColor = "text-blue-400";
        return (
          <div
            key={label}
            className={`py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider border-b border-white/[0.08] ${weekdayColor}`}
          >
            {label}
          </div>
        );
      })}

      {/* Day cells */}
      {monthDays.map((date, i) => {
        const isCurrentMonth = date.getMonth() === currentDate.getMonth();
        const isToday = isSameDay(date, today);
        const dayPosts = getPostsForDate(date);
        const dayOfWeek = date.getDay();

        let dayNumberColor = "text-neutral-200";
        if (isToday) dayNumberColor = "bg-emerald-500 text-white font-bold";
        else if (!isCurrentMonth) dayNumberColor = "text-neutral-600";
        else if (dayOfWeek === 0) dayNumberColor = "text-red-400";
        else if (dayOfWeek === 6) dayNumberColor = "text-blue-400";

        return (
          <button
            key={i}
            onClick={() => handleDayClick(date)}
            className={`
              relative min-h-[90px] sm:min-h-[110px] p-1.5 border-b border-r border-white/[0.08]
              text-left transition-colors duration-150
              hover:bg-white/[0.04]
              focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-inset
              ${!isCurrentMonth ? "bg-neutral-950" : "bg-neutral-900"}
              ${i % 7 === 0 ? "border-l" : ""}
            `}
          >
            <span
              className={`
                inline-flex items-center justify-center w-6 h-6 rounded-full text-[12px] font-medium
                ${dayNumberColor}
              `}
            >
              {date.getDate()}
            </span>
            {dayPosts.length > 0 && (
              <div className="mt-1 space-y-0.5">
                {dayPosts.slice(0, 3).map((post) => renderPostChip(post))}
                {dayPosts.length > 3 && (
                  <span className="text-[10px] font-medium text-neutral-500 pl-1">
                    +{dayPosts.length - 3}
                  </span>
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );

  // Week view
  const renderWeekView = () => (
    <div className="grid grid-cols-7">
      {/* Weekday headers with dates */}
      {weekDays.map((date, i) => {
        const isToday = isSameDay(date, today);
        let weekHeaderColor = "text-neutral-500";
        if (i === 0) weekHeaderColor = "text-red-400";
        else if (i === 6) weekHeaderColor = "text-blue-400";
        return (
          <div
            key={i}
            className={`py-3 text-center border-b border-white/[0.08] ${
              isToday ? "bg-emerald-500/10" : ""
            }`}
          >
            <div
              className={`text-[11px] font-semibold uppercase tracking-wider mb-1 ${weekHeaderColor}`}
            >
              {WEEKDAY_LABELS[i]}
            </div>
            <span
              className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-[14px] font-semibold ${
                isToday
                  ? "bg-emerald-500 text-white"
                  : "text-neutral-200"
              }`}
            >
              {date.getDate()}
            </span>
          </div>
        );
      })}

      {/* Day columns with posts */}
      {weekDays.map((date, i) => {
        const dayPosts = getPostsForDate(date);
        const isToday = isSameDay(date, today);
        return (
          <button
            key={`content-${i}`}
            onClick={() => handleDayClick(date)}
            className={`
              min-h-[200px] p-2 border-b border-r border-white/[0.08]
              text-left transition-colors duration-150
              hover:bg-white/[0.04]
              focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-inset
              ${isToday ? "bg-emerald-500/10" : "bg-neutral-900"}
              ${i === 0 ? "border-l" : ""}
            `}
          >
            <div className="space-y-1">
              {dayPosts.map((post) => {
                const config = STATUS_CONFIG[post.status];
                return (
                  <div
                    key={post.id}
                    className={`p-2 rounded-lg text-[11px] ${config.bgColor} ${config.color} border ${config.borderColor}`}
                  >
                    <div className="flex items-center gap-1 font-semibold mb-0.5">
                      {config.icon}
                      {formatTime(new Date(post.scheduledAt))}
                    </div>
                    <p className="truncate">{post.content}</p>
                  </div>
                );
              })}
            </div>
          </button>
        );
      })}
    </div>
  );

  // Day view
  const renderDayView = () => {
    const dayPosts = getPostsForDate(currentDate);
    const postsByHour = new Map<number, CalendarPost[]>();
    dayPosts.forEach((post) => {
      const hour = new Date(post.scheduledAt).getHours();
      if (!postsByHour.has(hour)) postsByHour.set(hour, []);
      postsByHour.get(hour)!.push(post);
    });

    return (
      <div className="divide-y divide-white/[0.08]">
        {dayHours.map((hour) => {
          const hourPosts = postsByHour.get(hour) || [];
          return (
            <div
              key={hour}
              className="grid grid-cols-[60px_1fr] min-h-[60px] hover:bg-white/[0.04] transition-colors"
            >
              <div className="px-3 py-2 text-right text-[12px] font-medium text-neutral-500 border-r border-white/[0.08]">
                {String(hour).padStart(2, "0")}:00
              </div>
              <div className="p-2 space-y-1">
                {hourPosts.map((post) => {
                  const config = STATUS_CONFIG[post.status];
                  return (
                    <div
                      key={post.id}
                      className={`p-2.5 rounded-lg ${config.bgColor} ${config.color} border ${config.borderColor}`}
                    >
                      <div className="flex items-center gap-1.5 font-semibold text-[12px] mb-1">
                        {config.icon}
                        <span>
                          {formatTime(new Date(post.scheduledAt))}
                        </span>
                        <Badge
                          className={`ml-auto text-[10px] ${config.bgColor} ${config.color} border ${config.borderColor}`}
                        >
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-[12px] line-clamp-2">{post.content}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Controls bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Left: Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="h-8 px-3 text-[12px] font-medium border-white/[0.08] text-neutral-200 hover:bg-white/[0.04]"
          >
            今日
          </Button>
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="h-8 w-8 p-0 text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.04]"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(1)}
              className="h-8 w-8 p-0 text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.04]"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="text-[15px] font-semibold text-neutral-200">
            {headerTitle}
          </h2>
        </div>

        {/* Right: View mode toggle */}
        <div className="flex items-center bg-white/[0.04] rounded-lg p-0.5 border border-white/[0.08]">
          {(["month", "week", "day"] as ViewMode[]).map((mode) => {
            const VIEW_LABELS: Record<ViewMode, string> = { month: "月", week: "週", day: "日" };
            return (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`
                  px-3 py-1.5 rounded-md text-[12px] font-medium transition-all duration-150
                  ${
                    viewMode === mode
                      ? "bg-white/[0.08] text-neutral-200"
                      : "text-neutral-500 hover:text-neutral-200"
                  }
                `}
              >
                {VIEW_LABELS[mode]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Status legend */}
      <div className="flex flex-wrap items-center gap-3 text-[11px]">
        {(Object.entries(STATUS_CONFIG) as [PostStatus, typeof STATUS_CONFIG[PostStatus]][]).map(
          ([status, config]) => (
            <div key={status} className="flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md ${config.bgColor} ${config.color} border ${config.borderColor}`}
              >
                {config.icon}
                {config.label}
              </span>
            </div>
          )
        )}
      </div>

      {/* Calendar body */}
      <div className="bg-neutral-900 rounded-xl border border-white/[0.08] overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Calendar className="h-8 w-8 text-neutral-600 mx-auto mb-3 animate-pulse" />
              <p className="text-[13px] text-neutral-500">
                読み込み中...
              </p>
            </div>
          </div>
        ) : (
          <>
            {viewMode === "month" && renderMonthView()}
            {viewMode === "week" && renderWeekView()}
            {viewMode === "day" && renderDayView()}
          </>
        )}
      </div>

      {/* Day detail dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg bg-neutral-900 border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-neutral-200 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-emerald-400" />
              {selectedDate && formatDate(selectedDate)}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            {selectedDatePosts.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-10 w-10 text-neutral-600 mx-auto mb-3" />
                <p className="text-[13px] text-neutral-500">
                  この日の投稿はありません
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {selectedDatePosts.map((post) => {
                  const config = STATUS_CONFIG[post.status];
                  return (
                    <div
                      key={post.id}
                      className={`p-3 rounded-lg border ${config.borderColor} ${config.bgColor}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className={`flex items-center gap-1.5 text-[12px] font-semibold ${config.color}`}>
                          {config.icon}
                          {formatTime(new Date(post.scheduledAt))}
                        </div>
                        <Badge
                          className={`text-[10px] ${config.bgColor} ${config.color} border ${config.borderColor}`}
                        >
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-[13px] text-neutral-200 leading-relaxed">
                        {post.content}
                      </p>
                      <div className="mt-2 text-[11px] text-neutral-500">
                        ID: {post.id} | Account: {post.accountId}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
