
import { useState } from "react";
import { SignIn as ClerkSignIn } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const SignIn = () => {
  const [isLoading, setIsLoading] = useState(false);
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/20 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="mb-4">
          <Button variant="ghost" asChild className="mb-8">
            <Link to="/" className="flex items-center gap-2">
              <ArrowLeft size={16} />
              <span>Back to home</span>
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Sign In</h1>
          <p className="text-muted-foreground">Sign in to your account to continue</p>
        </div>

        <div className="border rounded-lg bg-card p-6 shadow-sm">
          <ClerkSignIn 
            routing="path" 
            path="/sign-in" 
            signUpUrl="/sign-up"
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none p-0",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                socialButtonsBlockButton: "border-border",
                formFieldInput: "bg-background border-input",
                formButtonPrimary: "bg-primary hover:bg-primary/90",
                footerAction: "text-sm",
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default SignIn;
