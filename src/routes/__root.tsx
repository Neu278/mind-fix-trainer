import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  Link,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { SettingsDialog } from "@/components/settings-dialog";
import { BookMarked, Calculator, Settings } from "lucide-react";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <h1 className="text-7xl font-bold text-primary">404</h1>
        <p className="mt-4 text-muted-foreground">페이지를 찾을 수 없어요.</p>
        <a href="/" className="mt-6 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">홈으로</a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center">
      <div>
        <h1 className="text-xl font-semibold">문제가 발생했어요</h1>
        <p className="mt-2 text-sm text-muted-foreground">잠시 후 다시 시도해 주세요.</p>
        <button onClick={() => { router.invalidate(); reset(); }} className="mt-6 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">다시 시도</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "수학 풀이 AI · 오답노트" },
      { name: "description", content: "수학 문제 이미지를 올리면 AI가 단계별로 풀이하고, 오답노트에 저장해 복습할 수 있어요." },
      { property: "og:title", content: "수학 풀이 AI · 오답노트" },
      { property: "og:description", content: "이미지 한 장으로 수학 문제를 풀고 오답노트에 저장하세요." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://cdn.jsdelivr.net" },
      { rel: "stylesheet", href: "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [settingsOpen, setSettingsOpen] = useState(false);
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen">
        <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link to="/" className="flex items-center gap-2 font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">π</span>
              <span>수학 풀이 AI</span>
            </Link>
            <nav className="flex items-center gap-1">
              <NavLink to="/" icon={<Calculator className="h-4 w-4" />}>풀이하기</NavLink>
              <NavLink to="/notebook" icon={<BookMarked className="h-4 w-4" />}>오답노트</NavLink>
              <Button size="sm" variant="ghost" onClick={() => setSettingsOpen(true)} aria-label="설정">
                <Settings className="h-4 w-4" />
              </Button>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">
          <Outlet />
        </main>
      </div>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  );
}

function NavLink({ to, icon, children }: { to: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground [&.active]:bg-primary/10 [&.active]:text-primary"
      activeProps={{ className: "active" }}
      activeOptions={{ exact: true }}
    >
      {icon} {children}
    </Link>
  );
}
