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
            { type: "text", text: "이미지에서 문제 등록에 필요한 정보를 최대한 추출하세요.\n- question_text: 발문 전체를 정확히 옮겨 적기\n- choices: 객관식 보기 배열 (없으면 null)\n- subject: 과목명 (수학/영어/국어/과학/사회 등, 불명확하면 null)\n- correct_answer: 해설/정답 표시가 보이면 그 값 (예: '3', 'ㄴ,ㄷ', '42'). 없으면 null\n- my_answer: 학생이 체크/필기한 답이 보이면 그 값. 없으면 null\n- my_solution: 학생이 손으로 쓴 풀이 흔적이 보이면 간단 요약. 없으면 null\n- explanation: 해설 텍스트가 보이면 그대로. 없으면 null" },
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
        prevention: z.string(),
      }),
    });

    const meta = `[학습자 확신도] ★${p.confidence}/5\n[소요 시간] ${p.time_spent_sec}초\n[결과] ${p.is_correct ? "정답" : "오답"}`;
    const bodyText = `${meta}\n\n[과목] ${p.subject ?? "미지정"}\n[문제]\n${p.question_text}\n${p.choices ? `[보기]\n${(p.choices as string[]).map((c,i)=>`${i+1}. ${c}`).join("\n")}` : ""}\n[학습자 답] ${p.my_answer}\n[정답] ${p.correct_answer}\n[학습자 풀이 과정]\n${p.my_solution ?? "(없음)"}\n[해설]\n${p.explanation ?? "(없음)"}`;

    const prompt = `너는 학생의 오답을 '메타인지' 관점에서 진단하는 AI 트레이너 '또속'이다.
아래 정보를 보고, 학생이 왜 그렇게 생각해서 틀렸는지 6가지 중 하나로 분류하고 진단서를 작성해라.
반드시 한국어로, 10대 학생에게 친근한 반말/존댓말 혼합의 다정한 톤으로.

패턴 정의:
- overconfidence: 확신도 높은데(★4~5) 틀린 경우 등 안다고 착각한 유형
- misreading: 발문·조건('옳지 않은 것' 등)의 핵심 단서를 놓친 유형
- time_pressure: 시간 부족 흔적으로 조급한 판단
- lost_path: 중간에 접근법을 잃고 무리한 계산 늪
- calc_mistake: 접근은 맞으나 단순 연산/실수
- no_knowledge: 개념/공식 자체를 몰라 손 못 댄 유형

출력 규칙:
- reason: 1~2문장, 왜 이 패턴인지 근거.
- short_card.routine: '📌' 이모지 포함 1줄 실천 루틴.
- short_card.tags: 3~5개, '#행동_태그' 형식.
- short_card.challenges: 2~3개, 오늘 실천할 체크박스 챌린지 문장.
- long_report.trace: 학생의 사고 궤적을 단계별로 재구성.
- long_report.illusion: 어디서 '안다고 착각'했는지 상세 분석.
- long_report.prevention: 재발 방지 가이드(2~4단계).

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
