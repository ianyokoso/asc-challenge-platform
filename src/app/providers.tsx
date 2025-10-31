// In Next.js, this file would be called: app/providers.tsx
'use client';

// Since QueryClientProvider relies on useContext under the hood, we have to put 'use client' on top
import {
  isServer,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';
import { createClient } from '@/lib/supabase/client';
import { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { RealtimeCertificationsBridge } from '@/components/RealtimeCertificationsBridge';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 60 * 1000,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (isServer) {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    // This is very important, so we don't re-make a new client if React
    // suspends during the initial render. This may not be needed if we
    // have a suspense boundary BELOW the creation of the query client
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

// Supabase Auth Context
const SupabaseAuthContext = createContext<{
  user: User | null;
  loading: boolean;
}>({
  user: null,
  loading: true,
});

export const useSupabaseAuth = () => {
  const context = useContext(SupabaseAuthContext);
  if (!context) {
    throw new Error('useSupabaseAuth must be used within SupabaseAuthProvider');
  }
  return context;
};

function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    console.debug('[SupabaseAuth] 🔄 Initializing auth listener...');
    
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('[SupabaseAuth] ❌ Error getting initial session:', error);
        } else {
          console.debug('[SupabaseAuth] 📋 Initial session:', session ? 'found' : 'none');
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('[SupabaseAuth] ❌ Unexpected error getting initial session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.debug('[SupabaseAuth] 🔔 Auth state change:', event, session ? 'session found' : 'no session');
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      console.debug('[SupabaseAuth] 🧹 Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  return (
    <SupabaseAuthContext.Provider value={{ user, loading }}>
      {children}
    </SupabaseAuthContext.Provider>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  // NOTE: Avoid useState when initializing the query client if you don't
  //       have a suspense boundary between this and the code that may
  //       suspend because React will throw away the client on the initial
  //       render if it suspends and there is no boundary
  const queryClient = getQueryClient();

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <SupabaseAuthProvider>
          <RealtimeCertificationsBridge />
          {children}
          <Toaster />
        </SupabaseAuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
