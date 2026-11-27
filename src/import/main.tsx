import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ImportApp } from "@/import/ImportApp";
import "@/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ImportApp />
  </StrictMode>,
);
