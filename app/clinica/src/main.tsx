import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
// Fontes do sistema visual do pitch, empacotadas (funcionam sem internet no evento).
import "@fontsource/lexend/400.css";
import "@fontsource/lexend/700.css";
import "@fontsource/lexend/800.css";
import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
