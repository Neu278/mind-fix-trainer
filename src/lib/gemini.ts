// Client-side Gemini API helper. User provides their own API key.
export type SolveResult = {
  subject: string;
  unit: string;
  problem_text: string;
  concepts: string[];
  steps: { title: string; explanation: string }[];
  final_answer: string;
};

const SYSTEM_PROMPT = `너는 대한민국의 최고 수학 강사야. 학생이 올린 수학 문제 이미지를 정확히 분석해서 한국어로 친절하게 풀이해줘.
반드시 아래 JSON 스키마에 맞춰서만 응답해.
- problem_text: 이미지에서 인식한 문제 원문. 수식은 반드시 LaTeX 로 감싸서 표기. 인라인은 $...$, 별도 줄은 $$...$$ 사용.
- subject: '고등수학', '중등수학', '미적분', '확률과 통계' 등 과목명.
- unit: 단원명 (예: '이차함수', '삼각함수', '수열의 극한').
- concepts: 이 문제를 풀 때 사용된 핵심 개념·공식 목록. 각 항목에도 필요한 경우 $...$ LaTeX 포함.
- steps: 단계별 풀이. 각 step 은 title(한 줄 요약)과 explanation(자세한 설명)으로 구성. explanation 안에서는 $...$ / $$...$$ 로 수식 렌더링.
- final_answer: 최종 정답. 수식이면 $...$ 로 감싸기.
모든 설명은 100% 한국어로 작성. 마크다운 헤더(#) 사용하지 말고 자연스러운 문장으로.`;

export async function solveProblem(
  apiKey: string,
  imageBase64: string,
  mimeType: string,
): Promise<SolveResult> {
  const model = "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [
      {
        role: "user",
        parts: [
          { text: "다음 수학 문제 이미지를 분석하고 스키마에 맞춰 JSON 으로 풀이해줘." },
          { inline_data: { mime_type: mimeType, data: imageBase64 } },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          subject: { type: "STRING" },
          unit: { type: "STRING" },
          problem_text: { type: "STRING" },
          concepts: { type: "ARRAY", items: { type: "STRING" } },
          steps: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                title: { type: "STRING" },
                explanation: { type: "STRING" },
              },
              required: ["title", "explanation"],
            },
          },
          final_answer: { type: "STRING" },
        },
        required: ["subject", "unit", "problem_text", "concepts", "steps", "final_answer"],
      },
      temperature: 0.2,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini API 오류 (${res.status}): ${t.slice(0, 300)}`);
  }
  const json = await res.json();
  const text: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini 응답이 비어있습니다.");
  try {
    return JSON.parse(text) as SolveResult;
  } catch {
    throw new Error("Gemini 응답을 JSON 으로 해석하지 못했습니다.");
  }
}
