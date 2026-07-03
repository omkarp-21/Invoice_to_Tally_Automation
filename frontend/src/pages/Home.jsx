import {
    Box,
    Typography,
    Button,
    CircularProgress,
    Paper,
    Fade
} from "@mui/material";
import { useState, useEffect } from "react";
import { extractInvoice } from "../services/api";
import { useNavigate } from "react-router-dom";
import { useInvoice } from "../context/InvoiceContext";
import UploadCard from "../components/UploadCard";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

function Home() {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { setInvoice, setDocumentFile, resetInvoice } = useInvoice();

    useEffect(() => {
        resetInvoice();
    }, [resetInvoice]);

    const handleExtract = async () => {
        if (!file) return;
        try {
            setLoading(true);
            const result = await extractInvoice(file);
            setDocumentFile(file);
            setInvoice(prev => ({
                ...prev,
                vendor: {
                    ...prev.vendor,
                    gstin: result.data.vendor_gstin || "",
                    verified: false
                },
                extracted_line_items: (result.data.extracted_line_items || []).map((item, idx) => ({
                    ...item,
                    id: item.id || `item_${idx}_${Date.now()}`
                }))
            }));
            navigate("/review");
        } catch (err) {
            console.error(err);
            alert("Extraction failed. Please make sure the backend is running.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Fade in={true} timeout={600}>
            <Box
                sx={{
                    width: "100%",
                    minHeight: "100vh",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    bgcolor: "#f6f8fb",
                    p: 3
                }}
            >
                <Paper
                    elevation={0}
                    sx={{
                        p: 5,
                        borderRadius: 6,
                        bgcolor: "white",
                        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.04)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        maxWidth: 750,
                        width: "100%"
                    }}
                >
                    <Typography
                        variant="h4"
                        component="h1"
                        fontWeight="800"
                        color="text.primary"
                        sx={{
                            mb: 1,
                            letterSpacing: "-0.5px",
                            fontFamily: "'Outfit', 'Inter', sans-serif",
                            textAlign: "center"
                        }}
                    >
                        Tally Purchase Entry Automation
                    </Typography>

                    <Typography
                        color="text.secondary"
                        sx={{
                            mb: 4,
                            fontSize: "1.1rem",
                            textAlign: "center",
                            maxWidth: 500
                        }}
                    >
                        Upload your vendor invoice PDF or image to extract line items and automatically sync vouchers to TallyPrime.
                    </Typography>

                    <UploadCard
                        file={file}
                        setFile={setFile}
                    />

                    <Button
                        variant="contained"
                        size="large"
                        disabled={!file || loading}
                        onClick={handleExtract}
                        startIcon={loading ? null : <CloudUploadIcon />}
                        sx={{
                            mt: 4,
                            px: 6,
                            py: 1.5,
                            borderRadius: 3,
                            fontSize: "1rem",
                            fontWeight: 600,
                            textTransform: "none",
                            boxShadow: "0 8px 16px rgba(25, 118, 210, 0.15)",
                            "&:hover": {
                                boxShadow: "0 10px 20px rgba(25, 118, 210, 0.25)"
                            }
                        }}
                    >
                        {loading ? (
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <CircularProgress size={20} color="inherit" />
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    Analyzing Document layout & OCR...
                                </Typography>
                            </Box>
                        ) : (
                            "Extract & Review Invoice"
                        )}
                    </Button>
                </Paper>
            </Box>
        </Fade>
    );
}

export default Home;