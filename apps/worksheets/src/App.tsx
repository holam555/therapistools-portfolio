import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, useLocation } from "react-router-dom";
import { useEffect } from "react";
import AppRoutes from "./AppRoutes";
import "../../../shared/brand.css";
import "../../../shared/suite-bar.js";
import { ProfileProvider } from "@/hooks/use-profiles";
import { APP_BASE } from "@/lib/site";

const queryClient = new QueryClient();

// SPA navigation keeps the previous page's scroll offset — clicking a card at
// the bottom of the gallery opened the editor scrolled past the Print/
// Customize toolbar. Reset to top on every route change.
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ProfileProvider>
        <tt-suite-bar current="worksheets" />
        <BrowserRouter basename={APP_BASE}>
          <ScrollToTop />
          <AppRoutes />
        </BrowserRouter>
      </ProfileProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
