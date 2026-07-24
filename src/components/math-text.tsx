import "katex/dist/katex.min.css";
import { InlineMath, BlockMath } from "react-katex";

/**
 * Render text that may contain LaTeX delimited by $...$ (inline) or $$...$$ (block).
 * Supports multi-line text; blocks render on their own line.
 */
export function MathText({ children, className }: { children: string; className?: string }) {
  const parts = tokenize(children ?? "");
  return (
    <span className={className}>
      {parts.map((p, i) => {
        if (p.type === "block") {
          try {
            return <BlockMath key={i} math={p.value} />;
          } catch {
            return <code key={i}>{p.value}</code>;
          }
        }
        if (p.type === "inline") {
          try {
            return <InlineMath key={i} math={p.value} />;
          } catch {
            return <code key={i}>{p.value}</code>;
          }
        }
        // Text may contain newlines
        return (
          <span key={i} style={{ whiteSpace: "pre-wrap" }}>
            {p.value}
          </span>
        );
      })}
    </span>
  );
}

type Tok = { type: "text" | "inline" | "block"; value: string };
function tokenize(input: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  const n = input.length;
  let buf = "";
  const flush = () => {
    if (buf) {
      out.push({ type: "text", value: buf });
      buf = "";
    }
  };
  while (i < n) {
    if (input[i] === "$" && input[i + 1] === "$") {
      const end = input.indexOf("$$", i + 2);
      if (end === -1) {
        buf += input.slice(i);
        break;
      }
      flush();
      out.push({ type: "block", value: input.slice(i + 2, end).trim() });
      i = end + 2;
      continue;
    }
    if (input[i] === "$") {
      const end = input.indexOf("$", i + 1);
      if (end === -1) {
        buf += input.slice(i);
        break;
      }
      flush();
      out.push({ type: "inline", value: input.slice(i + 1, end).trim() });
      i = end + 1;
      continue;
    }
    buf += input[i];
    i++;
  }
  flush();
  return out;
}
