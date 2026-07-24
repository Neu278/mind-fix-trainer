import type { SolveResult } from "@/lib/gemini";
import { MathText } from "./math-text";
import { BookOpen, Lightbulb, ListOrdered, Sparkles } from "lucide-react";

export function SolutionView({ result }: { result: SolveResult }) {
  return (
    <div className="space-y-5">
      <Section icon={<BookOpen className="h-4 w-4" />} title="문제 인식 결과" tone="sky">
        <div className="flex flex-wrap gap-2 mb-2">
          {result.subject && <Chip>{result.subject}</Chip>}
          {result.unit && <Chip variant="mint">{result.unit}</Chip>}
        </div>
        <MathText className="leading-relaxed">{result.problem_text}</MathText>
      </Section>

      {result.concepts?.length > 0 && (
        <Section icon={<Lightbulb className="h-4 w-4" />} title="핵심 개념 & 공식" tone="peach">
          <ul className="space-y-2">
            {result.concepts.map((c, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-primary">✦</span>
                <MathText>{c}</MathText>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section icon={<ListOrdered className="h-4 w-4" />} title="단계별 풀이" tone="lavender">
        <ol className="space-y-4">
          {result.steps.map((s, i) => (
            <li key={i} className="rounded-2xl bg-background/60 border p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {i + 1}
                </span>
                <h4 className="font-semibold"><MathText>{s.title}</MathText></h4>
              </div>
              <div className="text-sm leading-relaxed text-foreground/90">
                <MathText>{s.explanation}</MathText>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <div className="rounded-3xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 to-accent/40 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Sparkles className="h-4 w-4" /> 최종 정답
        </div>
        <div className="mt-2 text-2xl font-bold">
          <MathText>{result.final_answer}</MathText>
        </div>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  tone,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  tone: "sky" | "mint" | "peach" | "lavender";
  children: React.ReactNode;
}) {
  const bg: Record<string, string> = {
    sky: "bg-[var(--sky)]/30",
    mint: "bg-[var(--mint)]/30",
    peach: "bg-[var(--peach)]/30",
    lavender: "bg-[var(--lavender)]/30",
  };
  return (
    <section className={`rounded-3xl border p-5 ${bg[tone]}`}>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-foreground/70">
        {icon} {title}
      </h3>
      <div>{children}</div>
    </section>
  );
}

function Chip({ children, variant = "sky" }: { children: React.ReactNode; variant?: "sky" | "mint" }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${variant === "mint" ? "bg-[var(--mint)]" : "bg-[var(--sky)]"}`}>
      {children}
    </span>
  );
}
