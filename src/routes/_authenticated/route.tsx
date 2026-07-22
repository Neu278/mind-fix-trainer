import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedShell,
});

function AuthedShell() {
  const router = useRouter();
  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/60 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <Link to="/dashboard" className="text-xl font-bold text-primary">
            또속 <span className="text-sm font-normal text-muted-foreground">Ttosok</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link to="/dashboard" className="px-3 py-2 rounded-lg hover:bg-accent" activeProps={{ className: "px-3 py-2 rounded-lg bg-accent font-semibold" }}>홈</Link>
            <Link to="/new" className="px-3 py-2 rounded-lg hover:bg-accent" activeProps={{ className: "px-3 py-2 rounded-lg bg-accent font-semibold" }}>새 오답</Link>
            <Link to="/problems" className="px-3 py-2 rounded-lg hover:bg-accent" activeProps={{ className: "px-3 py-2 rounded-lg bg-accent font-semibold" }}>오답노트</Link>
            <Link to="/insights" className="px-3 py-2 rounded-lg hover:bg-accent" activeProps={{ className: "px-3 py-2 rounded-lg bg-accent font-semibold" }}>인사이트</Link>
            <Button variant="ghost" size="sm" onClick={signOut}>로그아웃</Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
