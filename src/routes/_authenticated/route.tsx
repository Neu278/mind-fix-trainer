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
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <header className="sticky top-0 z-50 border-b border-[#3a3a3f] bg-black/90 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <span className="font-display text-2xl font-bold tracking-widest uppercase text-white group-hover:opacity-80 transition-opacity">
              TTOSOK
            </span>
            <span className="hidden sm:inline-block border-l border-[#3a3a3f] pl-3 font-display micro-cap text-[10px] text-neutral-400 tracking-widest">
              MISSION TELEMETRY
            </span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4 font-display micro-cap text-xs uppercase tracking-widest">
            <Link
              to="/dashboard"
              className="px-3 py-1.5 text-neutral-400 hover:text-white transition-colors"
              activeProps={{ className: "px-3 py-1.5 text-white font-bold border-b-2 border-white" }}
            >
              MISSION
            </Link>
            <Link
              to="/new"
              className="px-3 py-1.5 text-neutral-400 hover:text-white transition-colors"
              activeProps={{ className: "px-3 py-1.5 text-white font-bold border-b-2 border-white" }}
            >
              LOG ENTRY
            </Link>
            <Link
              to="/problems"
              className="px-3 py-1.5 text-neutral-400 hover:text-white transition-colors"
              activeProps={{ className: "px-3 py-1.5 text-white font-bold border-b-2 border-white" }}
            >
              ARCHIVE
            </Link>
            <Link
              to="/insights"
              className="px-3 py-1.5 text-neutral-400 hover:text-white transition-colors"
              activeProps={{ className: "px-3 py-1.5 text-white font-bold border-b-2 border-white" }}
            >
              ANALYTICS
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="ml-2 rounded-full border-neutral-700 text-neutral-300 hover:border-white hover:text-white hover:bg-transparent"
            >
              LOGOUT
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
