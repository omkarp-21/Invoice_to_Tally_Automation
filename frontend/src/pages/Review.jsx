import { useEffect, useState } from "react";
import {
    Box,
    Alert,
    Button,
    AlertTitle,
    CircularProgress,
    Typography,
    Stack,
    IconButton,
    Grid
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";
import { useInvoice } from "../context/InvoiceContext";
import { getVendors, getLedgers, refreshTally } from "../services/api";
import InvoicePreview from "../components/review/InvoicePreview";
import InvoiceDetails from "../components/review/InvoiceDetails";
import TaxConfig from "../components/review/TaxConfig";
import ItemTable from "../components/review/ItemTable";
import GroupCard from "../components/review/GroupCard";
import SummaryCard from "../components/review/SummaryCard";

function Review() {
    const {
        invoice,
        setInvoice,
        setVendors,
        setLedgers,
        loading,
        setLoading,
        error,
        setError
    } = useInvoice();

    const navigate = useNavigate();
    const [refreshing, setRefreshing] = useState(false);

    const loadTallyData = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        setError(null);
        try {
            const [vendorsRes, ledgersRes] = await Promise.all([
                getVendors(),
                getLedgers()
            ]);
            const loadedLedgers = ledgersRes.ledgers || [];
            setVendors(vendorsRes.vendors || []);
            setLedgers(loadedLedgers);

            // Fuzzy Auto-Suggestion Engine
            if (loadedLedgers.length > 0) {
                const scoreGSTLedger = (name, type) => {
                    const norm = (name || "").toUpperCase();
                    const t = type.toUpperCase();
                    if (!norm.includes(t)) return 0;

                    const exclusions = ["OUTPUT", "PAYABLE", "RECEIVABLE", "ADJUSTMENT", "REFUND", "REVERSE", "RCM", "OPENING", "PROVISION"];
                    for (const exc of exclusions) {
                        if (norm.includes(exc)) return -100;
                    }

                    let score = 0;
                    if (norm === `INPUT ${t}` || norm === `${t} INPUT`) score += 100;
                    else if (norm.startsWith(`INPUT ${t}`) || norm.startsWith(`${t} INPUT`)) score += 80;
                    else if (norm.includes("INPUT")) score += 65;
                    else if (norm.includes("INPUT TAX")) score += 70;
                    else if (norm.includes("PURCHASE")) score += 50;

                    score += 10;
                    return score;
                };

                const findBestSuggestion = (type) => {
                    let bestLedger = null;
                    let bestScore = -999;
                    let hasTie = false;

                    for (const l of loadedLedgers) {
                        if (!l || !l.name) continue;
                        const score = scoreGSTLedger(l.name, type);
                        if (score <= 0) continue;

                        if (score > bestScore) {
                            bestScore = score;
                            bestLedger = l;
                            hasTie = false;
                        } else if (score === bestScore) {
                            hasTie = true;
                        }
                    }

                    if (bestLedger && bestScore >= 50 && !hasTie) {
                        return {
                            ledger: { name: bestLedger.name, guid: bestLedger.guid, master_id: bestLedger.master_id },
                            source: "auto"
                        };
                    }
                    return null;
                };

                const cgstMatch = findBestSuggestion("CGST");
                const sgstMatch = findBestSuggestion("SGST");
                const igstMatch = findBestSuggestion("IGST");

                setInvoice(prev => ({
                    ...prev,
                    tax: {
                        ...prev.tax,
                        cgstLedger: prev.tax.cgstLedger || (cgstMatch ? cgstMatch.ledger : null),
                        cgstSource: prev.tax.cgstSource || (cgstMatch ? cgstMatch.source : null),
                        sgstLedger: prev.tax.sgstLedger || (sgstMatch ? sgstMatch.ledger : null),
                        sgstSource: prev.tax.sgstSource || (sgstMatch ? sgstMatch.source : null),
                        igstLedger: prev.tax.igstLedger || (igstMatch ? igstMatch.ledger : null),
                        igstSource: prev.tax.igstSource || (igstMatch ? igstMatch.source : null)
                    }
                }));
            }
        } catch (err) {
            console.error("Error loading Tally masters:", err);
            setError("Tally connection offline. Ledgers and Vendors could not be synchronized.");
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    useEffect(() => {
        loadTallyData();
    }, []);

    const handleRefreshTally = async () => {
        setRefreshing(true);
        setError(null);
        try {
            await refreshTally();
            await loadTallyData(false);
        } catch (err) {
            console.error("Refresh failed:", err);
            setError("Failed to refresh Tally synchronization. Ensure Tally is running at localhost:9000.");
        } finally {
            setRefreshing(false);
        }
    };

    return (
        <Box
            sx={{
                width: "100%",
                minHeight: "100vh",
                backgroundColor: "#f6f8fb",
                display: "flex",
                flexDirection: "column"
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    px: 3,
                    py: 2,
                    borderBottom: "1px solid #e2e8f0",
                    bgcolor: "white"
                }}
            >
                <Stack direction="row" spacing={2} /*alignItems="center"*/>
                    <IconButton onClick={() => navigate("/")} color="primary">
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h6" fontWeight="700" color="text.primary">
                        Review Invoice Voucher
                    </Typography>
                </Stack>
                
                <Button
                    variant="outlined"
                    startIcon={refreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
                    onClick={handleRefreshTally}
                    disabled={refreshing}
                    sx={{
                        textTransform: "none",
                        fontWeight: 600,
                        borderRadius: 2
                    }}
                >
                    {refreshing ? "Refreshing Tally..." : "Refresh Tally"}
                </Button>
            </Box>

            <Box
                sx={{
                    display: "flex",
                    gap: 3,
                    width: "100%",
                    p: 3,
                    boxSizing: "border-box",
                    flex: 1
                }}
            >
                <Box
                    sx={{
                        width: 430,
                        flexShrink: 0,
                        position: "sticky",
                        top: 24,
                        alignSelf: "flex-start",
                        maxHeight: "calc(100vh - 110px)",
                        overflow: "auto"
                    }}
                >
                    <InvoicePreview />
                </Box>

                <Box
                    sx={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        gap: 4
                    }}
                >
                    {error && (
                        <Alert 
                            severity="warning" 
                            action={
                                <Button 
                                    color="inherit" 
                                    size="small" 
                                    onClick={handleRefreshTally}
                                    disabled={refreshing}
                                >
                                    Retry Sync
                                </Button>
                            }
                            sx={{ borderRadius: 3, boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}
                        >
                            <AlertTitle>Synchronization Warning</AlertTitle>
                            {error}
                        </Alert>
                    )}

                    {loading ? (
                        <Box sx={{ display: "flex", justifyContent: "center", /*alignItems: "center", */py: 10, flex: 1 }}>
                            <Stack spacing={2} /*alignItems="center"*/>
                                <CircularProgress size={40} />
                                <Typography color="text.secondary" fontWeight={500}>
                                    Synchronizing Tally masters...
                                </Typography>
                            </Stack>
                        </Box>
                    ) : (
                        <>
                            <Grid container spacing={3}>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <InvoiceDetails />
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TaxConfig />
                                </Grid>
                            </Grid>

                            <Box>
                                <Typography variant="h6" fontWeight="700" sx={{ mb: 2, color: "text.primary" }}>
                                    Ungrouped Items
                                </Typography>
                                <ItemTable />
                            </Box>

                            <Box>
                                <Typography variant="h6" fontWeight="700" sx={{ mb: 2, color: "text.primary" }}>
                                    Groups
                                </Typography>
                                {invoice.groups.length === 0 ? (
                                    <Box
                                        sx={{
                                            border: "2px dashed #cbd5e1",
                                            borderRadius: 4,
                                            p: 4,
                                            textAlign: "center",
                                            bgcolor: "white"
                                        }}
                                    >
                                        <Typography color="text.secondary" variant="body1">
                                            No item groups created yet. Select items from the Ungrouped Items list above and click "Create Group".
                                        </Typography>
                                    </Box>
                                ) : (
                                    <Stack spacing={3}>
                                        {invoice.groups.map(group => (
                                            <GroupCard key={group.id} group={group} />
                                        ))}
                                    </Stack>
                                )}
                            </Box>

                            <Box sx={{ alignSelf: "flex-end", width: "100%", maxWidth: 450, mt: 2 }}>
                                <SummaryCard />
                            </Box>
                        </>
                    )}
                </Box>
            </Box>
        </Box>
    );
}

export default Review;