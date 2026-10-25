import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app.tsx";
import { createApiClient } from "./game/api_client.ts";
import { assetsReady } from "./lib/assets.ts";
import { LanguageProvider } from "./lib/language_provider.tsx";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LanguageProvider>
      <App client={createApiClient()} assets={assetsReady()} />
    </LanguageProvider>
  </StrictMode>,
);
