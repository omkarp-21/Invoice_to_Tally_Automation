import { createContext, useContext, useState, useCallback } from "react";

const InvoiceContext = createContext();

const initialInvoice = {

    invoiceNumber: "",

    invoiceDate: "",

    vendor: {
        name: "",
        gstin: "",
        verified: false,
        master_id: null,
        guid: null
    },

    tax: {
        mode: "CGST",
        cgstRate: 9,
        sgstRate: 9,
        igstRate: 18,
        cgstLedger: null,
        sgstLedger: null,
        igstLedger: null,
        cgstSource: null,
        sgstSource: null,
        igstSource: null
    },

    extracted_line_items: [],

    groups: []

};

export function InvoiceProvider({ children }) {

    const [invoice, setInvoice] = useState(initialInvoice);

    const [documentFile, setDocumentFile] = useState(null);

    const [vendors, setVendors] = useState([]);

    const [ledgers, setLedgers] = useState([]);

    const [loading, setLoading] = useState(false);

    const [error, setError] = useState(null);

    const resetInvoice = useCallback(() => {
        setInvoice(initialInvoice);
        setDocumentFile(null);
        setError(null);
    }, []);

    return (
        <InvoiceContext.Provider
            value={{
                invoice,
                setInvoice,
                documentFile,
                setDocumentFile,
                vendors,
                setVendors,
                ledgers,
                setLedgers,
                loading,
                setLoading,
                error,
                setError,
                resetInvoice
            }}
        >
            {children}
        </InvoiceContext.Provider>
    );
}

export function useInvoice() {
    return useContext(InvoiceContext);
}