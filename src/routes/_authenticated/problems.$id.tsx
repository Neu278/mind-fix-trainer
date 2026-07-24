import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getProblem, deleteProblem } from "@/lib/problems.functions";
import { analyzeProblem } from "@/lib/ai.functions";
import { PATTERN_META, type Pattern } from "@/lib/patterns";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/problems/$id")({
  head: () => ({ meta: [{ title: "오답 상세 · 또속" }, { name: "description", content: "Dual-Track 피드백" }] }),
  component: ProblemDetail,
});

function ProblemDetail() {
  const { id } = Route.useParams();
  const router = useRouter();
  const fn = useServerFn(getProblem);
  const analyze = useServerFn(analyzeProblem);
  const remove = useServerFn(deleteProblem);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["problem", id], queryFn: () => fn({ data: { id } }) });
  const [mode, setMode] = useState<"short" | "long">("short");

  const reAnalyze = useMutation({
    mutationFn: () => analyze({ data: { problem_id: id } }),
    onSuccess: () => { toast.success("재분석 완료!"); qc.invalidateQueries({ queryKey: ["problem", id] }); },
    onError: (e: any) => toast.error(e.message ?? "실패"),
  });

  const removeMut = useMutation({
    mutationFn: () => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("문제가 삭제되었습니다.");
      qc.invalidateQueries({ queryKey: ["problems"] });
      router.navigate({ to: "/problems" });
    },
    onError: (e: any) => toast.error(e.message ?? "삭제 실패"),
  });

  function handleDelete() {
    if (confirm("이 오답 문제와 분석 기록을 정말 삭제할까요?")) {
      removeMut.mutate();
    }
  }

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">불러오는 중...</p>;
  const { problem, analysis, signedImage } = data;
  const meta = analysis ? PATTERN_META[analysis.pattern as Pattern] : null;
  const short = analysis?.short_card as any;
  const long = analysis?.long_report as any;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link to="/problems" className="text-sm text-muted-foreground">← 목록</Link>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => reAnalyze.mutate()} disabled={reAnalyze.isPending}>
            {reAnalyze.isPending ? "분석 중..." : "🔄 재분석"}
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={handleDelete} disabled={removeMut.isPending}>
            <Trash2 className="h-4 w-4 mr-1" />
            삭제
          </Button>
        </div>
      </div>

      <div className="rounded-3xl border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium">{problem.subject ?? "일반"}</span>
          <span>·</span>
          <span>★{problem.confidence}</span>
          <span>·</span>
          <span>⏱ {problem.time_spent_sec}s</span>
          <span className="ml-auto">{problem.is_correct ? "⭕ 정답" : "❌ 오답"}</span>
        </div>
        {signedImage && <img src={signedImage} alt="문제 이미지" className="rounded-2xl max-h-72 object-contain" />}
        <div className="whitespace-pre-wrap text-sm">{problem.question_text}</div>
        {problem.choices && (
          <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
            {(problem.choices as string[]).map((c, i) => <li key={i}>{c}</li>)}
          </ol>
        )}
        <div className="grid md:grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-[var(--mint)]/30 p-3"><b>정답:</b> {problem.correct_answer}</div>
          <div className="rounded-xl bg-[var(--peach)]/30 p-3"><b>내 답:</b> {problem.my_answer}</div>
        </div>
        {problem.my_solution && <div className="text-sm text-muted-foreground border-l-2 border-primary/40 pl-3">내 풀이: {problem.my_solution}</div>}
      </div>

      {!analysis ? (
        <div className="rounded-3xl border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground mb-3">아직 분석이 없어요.</p>
          <Button onClick={() => reAnalyze.mutate()} disabled={reAnalyze.isPending}>AI 분석 시작</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {meta && (
            <div className="rounded-3xl p-5" style={{ background: meta.color + "33" }}>
              <div className="text-xs font-medium text-muted-foreground">진단된 사고 오류 패턴</div>
              <div className="mt-1 text-2xl font-bold">{meta.emoji} {meta.label}</div>
              <div className="mt-2 text-sm">{analysis.reason}</div>
            </div>
          )}

          <div className="rounded-full bg-muted p-1 grid grid-cols-2 gap-1">
            <button onClick={() => setMode("short")}
              className={`rounded-full py-2 text-sm font-medium transition ${mode === "short" ? "bg-primary text-primary-foreground" : ""}`}>
              ⚡ 숏폼 카드
            </button>
            <button onClick={() => setMode("long")}
              className={`rounded-full py-2 text-sm font-medium transition ${mode === "long" ? "bg-primary text-primary-foreground" : ""}`}>
              🔍 장문 정밀
            </button>
          </div>

          {mode === "short" ? (
            <div className="rounded-3xl border bg-card p-5 space-y-4">
              <div className="rounded-2xl bg-accent/60 p-4 text-lg font-medium">{short?.routine}</div>
              <div className="flex flex-wrap gap-2">
                {short?.tags?.map((t: string, i: number) => (
                  <span key={i} className="rounded-full bg-[var(--lavender)]/60 px-3 py-1 text-xs font-medium">{t}</span>
                ))}
              </div>
              <div>
                <div className="text-sm font-semibold mb-2">오늘의 챌린지 ✅</div>
                <ul className="space-y-2">
                  {short?.challenges?.map((c: string, i: number) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <input type="checkbox" className="mt-1" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border bg-card p-5 space-y-5">
              <Section title="🧭 사고 궤적 추적" body={long?.trace} />
              <Section title="🎭 메타인지 착각 분석" body={long?.illusion} />
              <Section title="🛡 재발 방지 가이드" body={long?.prevention} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <div className="text-sm font-bold text-primary">{title}</div>
      <p className="mt-1.5 text-sm whitespace-pre-wrap text-foreground/90">{body}</p>
    </div>
  );
}
