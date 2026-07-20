import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import GameDemo from "./pages/GameDemo";
import HostDashboard from "./pages/HostDashboard";
import HostGame from "./pages/HostGame";
import JoinGame from "./pages/JoinGame";
import NotFound from "./pages/NotFound";
import AdminLogin from '@/pages/AdminLogin';
import Printables from './pages/Printables';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/game-demo" element={<GameDemo />} />
          <Route path="/host" element={<HostDashboard />} />
          <Route path="/host/game" element={<HostGame />} />
          <Route path="/join" element={<JoinGame />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/printables" element={<Printables />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;