import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const PILLAR_CONFIG: Record<string, { label: string; color: string }> = {
  educational:  { label: '教育',             color: '#10b981' },
  promotional:  { label: 'プロモーション',   color: '#f59e0b' },
  engagement:   { label: 'エンゲージメント', color: '#6366f1' },
  entertainment:{ label: 'エンタメ',         color: '#ec4899' },
  curation:     { label: 'キュレーション',   color: '#8b5cf6' },
};

const PILLAR_KEYS = Object.keys(PILLAR_CONFIG);

interface PillarDistributionProps {
  data: Record<string, number>; // pillar key -> count
}

interface TooltipPayload {
  name: string;
  value: number;
  payload: { label: string; count: number; percentage: string };
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload;
  return (
    <div className="bg-neutral-800 border border-white/[0.08] rounded-lg px-3 py-2 text-[12px]">
      <p className="text-neutral-200 font-semibold">{item.label}</p>
      <p className="text-neutral-400">{item.count}件 ({item.percentage}%)</p>
    </div>
  );
}

export default function PillarDistribution({ data }: PillarDistributionProps) {
  const total = PILLAR_KEYS.reduce((sum, key) => sum + (data[key] ?? 0), 0);

  const chartData = PILLAR_KEYS.map((key) => {
    const count = data[key] ?? 0;
    const percentage = total > 0 ? ((count / total) * 100).toFixed(0) : '0';
    return {
      key,
      label: PILLAR_CONFIG[key].label,
      count,
      percentage,
      color: PILLAR_CONFIG[key].color,
    };
  }).filter((d) => d.count > 0);

  const isEmpty = chartData.length === 0;

  return (
    <div className="bg-neutral-900 rounded-xl border border-white/[0.08] p-4">
      <h3 className="text-[13px] font-semibold text-neutral-200 mb-3">コンテンツピラー分布</h3>

      {isEmpty ? (
        <div className="flex items-center justify-center h-[120px]">
          <p className="text-[12px] text-neutral-500">データなし</p>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          {/* Pie chart */}
          <div className="w-[120px] h-[120px] flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={32}
                  outerRadius={52}
                  paddingAngle={2}
                  dataKey="count"
                  strokeWidth={0}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex flex-col gap-1.5 min-w-0">
            {PILLAR_KEYS.map((key) => {
              const count = data[key] ?? 0;
              const percentage = total > 0 ? ((count / total) * 100).toFixed(0) : '0';
              const cfg = PILLAR_CONFIG[key];
              return (
                <div key={key} className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: cfg.color }}
                  />
                  <span className="text-[11px] text-neutral-400 truncate">{cfg.label}</span>
                  <span className="text-[11px] text-neutral-200 font-medium ml-auto pl-2 flex-shrink-0">
                    {count > 0 ? `${percentage}%` : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
