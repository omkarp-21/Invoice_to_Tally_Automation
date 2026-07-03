import axios from "../api/axios";

export async function extractInvoice(file) {
    const formData = new FormData();
    formData.append("invoice", file);
    
    const response = await axios.post(
        "/extract",
        formData,
        {
            headers: {
                "Content-Type": "multipart/form-data"
            }
        }
    );
    return response.data;
}