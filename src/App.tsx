import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import UpdatePassword from "./pages/UpdatePassword";
import NotificationSettings from "./pages/NotificationSettings";
import NotificationAdmin from "./pages/NotificationAdmin";
import BlockedUsers from "./pages/BlockedUsers";
import Settings from "./pages/Settings";
import PrivacySettings from "./pages/PrivacySettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/update-password" element={<UpdatePassword />} />
            <Route path="/notifications" element={<NotificationSettings />} />
            <Route path="/admin/notifications" element={<NotificationAdmin />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/blocked" element={<BlockedUsers />} />
            <Route path="/settings/privacy" element={<PrivacySettings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
