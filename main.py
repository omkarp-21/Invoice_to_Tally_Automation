import cv2
from document_processor import DocumentProcessor

def main():
    scanner = DocumentProcessor(max_processing_dim=800, target_ocr_width=1200)

    input_path = "invoice_data/test1.pdf"
    try:
        processed_invoice = scanner.process_invoice(input_path)
        
        cv2.imwrite("./result.jpg", processed_invoice)
        print("Success! Clean binary invoice generated and saved.")
        
    except Exception as e:
        print(f"Processing Interrupted: {e}")

if __name__ == "__main__":
    main()