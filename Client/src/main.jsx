import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./Context/AuthContext";
import { ModalProvider } from "./Context/ModalContext";
import { ThemeProvider } from "./Context/ThemeContext";
import { HelmetProvider } from 'react-helmet-async';
import "./index.css";

import App from "./App.jsx";
import "./i18n";
import { Suspense } from "react";

createRoot(document.getElementById("root")).render(
  <HelmetProvider>
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>
        <ModalProvider>
          <Suspense fallback="...loading">
            <App />
          </Suspense>
        </ModalProvider>
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>  
  </HelmetProvider>
);
