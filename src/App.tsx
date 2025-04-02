
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ClerkLoaded, ClerkLoading, SignedIn, SignedOut, useAuth } from "@clerk/clerk-react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import SignIn from "./pages/auth/SignIn";
import SignUp from "./pages/auth/SignUp";
import Dashboard from "./pages/Dashboard";
import UserProfile from "./pages/UserProfile";
import SharedAnalysis from "./pages/SharedAnalysis";
import AuthGuard from "./components/auth/AuthGuard";
import Loading from "./components/ui/loading";

const queryClient = new QueryClient();

// Check if Clerk is available in the environment
const isClerkAvailable = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        {isClerkAvailable ? (
          <>
            <ClerkLoading>
              <Loading />
            </ClerkLoading>
            <ClerkLoaded>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Index />} />
                <Route path="/sign-in/*" element={<SignIn />} />
                <Route path="/sign-up/*" element={<SignUp />} />
                <Route path="/shared/:userId/:analysisId" element={<SharedAnalysis />} />
                
                {/* Protected routes */}
                <Route element={<AuthGuard />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/profile" element={<UserProfile />} />
                </Route>
                
                {/* Catch-all route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ClerkLoaded>
          </>
        ) : (
          // Render app without authentication when Clerk is not available
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/shared/:userId/:analysisId" element={<SharedAnalysis />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        )}
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
