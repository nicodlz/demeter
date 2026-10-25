import { Suspense, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { PageErrorBoundary } from "@/components/PageErrorBoundary";

export const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
  </div>
);

export const PageRoute = ({ children }: { children: ReactNode }) => (
  <PageErrorBoundary>
    <Suspense fallback={<PageLoader />}>{children}</Suspense>
  </PageErrorBoundary>
);
