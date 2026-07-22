import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: "로그인 · 또속" }, { name: "description", content: "또속 계정으로 로그인하거나 회원가입하세요." }] }),
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("환영해요! 👋");
    router.navigate({ to: "/dashboard" });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: window.location.origin + "/dashboard" },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("가입 완료! 바로 시작해요 ✨");
    router.navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-[oklch(0.97_0.04_295)] to-[oklch(0.96_0.05_165)]">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-3xl font-bold text-primary">또속</div>
          <p className="text-sm text-muted-foreground mt-1">AI 메타인지 오답 트레이너</p>
        </div>
        <div className="rounded-3xl border bg-card p-6 shadow-sm">
          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">로그인</TabsTrigger>
              <TabsTrigger value="signup">회원가입</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={signIn} className="space-y-3 mt-4">
                <div><Label>이메일</Label><Input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
                <div><Label>비밀번호</Label><Input type="password" required value={password} onChange={e => setPassword(e.target.value)} /></div>
                <Button type="submit" className="w-full rounded-xl" disabled={loading}>{loading ? "..." : "로그인"}</Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={signUp} className="space-y-3 mt-4">
                <div><Label>이메일</Label><Input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
                <div><Label>비밀번호 (6자 이상)</Label><Input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} /></div>
                <Button type="submit" className="w-full rounded-xl" disabled={loading}>{loading ? "..." : "가입하고 시작하기"}</Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
