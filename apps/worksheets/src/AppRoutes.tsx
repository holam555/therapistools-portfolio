import { Routes, Route } from "react-router-dom";
import Gallery from "./pages/Gallery";
import Editor from "./pages/Editor";
import GoalPage from "./pages/GoalPage";
import GuidesIndex from "./pages/GuidesIndex";
import GuidePage from "./pages/GuidePage";
import PrivacyPage from "./pages/PrivacyPage";
import NotFound from "./pages/NotFound";

/**
 * Router-agnostic route table, shared by the client (BrowserRouter in App.tsx)
 * and the build-time prerenderer (StaticRouter in entry-prerender.tsx). Keeping
 * this in one place means a new route is prerendered for SEO automatically.
 */
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Gallery />} />
      <Route path="/goals/:goalSlug" element={<GoalPage />} />
      <Route path="/guides" element={<GuidesIndex />} />
      <Route path="/guides/:slug" element={<GuidePage />} />
      <Route path="/edit/:templateId" element={<Editor />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
