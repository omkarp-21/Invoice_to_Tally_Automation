import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { InvoiceProvider } from "./context/InvoiceContext";
import "./index.css";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <BrowserRouter>
            <InvoiceProvider>
                <App />
            </InvoiceProvider>
        </BrowserRouter>
    </React.StrictMode>
);