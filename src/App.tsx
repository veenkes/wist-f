import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Login from "@/pages/Login";
import Layout from "@/components/Layout";
import NotFound from "./pages/NotFound";
import { StudentPortal } from "./pages/student-portal";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <div className="font-sans">
              <Routes>
                <Route path="/" element={<LandingRoute />} />
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                } />
                <Route path="/payments" element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                } />
                <Route path="/expenses" element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                } />
                <Route path="/students" element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                } />
                <Route path="/events" element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                } />
                <Route path="/notifications" element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                } />
                <Route path="/support" element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                } />
                <Route path="/support/:conversationId" element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                } />
                <Route path="/employees" element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                } />
                <Route path="/teacher" element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                } />
                <Route path="/teacher/students" element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                } />
                 <Route path="/teacher/parents" element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                } />
                <Route path="/teacher/attendance" element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                } />
                <Route path="/teacher/schedule" element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                } />
                <Route path="/teacher/grades" element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                } />
                <Route path="/teacher/incidents" element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                } />
                <Route path="/teacher/reports" element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                } />
                <Route path="/student/:id" element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                } />
                <Route path="/student-portal" element={<StudentPortal />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

const LandingRoute = () => {
  const { isAuthenticated, loading, user } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }
  
  if (isAuthenticated) {
    if (user?.role === 'Teacher') {
      return <Navigate to="/teacher" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }
  
  return <Navigate to="/login" replace />;
};

export default App;