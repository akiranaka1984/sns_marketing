import { Lightbulb, TrendingUp } from "lucide-react";

interface ViralScorePrediction {
  score: number;
  factors: {
    hookStrength: number;
    emotionalImpact: number;
    shareability: number;
    relevance: number;
    readability: number;
  };
  suggestions: string[];
}

interface ViralScorePreviewProps {
  prediction: ViralScorePrediction;
}

const getScoreColor = (score: number) => {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
};

const getScoreBgColor = (score: number) => {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  if (score >= 40) return "bg-orange-500";
  return "bg-red-500";
};

const getScoreBorderColor = (score: number) => {
  if (score >= 80) return "border-green-500/30";
  if (score >= 60) return "border-yellow-500/30";
  if (score >= 40) return "border-orange-500/30";
  return "border-red-500/30";
};

const getScoreLabel = (score: number) => {
  if (score >= 80) return "高バイラル性";
  if (score >= 60) return "中バイラル性";
  if (score >= 40) return "低バイラル性";
  return "要改善";
};

const factorLabels: Record<keyof ViralScorePrediction["factors"], string> = {
  hookStrength: "フック強度",
  emotionalImpact: "感情的インパクト",
  shareability: "シェアしやすさ",
  relevance: "話題との関連性",
  readability: "読みやすさ",
};

function FactorBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-neutral-400">{label}</span>
        <span className={`text-[11px] font-bold ${getScoreColor(value)}`}>{value}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-neutral-800">
        <div
          className={`h-full rounded-full transition-all ${getScoreBgColor(value)}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export function ViralScorePreview({ prediction }: ViralScorePreviewProps) {
  const { score, factors, suggestions } = prediction;

  return (
    <div className={`rounded-lg border bg-neutral-950 p-4 space-y-4 ${getScoreBorderColor(score)}`}>
      {/* Score header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className={`h-4 w-4 ${getScoreColor(score)}`} />
          <span className="text-sm font-bold text-white">バイラル予測スコア</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}</span>
          <span className="text-neutral-500 text-sm font-bold">/100</span>
        </div>
      </div>

      {/* Score label badge */}
      <div>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${getScoreBorderColor(score)} ${getScoreColor(score)} bg-neutral-900`}
        >
          {getScoreLabel(score)}
        </span>
      </div>

      {/* Factor bars */}
      <div className="space-y-2.5">
        {(Object.keys(factorLabels) as Array<keyof typeof factors>).map((key) => (
          <FactorBar key={key} label={factorLabels[key]} value={factors[key]} />
        ))}
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-white/[0.06]">
          <div className="flex items-center gap-1.5">
            <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide">改善提案</span>
          </div>
          <ul className="space-y-1.5">
            {suggestions.map((suggestion, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                <span className="text-[12px] font-bold text-neutral-300 leading-snug">{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
