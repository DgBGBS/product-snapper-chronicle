import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import ProductDetail from "./pages/ProductDetail";
import WebScraper from "./pages/WebScraper";
import AdminPanel from "./pages/AdminPanel";
import NotFound from "./pages/NotFound";
import { FirecrawlService } from "./utils/FirecrawlService";

// Create a new QueryClient instance that doesn't requery on focus or reconnect
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    },
  },
});

const App = () => {
  // Ensure FirecrawlService API key is set (if required for scraping)
  const apiKey = FirecrawlService.getApiKey();
  if (!apiKey) {
    console.warn("Firecrawl API Key is missing. Some features may not work correctly.");
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<WebScraper />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/products" element={<Index />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
