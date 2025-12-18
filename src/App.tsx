import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { MotionConfig } from "framer-motion";
import { usePerformanceMode } from "@/hooks/usePerformanceMode";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import UpdatePassword from "./pages/UpdatePassword";
import NotificationSettings from "./pages/NotificationSettings";
import NotificationAdmin from "./pages/NotificationAdmin";
import BlockedUsers from "./pages/BlockedUsers";
import Settings from "./pages/Settings";
import PrivacySettings from "./pages/PrivacySettings";
import Invite from "./pages/Invite";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const { reduceMotion } = usePerformanceMode();

  return (
    <MotionConfig reducedMotion={reduceMotion ? "always" : "user"}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/invite" element={<Invite />} />
              <Route path="/auth" element={<AuthProvider><Auth /></AuthProvider>} />
              <Route path="/update-password" element={<AuthProvider><UpdatePassword /></AuthProvider>} />
              <Route path="/notifications" element={<AuthProvider><NotificationSettings /></AuthProvider>} />
              <Route path="/admin/notifications" element={<AuthProvider><NotificationAdmin /></AuthProvider>} />
              <Route path="/settings" element={<AuthProvider><Settings /></AuthProvider>} />
              <Route path="/settings/blocked" element={<AuthProvider><BlockedUsers /></AuthProvider>} />
              <Route path="/settings/privacy" element={<AuthProvider><PrivacySettings /></AuthProvider>} />
              <Route path="/" element={<AuthProvider><Index /></AuthProvider>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </MotionConfig>
  );
};

export default App;
