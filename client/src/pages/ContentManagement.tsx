import { Link } from "wouter";
import { Calendar, ClipboardList, Clock, ChevronRight } from "lucide-react";

// ---- Types ----

interface HubCard {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

// ---- Data ----

const HUB_CARDS: HubCard[] = [
  {
    href: "/content-calendar",
    icon: <Calendar className="h-5 w-5 text-emerald-500" />,
    title: "コンテンツカレンダー",
    description: "投稿スケジュールをカレンダー形式で一覧・管理します",
  },
  {
    href: "/post-review",
    icon: <ClipboardList className="h-5 w-5 text-emerald-500" />,
    title: "投稿レビュー",
    description: "自動生成された投稿を確認・編集・承認します",
  },
  {
    href: "/scheduled-posts",
    icon: <Clock className="h-5 w-5 text-emerald-500" />,
    title: "スケジュール投稿",
    description: "予約済み投稿の一覧と実行状況を確認します",
  },
];

// ---- Main component ----

export default function ContentManagement() {
  return (
    <div className="space-y-5 max-w-3xl">
      {/* Page header */}
      <div className="fade-in-up page-header">
        <div>
          <h1 className="page-title">コンテンツ管理</h1>
          <p className="page-subtitle">
            投稿コンテンツの計画・レビュー・スケジュールを一元管理
          </p>
        </div>
      </div>

      {/* Hub cards */}
      <div className="fade-in-up grid grid-cols-1 gap-3" style={{ animationDelay: "40ms" }}>
        {HUB_CARDS.map((card, i) => (
          <Link key={card.href} href={card.href}>
            <div
              className="
                group flex items-center gap-4 p-5
                bg-neutral-900 border border-white/[0.08] rounded-xl
                hover:border-emerald-500/30 hover:bg-neutral-800/60
                transition-all duration-150 cursor-pointer
              "
              style={{ animationDelay: `${(i + 1) * 40}ms` }}
            >
              {/* Icon */}
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/15 shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                {card.icon}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white leading-snug">
                  {card.title}
                </p>
                <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
                  {card.description}
                </p>
              </div>

              {/* Arrow */}
              <ChevronRight className="h-4 w-4 text-neutral-600 shrink-0 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all duration-150" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
