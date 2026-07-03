import {
    Paper,
    Typography,
    RadioGroup,
    FormControlLabel,
    Radio,
    TextField,
    Stack,
    Grid,
    Divider,
    Box,
    Chip
} from "@mui/material";
import { useInvoice } from "../../context/InvoiceContext";
import AccountHeadAutocomplete from "./AccountHeadAutocomplete";

function TaxConfig() {
    const { invoice, setInvoice } = useInvoice();
    const { mode, cgstRate, sgstRate, igstRate } = invoice.tax;

    // Helper to compute taxes for a single group based on rates/mode
    const recalculateGroupTaxes = (group, taxMode, cRate, sRate, iRate) => {
        const sub = group.subtotal || 0;
        let cgst = 0;
        let sgst = 0;
        let igst = 0;

        if (taxMode === "CGST") {
            cgst = Number((sub * (Number(cRate) / 100)).toFixed(2));
            sgst = Number((sub * (Number(sRate) / 100)).toFixed(2));
        } else {
            igst = Number((sub * (Number(iRate) / 100)).toFixed(2));
        }

        const tot = Number((sub + cgst + sgst + igst).toFixed(2));

        return {
            ...group,
            taxes: { cgst, sgst, igst },
            total: tot
        };
    };

    const handleModeChange = (e) => {
        const newMode = e.target.value;
        setInvoice(prev => {
            const nextTax = { ...prev.tax, mode: newMode };
            const nextGroups = prev.groups.map(g =>
                recalculateGroupTaxes(g, newMode, nextTax.cgstRate, nextTax.sgstRate, nextTax.igstRate)
            );
            return {
                ...prev,
                tax: nextTax,
                groups: nextGroups
            };
        });
    };

    const handleRateChange = (field, value) => {
        const numVal = value === "" ? 0 : Number(value);
        setInvoice(prev => {
            const nextTax = { ...prev.tax, [field]: numVal };
            const nextGroups = prev.groups.map(g =>
                recalculateGroupTaxes(g, nextTax.mode, nextTax.cgstRate, nextTax.sgstRate, nextTax.igstRate)
            );
            return {
                ...prev,
                tax: nextTax,
                groups: nextGroups
            };
        });
    };

    const handleLedgerChange = (ledgerField, sourceField, value) => {
        setInvoice(prev => ({
            ...prev,
            tax: {
                ...prev.tax,
                [ledgerField]: value,
                [sourceField]: value ? "user" : null
            }
        }));
    };

    // Aggregate estimated taxes from all groups
    const totalCGST = invoice.groups.reduce((acc, g) => acc + (g.taxes.cgst || 0), 0);
    const totalSGST = invoice.groups.reduce((acc, g) => acc + (g.taxes.sgst || 0), 0);
    const totalIGST = invoice.groups.reduce((acc, g) => acc + (g.taxes.igst || 0), 0);

    return (
        <Paper
            elevation={0}
            sx={{
                p: 3,
                borderRadius: 4,
                backgroundColor: "#ffffff",
                boxShadow: "0 4px 18px rgba(0,0,0,0.05)"
            }}
        >
            <Typography
                sx={{
                    fontSize: 18,
                    fontWeight: 750,
                    color: "text.primary",
                    mb: 2
                }}
            >
                Tax Configuration
            </Typography>

            <RadioGroup 
                value={mode} 
                onChange={handleModeChange}
                row
                sx={{ mb: 2.5 }}
            >
                <FormControlLabel
                    value="CGST"
                    control={<Radio size="small" />}
                    label={<Typography variant="body2" fontWeight={600}>CGST + SGST</Typography>}
                    sx={{ mr: 4 }}
                />
                <FormControlLabel
                    value="IGST"
                    control={<Radio size="small" />}
                    label={<Typography variant="body2" fontWeight={600}>IGST</Typography>}
                />
            </RadioGroup>

            <Stack spacing={2.5}>
                {/* RATE FIELDS */}
                <Grid container spacing={2}>
                    <Grid size={6}>
                        <TextField
                            label="CGST %"
                            type="number"
                            value={cgstRate}
                            onChange={(e) => handleRateChange("cgstRate", e.target.value)}
                            disabled={mode !== "CGST"}
                            fullWidth
                            size="small"
                            variant="outlined"
                            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                        />
                    </Grid>
                    <Grid size={6}>
                        <TextField
                            label="SGST %"
                            type="number"
                            value={sgstRate}
                            onChange={(e) => handleRateChange("sgstRate", e.target.value)}
                            disabled={mode !== "CGST"}
                            fullWidth
                            size="small"
                            variant="outlined"
                            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                        />
                    </Grid>
                </Grid>

                <TextField
                    label="IGST %"
                    type="number"
                    value={igstRate}
                    onChange={(e) => handleRateChange("igstRate", e.target.value)}
                    disabled={mode !== "IGST"}
                    fullWidth
                    size="small"
                    variant="outlined"
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                />

                {/* GST LEDGER AUTOCOMPLETE SELECTORS */}
                {mode === "CGST" ? (
                    <Grid container spacing={2}>
                        <Grid size={6}>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.8 }}>
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <Typography variant="caption" fontWeight={700} color="text.secondary">CGST Account</Typography>
                                    {invoice.tax.cgstLedger && (
                                        <Chip
                                            label={invoice.tax.cgstSource === "auto" ? "🟢 Auto" : "🔵 User"}
                                            size="small"
                                            variant="outlined"
                                            sx={{ height: 16, fontSize: "0.62rem", px: 0.5, fontWeight: 700 }}
                                        />
                                    )}
                                </Box>
                                <AccountHeadAutocomplete
                                    value={invoice.tax.cgstLedger}
                                    onChange={(val) => handleLedgerChange("cgstLedger", "cgstSource", val)}
                                    error={!invoice.tax.cgstLedger}
                                    helperText={!invoice.tax.cgstLedger ? "Required in CGST mode" : ""}
                                />
                            </Box>
                        </Grid>
                        <Grid size={6}>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.8 }}>
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <Typography variant="caption" fontWeight={700} color="text.secondary">SGST Account</Typography>
                                    {invoice.tax.sgstLedger && (
                                        <Chip
                                            label={invoice.tax.sgstSource === "auto" ? "🟢 Auto" : "🔵 User"}
                                            size="small"
                                            variant="outlined"
                                            sx={{ height: 16, fontSize: "0.62rem", px: 0.5, fontWeight: 700 }}
                                        />
                                    )}
                                </Box>
                                <AccountHeadAutocomplete
                                    value={invoice.tax.sgstLedger}
                                    onChange={(val) => handleLedgerChange("sgstLedger", "sgstSource", val)}
                                    error={!invoice.tax.sgstLedger}
                                    helperText={!invoice.tax.sgstLedger ? "Required in CGST mode" : ""}
                                />
                            </Box>
                        </Grid>
                    </Grid>
                ) : (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.8 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <Typography variant="caption" fontWeight={700} color="text.secondary">IGST Account</Typography>
                            {invoice.tax.igstLedger && (
                                <Chip
                                    label={invoice.tax.igstSource === "auto" ? "🟢 Auto" : "🔵 User"}
                                    size="small"
                                    variant="outlined"
                                    sx={{ height: 16, fontSize: "0.62rem", px: 0.5, fontWeight: 700 }}
                                />
                            )}
                        </Box>
                        <AccountHeadAutocomplete
                            value={invoice.tax.igstLedger}
                            onChange={(val) => handleLedgerChange("igstLedger", "igstSource", val)}
                            error={!invoice.tax.igstLedger}
                            helperText={!invoice.tax.igstLedger ? "Required in IGST mode" : ""}
                        />
                    </Box>
                )}

                <Divider sx={{ my: 0.5 }} />

                {/* ESTIMATED TOTALS */}
                <Typography variant="body2" fontWeight={700} color="text.secondary">
                    Estimated Tax Totals (Grouped)
                </Typography>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2" color="text.secondary">CGST Amount:</Typography>
                        <Typography variant="body2" fontWeight={600}>₹{totalCGST.toFixed(2)}</Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2" color="text.secondary">SGST Amount:</Typography>
                        <Typography variant="body2" fontWeight={600}>₹{totalSGST.toFixed(2)}</Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2" color="text.secondary">IGST Amount:</Typography>
                        <Typography variant="body2" fontWeight={600}>₹{totalIGST.toFixed(2)}</Typography>
                    </Box>
                </Box>
            </Stack>
        </Paper>
    );
}

export default TaxConfig;