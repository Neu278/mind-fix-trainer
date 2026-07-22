import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getInsights } from "@/lib/problems.functions";
import { PATTERN_META, ALL_PATTERNS, type Pattern } from "@/lib/patterns";
import {
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";

export const Route = createFileRoute("/_authenticated/insights")({
  head: () => ({ meta: [{ title: "인사이트 · 또속" }, { name: "description", content: "메타인지 4분면, 6대 패턴 레이더, 시간 히트맵" }] }),
  component: Insights,
});

function Insights() {
  const fn = useServerFn(getInsights);
  const { data, isLoading } = useQuery({ queryKey: ["insights"], queryFn: () => fn() });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">불러오는 중...</p>;

  const { problems, analyses } = data;

  // Quadrant scatter: X = confidence(1-5), Y = correct(1) / wrong(0) -> jittered
  const scatter = problems.map((p, i) => ({
    x: p.confidence + (Math.random() - 0.5) * 0.3,
    y: (p.is_correct ? 1 : 0) + (Math.random() - 0.5) * 0.15,
    z: 40,
    label: p.is_correct ? "정답" : "오답",
    key: i,
  }));

  // Radar: pattern counts
  const patternCounts: Record<Pattern, number> = {
    overconfidence: 0, misreading: 0, time_pressure: 0, lost_path: 0, calc_mistake: 0, no_knowledge: 0,
  };
  analyses.forEach(a => { patternCounts[a.pattern as Pattern]++; });
  const radar = ALL_PATTERNS.map(p => ({ pattern: PATTERN_META[p].label, count: patternCounts[p] }));

  // Time heatmap: bins by time (0-30, 30-60, 60-120, 120-300, 300+) — accuracy per bin
  const bins = [
    { label: "~30초", min: 0, max: 30 },
    { label: "30~60초", min: 30, max: 60 },
    { label: "1~2분", min: 60, max: 120 },
    { label: "2~5분", min: 120, max: 300 },
    { label: "5분+", min: 300, max: 9999 },
  ];
  const heat = bins.map(b => {
    const inBin = problems.filter(p => p.time_spent_sec >= b.min && p.time_spent_sec < b.max);
    const acc = inBin.length ? inBin.filter(p => p.is_correct).length / inBin.length : 0;
    return { ...b, count: inBin.length, acc };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">📊 나의 메타인지 인사이트</h1>

      <Card title="🎯 메타인지 4분면 매트릭스" desc="X: 확신도 · Y: 정답 여부 — 오른쪽 아래(고확신·오답)는 '착각 구역', 왼쪽 위(저확신·정답)는 '찍기 구역'입니다.">
        {problems.length === 0 ? <Empty /> : (
          <div className="h-72">
            <ResponsiveContainer>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 30, left: 0 }}>
                <CartesianGrid strokeOpacity={0.3} />
                <XAxis type="number" dataKey="x" domain={[0.5, 5.5]} ticks={[1,2,3,4,5]} label={{ value: "확신도", position: "insideBottom", offset: -10 }} />
                <YAxis type="number" dataKey="y" domain={[-0.3, 1.3]} ticks={[0, 1]} tickFormatter={(v) => v === 1 ? "정답" : "오답"} />
                <ZAxis type="number" dataKey="z" range={[60, 60]} />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                <Scatter data={scatter} fill="var(--primary)" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card title="🧩 6대 오답 패턴 레이더" desc="어떤 사고 오류에 가장 취약한지 확인해요.">
        {analyses.length === 0 ? <Empty /> : (
          <div className="h-80">
            <ResponsiveContainer>
              <RadarChart data={radar}>
                <PolarGrid />
                <PolarAngleAxis dataKey="pattern" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis />
                <Radar name="빈도" dataKey="count" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card title="⏱ 시간 대비 정답률 히트맵" desc="시간을 얼마나 쓸 때 정답률이 높은지 파악해요.">
        {problems.length === 0 ? <Empty /> : (
          <div className="grid grid-cols-5 gap-2">
            {heat.map(h => (
              <div key={h.label} className="rounded-2xl p-3 text-center border" style={{
                background: `oklch(0.9 ${0.05 + h.acc * 0.1} ${120 + h.acc * 60})`,
              }}>
                <div className="text-xs text-muted-foreground">{h.label}</div>
                <div className="mt-1 text-xl font-bold">{h.count ? Math.round(h.acc * 100) + "%" : "-"}</div>
                <div className="text-xs text-muted-foreground">n={h.count}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Card({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border bg-card p-5">
      <div className="font-bold">{title}</div>
      <div className="text-xs text-muted-foreground mt-1 mb-4">{desc}</div>
      {children}
    </div>
  );
}
function Empty() { return <div className="text-sm text-muted-foreground py-10 text-center">데이터가 아직 부족해요. 문제를 등록해 보세요!</div>; }
