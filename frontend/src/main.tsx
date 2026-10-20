import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app.tsx";
import { createApiClient } from "./game/api_client.ts";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App client={createApiClient()} />
  </StrictMode>,
);
