
import { useUser } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserButton } from "@clerk/clerk-react";
import { Home, Settings, Share2, FileText } from "lucide-react";
import RegexManager from "@/components/regex/RegexManager";
import { useEffect, useState } from "react";
import { RegexPattern } from "@/components/regex/RegexManager";
import { getUserPatterns, saveUserPatterns } from "@/utils/userPatterns";

const Dashboard = () => {
  const { user } = useUser();
  const [patterns, setPatterns] = useState<RegexPattern[]>([]);
  
  useEffect(() => {
    if (user?.id) {
      // Load user-specific patterns
      const userPatterns = getUserPatterns(user.id);
      if (userPatterns && userPatterns.length > 0) {
        setPatterns(userPatterns);
      }
    }
  }, [user?.id]);

  const handlePatternsChange = (newPatterns: RegexPattern[]) => {
    setPatterns(newPatterns);
    if (user?.id) {
      saveUserPatterns(user.id, newPatterns);
    }
  };
  
  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">Regex Tool</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                Home
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/profile">
                <Settings className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </Button>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <main className="container py-6 px-4">
        <div className="grid gap-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Welcome, {user?.firstName || 'User'}</h2>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>My Regex Patterns</CardTitle>
                <CardDescription>
                  Manage and use your regex patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/">
                    <FileText className="mr-2 h-4 w-4" />
                    Open Editor
                  </Link>
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Share Analysis</CardTitle>
                <CardDescription>
                  Share your regex analysis with others
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  <Share2 className="mr-2 h-4 w-4" />
                  Share Current Analysis
                </Button>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Regex Manager</CardTitle>
              <CardDescription>
                Create and manage your regex patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RegexManager 
                initialPatterns={patterns} 
                onPatternsChange={handlePatternsChange}
                userId={user?.id || ''}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
