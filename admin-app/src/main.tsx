import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import App from "./App.tsx";
import "./app.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* No layout class here: Fluent copies the provider classes onto its portal mount node. */}
    <FluentProvider theme={webLightTheme}>
      <App />
    </FluentProvider>
  </StrictMode>,
);
