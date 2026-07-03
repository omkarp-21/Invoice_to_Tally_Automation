import { Autocomplete, TextField, Box, Typography } from "@mui/material";
import { useInvoice } from "../../context/InvoiceContext";

function AccountHeadAutocomplete({ value, onChange, error, helperText }) {
    const { ledgers } = useInvoice();

    return (
        <Autocomplete
            options={ledgers}
            getOptionLabel={(option) => {
                if (typeof option === "string") return option;
                return option.name || "";
            }}
            value={value}
            onChange={(event, newValue) => {
                onChange(newValue);
            }}
            renderOption={(props, option) => {
                const { key, ...restProps } = props;
                return (
                    <Box key={key || option.guid || option.name} component="li" {...restProps} sx={{ py: 1 }}>
                        <Box sx={{ display: "flex", flexDirection: "column" }}>
                            <Typography variant="body2" fontWeight={600} color="text.primary">
                                {option.name}
                            </Typography>
                            {option.parent && (
                                <Typography variant="caption" color="text.secondary">
                                    Parent: {option.parent}
                                </Typography>
                            )}
                        </Box>
                    </Box>
                );
            }}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label="Group Name / Account Head"
                    size="small"
                    variant="outlined"
                    error={error}
                    helperText={helperText}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                />
            )}
            sx={{ width: "100%" }}
        />
    );
}

export default AccountHeadAutocomplete;
