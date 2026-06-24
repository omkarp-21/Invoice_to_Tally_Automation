import time
import ollama
import json
from document_processor import DocumentProcessor
from doc_ocr import InvoiceOCR
from doc_parser import parse_invoice_structure

MY_COMPANY_GSTIN = "27AADFF3944P1ZY"

def main():
    scanner = DocumentProcessor(max_processing_dim=800, target_ocr_width=1500)
    ocr_engine = InvoiceOCR()

    input_document = "invoice_data/test7.pdf"
    try:
        print(f"🔄 Step 1: Processing layout for {input_document}...")
        
        processed_image = scanner.process_file(input_document)
        
        start_time = time.time()
        layout_data, breakdown = ocr_engine.extract_text(processed_image)
        end_time = time.time()

        print(f"⏱️ Total OCR Pipeline Time: {end_time - start_time:.4f} seconds")
        print(f"📊 Model Breakdown (Det/Rec): {breakdown}")

        pre_sorted_text = ocr_engine.coordinate_pre_sort(layout_data, y_threshold=12)
        
        print("\n--- Clean Text Block Prepped for Ollama ---")
        print(layout_data)
        print("------------------------------------------")

        # -------------------------------------------------------------
        # 1. PARSE VIA GEOMETRIC ENGINE (Taxes, Totals, GSTIN Selection)
        # -------------------------------------------------------------
        print("📐 Step 2: Executing Neighborhood Spatial Parser Engine...")
        geometric_results = parse_invoice_structure(layout_data, MY_COMPANY_GSTIN)

        # -------------------------------------------------------------
        # 2. PARSE VIA LOCAL LLM (Product/Material Items Only)
        # -------------------------------------------------------------
        print("🤖 Step 3: Extracting Material Items via Local LLM...")

        system_prompt = (
            "You are a line-item extraction utility. Read the raw invoice text stream and extract ONLY the descriptive names of the physical products or goods listed.\n\n"
            "Rules:\n"
            "- Ignore all prices, quantities, amounts, tax rates, and totals.\n"
            "- Ignore company names, bank details, and invoice metadata headers.\n"
            "- If a product description spans multiple lines, combine them into a single item name.\n"
            "- Respond ONLY with a clean JSON list of strings (no markdown blocks, no backticks, no chat commentary)."
        )

        response = ollama.chat(
            model='llama3.2', 
            messages=[
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': f"Extract goods names from this invoice text:\n{pre_sorted_text}"}
            ],
            options={'temperature': 0.0}
        )

        # 3. Clean up and structure the LLM list payload string
        try:
            material_items = json.loads(response['message']['content'].strip())
        except Exception:
            # Fallback if the LLM output adds structural noise or formatting backticks
            material_items = response['message']['content']

        # -------------------------------------------------------------
        # 3. CONSOLIDATE OUTPUT DATA OBJECT
        # -------------------------------------------------------------
        final_extraction_payload = {
            "vendor_gstin": geometric_results["vendor_gstin"],
            "buyer_gstin": geometric_results["buyer_gstin"],
            "cgst": geometric_results["cgst"],
            "sgst": geometric_results["sgst"],
            "igst": geometric_results["igst"],
            "grand_total": geometric_results["grand_total"],
            "material_items": material_items
        }

        print("\n🏆 FINAL PIPELINE LEDGER OUTPUT (Ready for Tally Sync):")
        print(json.dumps(final_extraction_payload, indent=4))
        print("-------------------------------------------------------")
        
        print(f"⏱️ Total OCR Pipeline Time: {end_time - start_time:.4f} seconds")
        print(f"📊 Model Breakdown (Det/Rec): {breakdown}")

    except Exception as e:
        print(f"Processing Interrupted: {e}")

if __name__ == "__main__":
    main()
