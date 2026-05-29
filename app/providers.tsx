"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RealtimeProvider } from "@upstash/realtime/client";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: Infinity, retry: false } },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeProvider>{children}</RealtimeProvider>
    </QueryClientProvider>
  );
}
