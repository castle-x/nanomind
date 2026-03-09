import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { Providers } from "@/app/providers";
import { router } from "@/app/routes";
import "@/app/styles/globals.css";
import "@/app/styles/docs.css";
import "@/shared/lib/request";

const root = document.getElementById("root");

if (root) {
  createRoot(root).render(
    <StrictMode>
      <Providers>
        <RouterProvider router={router} />
      </Providers>
    </StrictMode>,
  );
}
