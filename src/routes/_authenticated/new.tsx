import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { createProblem, } from "@/lib/problems.functions";
import { ocrImage, analyzeProblem } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/new")({
  head: () => ({ meta: [{ title: "새 오답 등록 · 또속" }, { name: "description", content: "확신도와 시간을 함께 기록하고 AI 분석을 받아보세요." }] }),
  component: NewProblem,
});

function NewProblem() {
  const router = useRouter();
  const create = useServerFn(createProblem);
  const analyze = useServerFn(analyzeProblem);
  const ocr = useServerFn(ocrImage);

  const [subject, setSubject] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [useChoices, setUseChoices] = useState(false);
  const [choices, setChoices] = useState<string[]>(["", "", "", ""]);
  const [correct, setCorrect] = useState("");
  const [mine, setMine] = useState("");
  const [mySolution, setMySolution] = useState("");
  const [explanation, setExplanation] = useState("");
  const [confidence, setConfidence] = useState(3);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [ocring, setOcring] = useState(false);
  const [saving, setSaving] = useState(false);

  // timer
  const startRef = useRef<number>(Date.now());
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 500);
    return () => clearInterval(t);
  }, []);

  async function uploadImageAndOcr(file: File) {
    setOcring(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user!.id;
      const path = `${uid}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("problem-images").upload(path, file);
      if (upErr) throw upErr;
      setImageUrl(path);

      // base64 for OCR
      const b64: string = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const ocred = await ocr({ data: { image_base64: b64 } });
      if (ocred.subject) setSubject(ocred.subject);
      if (ocred.question_text) setQuestionText(ocred.question_text);
      if (ocred.choices && ocred.choices.length) {
        setUseChoices(true);
        setChoices([...ocred.choices, ...Array(Math.max(0, 4 - ocred.choices.length)).fill("")]);
      }
      if (ocred.correct_answer) setCorrect(ocred.correct_answer);
      if (ocred.my_answer) setMine(ocred.my_answer);
      if (ocred.my_solution) setMySolution(ocred.my_solution);
      if (ocred.explanation) setExplanation(ocred.explanation);
      toast.success("이미지에서 문제를 읽어왔어요 ✨");

      // 자동 등록: 필수 필드가 모두 추출됐으면 바로 저장 + 분석 진행
      if (ocred.question_text && ocred.correct_answer && ocred.my_answer) {
        toast.info("자동 등록을 시작합니다...");
        await submitWith({
          subject: ocred.subject ?? null,
          question_text: ocred.question_text,
          choices: ocred.choices && ocred.choices.length ? ocred.choices : null,
          correct_answer: ocred.correct_answer,
          my_answer: ocred.my_answer,
          my_solution: ocred.my_solution ?? null,
          explanation: ocred.explanation ?? null,
          image_url: path,
        });
      }
    } catch (e: any) {
      toast.error("이미지 처리 실패: " + (e.message ?? e));
    } finally {
      setOcring(false);
    }
  }

  async function submitWith(fields: {
    subject: string | null;
    question_text: string;
    choices: string[] | null;
    correct_answer: string;
    my_answer: string;
    my_solution: string | null;
    explanation: string | null;
    image_url: string | null;
  }) {
    setSaving(true);
    try {
      const res = await create({
        data: { ...fields, confidence, time_spent_sec: elapsed },
      });
      toast.info("🧠 AI가 분석 중이에요...");
      await analyze({ data: { problem_id: res.id } });
      toast.success("분석 완료!");
      router.navigate({ to: "/problems/$id", params: { id: res.id } });
    } catch (e: any) {
      toast.error(e.message ?? "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  async function submit() {
    if (!questionText || !correct || !mine) return toast.error("문제·정답·내가 쓴 답은 꼭 필요해요!");
    setSaving(true);
    try {
      const res = await create({
        data: {
          subject: subject || null,
          question_text: questionText,
          choices: useChoices ? choices.filter(Boolean) : null,
          correct_answer: correct,
          my_answer: mine,
          my_solution: mySolution || null,
          explanation: explanation || null,
          image_url: imageUrl,
          confidence,
          time_spent_sec: elapsed,
        },
      });
      toast.info("🧠 AI가 분석 중이에요...");
      await analyze({ data: { problem_id: res.id } });
      toast.success("분석 완료!");
      router.navigate({ to: "/problems/$id", params: { id: res.id } });
    } catch (e: any) {
      toast.error(e.message ?? "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">새 오답 등록 ✏️</h1>
        <div className="rounded-full bg-accent px-3 py-1 text-xs font-mono">⏱ {elapsed}s</div>
      </div>

      <div className="rounded-3xl border bg-card p-5 space-y-4">
        <div>
          <Label>과목 (선택)</Label>
          <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="수학, 영어, 과학..." />
        </div>

        <Tabs defaultValue="text">
          <TabsList>
            <TabsTrigger value="text">✍️ 직접 입력</TabsTrigger>
            <TabsTrigger value="photo">📷 사진(OCR)</TabsTrigger>
          </TabsList>
          <TabsContent value="text" className="pt-3">
            <Label>문제</Label>
            <Textarea value={questionText} onChange={e => setQuestionText(e.target.value)} rows={4} placeholder="문제를 그대로 옮겨 적어주세요." />
          </TabsContent>
          <TabsContent value="photo" className="pt-3 space-y-2">
            <Input type="file" accept="image/*" onChange={e => e.target.files?.[0] && uploadImageAndOcr(e.target.files[0])} disabled={ocring} />
            {ocring && <p className="text-sm text-primary">🔍 AI가 이미지를 읽는 중...</p>}
            {questionText && (
              <>
                <Label>추출된 문제 (수정 가능)</Label>
                <Textarea value={questionText} onChange={e => setQuestionText(e.target.value)} rows={4} />
              </>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex items-center gap-2">
          <input id="useChoices" type="checkbox" checked={useChoices} onChange={e => setUseChoices(e.target.checked)} />
          <label htmlFor="useChoices" className="text-sm">객관식이에요</label>
        </div>
        {useChoices && (
          <div className="grid gap-2">
            {choices.map((c, i) => (
              <Input key={i} placeholder={`보기 ${i + 1}`} value={c} onChange={e => setChoices(cs => cs.map((v, j) => j === i ? e.target.value : v))} />
            ))}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-3">
          <div><Label>정답</Label><Input value={correct} onChange={e => setCorrect(e.target.value)} /></div>
          <div><Label>내가 쓴 답</Label><Input value={mine} onChange={e => setMine(e.target.value)} /></div>
        </div>

        <div><Label>내 풀이 과정 (있으면)</Label><Textarea value={mySolution} onChange={e => setMySolution(e.target.value)} rows={3} placeholder="어떻게 풀었는지 간단히 적으면 분석이 훨씬 정확해져요." /></div>
        <div><Label>해설 (있으면)</Label><Textarea value={explanation} onChange={e => setExplanation(e.target.value)} rows={2} /></div>

        <div>
          <Label>이 문제를 풀 때 확신도는? <span className="text-primary font-bold">★{confidence}</span></Label>
          <div className="mt-2 flex gap-2">
            {[1,2,3,4,5].map(n => (
              <button key={n} type="button" onClick={() => setConfidence(n)}
                className={`flex-1 rounded-2xl border py-3 flex items-center justify-center transition ${n === confidence ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-accent"}`}>
                <Star className={`h-5 w-5 ${n <= confidence ? "fill-current" : ""}`} />
              </button>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>1 · 감으로 찍음</span><span>5 · 완전 확신했음</span>
          </div>
        </div>

        <Button size="lg" className="w-full rounded-2xl" onClick={submit} disabled={saving || ocring}>
          {saving ? "🧠 AI 분석 중..." : "저장하고 분석 받기 →"}
        </Button>
      </div>
    </div>
  );
}
