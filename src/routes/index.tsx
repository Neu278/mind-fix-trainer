import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "또속 (Ttosok) — AI 메타인지 오답 트레이너" },
      { name: "description", content: "안다고 착각한 지점을 짚어주는 오답 노트. 문제·확신도·시간을 기록하면 AI가 왜 틀렸는지 분석해줍니다." },
      { property: "og:title", content: "또속 — 안다고 착각한 그 지점을 짚어드려요" },
      { property: "og:description", content: "6가지 메타인지 오답 패턴 자동 분류 · Dual-Track 맞춤 처방" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[oklch(0.97_0.04_295)] via-background to-[oklch(0.96_0.05_165)]">
      <header className="mx-auto max-w-5xl px-4 py-5 flex items-center justify-between">
        <div className="text-2xl font-bold text-primary">또속</div>
        <Button asChild variant="ghost"><Link to="/auth">로그인</Link></Button>
      </header>
      <section className="mx-auto max-w-3xl px-4 pt-16 pb-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-accent/60 px-4 py-1.5 text-xs font-medium">
          🧠 AI 메타인지 PT 트레이너
        </div>
        <h1 className="mt-6 text-5xl md:text-6xl font-bold leading-tight tracking-tight">
          "왜 틀렸는가"를<br/>
          <span className="text-primary">짚어드려요.</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
          단순 오답 저장소가 아니에요. 확신도·시간·풀이를 함께 기록하면,
          AI가 <b>6가지 사고 오류 패턴</b>으로 분류하고 나만의 <b>행동 교정 루틴</b>을 제안해요.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild size="lg" className="rounded-2xl px-8"><Link to="/auth">지금 시작하기 →</Link></Button>
        </div>

        <div className="mt-20 grid gap-4 md:grid-cols-2 text-left">
          {[
            { emoji: "🎯", title: "메타인지 갭 측정", desc: "확신도(★1~5)와 소요 시간으로 '안다고 착각한 지점'을 수치화" },
            { emoji: "🧩", title: "6대 오답 패턴 자동 분류", desc: "과신·조건오독·시간압박·풀이길잃음·연산실수·지식부재" },
            { emoji: "📊", title: "메타인지 다이어그램", desc: "4분면 매트릭스 · 레이더 차트 · 시간 히트맵" },
            { emoji: "⚡", title: "Dual-Track 처방", desc: "숏폼 카드로 빠르게, 장문 리포트로 깊게 — 토글 전환" },
          ].map((f) => (
            <div key={f.title} className="rounded-3xl bg-card border p-6 shadow-sm">
              <div className="text-3xl">{f.emoji}</div>
              <div className="mt-3 font-bold">{f.title}</div>
              <div className="mt-1 text-sm text-muted-foreground">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
