'use client';

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { SessionTimeoutProvider } from "@/components/SessionTimeoutProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60000 },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionTimeoutProvider>
        {children}
      </SessionTimeoutProvider>
    </QueryClientProvider>
  );
}
