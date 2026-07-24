import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getProblem } from "@/lib/problems.functions";
import { analyzeProblem, askProblemQuestion } from "@/lib/ai.functions";
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

          {/* AI 추가 질문 챗봇 섹션 */}
          <AIChatSection problemId={id} />
        </div>
      )}
    </div>
  );
}

function AIChatSection({ problemId }: { problemId: string }) {
  const askFn = useServerFn(askProblemQuestion);
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [input, setInput] = useState("");

  const askMutation = useMutation({
    mutationFn: (qText: string) => askFn({
      data: {
        problem_id: problemId,
        user_question: qText,
        history: messages,
      }
    }),
    onSuccess: (res, qText) => {
      setMessages(prev => [
        ...prev,
        { role: "user", content: qText },
        { role: "assistant", content: res.answer }
      ]);
      setInput("");
    },
    onError: (e: any) => toast.error(e.message ?? "답변을 가져오지 못했어요."),
  });

  const handleSend = (textToSend?: string) => {
    const q = textToSend ?? input;
    if (!q.trim() || askMutation.isPending) return;
    askMutation.mutate(q.trim());
  };

  const quickChips = [
    "💡 이 문제 핵심 개념이 뭐야?",
    "🔍 1단계 풀이 과정을 더 쉽게 풀어줘",
    "🛡 실수하지 않는 검산 팁은?",
    "📝 시험에 나오면 제일 먼저 할 행동은?"
  ];

  return (
    <div className="rounded-3xl border bg-card p-5 space-y-4 shadow-sm border-primary/30">
      <div className="flex items-center gap-2">
        <span className="text-xl">🤖</span>
        <div>
          <h3 className="font-bold text-base">'또속' AI 튜터에게 1:1 질문하기</h3>
          <p className="text-xs text-muted-foreground">풀이 과정 중 궁금한 점이나 헷갈리는 공식을 자유롭게 물어보세요!</p>
        </div>
      </div>

      {/* 추천 질문 칩 */}
      <div className="flex flex-wrap gap-1.5 pt-1">
        {quickChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(chip)}
            disabled={askMutation.isPending}
            className="rounded-full border border-primary/20 bg-primary/5 hover:bg-primary/15 px-3 py-1 text-xs text-primary font-medium transition cursor-pointer disabled:opacity-50"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* 대화 내역 */}
      {messages.length > 0 && (
        <div className="space-y-3 pt-2 max-h-80 overflow-y-auto pr-1">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2 text-sm ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "assistant" && <span className="text-lg">🤖</span>}
              <div className={`rounded-2xl px-4 py-2.5 max-w-[85%] whitespace-pre-wrap ${
                m.role === "user" 
                  ? "bg-primary text-primary-foreground rounded-tr-none font-medium" 
                  : "bg-accent/80 text-foreground rounded-tl-none border"
              }`}>
                {m.content}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 질문 입력창 */}
      <div className="flex gap-2 pt-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
          placeholder="예: 2단계에서 왜 부호가 바뀌는지 설명해줘..."
          disabled={askMutation.isPending}
          className="flex-1 rounded-2xl border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
        />
        <Button 
          onClick={() => handleSend()} 
          disabled={askMutation.isPending || !input.trim()}
          className="rounded-2xl px-5"
        >
          {askMutation.isPending ? "생각 중..." : "전송 🚀"}
        </Button>
      </div>
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
