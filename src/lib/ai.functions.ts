import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateText, Output, NoObjectGeneratedError } from "ai";
import { getGeminiProvider } from "./ai-gateway.server";

const MODEL = "gemini-2.5-flash";

function gateway() {
  return getGeminiProvider();
}

// --- OCR: read a problem image and return question / choices / correct / my_answer / my_solution guesses.
export const ocrImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    image_base64: z.string().min(10), // "data:image/...;base64,..."
  }).parse(d))
  .handler(async ({ data }) => {
    const provider = gateway();
    const schema = z.object({
      subject: z.string().nullable(),
      question_text: z.string(),
      choices: z.array(z.string()).nullable(),
      correct_answer: z.string().nullable(),
      my_answer: z.string().nullable(),
      my_solution: z.string().nullable(),
      explanation: z.string().nullable(),
    });
    try {
      const result = await generateText({
        model: provider(MODEL),
        output: Output.object({ schema }),
        messages: [{
          role: "user",
          content: [
            { type: "text", text: "이 이미지는 학생의 수학 오답 노트/문제집 페이지입니다. 등록에 필요한 정보를 최대한 정확히 추출하세요.\n- question_text: 수학 문제 발문 전체. 수식/기호(제곱, 분수, 함수 표기 등)는 자연스러운 텍스트(예: x^2, √3, y = f(x))로 옮겨 적기\n- choices: 객관식 보기 배열 (없으면 null). 수식 기호 그대로 유지\n- subject: '수학' 으로 고정\n- correct_answer: 정답 표시가 보이면 그 값 (예: '3', '②', 'x = 2', '12')\n- my_answer: 학생이 체크/필기한 답이 보이면 그 값\n- my_solution: 학생이 손으로 쓴 계산/풀이 흔적이 보이면 단계별로 간단 요약\n- explanation: 해설 텍스트가 보이면 그대로" },
            { type: "image", image: data.image_base64 },
          ],
        }],
      });
      return result.output;
    } catch (e) {
      if (NoObjectGeneratedError.isInstance(e)) {
        return { subject: null, question_text: "", choices: null, correct_answer: null, my_answer: null, my_solution: null, explanation: null };
      }
      throw e;
    }
  });

// --- Analyze: 6-pattern classification + Dual-Track output
export const analyzeProblem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ problem_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: p, error } = await context.supabase
      .from("problems").select("*").eq("id", data.problem_id).single();
    if (error) throw new Error(error.message);

    const provider = gateway();
    const schema = z.object({
      pattern: z.enum(["overconfidence","misreading","time_pressure","lost_path","calc_mistake","no_knowledge"]),
      reason: z.string(),
      short_card: z.object({
        routine: z.string(),
        tags: z.array(z.string()),
        challenges: z.array(z.string()),
      }),
      long_report: z.object({
        trace: z.string(),
        illusion: z.string(),
        correct_solution: z.string(),
        flaws: z.string(),
        prevention: z.string(),
      }),
    });

    const meta = `[학습자 확신도] ★${p.confidence}/5\n[소요 시간] ${p.time_spent_sec}초\n[결과] ${p.is_correct ? "정답" : "오답"}`;
    const bodyText = `${meta}\n\n[과목] 수학\n[문제]\n${p.question_text}\n${p.choices ? `[보기]\n${(p.choices as string[]).map((c,i)=>`${i+1}. ${c}`).join("\n")}` : ""}\n[학습자 답] ${p.my_answer}\n[정답] ${p.correct_answer}\n[학습자 풀이 과정]\n${p.my_solution ?? "(없음)"}\n[해설]\n${p.explanation ?? "(없음)"}`;

    const prompt = `너는 학생의 '수학 오답'을 메타인지 관점에서 진단하는 AI 트레이너 '또속'이다.
이 서비스는 수학 오답 전용이며, 항상 수학 학습 맥락(개념·공식·조건 해석·계산 절차·풀이 전략)에서 분석해라.
반드시 한국어로, 10대 학생에게 친근한 다정한 톤으로 작성.

수학 오답 6가지 패턴 정의:
- overconfidence: 확신도 높은데(★4~5) 틀림 — 수학 개념을 안다고 착각(공식/정의를 잘못 기억, 예외 상황 무시 등)
- misreading: 발문·조건('양수', '정수', '옳지 않은 것', 범위, 단위 등) 핵심 수학 조건을 놓친 유형
- time_pressure: 시간 부족으로 급하게 처리하다가 조건 확인/검산을 건너뛴 유형
- lost_path: 접근 전략을 잃고 무리한 식 전개·대입에 빠진 유형(풀이의 방향성 상실)
- calc_mistake: 접근·식 세우기는 맞으나 부호/이항/대입/사칙연산 등 단순 계산 실수
- no_knowledge: 필요한 수학 개념·공식·정리 자체를 몰라 손도 못 댄 유형

출력 규칙(모두 수학 학습 맥락으로):
- reason: 1~2문장, 이 수학 오답이 왜 이 패턴인지 근거(어떤 개념/조건/계산 단계에서 문제였는지).
- short_card.routine: '📌' 이모지 포함 1줄 실천 루틴(예: '📌 문제 읽자마자 조건에 동그라미 치기').
- short_card.tags: 3~5개, '#조건_확인' '#검산_습관' 처럼 수학 학습 행동 태그.
- short_card.challenges: 2~3개, 오늘 실천할 체크박스 챌린지 문장(수학 학습 행동).
- long_report.trace: 학생의 사고 궤적을 수식/단계 기준으로 재구성.
- long_report.illusion: 어떤 수학 개념/조건에서 '안다고 착각'했는지 상세 분석.
- long_report.correct_solution: AI가 추천하는 이 문제의 올바른 정석 단계별 풀이 과정(Step 1, Step 2...).
- long_report.flaws: 학생의 풀이/생각 과정에서 결정적으로 부족했던 점, 놓친 조건, 논리적 비약이나 허점을 핀포인트로 다정하게 지적.
- long_report.prevention: 재발 방지 가이드(2~4단계, 수학 문제 풀이 루틴).

정보:
${bodyText}`;

    let output: z.infer<typeof schema>;
    try {
      const r = await generateText({
        model: provider(MODEL),
        output: Output.object({ schema }),
        prompt,
      });
      output = r.output;
    } catch (e) {
      if (NoObjectGeneratedError.isInstance(e)) throw new Error("AI 분석 결과를 해석하지 못했어요. 다시 시도해 주세요.");
      throw e;
    }

    // Heuristic override: overconfidence signal
    if (!p.is_correct && p.confidence >= 4) output.pattern = "overconfidence";

    const { error: upErr } = await context.supabase
      .from("analyses")
      .upsert({
        problem_id: p.id,
        user_id: context.userId,
        pattern: output.pattern,
        reason: output.reason,
        short_card: output.short_card,
        long_report: output.long_report,
      }, { onConflict: "problem_id" });
    if (upErr) throw new Error(upErr.message);

    return output;
  });

// --- Q&A: Ask follow-up questions to AI tutor about the problem
export const askProblemQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    problem_id: z.string().uuid(),
    user_question: z.string().min(1),
    history: z.array(z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: p, error } = await context.supabase
      .from("problems").select("*, analyses(*)").eq("id", data.problem_id).single();
    if (error) throw new Error(error.message);

    const provider = gateway();
    const analysis = Array.isArray(p.analyses) ? p.analyses[0] : p.analyses;
    const long = analysis?.long_report as any;

    const contextText = `[수학 문제]\n${p.question_text}\n${p.choices ? `[보기]\n${(p.choices as string[]).map((c,i)=>`${i+1}. ${c}`).join("\n")}` : ""}\n[학습자 답] ${p.my_answer}\n[정답] ${p.correct_answer}\n[학습자 풀이 과정]\n${p.my_solution ?? "(없음)"}\n[AI 정석 풀이]\n${long?.correct_solution ?? "(없음)"}\n[내 풀이의 부족점]\n${long?.flaws ?? "(없음)"}`;

    const systemPrompt = `너는 학생의 수학 오답 노트를 함께 짚어주는 다정하고 실력 있는 AI 튜터 '또속'이다.
학생이 이 오답 문제와 정석 풀이에 대해 추가 질문을 했다.
반드시 한국어로, 10대 학생이 친근감을 느끼는 다정한 톤으로 쉽게 풀어서 설명해라.
필요하면 단계별 예시나 간단한 수식 표기(x^2, √3 등)를 들어 쉽게 대답해라.

문제 맥락:
${contextText}`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...(data.history ?? []).map(h => ({
        role: h.role === "user" ? ("user" as const) : ("assistant" as const),
        content: h.content,
      })),
      { role: "user" as const, content: data.user_question },
    ];

    const result = await generateText({
      model: provider(MODEL),
      messages,
    });

    return { answer: result.text };
  });
