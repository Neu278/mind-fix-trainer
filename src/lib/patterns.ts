export type Pattern =
  | "overconfidence" | "misreading" | "time_pressure"
  | "lost_path" | "calc_mistake" | "no_knowledge";

export const PATTERN_META: Record<Pattern, { label: string; emoji: string; color: string; desc: string }> = {
  overconfidence: { label: "과신/착각형", emoji: "🎭", color: "oklch(0.75 0.14 340)", desc: "안다고 생각했지만 잘못 적용" },
  misreading:     { label: "조건 오독형", emoji: "🔍", color: "oklch(0.75 0.14 40)",  desc: "발문·조건의 핵심 단서 놓침" },
  time_pressure:  { label: "시간 압박형", emoji: "⏱️", color: "oklch(0.75 0.14 90)",  desc: "시간 부족으로 조급한 판단" },
  lost_path:      { label: "풀이 길 잃음", emoji: "🌀", color: "oklch(0.72 0.14 220)", desc: "중간에 접근법을 잃음" },
  calc_mistake:   { label: "연산/실수형", emoji: "✏️", color: "oklch(0.75 0.14 165)", desc: "아이디어는 맞았으나 계산 오차" },
  no_knowledge:   { label: "지식 부재형", emoji: "📚", color: "oklch(0.72 0.14 295)", desc: "개념·공식 자체를 모름" },
};

export const ALL_PATTERNS: Pattern[] = ["overconfidence","misreading","time_pressure","lost_path","calc_mistake","no_knowledge"];
