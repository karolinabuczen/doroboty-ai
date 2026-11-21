import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./features/prototype/app";
import "./app/globals.css";
import "./app/realm-themes.css";

// Enchanted realm is the default look; ?theme=classic restores the original, ?theme=gilded|hollow previews the alternatives.
const realm = new URLSearchParams(window.location.search).get("theme");
if (realm === "gilded" || realm === "hollow") {
  document.documentElement.dataset.theme = realm;
} else if (realm !== "classic") {
  document.documentElement.dataset.theme = "hollow";
  document.documentElement.dataset.frame = "gold";
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
