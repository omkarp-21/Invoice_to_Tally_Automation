import json
import os
from dotenv import load_dotenv

from document_processor import DocumentProcessor
from doc_ocr import InvoiceOCR
from doc_parser import extract_raw_line_lanes, extract_gstins
from llm_parser import structure_lines_with_llm

load_dotenv()

MY_COMPANY_GSTIN = os.getenv("MY_COMPANY_GSTIN")

def process_invoice(input_document):

    scanner = DocumentProcessor(
        max_processing_dim=800,
        target_ocr_width=1500
    )

    ocr_engine = InvoiceOCR()

    print(f"🔄 Step 1: Processing layout for {input_document}...")

    processed_image = scanner.process_file(input_document)
    ocr_results, breakdown = ocr_engine.extract_text(processed_image)

    print(f"📊 OCR Model Breakdown (Det/Rec): {breakdown}")

    print("\n--- Layout Data from OCR ---")
    print(ocr_results)
    print("------------------------------------------")

    print("📐 Step 2: Executing Neighborhood Spatial Parser Engine...")

    raw_lanes = extract_raw_line_lanes(ocr_results)

    print("\n--- Extracted Raw Lanes ---")
    print(raw_lanes)
    print("------------------------------------------")

    print("🤖 Step 3: Handing off refined data arrays to Ollama...")

    final_line_items = structure_lines_with_llm(
        raw_lanes,
        model_name="qwen2.5:7b"
    )

    vendor_gstin, buyer_gstin = extract_gstins(
        ocr_results,
        MY_COMPANY_GSTIN
    )

    pipeline_ledger = {
        "vendor_gstin": vendor_gstin,
        "buyer_gstin": buyer_gstin,
        "extracted_line_items": final_line_items
    }
    print("\n🏆 FINAL PIPELINE LEDGER OUTPUT (Ready for Tally Sync):")
    print(json.dumps(pipeline_ledger, indent=4))
    return pipeline_ledger


def main():
    input_document = "invoice_data/test7.pdf"
    try:
        process_invoice(input_document)
    except Exception as e:
        print(f"\nProcessing Interrupted:\n{e}")


if __name__ == "__main__":
    main()