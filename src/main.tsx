import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { supabaseApi } from "./lib/api";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App api={supabaseApi} />
  </React.StrictMode>,
);
