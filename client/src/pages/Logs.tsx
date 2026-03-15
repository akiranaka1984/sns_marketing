import { trpc } from "@/lib/trpc";
import { Loader2, CheckCircle2, XCircle, Clock, ClipboardList } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

export default function Logs() {
  const { t } = useI18n();
  const { data: logs, isLoading } = trpc.logs.recent.useQuery({ limit: 100 });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-rose-400" />;
      default:
        return <Clock className="h-5 w-5 text-amber-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      case 'failed':
        return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
      default:
        return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
    }
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="fade-in-up page-header">
        <div>
          <h1 className="page-title">{t('logs.title')}</h1>
          <p className="page-subtitle">{t('logs.subtitle')}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        </div>
      ) : logs && logs.length > 0 ? (
        <div className="fade-in-up bg-neutral-900 rounded-lg border border-white/[0.06] p-4">
          <h3 className="font-bold text-sm text-white mb-1">{t('logs.recentActivity')}</h3>
          <p className="text-xs text-neutral-500 mb-4 font-bold">
            {t('logs.showingLatest').replace('{count}', logs.length.toString())}
          </p>
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-4 p-4 rounded-lg border border-white/[0.06] hover:bg-neutral-800 transition-colors bg-neutral-950"
              >
                <div className="flex-shrink-0 mt-1">
                  {getStatusIcon(log.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <h4 className="font-bold text-white">{log.action}</h4>
                      {log.details && (
                        <p className="text-sm text-neutral-500 mt-1 font-bold">{log.details}</p>
                      )}
                    </div>
                    <span
                      className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${getStatusColor(log.status)}`}
                    >
                      {log.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-neutral-500 font-bold">
                    <span>{new Date(log.createdAt).toLocaleString()}</span>
                    {log.deviceId && (
                      <span className="flex items-center gap-1">
                        <span className="font-bold">{t('logs.device')}:</span> {log.deviceId}
                      </span>
                    )}
                    {log.accountId && (
                      <span className="flex items-center gap-1">
                        <span className="font-bold">{t('logs.accountId')}:</span> {log.accountId}
                      </span>
                    )}
                  </div>
                  {log.errorMessage && (
                    <div className="mt-2 p-3 bg-rose-500/10 rounded-lg border border-rose-500/30">
                      <p className="text-sm text-rose-400 font-bold">
                        <span className="font-bold">{t('logs.error')}:</span> {log.errorMessage}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="fade-in-up bg-neutral-900 rounded-lg border border-white/[0.06] p-4">
          <div className="text-center py-12">
            <ClipboardList className="h-12 w-12 text-neutral-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">
              {t('logs.noLogs')}
            </h3>
            <p className="text-neutral-500 font-bold">
              {t('logs.noLogsSubtitle')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
