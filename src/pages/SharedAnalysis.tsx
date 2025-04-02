
import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Home, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { getSharedAnalysis } from "@/utils/shareAnalysis";

interface Analysis {
  id: string;
  userId: string;
  title: string;
  description: string;
  pattern: string;
  testText: string;
  createdAt: string;
}

const SharedAnalysis = () => {
  const { userId, analysisId } = useParams();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  
  useEffect(() => {
    async function fetchAnalysis() {
      try {
        if (userId && analysisId) {
          const data = await getSharedAnalysis(userId, analysisId);
          setAnalysis(data);
        }
      } catch (error) {
        toast.error("Failed to load the shared analysis");
        console.error("Error fetching shared analysis:", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchAnalysis();
  }, [userId, analysisId]);
  
  const copyPattern = () => {
    if (analysis?.pattern) {
      navigator.clipboard.writeText(analysis.pattern);
      setCopied(true);
      toast.success("Pattern copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4">Loading shared analysis...</p>
        </div>
      </div>
    );
  }
  
  if (!analysis) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Analysis Not Found</CardTitle>
            <CardDescription className="text-center">
              The shared analysis you're looking for doesn't exist or has been removed.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild>
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                Return to Home
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-muted/20 p-4">
      <header className="container mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Shared Regex Analysis</h1>
        <Button asChild variant="outline" size="sm">
          <Link to="/">
            <Home className="mr-2 h-4 w-4" />
            Home
          </Link>
        </Button>
      </header>
      
      <main className="container max-w-4xl">
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{analysis.title}</CardTitle>
                <CardDescription>
                  Shared on {new Date(analysis.createdAt).toLocaleDateString()}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={copyPattern}
                className="flex items-center gap-1"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy Pattern
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {analysis.description && (
              <div>
                <h3 className="font-medium text-sm">Description</h3>
                <p className="text-muted-foreground">{analysis.description}</p>
              </div>
            )}
            
            <div>
              <h3 className="font-medium text-sm mb-1">Regex Pattern</h3>
              <div className="rounded-md bg-muted p-3 font-mono text-sm">
                {analysis.pattern}
              </div>
            </div>
            
            {analysis.testText && (
              <div>
                <h3 className="font-medium text-sm mb-1">Test Text</h3>
                <div className="rounded-md bg-muted p-3 whitespace-pre-wrap">
                  {analysis.testText}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Want to create your own regex patterns?{" "}
            <Link to="/sign-up" className="text-primary hover:underline">
              Sign up
            </Link>{" "}
            or{" "}
            <Link to="/sign-in" className="text-primary hover:underline">
              sign in
            </Link>{" "}
            to get started.
          </p>
        </div>
      </main>
    </div>
  );
};

export default SharedAnalysis;
