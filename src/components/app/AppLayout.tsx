import { Outlet, useNavigation } from "react-router-dom";
import { Suspense, useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TopProgress } from "@/components/ui/top-progress";
import { useAuth } from "@/contexts/AuthContext";
import AppSidebar from "./AppSidebar";
import PageSkeleton from "./PageSkeleton";

export default function AppLayout() {
  const { loading } = useAuth();
  // Pulso curto de carregamento ao trocar de rota. Feedback visual.
  const [routeBusy, setRouteBusy] = useState(false);
  let nav: ReturnType<typeof useNavigation> | null = null;
  try {
    nav = useNavigation();
  } catch {
    nav = null;
  }
  const navState = nav?.state ?? "idle";

  useEffect(() => {
    if (navState !== "idle") {
      setRouteBusy(true);
    } else {
      const t = setTimeout(() => setRouteBusy(false), 200);
      return () => clearTimeout(t);
    }
  }, [navState]);

  return (
    <SidebarProvider>
      <TopProgress active={loading || routeBusy} />
      <div className="flex min-h-screen w-full bg-off-white">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border/60 bg-off-white/85 px-4 backdrop-blur">
            <SidebarTrigger className="text-verde-raiz" />
            <div className="font-body text-sm text-quase-preto/70">Raiz · plataforma</div>
          </header>
          <main className="flex-1 p-6 md:p-10">
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
