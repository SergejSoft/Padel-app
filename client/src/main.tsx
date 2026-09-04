import { createRoot } from "react-dom/client";
import { ClerkProvider, isLocalAuth } from "@/lib/auth";
import { shadcn } from "@clerk/ui/themes";
import "@clerk/ui/themes/shadcn.css";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "@/lib/register-sw";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY && !isLocalAuth) {
  throw new Error(
    "Missing VITE_CLERK_PUBLISHABLE_KEY. Add it to the .env file in the project root.",
  );
}

createRoot(document.getElementById("root")!).render(
  <ClerkProvider
    publishableKey={PUBLISHABLE_KEY ?? ""}
    appearance={{ theme: shadcn }}
    afterSignOutUrl="/"
  >
    <App />
  </ClerkProvider>,
);

registerServiceWorker();
