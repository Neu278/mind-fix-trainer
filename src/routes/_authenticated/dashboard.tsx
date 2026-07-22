import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listProblems } from "@/lib/problems.functions";
import { PATTERN_META, type Pattern } from "@/lib/patterns";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "홈 · 또속" }, { name: "description", content: "나의 오답과 메타인지 요약" }] }),
  component: Dashboard,
});

function Dashboard() {
  const fn = useServerFn(listProblems);
  const { data = [], isLoading } = useQuery({ queryKey: ["problems"], queryFn: () => fn() });

  const total = data.length;
  const correct = data.filter(d => d.is_correct).length;
  const wrong = total - correct;
  const overConf = data.filter(d => !d.is_correct && d.confidence >= 4).length;
  const luckyRight = data.filter(d => d.is_correct && d.confidence <= 2).length;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-br from-accent/60 to-primary/20 p-6">
        <div className="text-xs font-medium text-primary">👋 안녕! 오늘도 함께해요</div>
        <h1 className="mt-1 text-2xl font-bold">오답에서 '생각의 오류'를 찾아드릴게요</h1>
        <div className="mt-4 flex gap-2">
          <Button asChild className="rounded-2xl"><Link to="/new">+ 새 오답 등록</Link></Button>
          <Button asChild variant="secondary" className="rounded-2xl"><Link to="/insights">📊 인사이트 보기</Link></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="총 문제" value={total} emoji="📝" />
        <Stat label="오답" value={wrong} emoji="❌" tone="peach" />
        <Stat label="과신형 오답" value={overConf} emoji="🎭" tone="lavender" />
        <Stat label="찍어서 맞음" value={luckyRight} emoji="🍀" tone="mint" />
      </div>

      <section>
        <h2 className="font-bold mb-3">최근 오답</h2>
        {isLoading ? <p className="text-sm text-muted-foreground">불러오는 중...</p> :
         data.length === 0 ? (
          <div className="rounded-3xl border border-dashed p-8 text-center text-muted-foreground">
            아직 등록된 문제가 없어요. <Link to="/new" className="text-primary font-semibold">첫 오답 등록하기 →</Link>
          </div>
         ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {data.slice(0, 6).map(p => <ProblemCard key={p.id} p={p} />)}
          </div>
         )}
      </section>
    </div>
  );
}

function Stat({ label, value, emoji, tone }: { label: string; value: number; emoji: string; tone?: string }) {
  const bg = tone === "peach" ? "bg-[var(--peach)]/40" : tone === "lavender" ? "bg-[var(--lavender)]/40" : tone === "mint" ? "bg-[var(--mint)]/40" : "bg-card";
  return (
    <div className={`rounded-2xl ${bg} border p-4`}>
      <div className="text-2xl">{emoji}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

export function ProblemCard({ p }: { p: { id: string; subject: string | null; question_text: string; confidence: number; is_correct: boolean; created_at: string; analyses?: { pattern: Pattern }[] | null } }) {
  const pattern = p.analyses?.[0]?.pattern;
  const meta = pattern ? PATTERN_META[pattern] : null;
  return (
    <Link to="/problems/$id" params={{ id: p.id }} className="block rounded-2xl border bg-card p-4 hover:shadow-md transition">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{p.subject ?? "일반"}</span>
        <span>·</span>
        <span>{new Date(p.created_at).toLocaleDateString("ko-KR")}</span>
        <span className="ml-auto">{p.is_correct ? "⭕" : "❌"} ★{p.confidence}</span>
      </div>
      <div className="mt-2 line-clamp-2 text-sm">{p.question_text}</div>
      {meta && (
        <div className="mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: meta.color + "22", color: "var(--foreground)" }}>
          <span>{meta.emoji}</span><span>{meta.label}</span>
        </div>
      )}
    </Link>
  );
}
