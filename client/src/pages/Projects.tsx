import { Link } from "wouter";
import { Plus, Calendar, Target, TrendingUp, Users, MoreVertical, Play, Pause, CheckCircle, Loader2, FolderKanban } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

function StatusPill({ status, label }: { status: string; label: string }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    paused: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    completed: "bg-sky-500/20 text-sky-400 border-sky-500/30",
    draft: "bg-neutral-800 text-neutral-400 border-white/[0.06]",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${styles[status] || styles.draft}`}>
      {status === "active" && <Play className="w-2.5 h-2.5" />}
      {status === "paused" && <Pause className="w-2.5 h-2.5" />}
      {status === "completed" && <CheckCircle className="w-2.5 h-2.5" />}
      {label}
    </span>
  );
}

export default function Projects() {
  const { t } = useI18n();
  const { data: projects, isLoading } = trpc.projects.list.useQuery();
  const utils = trpc.useUtils();
  const deleteMutation = trpc.projects.delete.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      toast.success("プロジェクトを削除しました");
    },
    onError: () => {
      toast.error("プロジェクトの削除に失敗しました");
    },
  });

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: t('abTesting.draft'),
      active: t('projects.active'),
      paused: t('projects.paused'),
      completed: t('projects.completed'),
    };
    return labels[status] || status;
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "未設定";
    return new Date(date).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 p-8 bg-neutral-900 border border-white/[0.06] rounded-lg">
          <Loader2 className="h-6 w-6 animate-spin text-white" />
          <span className="text-sm text-white font-bold">{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="fade-in-up flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="section-label mb-1 text-neutral-500 font-bold">Projects</p>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            {t('projects.title')}
          </h1>
          <p className="text-sm text-neutral-400 mt-0.5 font-bold">{t('projects.subtitle')}</p>
        </div>
        <Link href="/projects/new">
          <Button size="sm" className="h-8 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white border border-white/[0.06] rounded-lg transition-all">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            {t('projects.newProject')}
          </Button>
        </Link>
      </div>

      {/* Projects Grid */}
      {!projects || projects.length === 0 ? (
        <div className="fade-in-up bg-neutral-900 border border-white/[0.06] rounded-lg" style={{ animationDelay: '80ms' }}>
          <div className="flex flex-col items-center justify-center py-16">
            <div className="p-4 rounded-lg bg-neutral-800 border border-white/[0.06] mb-4">
              <FolderKanban className="h-8 w-8 text-neutral-400" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              {t('projects.noProjects')}
            </h3>
            <p className="text-xs text-neutral-500 text-center mb-5 max-w-sm font-bold">
              {t('projects.createFirst')}
            </p>
            <Link href="/projects/new">
              <Button size="sm" className="h-8 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white border border-white/[0.06] rounded-lg transition-all">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                {t('projects.newProject')}
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {projects.map((project, idx) => (
            <div
              key={project.id}
              className="fade-in-up bg-neutral-900 border border-white/[0.06] rounded-lg hover:bg-neutral-800 transition-all p-4"
              style={{ animationDelay: `${(idx + 1) * 60}ms` }}
            >
              <div className="flex items-start justify-between mb-3">
                <StatusPill status={project.status} label={getStatusLabel(project.status)} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 rounded-lg hover:bg-neutral-700 text-neutral-400 transition-colors">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-neutral-900 border border-white/[0.06]">
                    <DropdownMenuItem asChild>
                      <Link href={`/projects/${project.id}`} className="font-bold text-white">{t('accounts.viewDetails')}</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/projects/${project.id}/edit`} className="font-bold text-white">{t('common.edit')}</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-400 font-bold"
                      onClick={() => {
                        if (confirm(t('common.confirm'))) {
                          deleteMutation.mutate({ id: project.id });
                        }
                      }}
                    >
                      {t('common.delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <Link href={`/projects/${project.id}`}>
                <h3 className="text-sm font-bold text-white hover:text-neutral-300 transition-colors cursor-pointer mb-1 line-clamp-1">
                  {project.name}
                </h3>
              </Link>
              <p className="text-xs text-neutral-500 line-clamp-2 mb-3 font-bold">
                {project.objective}
              </p>

              <div className="space-y-2 pt-3 border-t border-white/[0.06]">
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 font-bold">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(project.startDate)} ~ {formatDate(project.endDate)}</span>
                </div>

                {project.targets && (() => {
                  try {
                    const targets = JSON.parse(project.targets);
                    const targetEntries = Object.entries(targets);
                    if (targetEntries.length > 0) {
                      return (
                        <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 font-bold">
                          <Target className="h-3 w-3" />
                          <span className="truncate">
                            {targetEntries.map(([key, value], index) => (
                              <span key={key}>
                                {index > 0 && " / "}
                                {key}: {typeof value === 'number' ? (value as number).toLocaleString() : String(value)}
                              </span>
                            ))}
                          </span>
                        </div>
                      );
                    }
                  } catch (e) {
                    return null;
                  }
                })()}

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-[11px] text-neutral-500 font-bold">
                    <Users className="h-3 w-3" />
                    <span className="tabular-nums">{project.accountCount || 0}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-neutral-500 font-bold">
                    <TrendingUp className="h-3 w-3" />
                    <span className="tabular-nums">{project.postCount || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
