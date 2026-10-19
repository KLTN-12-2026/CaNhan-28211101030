import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import "./i18n";
import GlobalToast from "./components/GlobalToast.jsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
console.log("Senior Debug: Google Client ID is", clientId);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <GoogleOAuthProvider clientId={clientId}>
        <App />
        <GlobalToast />
      </GoogleOAuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
