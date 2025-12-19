import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { MotionConfig } from "framer-motion";
import { usePerformanceMode } from "@/hooks/usePerformanceMode";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// Lazy load heavy pages for faster initial load
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const UpdatePassword = lazy(() => import("./pages/UpdatePassword"));
const NotificationSettings = lazy(() => import("./pages/NotificationSettings"));
const NotificationAdmin = lazy(() => import("./pages/NotificationAdmin"));
const Notifications = lazy(() => import("./pages/Notifications"));
const BlockedUsers = lazy(() => import("./pages/BlockedUsers"));
const Settings = lazy(() => import("./pages/Settings"));
const PrivacySettings = lazy(() => import("./pages/PrivacySettings"));
const Invite = lazy(() => import("./pages/Invite"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Optimized QueryClient for low-end devices
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes - reduce refetches
      gcTime: 1000 * 60 * 10, // 10 minutes garbage collection
      refetchOnWindowFocus: false, // Prevent unnecessary refetches
      retry: 1, // Reduce retry attempts
      refetchOnMount: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Simple loading fallback
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const App = () => {
  const { reduceMotion } = usePerformanceMode();

  return (
    <MotionConfig reducedMotion={reduceMotion ? "always" : "user"}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/invite" element={<Invite />} />
                <Route path="/auth" element={<AuthProvider><Auth /></AuthProvider>} />
                <Route path="/update-password" element={<AuthProvider><UpdatePassword /></AuthProvider>} />
                <Route path="/notification-settings" element={<AuthProvider><NotificationSettings /></AuthProvider>} />
                <Route path="/notifications" element={<AuthProvider><Notifications /></AuthProvider>} />
                <Route path="/admin/notifications" element={<AuthProvider><NotificationAdmin /></AuthProvider>} />
                <Route path="/settings" element={<AuthProvider><Settings /></AuthProvider>} />
                <Route path="/settings/blocked" element={<AuthProvider><BlockedUsers /></AuthProvider>} />
                <Route path="/settings/privacy" element={<AuthProvider><PrivacySettings /></AuthProvider>} />
                <Route path="/" element={<AuthProvider><Index /></AuthProvider>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </MotionConfig>
  );
};

export default App;
