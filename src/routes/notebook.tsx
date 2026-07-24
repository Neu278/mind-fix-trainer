import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SolutionView } from "@/components/solution-view";
import { deleteNote, listNotes, updateNote, type Note } from "@/lib/storage";
import { BookmarkX, CheckCircle2, Filter, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/notebook")({
  head: () => ({
    meta: [
      { title: "오답노트 · 수학 풀이 AI" },
      { name: "description", content: "AI 풀이 결과를 저장해 나만의 오답노트를 만들고 반복 복습하세요." },
      { property: "og:title", content: "오답노트" },
      { property: "og:description", content: "저장한 수학 오답을 단원별로 정리하고 복습하세요." },
    ],
  }),
  component: NotebookPage,
});

function NotebookPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [subject, setSubject] = useState<string>("all");
  const [unit, setUnit] = useState<string>("all");
  const [showMastered, setShowMastered] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const refresh = () => setNotes(listNotes());
  useEffect(() => { refresh(); }, []);

  const subjects = useMemo(() => Array.from(new Set(notes.map((n) => n.result.subject).filter(Boolean))), [notes]);
  const units = useMemo(
    () => Array.from(new Set(notes.filter((n) => subject === "all" || n.result.subject === subject).map((n) => n.result.unit).filter(Boolean))),
    [notes, subject],
  );

  const filtered = notes.filter((n) => {
    if (!showMastered && n.mastered) return false;
    if (subject !== "all" && n.result.subject !== subject) return false;
    if (unit !== "all" && n.result.unit !== unit) return false;
    return true;
  });

  const current = notes.find((n) => n.id === openId) ?? null;

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">오답노트</h1>
          <p className="text-sm text-muted-foreground">저장한 문제 {notes.length}개 · 복습 완료 {notes.filter((n) => n.mastered).length}개</p>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" /> 필터
          </div>
          <Select label="과목" value={subject} onChange={(v) => { setSubject(v); setUnit("all"); }} options={[{ value: "all", label: "전체" }, ...subjects.map((s) => ({ value: s, label: s }))]} />
          <Select label="단원" value={unit} onChange={setUnit} options={[{ value: "all", label: "전체" }, ...units.map((u) => ({ value: u, label: u }))]} />
          <label className="ml-auto flex items-center gap-2 text-sm">
            <Checkbox checked={showMastered} onCheckedChange={(v) => setShowMastered(!!v)} />
            복습 완료 포함
          </label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed p-12 text-center">
          <BookmarkX className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-medium">저장된 오답이 아직 없어요</p>
          <p className="text-sm text-muted-foreground">문제를 풀이한 뒤 <b>오답노트에 저장하기</b> 버튼을 눌러주세요.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((n) => (
            <button
              key={n.id}
              onClick={() => setOpenId(n.id)}
              className="group text-left rounded-2xl border bg-card overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition"
            >
              <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
                <img src={n.imageDataUrl} alt="문제 썸네일" className="w-full h-full object-contain" />
              </div>
              <div className="p-3">
                <div className="flex flex-wrap gap-1 mb-1">
                  {n.result.subject && <span className="rounded-full bg-[var(--sky)] px-2 py-0.5 text-[10px] font-medium">{n.result.subject}</span>}
                  {n.result.unit && <span className="rounded-full bg-[var(--mint)] px-2 py-0.5 text-[10px] font-medium">{n.result.unit}</span>}
                  {n.mastered && <span className="rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-medium inline-flex items-center gap-0.5"><CheckCircle2 className="h-2.5 w-2.5" />완료</span>}
                </div>
                <p className="text-sm font-medium line-clamp-2">
                  정답: {n.result.final_answer.replace(/\$/g, "")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleDateString("ko-KR")}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      <NoteDetailDialog
        note={current}
        onClose={() => setOpenId(null)}
        onChange={(patch) => {
          if (!current) return;
          updateNote(current.id, patch);
          refresh();
        }}
        onDelete={() => {
          if (!current) return;
          deleteNote(current.id);
          setOpenId(null);
          refresh();
          toast.info("오답노트에서 삭제했어요.");
        }}
      />
    </div>
  );
}

function NoteDetailDialog({
  note,
  onClose,
  onChange,
  onDelete,
}: {
  note: Note | null;
  onClose: () => void;
  onChange: (patch: Partial<Note>) => void;
  onDelete: () => void;
}) {
  const [memo, setMemo] = useState("");
  useEffect(() => { setMemo(note?.memo ?? ""); }, [note?.id]);

  return (
    <Dialog open={!!note} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        {note && (
          <>
            <DialogHeader>
              <DialogTitle>오답 상세보기</DialogTitle>
            </DialogHeader>
            <div className="space-y-5">
              <div className="rounded-2xl border bg-card p-3">
                <img src={note.imageDataUrl} alt="원본 문제" className="max-h-[300px] mx-auto rounded-xl" />
              </div>

              <div className="rounded-2xl border bg-accent/30 p-4 space-y-2">
                <Label htmlFor="memo" className="font-semibold">내 메모</Label>
                <Textarea
                  id="memo"
                  rows={3}
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  onBlur={() => onChange({ memo })}
                  placeholder="이 문제를 왜 틀렸는지, 다음에 어떻게 접근할지 적어두세요."
                />
              </div>

              <SolutionView result={note.result} />

              <div className="sticky bottom-0 -mx-6 border-t bg-background/95 px-6 py-3 flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Checkbox
                    checked={note.mastered}
                    onCheckedChange={(v) => onChange({ mastered: !!v })}
                  />
                  완전 정복 (복습 완료)
                </label>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={onClose}>닫기</Button>
                  <Button variant="destructive" onClick={onDelete}>
                    <Trash2 className="h-4 w-4 mr-1" /> 삭제
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border bg-background px-3 py-1.5 text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}
