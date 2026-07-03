import {
    Paper,
    Typography,
    TextField,
    Stack,
    Grid,
    Chip,
    Autocomplete,
    Box
} from "@mui/material";
import { useInvoice } from "../../context/InvoiceContext";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";

function InvoiceDetails() {
    const { invoice, setInvoice, vendors } = useInvoice();

    const normalizeGSTIN = (g) => {
        if (!g) return "";
        return g.replace(/\s+/g, "").toUpperCase();
    };

    const handleNumberChange = (e) => {
        const val = e.target.value;
        setInvoice(prev => ({
            ...prev,
            invoiceNumber: val
        }));
    };

    const handleDateChange = (e) => {
        const val = e.target.value;
        setInvoice(prev => ({
            ...prev,
            invoiceDate: val
        }));
    };

    const handleVendorAutocomplete = (event, value) => {
        setInvoice(prev => {
            if (typeof value === "string") {
                // Free solo typed value
                return {
                    ...prev,
                    vendor: {
                        ...prev.vendor,
                        name: value,
                        verified: false,
                        master_id: null,
                        guid: null
                    }
                };
            } else if (value && value.name) {
                // Selected vendor object
                return {
                    ...prev,
                    vendor: {
                        name: value.name,
                        gstin: value.gstin || "",
                        verified: true,
                        master_id: value.master_id || null,
                        guid: value.guid || null
                    }
                };
            } else {
                // Cleared
                return {
                    ...prev,
                    vendor: {
                        name: "",
                        gstin: "",
                        verified: false,
                        master_id: null,
                        guid: null
                    }
                };
            }
        });
    };

    const handleGSTINChange = (e) => {
        const val = e.target.value;
        
        setInvoice(prev => {
            const updatedVendor = { ...prev.vendor, gstin: val };
            const normVal = normalizeGSTIN(val);
            
            if (normVal.length >= 2) {
                const match = vendors.find(v => normalizeGSTIN(v.gstin) === normVal);
                if (match) {
                    updatedVendor.name = match.name;
                    updatedVendor.master_id = match.master_id;
                    updatedVendor.guid = match.guid;
                    updatedVendor.verified = true;
                } else {
                    updatedVendor.verified = false;
                    updatedVendor.master_id = null;
                    updatedVendor.guid = null;
                }
            } else {
                updatedVendor.verified = false;
                updatedVendor.master_id = null;
                updatedVendor.guid = null;
            }

            return {
                ...prev,
                vendor: updatedVendor
            };
        });
    };

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
            <Box sx={{ display: "flex", justifyContent: "space-between", /*alignItems: "center", */mb: 2.5 }}>
                <Typography
                    sx={{
                        fontSize: 18,
                        fontWeight: 750,
                        color: "text.primary"
                    }}
                >
                    Invoice Details
                </Typography>
                {invoice.vendor.gstin && (
                    <Chip
                        icon={invoice.vendor.verified ? <CheckCircleIcon /> : <ErrorIcon />}
                        label={invoice.vendor.verified ? "Verified in Tally" : "Not Found in Tally"}
                        color={invoice.vendor.verified ? "success" : "warning"}
                        size="small"
                        sx={{ fontWeight: 600, borderRadius: 2 }}
                    />
                )}
            </Box>

            <Stack spacing={2.5}>
                <Grid container spacing={2}>
                    <Grid size={6}>
                        <TextField
                            label="Invoice Number"
                            value={invoice.invoiceNumber || ""}
                            onChange={handleNumberChange}
                            fullWidth
                            size="small"
                            variant="outlined"
                            // InputLabelProps={{ shrink: true }}
                            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                        />
                    </Grid>
                    <Grid size={6}>
                        <TextField
                            label="Invoice Date"
                            type="date"
                            value={invoice.invoiceDate || ""}
                            onChange={handleDateChange}
                            fullWidth
                            size="small"
                            variant="outlined"
                            // InputLabelProps={{ shrink: true }}
                            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                        />
                    </Grid>
                </Grid>

                <Autocomplete
                    freeSolo
                    options={vendors}
                    getOptionLabel={(option) => {
                        if (typeof option === "string") return option;
                        return option.name || "";
                    }}
                    value={vendors.find(v => v.name === invoice.vendor.name) || invoice.vendor.name || null}
                    onChange={handleVendorAutocomplete}
                    onInputChange={(event, newInputValue) => {
                        // Keep text field entry updated in context when typing
                        if (!vendors.some(v => v.name === newInputValue)) {
                            setInvoice(prev => ({
                                ...prev,
                                vendor: {
                                    ...prev.vendor,
                                    name: newInputValue,
                                    verified: false,
                                    master_id: null,
                                    guid: null
                                }
                            }));
                        }
                    }}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Vendor Name"
                            size="small"
                            variant="outlined"
                            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                        />
                    )}
                />

                <TextField
                    label="Vendor GSTIN"
                    value={invoice.vendor.gstin || ""}
                    onChange={handleGSTINChange}
                    fullWidth
                    size="small"
                    variant="outlined"
                    // InputLabelProps={{ shrink: true }}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                />
            </Stack>
        </Paper>
    );
}

export default InvoiceDetails;