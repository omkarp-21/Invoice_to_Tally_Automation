import { useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Typography,
    Stack
} from "@mui/material";
import { useInvoice } from "../../context/InvoiceContext";

function CreateGroupDialog({ open, onClose, onSuccess, selectedItemIds }) {
    const { invoice, setInvoice } = useInvoice();
    const [groupName, setGroupName] = useState("");
    const [errorText, setErrorText] = useState("");

    const handleSave = () => {
        if (!groupName.trim()) {
            setErrorText("Group name is required");
            return;
        }

        const selectedItems = invoice.extracted_line_items.filter(item => 
            selectedItemIds.includes(item.id || item.serial_no || item.description)
        );

        if (selectedItems.length === 0) {
            setErrorText("No items found to group");
            return;
        }

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
            name: groupName.trim(),
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
                !selectedItemIds.includes(item.id || item.serial_no || item.description)
            )
        }));

        onSuccess();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle fontWeight={750}>Create Item Group</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                        Bundle the {selectedItemIds.length} selected item{selectedItemIds.length > 1 ? "s" : ""} into an accounting group. You can assign a Tally Account Head to this group.
                    </Typography>
                    <TextField
                        autoFocus
                        label="Group Name"
                        value={groupName}
                        onChange={(e) => {
                            setGroupName(e.target.value);
                            setErrorText("");
                        }}
                        error={!!errorText}
                        helperText={errorText}
                        fullWidth
                        size="small"
                        sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                    />
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5 }}>
                <Button onClick={onClose} sx={{ fontWeight: 600, textTransform: "none" }}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSave}
                    variant="contained"
                    sx={{ fontWeight: 600, textTransform: "none", borderRadius: 2 }}
                >
                    Create
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default CreateGroupDialog;
