import cv2
import time
from document_processor import DocumentProcessor
from invoice_ocr import InvoiceOCR

def main():
    scanner = DocumentProcessor(max_processing_dim=800, target_ocr_width=1500)
    ocr_engine = InvoiceOCR()

    input_document = "invoice_data/test1.pdf"
    try:
        print(f"🔄 Step 1: Processing layout for {input_document}...")
        
        processed_image = scanner.process_file(input_document)
        
        start_time = time.time()
        extracted_text, breakdown = ocr_engine.extract_text(processed_image)
        end_time = time.time()
        
        print("\n--- Clean Text Block Prepped for Ollama ---")
        print(extracted_text)
        print("------------------------------------------")
        
        print(f"⏱️ Total OCR Pipeline Time: {end_time - start_time:.4f} seconds")
        print(f"📊 Model Breakdown (Det/Rec): {breakdown}")
    except Exception as e:
        print(f"Processing Interrupted: {e}")

if __name__ == "__main__":
    main()