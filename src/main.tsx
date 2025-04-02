
import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import "./index.css";

// Important: We're removing the use of a development key that's causing issues
// Instead, we'll use a more reliable approach for development
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// If we don't have any key at all, we need to render the app without Clerk
if (!PUBLISHABLE_KEY) {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  // Only use Clerk if we have a valid key
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <ClerkProvider
        publishableKey={PUBLISHABLE_KEY}
        signInUrl="/sign-in"
        signUpUrl="/sign-up"
        signInFallbackRedirectUrl="/dashboard"
        signUpFallbackRedirectUrl="/"
        signInForceRedirectUrl="/dashboard"
        signUpForceRedirectUrl="/"
        afterSignOutUrl="/"
      >
        <App />
      </ClerkProvider>
    </React.StrictMode>
  );
}
