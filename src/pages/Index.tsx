
import { RegexPattern } from "@/components/regex/RegexManager";
import AppLayout from "@/components/layout/AppLayout";
import { SignedIn, SignedOut, useUser } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { getUserPatterns } from "@/utils/userPatterns";

export default function Index() {
  const { user, isLoaded } = useUser();
  const [userPatterns, setUserPatterns] = useState<RegexPattern[]>([]);
  
  useEffect(() => {
    if (user?.id) {
      const patterns = getUserPatterns(user.id);
      setUserPatterns(patterns);
    }
  }, [user?.id]);

  return (
    <AppLayout>
      <div className="py-4">
        <SignedIn>
          <div className="mb-6 flex flex-col sm:flex-row items-start justify-between gap-4 sm:items-center">
            <div>
              <h1 className="text-2xl font-bold">
                Welcome back, {user?.firstName || 'User'}
              </h1>
              <p className="text-muted-foreground">
                Continue working with your regex patterns and analysis
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild>
                <Link to="/dashboard">
                  Go to Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </SignedIn>
        
        <SignedOut>
          <div className="mb-6 sm:mb-10 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 p-6 text-center dark:from-blue-900/20 dark:to-indigo-900/20">
            <h1 className="text-2xl sm:text-3xl font-bold">Regex Analysis Tool</h1>
            <p className="mt-2 text-muted-foreground">
              Create, test, and share regex patterns with ease
            </p>
            <div className="mt-4 flex justify-center gap-4">
              <Button asChild size="lg">
                <Link to="/sign-up">Sign Up</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/sign-in">Sign In</Link>
              </Button>
            </div>
          </div>
        </SignedOut>
      </div>
    </AppLayout>
  );
}
