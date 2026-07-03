import { useState, useMemo } from "react";
import {
    Paper,
    Typography,
    Box,
    Button,
    Stack,
    Divider
} from "@mui/material";
import { useInvoice } from "../../context/InvoiceContext";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import VoucherPreviewDialog from "./VoucherPreviewDialog";

function SummaryCard() {
    const { invoice } = useInvoice();
    const [previewOpen, setPreviewOpen] = useState(false);

    const totals = useMemo(() => {
        const subtotal = invoice.groups.reduce((acc, g) => acc + (g.subtotal || 0), 0);
        const cgst = invoice.groups.reduce((acc, g) => acc + (g.taxes.cgst || 0), 0);
        const sgst = invoice.groups.reduce((acc, g) => acc + (g.taxes.sgst || 0), 0);
        const igst = invoice.groups.reduce((acc, g) => acc + (g.taxes.igst || 0), 0);
        const grandTotal = Number((subtotal + cgst + sgst + igst).toFixed(2));
        return { subtotal, cgst, sgst, igst, grandTotal };
    }, [invoice.groups]);

    const handleCreateVoucherClick = () => {
        setPreviewOpen(true);
    };

    const handleClosePreview = () => {
        setPreviewOpen(false);
    };

    return (
        <Paper
            elevation={0}
            sx={{
                p: 3,
                borderRadius: 4,
                bgcolor: "white",
                boxShadow: "0 4px 18px rgba(0,0,0,0.06)",
                border: "1px solid #e2e8f0"
            }}
        >
            <Typography variant="subtitle1" fontWeight={750} color="text.primary" sx={{ mb: 2 }}>
                Voucher Summary
            </Typography>

            <Stack spacing={1.5} sx={{ mb: 2.5 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="body2" color="text.secondary">Total Subtotal:</Typography>
                    <Typography variant="body2" fontWeight={600}>₹{totals.subtotal.toFixed(2)}</Typography>
                </Box>
                {totals.cgst > 0 && (
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2" color="text.secondary">Total CGST:</Typography>
                        <Typography variant="body2" fontWeight={600}>₹{totals.cgst.toFixed(2)}</Typography>
                    </Box>
                )}
                {totals.sgst > 0 && (
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2" color="text.secondary">Total SGST:</Typography>
                        <Typography variant="body2" fontWeight={600}>₹{totals.sgst.toFixed(2)}</Typography>
                    </Box>
                )}
                {totals.igst > 0 && (
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2" color="text.secondary">Total IGST:</Typography>
                        <Typography variant="body2" fontWeight={600}>₹{totals.igst.toFixed(2)}</Typography>
                    </Box>
                )}
                
                <Divider />
                
                <Box sx={{ display: "flex", justifyContent: "space-between", pt: 0.5 }}>
                    <Typography variant="subtitle1" fontWeight={750} color="text.primary">Grand Total:</Typography>
                    <Typography variant="subtitle1" fontWeight={800} color="primary.main">₹{totals.grandTotal.toFixed(2)}</Typography>
                </Box>
            </Stack>

            <Button
                variant="contained"
                fullWidth
                size="large"
                startIcon={<ReceiptLongIcon />}
                onClick={handleCreateVoucherClick}
                disabled={invoice.groups.length === 0 || invoice.groups.some(g => !g.accountHead)}
                sx={{
                    borderRadius: 3,
                    fontWeight: 600,
                    textTransform: "none",
                    py: 1.2
                }}
            >
                Create Voucher
            </Button>

            {previewOpen && (
                <VoucherPreviewDialog
                    open={previewOpen}
                    onClose={handleClosePreview}
                />
            )}
        </Paper>
    );
}

export default SummaryCard;