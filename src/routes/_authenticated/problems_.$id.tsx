import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getProblem } from "@/lib/problems.functions";
import { analyzeProblem } from "@/lib/ai.functions";
import { PATTERN_META, type Pattern } from "@/lib/patterns";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/problems_/$id")({
  head: () => ({ meta: [{ title: "오답 상세 · 또속" }, { name: "description", content: "Dual-Track 피드백" }] }),
  component: ProblemDetail,
});

function ProblemDetail() {
  const { id } = Route.useParams();
  const fn = useServerFn(getProblem);
  const analyze = useServerFn(analyzeProblem);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["problem", id], queryFn: () => fn({ data: { id } }) });
  const [mode, setMode] = useState<"long" | "short">("long");

  const reAnalyze = useMutation({
    mutationFn: () => analyze({ data: { problem_id: id } }),
    onSuccess: () => { toast.success("재분석 완료!"); qc.invalidateQueries({ queryKey: ["problem", id] }); },
    onError: (e: any) => toast.error(e.message ?? "실패"),
  });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground p-4">불러오는 중...</p>;
  const { problem, analysis, signedImage } = data;
  const meta = analysis ? PATTERN_META[analysis.pattern as Pattern] : null;
  const short = analysis?.short_card as any;
  const long = analysis?.long_report as any;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link to="/problems" className="text-sm text-muted-foreground hover:underline flex items-center gap-1 font-medium">
          ← 문제 목록으로
        </Link>
        <Button size="sm" variant="ghost" onClick={() => reAnalyze.mutate()} disabled={reAnalyze.isPending}>
          {reAnalyze.isPending ? "분석 중..." : "🔄 AI 재분석"}
        </Button>
      </div>

      <div className="rounded-3xl border bg-card p-5 space-y-3 shadow-sm">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium px-2 py-0.5 rounded-full bg-muted">{problem.subject ?? "수학"}</span>
          <span>·</span>
          <span>확신도 ★{problem.confidence}</span>
          <span>·</span>
          <span>⏱ {problem.time_spent_sec}초</span>
          <span className="ml-auto font-bold">{problem.is_correct ? "⭕ 정답" : "❌ 오답"}</span>
        </div>
        {signedImage && <img src={signedImage} alt="문제 이미지" className="rounded-2xl max-h-72 object-contain border my-2" />}
        <div className="whitespace-pre-wrap text-base font-medium">{problem.question_text}</div>
        {problem.choices && (
          <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground bg-accent/30 p-3 rounded-xl">
            {(problem.choices as string[]).map((c, i) => <li key={i}>{c}</li>)}
          </ol>
        )}
        <div className="grid md:grid-cols-2 gap-2 text-sm pt-2">
          <div className="rounded-xl bg-[var(--mint)]/30 p-3 border border-[var(--mint)]/50"><b>정답:</b> {problem.correct_answer}</div>
          <div className="rounded-xl bg-[var(--peach)]/30 p-3 border border-[var(--peach)]/50"><b>내 답:</b> {problem.my_answer}</div>
        </div>
        {problem.my_solution && (
          <div className="text-sm text-muted-foreground bg-muted/40 p-3 rounded-xl border-l-4 border-primary/60">
            <b>내 풀이 과정:</b> {problem.my_solution}
          </div>
        )}
      </div>

      {!analysis ? (
        <div className="rounded-3xl border border-dashed p-8 text-center bg-card">
          <p className="text-sm text-muted-foreground mb-3">아직 AI 정석 풀이 및 메타인지 진단이 없어요.</p>
          <Button onClick={() => reAnalyze.mutate()} disabled={reAnalyze.isPending}>AI 분석 & 정석 풀이 생성</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {meta && (
            <div className="rounded-3xl p-5 border shadow-sm" style={{ background: meta.color + "33", borderColor: meta.color + "66" }}>
              <div className="text-xs font-semibold text-muted-foreground">진단된 사고 오류 패턴</div>
              <div className="mt-1 text-2xl font-bold">{meta.emoji} {meta.label}</div>
              <div className="mt-2 text-sm leading-relaxed">{analysis.reason}</div>
            </div>
          )}

          <div className="rounded-full bg-muted p-1 grid grid-cols-2 gap-1">
            <button onClick={() => setMode("long")}
              className={`rounded-full py-2.5 text-sm font-semibold transition cursor-pointer ${mode === "long" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              💡 AI 정석 풀이 & 진단
            </button>
            <button onClick={() => setMode("short")}
              className={`rounded-full py-2.5 text-sm font-semibold transition cursor-pointer ${mode === "short" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              ⚡ 숏폼 루틴 & 챌린지
            </button>
          </div>

          {mode === "long" ? (
            <div className="rounded-3xl border bg-card p-5 space-y-5 shadow-sm">
              <Section 
                title="💡 AI 추천 정석 풀이" 
                body={long?.correct_solution || problem.explanation || "이전 분석 데이터입니다. 상단의 '🔄 AI 재분석' 버튼을 누르시면 최신 AI 정석 풀이가 생성됩니다!"} 
                highlight="mint" 
              />
              <Section 
                title="🎯 내 풀이의 허점 & 부족점 피드백" 
                body={long?.flaws || "상단의 '🔄 AI 재분석' 버튼을 누르시면 학생 풀이의 논리적 비약과 허점 피드백이 생성됩니다!"} 
                highlight="peach" 
              />
              <Section title="🧭 사고 궤적 추적" body={long?.trace} />
              <Section title="🎭 메타인지 착각 분석" body={long?.illusion} />
              <Section title="🛡 재발 방지 가이드" body={long?.prevention} />
            </div>
          ) : (
            <div className="rounded-3xl border bg-card p-5 space-y-4 shadow-sm">
              <div className="rounded-2xl bg-accent/60 p-4 text-lg font-medium">{short?.routine}</div>
              <div className="flex flex-wrap gap-2">
                {short?.tags?.map((t: string, i: number) => (
                  <span key={i} className="rounded-full bg-[var(--lavender)]/60 px-3 py-1 text-xs font-medium">{t}</span>
                ))}
              </div>
              <div>
                <div className="text-sm font-semibold mb-2">오늘의 실천 챌린지 ✅</div>
                <ul className="space-y-2">
                  {short?.challenges?.map((c: string, i: number) => (
                    <li key={i} className="flex gap-2 text-sm items-start">
                      <input type="checkbox" className="mt-1 rounded" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, body, highlight }: { title: string; body?: string; highlight?: "mint" | "peach" }) {
  if (!body) return null;
  const bgStyle = highlight === "mint" 
    ? "bg-[var(--mint)]/20 border border-[var(--mint)]/40 p-4 rounded-2xl" 
    : highlight === "peach" 
    ? "bg-[var(--peach)]/20 border border-[var(--peach)]/40 p-4 rounded-2xl" 
    : "";

  return (
    <div className={bgStyle}>
      <div className="text-sm font-bold text-primary">{title}</div>
      <p className="mt-1.5 text-sm whitespace-pre-wrap text-foreground/90">{body}</p>
    </div>
  );
}
