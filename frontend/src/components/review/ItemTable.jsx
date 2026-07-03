import { useState } from "react";
import {
    Paper,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Checkbox,
    Button,
    Toolbar,
    Tooltip
} from "@mui/material";
import { useInvoice } from "../../context/InvoiceContext";
import GroupAddIcon from "@mui/icons-material/GroupAdd";

function ItemTable() {
    const { invoice, setInvoice } = useInvoice();
    const [selectedIds, setSelectedIds] = useState([]);

    const items = invoice.extracted_line_items || [];

    const handleSelectAllClick = (event) => {
        if (event.target.checked) {
            const newSelecteds = items.map((n) => n.id);
            setSelectedIds(newSelecteds);
            return;
        }
        setSelectedIds([]);
    };

    const handleClick = (event, id) => {
        const selectedIndex = selectedIds.indexOf(id);
        let newSelected = [];

        if (selectedIndex === -1) {
            newSelected = newSelected.concat(selectedIds, id);
        } else if (selectedIndex === 0) {
            newSelected = newSelected.concat(selectedIds.slice(1));
        } else if (selectedIndex === selectedIds.length - 1) {
            newSelected = newSelected.concat(selectedIds.slice(0, -1));
        } else if (selectedIndex > 0) {
            newSelected = newSelected.concat(
                selectedIds.slice(0, selectedIndex),
                selectedIds.slice(selectedIndex + 1)
            );
        }

        setSelectedIds(newSelected);
    };

    const isSelected = (id) => selectedIds.indexOf(id) !== -1;

    const handleCreateGroupClick = () => {
        const selectedItems = items.filter(item => 
            selectedIds.includes(item.id)
        );

        if (selectedItems.length === 0) return;

        const subtotal = selectedItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);

        const { mode, cgstRate, sgstRate, igstRate } = invoice.tax;
        let cgst = 0;
        let sgst = 0;
        let igst = 0;

        if (mode === "CGST") {
            cgst = Number((subtotal * (cgstRate / 100)).toFixed(2));
            sgst = Number((subtotal * (sgstRate / 100)).toFixed(2));
        } else {
            igst = Number((subtotal * (igstRate / 100)).toFixed(2));
        }

        const total = Number((subtotal + cgst + sgst + igst).toFixed(2));

        const newGroup = {
            id: `group_${Date.now()}`,
            name: "",
            accountHead: null,
            items: selectedItems,
            subtotal,
            taxes: {
                cgst,
                sgst,
                igst
            },
            total
        };

        setInvoice(prev => ({
            ...prev,
            groups: [...prev.groups, newGroup],
            extracted_line_items: prev.extracted_line_items.filter(item => 
                !selectedIds.includes(item.id)
            )
        }));

        setSelectedIds([]);
    };

    const getRowId = (item, index) => {
        return item.id || `item_${index}`;
    };

    return (
        <Paper
            elevation={0}
            sx={{
                width: "100%",
                borderRadius: 4,
                overflow: "hidden",
                boxShadow: "0 4px 18px rgba(0,0,0,0.05)",
                border: "1px solid #e2e8f0",
                bgcolor: "white"
            }}
        >
            <Toolbar
                sx={{
                    pl: { sm: 2 },
                    pr: { xs: 1, sm: 1 },
                    bgcolor: selectedIds.length > 0 ? "#f1f5f9" : "transparent",
                    display: "flex",
                    justifyContent: "space-between",
                    // alignItems: "center"
                }}
            >
                {selectedIds.length > 0 ? (
                    <Typography color="inherit" variant="subtitle1" fontWeight={700}>
                        {selectedIds.length} item{selectedIds.length > 1 ? "s" : ""} selected
                    </Typography>
                ) : (
                    <Typography variant="subtitle1" fontWeight={750} color="text.secondary">
                        Available OCR Extracted Items ({items.length})
                    </Typography>
                )}

                {selectedIds.length > 0 && (
                    <Tooltip title="Create Group from Selected Items">
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<GroupAddIcon />}
                            onClick={handleCreateGroupClick}
                            sx={{
                                borderRadius: 2,
                                textTransform: "none",
                                fontWeight: 600
                            }}
                        >
                            Create Group
                        </Button>
                    </Tooltip>
                )}
            </Toolbar>

            <TableContainer sx={{ maxHeight: 400 }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell padding="checkbox" sx={{ bgcolor: "#f8fafc" }}>
                                <Checkbox
                                    color="primary"
                                    indeterminate={selectedIds.length > 0 && selectedIds.length < items.length}
                                    checked={items.length > 0 && selectedIds.length === items.length}
                                    onChange={handleSelectAllClick}
                                    slotProps={{ input: { "aria-label": "select all items" } }}
                                />
                            </TableCell>
                            <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: 700 }}>Description</TableCell>
                            <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: 700 }} align="right">Qty</TableCell>
                            <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: 700 }} align="right">Rate</TableCell>
                            <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: 700 }} align="right">Amount</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                                    <Typography color="text.secondary" variant="body2">
                                        All items grouped or no items loaded.
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            items.map((item, index) => {
                                const rowId = getRowId(item, index);
                                const isItemSelected = isSelected(rowId);
                                const labelId = `enhanced-table-checkbox-${index}`;

                                return (
                                    <TableRow
                                        hover
                                        onClick={(event) => handleClick(event, rowId)}
                                        role="checkbox"
                                        aria-checked={isItemSelected}
                                        tabIndex={-1}
                                        key={rowId}
                                        selected={isItemSelected}
                                        sx={{ cursor: "pointer" }}
                                    >
                                        <TableCell padding="checkbox">
                                            <Checkbox
                                                color="primary"
                                                checked={isItemSelected}
                                                slotProps={{ input: { "aria-labelledby": labelId } }}
                                            />
                                        </TableCell>
                                        <TableCell id={labelId} scope="row">
                                            <Typography variant="body2" fontWeight={500}>
                                                {item.description}
                                            </Typography>
                                            {item.hsn && (
                                                <Typography variant="caption" color="text.secondary">
                                                    HSN: {item.hsn}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell align="right">
                                            {item.quantity != null ? item.quantity : "-"} {item.unit || ""}
                                        </TableCell>
                                        <TableCell align="right">
                                            {item.rate != null ? `₹${Number(item.rate).toFixed(2)}` : "-"}
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                                            {item.amount != null ? `₹${Number(item.amount).toFixed(2)}` : "-"}
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
}

export default ItemTable;