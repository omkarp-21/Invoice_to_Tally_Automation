import {
    Paper,
    Box,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Stack,
    Grid,
    Tooltip,
    Divider,
    Typography
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useInvoice } from "../../context/InvoiceContext";
import AccountHeadAutocomplete from "./AccountHeadAutocomplete";

function GroupCard({ group }) {
    const { setInvoice } = useInvoice();

    const handleAccountHeadChange = (newValue) => {
        setInvoice(prev => {
            const nextGroups = prev.groups.map(g => {
                if (g.id === group.id) {
                    return {
                        ...g,
                        accountHead: newValue,
                        name: newValue ? newValue.name : ""
                    };
                }
                return g;
            });
            return {
                ...prev,
                groups: nextGroups
            };
        });
    };

    const handleUngroup = () => {
        setInvoice(prev => {
            const nextExtracted = [...prev.extracted_line_items, ...group.items];
            const nextGroups = prev.groups.filter(g => g.id !== group.id);

            return {
                ...prev,
                extracted_line_items: nextExtracted,
                groups: nextGroups
            };
        });
    };

    const items = group.items || [];
    const taxes = group.taxes || { cgst: 0, sgst: 0, igst: 0 };
    const hasAccountHead = !!group.accountHead;

    return (
        <Paper
            elevation={0}
            sx={{
                p: 3,
                borderRadius: 4,
                bgcolor: "white",
                boxShadow: "0 4px 18px rgba(0,0,0,0.04)",
                border: hasAccountHead ? "1px solid #e2e8f0" : "1px solid #f59e0b"
            }}
        >
            <Box sx={{ display: "flex", gap: 2, /*alignItems: "flex-start",*/ mb: 2.5 }}>
                <Box sx={{ flex: 1 }}>
                    <AccountHeadAutocomplete
                        value={group.accountHead}
                        onChange={handleAccountHeadChange}
                        error={!hasAccountHead}
                        helperText={!hasAccountHead ? "Group name / Tally Account Head is required" : ""}
                    />
                </Box>
                <Box sx={{ pt: 0.5 }}>
                    <Tooltip title="Ungroup / Delete Group">
                        <IconButton onClick={handleUngroup} color="error" size="small">
                            <DeleteIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            <TableContainer sx={{ border: "1px solid #f1f5f9", borderRadius: 2, mb: 2.5 }}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: "#f8fafc" }}>
                            <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Description</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }} align="right">Qty</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }} align="right">Rate</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }} align="right">Amount</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {items.map((item, index) => (
                            <TableRow key={item.id || index}>
                                <TableCell sx={{ fontSize: "0.75rem" }}>
                                    {item.description}
                                </TableCell>
                                <TableCell align="right" sx={{ fontSize: "0.75rem" }}>
                                    {item.quantity != null ? item.quantity : "-"} {item.unit || ""}
                                </TableCell>
                                <TableCell align="right" sx={{ fontSize: "0.75rem" }}>
                                    {item.rate != null ? `₹${Number(item.rate).toFixed(2)}` : "-"}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600, fontSize: "0.75rem" }}>
                                    {item.amount != null ? `₹${Number(item.amount).toFixed(2)}` : "-"}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2}>
                <Grid size={6}>
                </Grid>
                <Grid size={6}>
                    <Stack spacing={1}>
                        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                            <Typography variant="caption" color="text.secondary">Subtotal:</Typography>
                            <Typography variant="caption" fontWeight={600}>₹{(group.subtotal || 0).toFixed(2)}</Typography>
                        </Box>
                        {taxes.cgst > 0 && (
                            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                                <Typography variant="caption" color="text.secondary">CGST:</Typography>
                                <Typography variant="caption" fontWeight={600}>₹{taxes.cgst.toFixed(2)}</Typography>
                            </Box>
                        )}
                        {taxes.sgst > 0 && (
                            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                                <Typography variant="caption" color="text.secondary">SGST:</Typography>
                                <Typography variant="caption" fontWeight={600}>₹{taxes.sgst.toFixed(2)}</Typography>
                            </Box>
                        )}
                        {taxes.igst > 0 && (
                            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                                <Typography variant="caption" color="text.secondary">IGST:</Typography>
                                <Typography variant="caption" fontWeight={600}>₹{taxes.igst.toFixed(2)}</Typography>
                            </Box>
                        )}
                        <Box sx={{ display: "flex", justifyContent: "space-between", pt: 0.5, borderTop: "1px dashed #e2e8f0" }}>
                            <Typography variant="caption" fontWeight={700} color="text.primary">Group Total:</Typography>
                            <Typography variant="caption" fontWeight={750} color="primary.main">₹{(group.total || 0).toFixed(2)}</Typography>
                        </Box>
                    </Stack>
                </Grid>
            </Grid>
        </Paper>
    );
}

export default GroupCard;
