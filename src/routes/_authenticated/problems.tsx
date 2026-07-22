import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listProblems } from "@/lib/problems.functions";
import { PATTERN_META, ALL_PATTERNS, type Pattern } from "@/lib/patterns";
import { ProblemCard } from "./dashboard";

export const Route = createFileRoute("/_authenticated/problems")({
  head: () => ({ meta: [{ title: "오답 노트 · 또속" }, { name: "description", content: "패턴별로 오답을 필터링해 보세요." }] }),
  component: ProblemsList,
});

function ProblemsList() {
  const fn = useServerFn(listProblems);
  const { data = [], isLoading } = useQuery({ queryKey: ["problems"], queryFn: () => fn() });
  const [filter, setFilter] = useState<Pattern | "all">("all");

  const filtered = filter === "all" ? data : data.filter(p => p.analyses?.[0]?.pattern === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">오답 노트 📓</h1>
        <Link to="/new" className="text-sm text-primary font-semibold">+ 등록</Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterPill active={filter === "all"} onClick={() => setFilter("all")}>전체 {data.length}</FilterPill>
        {ALL_PATTERNS.map(p => {
          const count = data.filter(d => d.analyses?.[0]?.pattern === p).length;
          const m = PATTERN_META[p];
          return (
            <FilterPill key={p} active={filter === p} onClick={() => setFilter(p)} color={m.color}>
              {m.emoji} {m.label} {count}
            </FilterPill>
          );
        })}
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">불러오는 중...</p> :
       filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed p-8 text-center text-muted-foreground">해당 패턴의 문제가 아직 없어요.</div>
       ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map(p => <ProblemCard key={p.id} p={p} />)}
        </div>
      )}
    </div>
  );
}

function FilterPill({ children, active, onClick, color }: { children: React.ReactNode; active: boolean; onClick: () => void; color?: string }) {
  return (
    <button onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${active ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-accent"}`}
      style={active && color ? { background: color, color: "var(--foreground)", borderColor: color } : undefined}>
      {children}
    </button>
  );
}
