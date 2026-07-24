import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ImageUploader, type UploaderValue } from "@/components/image-uploader";
import { SolutionView } from "@/components/solution-view";
import { SettingsDialog } from "@/components/settings-dialog";
import { Button } from "@/components/ui/button";
import { solveProblem, type SolveResult } from "@/lib/gemini";
import { addNote, getApiKey } from "@/lib/storage";
import { BookmarkPlus, Loader2, Sparkles, KeyRound } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "수학 풀이 AI · 이미지로 풀이받기" },
      { name: "description", content: "수학 문제 사진을 올리면 AI가 개념·단계별 풀이·정답을 한국어로 알려줘요." },
      { property: "og:title", content: "수학 풀이 AI" },
      { property: "og:description", content: "이미지 한 장이면 AI가 수학 문제를 단계별로 풀어드려요." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [image, setImage] = useState<UploaderValue | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SolveResult | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  async function onSolve() {
    if (!image) {
      toast.error("먼저 문제 이미지를 선택해 주세요.");
      return;
    }
    const key = getApiKey();
    if (!key) {
      toast.error("Gemini API 키를 먼저 설정해 주세요.");
      setSettingsOpen(true);
      return;
    }
    setLoading(true);
    setResult(null);
    setSaved(false);
    try {
      const base64 = image.dataUrl.split(",")[1] ?? "";
      const r = await solveProblem(key, base64, image.mimeType);
      setResult(r);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function saveToNotebook() {
    if (!result || !image) return;
    addNote({
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      imageDataUrl: image.dataUrl,
      result,
      memo: "",
      mastered: false,
    });
    setSaved(true);
    toast.success("오답노트에 저장했어요.");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <section className="lg:col-span-2 space-y-4">
        <div className="rounded-3xl border bg-card p-5">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            수학 문제 이미지
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">사진을 업로드하고 문제 영역만 크롭한 뒤 AI로 풀이하세요.</p>
          <div className="mt-4">
            <ImageUploader value={image} onChange={(v) => { setImage(v); setResult(null); setSaved(false); }} />
          </div>
          <Button className="mt-4 w-full h-12 text-base" onClick={onSolve} disabled={loading || !image}>
            {loading ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> AI가 풀이 중...</>
            ) : (
              <><Sparkles className="mr-2 h-5 w-5" /> AI로 풀이하기</>
            )}
          </Button>
          {!getApiKey() && (
            <button
              onClick={() => setSettingsOpen(true)}
              className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl bg-accent/60 py-2 text-xs font-medium hover:bg-accent"
            >
              <KeyRound className="h-3.5 w-3.5" /> Gemini API 키를 먼저 등록해주세요
            </button>
          )}
        </div>
      </section>

      <section className="lg:col-span-3">
        {loading && <LoadingCard />}
        {!loading && !result && <EmptyCard />}
        {!loading && result && (
          <div className="space-y-4">
            <SolutionView result={result} />
            <Button
              className="w-full h-12 text-base"
              variant={saved ? "outline" : "default"}
              onClick={saveToNotebook}
              disabled={saved}
            >
              <BookmarkPlus className="mr-2 h-5 w-5" />
              {saved ? "저장 완료" : "오답노트에 저장하기"}
            </Button>
          </div>
        )}
      </section>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="rounded-3xl border bg-card p-10 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
      <h3 className="mt-4 font-bold">AI가 문제를 분석하고 있어요</h3>
      <p className="mt-1 text-sm text-muted-foreground">잠시만 기다려 주세요. 보통 10초 이내에 완료돼요.</p>
      <div className="mt-6 grid gap-2">
        {["📖 문제 인식 중...", "💡 개념·공식 매칭...", "✍️ 단계별 풀이 작성..."].map((t, i) => (
          <div key={i} className="rounded-full bg-accent/40 py-2 text-xs" style={{ animation: `pulse 1.5s ${i * 0.3}s infinite` }}>{t}</div>
        ))}
      </div>
    </div>
  );
}

function EmptyCard() {
  return (
    <div className="rounded-3xl border border-dashed bg-card/60 p-10 text-center text-muted-foreground">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--lavender)]/40">
        <Sparkles className="h-8 w-8 text-primary" />
      </div>
      <h3 className="mt-4 font-bold text-foreground">문제 이미지를 올려주세요</h3>
      <p className="mt-1 text-sm">왼쪽에서 이미지를 선택하고 <b>AI로 풀이하기</b> 버튼을 누르면<br />여기에 단계별 풀이가 나타나요.</p>
    </div>
  );
}
