import { Stack } from "@mui/material";

import InvoicePreview from "./InvoicePreview";
import InvoiceDetails from "./InvoiceDetails";
import TaxConfig from "./TaxConfig";

function LeftPanel() {
    return (
        <Stack
            spacing={3}
            sx={{
                position: "sticky",
                top: 24
            }}
        >
            <InvoicePreview />

            <InvoiceDetails />

            <TaxConfig />
        </Stack>
    );
}

export default LeftPanel;