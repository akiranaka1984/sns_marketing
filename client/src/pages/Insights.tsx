import { BrainCircuit, Lightbulb, TrendingUp, BookOpen } from "lucide-react";
import { trpc } from "@/lib/trpc";

// ---- Section card wrapper ----

interface SectionCardProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

function SectionCard({ icon, title, children }: SectionCardProps) {
  return (
    <div className="bg-neutral-900 border border-white/[0.08] rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/15 shrink-0">
          {icon}
        </div>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ---- Empty state ----

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 rounded-xl border border-white/[0.08] bg-neutral-900">
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-neutral-800 mb-4">
        <BrainCircuit className="h-6 w-6 text-neutral-500" />
      </div>
      <p className="text-sm font-medium text-neutral-400 text-center">
        データが蓄積されるとインサイトが表示されます
      </p>
    </div>
  );
}

// ---- Main component ----

export default function Insights() {
  const { data: unifiedView, isError: unifiedError } =
    trpc.learningInsights.getUnifiedView.useQuery({});

  const { data: accountHealth, isError: healthError } =
    trpc.learningInsights.getAccountHealth.useQuery({});

  // Derive display data from tRPC responses; fall back to empty arrays on error
  const weeklyLearnings: string[] =
    !unifiedError && unifiedView
      ? (unifiedView as { weeklyLearnings?: string[] }).weeklyLearnings ?? []
      : [];

  const improvements: string[] =
    !healthError && accountHealth
      ? (accountHealth as { improvements?: string[] }).improvements ?? []
      : [];

  const trends: string[] =
    !unifiedError && unifiedView
      ? (unifiedView as { trends?: string[] }).trends ?? []
      : [];

  const hasAnyData =
    weeklyLearnings.length > 0 ||
    improvements.length > 0 ||
    trends.length > 0;

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Page header */}
      <div className="fade-in-up page-header">
        <div>
          <h1 className="page-title">インサイト</h1>
          <p className="page-subtitle">
            AIが分析した学習インサイトのサマリー
          </p>
        </div>
      </div>

      {hasAnyData ? (
        <div className="grid grid-cols-1 gap-4 fade-in-up">
          {/* Weekly learnings */}
          <SectionCard
            icon={<BookOpen className="h-4 w-4 text-emerald-500" />}
            title="今週の学び"
          >
            {weeklyLearnings.length > 0 ? (
              <ul className="space-y-2.5">
                {weeklyLearnings.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-sm text-neutral-300 leading-relaxed">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-500">
                データが蓄積されるとインサイトが表示されます
              </p>
            )}
          </SectionCard>

          {/* Improvement suggestions */}
          <SectionCard
            icon={<Lightbulb className="h-4 w-4 text-emerald-500" />}
            title="改善提案"
          >
            {improvements.length > 0 ? (
              <ul className="space-y-2.5">
                {improvements.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-sm text-neutral-300 leading-relaxed">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-500">
                データが蓄積されるとインサイトが表示されます
              </p>
            )}
          </SectionCard>

          {/* Trends */}
          <SectionCard
            icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
            title="トレンド"
          >
            {trends.length > 0 ? (
              <ul className="space-y-2.5">
                {trends.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-sm text-neutral-300 leading-relaxed">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-500">
                データが蓄積されるとインサイトが表示されます
              </p>
            )}
          </SectionCard>
        </div>
      ) : (
        <div className="fade-in-up" style={{ animationDelay: "40ms" }}>
          <EmptyState />
        </div>
      )}
    </div>
  );
}
