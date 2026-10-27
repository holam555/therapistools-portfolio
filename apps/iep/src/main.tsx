import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "../../../shared/brand.css";
import "../../../shared/suite-bar.js";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
