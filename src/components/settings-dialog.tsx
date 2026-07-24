import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiKey, setApiKey, clearApiKey } from "@/lib/storage";
import { toast } from "sonner";
import { KeyRound, ExternalLink } from "lucide-react";

export function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) setValue(getApiKey());
  }, [open]);

  const save = () => {
    const v = value.trim();
    if (!v) {
      toast.error("API 키를 입력해 주세요.");
      return;
    }
    setApiKey(v);
    toast.success("Gemini API 키가 저장되었어요.");
    onOpenChange(false);
  };

  const remove = () => {
    clearApiKey();
    setValue("");
    toast.info("API 키를 삭제했어요.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" /> Gemini API 키 설정
          </DialogTitle>
          <DialogDescription>
            본인의 Google Gemini API 키를 입력해 주세요. 키는 이 브라우저에만 저장되며 서버로 전송되지 않아요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="gemini-key">API Key</Label>
            <Input
              id="gemini-key"
              type="password"
              placeholder="AIza..."
              autoComplete="off"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="mt-1"
            />
          </div>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Google AI Studio 에서 무료 키 발급받기 <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" onClick={remove} type="button">삭제</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} type="button">취소</Button>
            <Button onClick={save} type="button">저장</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
