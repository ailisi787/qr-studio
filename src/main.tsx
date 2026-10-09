import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QrStudio } from "@/components/qr-studio";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div className="min-h-dvh bg-[#f2efe6] text-zinc-900 antialiased">
      <QrStudio />
    </div>
  </StrictMode>,
);
