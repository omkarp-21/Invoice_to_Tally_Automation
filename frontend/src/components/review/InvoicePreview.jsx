import { useState, useMemo, useEffect } from "react";

import {
    Paper,
    Typography,
    Box,
    IconButton,
    Stack
} from "@mui/material";

import {
    ChevronLeft,
    ChevronRight,
    Description
} from "@mui/icons-material";

import { Document, Page, pdfjs } from "react-pdf";

import { useInvoice } from "../../context/InvoiceContext";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
).toString();

function InvoicePreview() {

    const { documentFile } = useInvoice();
    const [numPages, setNumPages] = useState(0);
    const [pageNumber, setPageNumber] = useState(1);

    useEffect(() => {
        setPageNumber(1);
    }, [documentFile]);

    const imageUrl = useMemo(() => {
        if (
            documentFile &&
            documentFile.type.startsWith("image/")
        ) {
            return URL.createObjectURL(documentFile);
        }

        return null;
    }, [documentFile]);

    useEffect(() => {
        return () => {
            if (imageUrl) {
                URL.revokeObjectURL(imageUrl);
            }
        };
    }, [imageUrl]);

    function onDocumentLoadSuccess({ numPages }) {
        setNumPages(numPages);
        setPageNumber(1);
    }

    const isPdf =
        documentFile &&
        documentFile.type === "application/pdf";

    const isImage =
        documentFile &&
        documentFile.type.startsWith("image/");

    return (
        <Paper
            elevation={0}
            sx={{
                borderRadius: 4,
                p: 3,
                backgroundColor: "#ffffff",
                boxShadow: "0 4px 18px rgba(0,0,0,0.08)"
            }}
        >
            <Typography
                sx={{
                    fontSize: 22,
                    fontWeight: 700,
                    mb: 2
                }}
            >
                Invoice Preview
            </Typography>

            <Box
                sx={{
                    border: "1px solid #dcdcdc",
                    borderRadius: 2,
                    backgroundColor: "#f8f8f8",
                    minHeight: 500,
                    display: "flex",
                    justifyContent: "center",
                    // alignItems: "center",
                    overflow: "auto"
                }}
            >
                {!documentFile && (
                    <Stack
                        spacing={2}
                        // alignItems="center"
                    >
                        <Description
                            sx={{
                                fontSize: 70,
                                color: "#b0b0b0"
                            }}
                        />

                        <Typography color="text.secondary">
                            No document selected
                        </Typography>
                    </Stack>
                )}

                {isPdf && (
                    <Document
                        file={documentFile}
                        onLoadSuccess={onDocumentLoadSuccess}
                        loading="Loading PDF..."
                        error="Unable to load PDF."
                    >
                        <Page
                            pageNumber={pageNumber}
                            width={360}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                        />
                    </Document>
                )}

                {isImage && (
                    <img
                        src={imageUrl}
                        alt="Invoice Preview"
                        style={{
                            maxWidth: "100%",
                            maxHeight: "500px",
                            objectFit: "contain"
                        }}
                    />
                )}
            </Box>

            {isPdf && (
                <Box
                    sx={{
                        mt: 2,
                        display: "flex",
                        justifyContent: "space-between",
                        // alignItems: "center"
                    }}
                >
                    <IconButton
                        disabled={pageNumber <= 1}
                        onClick={() =>
                            setPageNumber((prev) => prev - 1)
                        }
                    >
                        <ChevronLeft />
                    </IconButton>

                    <Typography fontWeight={600}>
                        {pageNumber} / {numPages}
                    </Typography>

                    <IconButton
                        disabled={pageNumber >= numPages}
                        onClick={() =>
                            setPageNumber((prev) => prev + 1)
                        }
                    >
                        <ChevronRight />
                    </IconButton>
                </Box>
            )}
        </Paper>
    );
}

export default InvoicePreview;