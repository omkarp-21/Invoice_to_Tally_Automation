import { Paper, Typography } from "@mui/material";
import { useDropzone } from "react-dropzone";

function UploadCard({ file, setFile }) {

    const onDrop = (acceptedFiles) => {
        if (acceptedFiles.length > 0) {
            setFile(acceptedFiles[0]);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        multiple: false,
        accept: {
            "application/pdf": [".pdf"],
            "image/png": [".png"],
            "image/jpeg": [".jpg", ".jpeg"]
        }
    });

    return (

        <Paper
            {...getRootProps()}
            elevation={4}
            sx={{
                width: 650,
                height: 280,
                border: "2px dashed #1976d2",
                borderRadius: 3,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                cursor: "pointer",
                transition: "0.2s",
                bgcolor: isDragActive ? "#eef7ff" : "white"
            }}
        >

            <input {...getInputProps()} />

            <Typography sx={{ fontSize: 64 }}>
                📄
            </Typography>

            <Typography variant="h6">
                {file
                    ? file.name
                    : "Drag & Drop Invoice Here"}
            </Typography>

            <Typography color="text.secondary">
                {file
                    ? `${(file.size / 1024).toFixed(1)} KB`
                    : "or click to browse"}
            </Typography>
        </Paper>

    );

}

export default UploadCard;