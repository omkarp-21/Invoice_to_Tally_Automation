import axios from "axios";

const api = axios.create({
    baseURL: "http://127.0.0.1:5000",
    headers: {
        "Content-Type": "application/json"
    }
});

export async function extractInvoice(file) {
    const formData = new FormData();
    formData.append("invoice", file);

    const response = await axios.post(
        "http://127.0.0.1:5000/extract",
        formData,
        {
            headers: {
                "Content-Type": "multipart/form-data"
            }
        }
    );

    return response.data;
}

export async function getVendors() {
    const response = await api.get("/vendors");
    return response.data;
}

export async function getLedgers() {
    const response = await api.get("/ledgers");
    return response.data;
}

export async function refreshTally() {
    const response = await api.post("/refresh_tally");
    return response.data;
}

export async function createVoucher(voucherData) {
    const response = await api.post("/create_voucher", voucherData);
    return response.data;
}

export default api;
