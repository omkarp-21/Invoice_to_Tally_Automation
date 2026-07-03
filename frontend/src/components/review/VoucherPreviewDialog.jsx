import { useState, useMemo } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    Box,
    CircularProgress,
    Alert,
    AlertTitle,
    Stack,
    Grid
} from "@mui/material";
import { useInvoice } from "../../context/InvoiceContext";
import { createVoucher } from "../../services/api";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";

function VoucherPreviewDialog({ open, onClose }) {
    const { invoice, ledgers, resetInvoice } = useInvoice();
    const [loading, setLoading] = useState(false);
    const [apiResponse, setApiResponse] = useState(null);

    const findTaxLedgerName = (type) => {
        if (!ledgers || ledgers.length === 0) return `Input ${type}`;
        const match = ledgers.find(l => l && l.name && l.name.toUpperCase().includes(type.toUpperCase()));
        return match ? optionNameWithParent(match) : `Input ${type}`;
    };

    const optionNameWithParent = (ledger) => {
        return ledger.name;
    };

    const cgstLedger = useMemo(() => invoice.tax.cgstLedger?.name || "CGST Ledger", [invoice.tax.cgstLedger]);
    const sgstLedger = useMemo(() => invoice.tax.sgstLedger?.name || "SGST Ledger", [invoice.tax.sgstLedger]);
    const igstLedger = useMemo(() => invoice.tax.igstLedger?.name || "IGST Ledger", [invoice.tax.igstLedger]);

    // Aggregate calculations across all groups
    const totals = useMemo(() => {
        const subtotal = invoice.groups.reduce((acc, g) => acc + (g.subtotal || 0), 0);
        const cgst = invoice.groups.reduce((acc, g) => acc + (g.taxes.cgst || 0), 0);
        const sgst = invoice.groups.reduce((acc, g) => acc + (g.taxes.sgst || 0), 0);
        const igst = invoice.groups.reduce((acc, g) => acc + (g.taxes.igst || 0), 0);
        const grandTotal = Number((subtotal + cgst + sgst + igst).toFixed(2));
        return { subtotal, cgst, sgst, igst, grandTotal };
    }, [invoice.groups]);

    const validationError = useMemo(() => {
        if (!invoice.vendor.name) return "Vendor name is missing.";
        if (invoice.groups.length === 0) return "No item groups have been created.";
        const unassignedGroup = invoice.groups.find(g => !g.accountHead);
        if (unassignedGroup) {
            return `Group "${unassignedGroup.name || 'Unnamed Group'}" does not have an Account Head assigned.`;
        }
        
        // Enforce configured GST ledgers validation
        if (invoice.tax.mode === "CGST") {
            if (!invoice.tax.cgstLedger) return "CGST Ledger account has not been configured in Tax Configuration.";
            if (!invoice.tax.sgstLedger) return "SGST Ledger account has not been configured in Tax Configuration.";
        } else if (invoice.tax.mode === "IGST") {
            if (!invoice.tax.igstLedger) return "IGST Ledger account has not been configured in Tax Configuration.";
        }
        return null;
    }, [invoice.vendor, invoice.groups, invoice.tax.mode, invoice.tax.cgstLedger, invoice.tax.sgstLedger, invoice.tax.igstLedger]);

    const journalEntries = useMemo(() => {
        const entries = [];

        invoice.groups.forEach(group => {
            if (group.accountHead && group.subtotal > 0) {
                entries.push({
                    ledger: group.accountHead.name,
                    type: "Dr",
                    amount: group.subtotal
                });
            }
        });

        // 2. Debits: Taxes
        if (totals.cgst > 0) {
            entries.push({
                ledger: cgstLedger,
                type: "Dr",
                amount: totals.cgst
            });
        }
        if (totals.sgst > 0) {
            entries.push({
                ledger: sgstLedger,
                type: "Dr",
                amount: totals.sgst
            });
        }
        if (totals.igst > 0) {
            entries.push({
                ledger: igstLedger,
                type: "Dr",
                amount: totals.igst
            });
        }

        // 3. Credit: Vendor
        if (invoice.vendor.name && totals.grandTotal > 0) {
            entries.push({
                ledger: invoice.vendor.name,
                type: "Cr",
                amount: totals.grandTotal
            });
        }

        return entries;
    }, [invoice.groups, invoice.vendor, totals, cgstLedger, sgstLedger, igstLedger]);

    const handleImport = async () => {
        if (validationError) return;
        setLoading(true);
        setApiResponse(null);

        const payload = {
            invoiceNumber: invoice.invoiceNumber,
            invoiceDate: invoice.invoiceDate,
            vendor: {
                name: invoice.vendor.name,
                gstin: invoice.vendor.gstin,
                master_id: invoice.vendor.master_id,
                guid: invoice.vendor.guid
            },
            tax: {
                mode: invoice.tax.mode,
                cgstRate: invoice.tax.cgstRate,
                sgstRate: invoice.tax.sgstRate,
                igstRate: invoice.tax.igstRate,
                cgstLedger: invoice.tax.cgstLedger ? {
                    name: invoice.tax.cgstLedger.name,
                    guid: invoice.tax.cgstLedger.guid,
                    master_id: invoice.tax.cgstLedger.master_id
                } : null,
                sgstLedger: invoice.tax.sgstLedger ? {
                    name: invoice.tax.sgstLedger.name,
                    guid: invoice.tax.sgstLedger.guid,
                    master_id: invoice.tax.sgstLedger.master_id
                } : null,
                igstLedger: invoice.tax.igstLedger ? {
                    name: invoice.tax.igstLedger.name,
                    guid: invoice.tax.igstLedger.guid,
                    master_id: invoice.tax.igstLedger.master_id
                } : null
            },
            groups: invoice.groups.map(g => ({
                id: g.id,
                name: g.name,
                accountHead: g.accountHead ? {
                    name: g.accountHead.name,
                    master_id: g.accountHead.master_id,
                    guid: g.accountHead.guid
                } : null,
                items: g.items,
                subtotal: g.subtotal,
                taxes: g.taxes,
                total: g.total
            })),
            summary: {
                subtotal: totals.subtotal,
                cgst: totals.cgst,
                sgst: totals.sgst,
                igst: totals.igst,
                grandTotal: totals.grandTotal
            }
        };

        try {
            const res = await createVoucher(payload);
            setApiResponse(res);
        } catch (err) {
            console.error("Voucher creation failed:", err);
            const errData = err.response?.data;
            setApiResponse({
                success: false,
                implemented: errData?.implemented !== false,
                message: errData?.message || "Failed to communicate with the import backend.",
                errors: errData?.errors || []
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="md" fullWidth>
            <DialogTitle fontWeight={800}>
                Tally Purchase Voucher Preview
            </DialogTitle>
            <DialogContent dividers>
                <Stack spacing={3}>
                    {/* Meta Info */}
                    <Box sx={{ p: 2, bgcolor: "#f8fafc", borderRadius: 3, border: "1px solid #f1f5f9" }}>
                        <Grid container spacing={2}>
                            <Grid size={6}>
                                <Typography variant="caption" color="text.secondary" display="block">VENDOR (CREDITED)</Typography>
                                <Typography variant="body2" fontWeight={700}>{invoice.vendor.name || "Not Selected"}</Typography>
                                <Typography variant="caption" color="text.secondary">GSTIN: {invoice.vendor.gstin || "N/A"}</Typography>
                            </Grid>
                            <Grid size={3}>
                                <Typography variant="caption" color="text.secondary" display="block">INVOICE NO</Typography>
                                <Typography variant="body2" fontWeight={700}>{invoice.invoiceNumber || "N/A"}</Typography>
                            </Grid>
                            <Grid size={3}>
                                <Typography variant="caption" color="text.secondary" display="block">DATE</Typography>
                                <Typography variant="body2" fontWeight={700}>{invoice.invoiceDate || "N/A"}</Typography>
                            </Grid>
                        </Grid>
                    </Box>

                    {/* Validation Error */}
                    {validationError && (
                        <Alert severity="error" sx={{ borderRadius: 2 }}>
                            <AlertTitle>Validation Blocked</AlertTitle>
                            {validationError}
                        </Alert>
                    )}

                    {/* Double Entry Table */}
                    <Box>
                        <Typography variant="subtitle2" fontWeight={750} sx={{ mb: 1.5 }}>
                            Ledger Posting Details
                        </Typography>
                        <TableContainer sx={{ border: "1px solid #e2e8f0", borderRadius: 3 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: "#f8fafc" }}>
                                        <TableCell sx={{ fontWeight: 700 }}>Particulars (Tally Ledger)</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }} align="center">Dr / Cr</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }} align="right">Debit (₹)</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }} align="right">Credit (₹)</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {journalEntries.map((row, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={row.type === "Cr" ? 600 : 500} sx={{ pl: row.type === "Cr" ? 4 : 0 }}>
                                                    {row.ledger}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Typography variant="body2" color={row.type === "Dr" ? "success.main" : "error.main"} fontWeight={700}>
                                                    {row.type}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 600 }}>
                                                {row.type === "Dr" ? row.amount.toFixed(2) : ""}
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 600 }}>
                                                {row.type === "Cr" ? row.amount.toFixed(2) : ""}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>

                    {/* API Response Alert */}
                    {apiResponse && (
                        <Alert 
                            severity={apiResponse.implemented === false ? "warning" : (apiResponse.success ? "success" : "error")} 
                            icon={apiResponse.success ? <CheckCircleIcon /> : <ErrorIcon />}
                            sx={{ borderRadius: 2 }}
                        >
                            <AlertTitle>
                                {apiResponse.implemented === false 
                                    ? "Feature Not Implemented" 
                                    : (apiResponse.success ? "Import Succeeded" : "Import Failed")}
                            </AlertTitle>
                            {apiResponse.message}
                            
                            {/* Render detailed validation errors if present */}
                            {apiResponse.errors && apiResponse.errors.length > 0 && (
                                <Box component="ul" sx={{ mt: 1, pl: 2, mb: 0 }}>
                                    {apiResponse.errors.map((err, idx) => (
                                        <Typography key={idx} component="li" variant="body2">
                                            {err}
                                        </Typography>
                                    ))}
                                </Box>
                            )}
                        </Alert>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2.5 }}>
                <Button onClick={onClose} disabled={loading} sx={{ fontWeight: 600, textTransform: "none" }}>
                    Close
                </Button>
                {!apiResponse?.success && (
                    <Button
                        variant="contained"
                        onClick={handleImport}
                        disabled={loading || !!validationError}
                        sx={{ fontWeight: 600, textTransform: "none", borderRadius: 2 }}
                    >
                        {loading ? (
                            <Box sx={{ display: "flex", /*alignItems: "center", */gap: 1 }}>
                                <CircularProgress size={16} color="inherit" />
                                Importing...
                            </Box>
                        ) : (
                            "Import into Tally"
                        )}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}

export default VoucherPreviewDialog;
