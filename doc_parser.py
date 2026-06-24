import re
from math import sqrt

GST_PATTERN = re.compile(r'\b\d{2}[A-Z]{5}\d{4}[A-Z\d]{4}\b')
AMOUNT_PATTERN = re.compile(r'\d[\d,]*\.\d{2}')

def sanitize_ocr_amount(raw_text):
    clean = raw_text.replace(",", "")
    
    if clean.count(".") > 1:
        parts = clean.split(".")
        clean = "".join(parts[:-1]) + "." + parts[-1]
        
    try:
        return float(clean)
    except ValueError:
        return 0.0


def get_box_center(box):
    if not box:
        return (0.0, 0.0)
    if isinstance(box[0], list):
        xs = [point[0] for point in box]
        ys = [point[1] for point in box]
    elif len(box) == 4:
        xs = [box[0], box[2]]
        ys = [box[1], box[3]]
    elif len(box) == 8:
        xs = [box[0], box[2], box[4], box[6]]
        ys = [box[1], box[3], box[5], box[7]]
    else:
        raise ValueError(f"Unsupported bounding box format: {box}")
        
    return (sum(xs) / len(xs), sum(ys) / len(ys))

def anisotropic_distance(center_a, center_b, y_penalty=12.0):
    dx = center_b[0] - center_a[0]
    dy = center_b[1] - center_a[1]
    return sqrt(dx**2 + (dy * y_penalty)**2)


def extract_gstins(ocr_results, target_buyer_gstin):
    vendor_gstin, buyer_gstin = None, None
    for item in ocr_results:
        text = item.get("text", "").strip().upper()
        match = GST_PATTERN.search(text)
        if match:
            found_gst = match.group()
            if found_gst == target_buyer_gstin.upper():
                buyer_gstin = found_gst
            else:
                vendor_gstin = found_gst
    return vendor_gstin, buyer_gstin


def find_nearest_amount_right(label_keywords, ocr_results):
    label_candidates = [
        item for item in ocr_results 
        if any(kw in item.get("text", "").upper() for kw in label_keywords)
    ]
    if not label_candidates:
        return 0.0

    best_amount = 0.0
    best_distance = float("inf")

    for label in label_candidates:
        label_box = label.get("box") or label.get("bbox")
        label_center = get_box_center(label_box)

        for candidate in ocr_results:
            amount_match = AMOUNT_PATTERN.search(candidate.get("text", ""))
            if not amount_match:
                continue

            candidate_box = candidate.get("box") or candidate.get("bbox")
            candidate_center = get_box_center(candidate_box)

            if candidate_center[0] < (label_center[0] - 10):
                continue

            d = anisotropic_distance(label_center, candidate_center)
            if d < best_distance:
                extracted_val = sanitize_ocr_amount(amount_match.group())
                if extracted_val > 0.0:
                    best_distance = d
                    best_amount = extracted_val

    return best_amount

def parse_invoice_structure(ocr_results, target_buyer_gstin):
    vendor_gst, buyer_gst = extract_gstins(ocr_results, target_buyer_gstin)
    
    return {
        "vendor_gstin": vendor_gst,
        "buyer_gstin": buyer_gst,
        "cgst": find_nearest_amount_right(["CGST", "OUTPUTCGST"], ocr_results),
        "sgst": find_nearest_amount_right(["SGST", "OUTPUTSGST"], ocr_results),
        "igst": find_nearest_amount_right(["IGST", "ADD:IGST"], ocr_results),
        "grand_total": find_nearest_amount_right(["GRAND TOTAL", "TOTAL AMOUNT AFTER TAX", "于", "TOTAL"], ocr_results)
    }