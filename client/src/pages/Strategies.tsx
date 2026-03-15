import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { useI18n } from "@/contexts/I18nContext";

export default function Strategies() {
  const { t } = useI18n();
  const { data: strategies, isLoading } = trpc.strategies.list.useQuery();

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="fade-in-up page-header">
        <div>
          <h1 className="page-title">{t('strategies.title')}</h1>
          <p className="page-subtitle">{t('strategies.subtitle')}</p>
        </div>
        <Link href="/strategies/new">
          <Button size="lg" className="gap-2 bg-emerald-500 hover:bg-emerald-600 text-white border border-white/[0.06] font-bold rounded-lg">
            <Plus className="h-5 w-5" />
            {t('strategies.generateStrategy')}
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        </div>
      ) : strategies && strategies.length > 0 ? (
        <div className="grid gap-4">
          {strategies.map((strategy) => (
            <div key={strategy.id} className="fade-in-up bg-neutral-900 rounded-lg border border-white/[0.06] p-4 hover:bg-neutral-800 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-sm text-white flex items-center gap-2 mb-1">
                    <Sparkles className="h-5 w-5 text-amber-400" />
                    Strategy #{strategy.id}
                  </h3>
                  <p className="text-sm text-neutral-500 font-bold">
                    {strategy.objective}
                  </p>
                </div>
                <span className="text-xs text-neutral-500 font-bold">
                  {new Date(strategy.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-bold text-white mb-2 text-sm">{t('strategies.contentType')}</h4>
                  <p className="text-sm text-neutral-500 font-bold">{strategy.contentType}</p>
                </div>
                <div>
                  <h4 className="font-bold text-white mb-2 text-sm">{t('strategies.hashtags')}</h4>
                  <p className="text-sm text-neutral-500 font-bold">{strategy.hashtags}</p>
                </div>
                <div>
                  <h4 className="font-bold text-white mb-2 text-sm">{t('strategies.postingSchedule')}</h4>
                  <p className="text-sm text-neutral-500 font-bold">{strategy.postingSchedule}</p>
                </div>
                <div>
                  <h4 className="font-bold text-white mb-2 text-sm">{t('strategies.engagementStrategy')}</h4>
                  <p className="text-sm text-neutral-500 font-bold">{strategy.engagementStrategy}</p>
                </div>
              </div>
              {strategy.generatedContent && (
                <div className="mt-4 pt-4 border-t border-white/[0.06]">
                  <h4 className="font-bold text-white mb-2 text-sm">{t('strategies.sampleContent')}</h4>
                  <div className="bg-neutral-950 rounded-lg p-4 border border-white/[0.06]">
                    <pre className="text-sm text-neutral-300 whitespace-pre-wrap font-sans font-bold">
                      {strategy.generatedContent}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="fade-in-up bg-neutral-900 rounded-lg border border-white/[0.06] p-4">
          <div className="py-12 text-center">
            <Sparkles className="h-12 w-12 text-neutral-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">
              {t('strategies.noStrategies')}
            </h3>
            <p className="text-neutral-500 mb-6 font-bold">
              {t('strategies.noStrategiesSubtitle')}
            </p>
            <Link href="/strategies/new">
              <Button size="lg" className="gap-2 bg-emerald-500 hover:bg-emerald-600 text-white border border-white/[0.06] font-bold rounded-lg">
                <Plus className="h-5 w-5" />
                {t('strategies.generateFirstStrategy')}
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
