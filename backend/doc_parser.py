import re

AMOUNT_PATTERN = re.compile(r'^\s*[\d,]+\.\d{2}\s*$')
GST_PATTERN = re.compile(r'\b\d{2}[A-Z]{5}\d{4}[A-Z\d]{4}\b')

def sanitize_ocr_amount(raw_text):
    clean = re.sub(r'[^\d.,]', '', raw_text)
    clean = clean.replace(",", "")
    if clean.count(".") > 1:
        parts = clean.split(".")
        clean = "".join(parts[:-1]) + "." + parts[-1]
    try:
        return float(clean)
    except ValueError:
        return 0.0
    
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

def get_box_bounds(box):
    if not box or not isinstance(box, list): 
        return (0, 0, 0, 0)
    if isinstance(box[0], list): # [[x1,y1], [x2,y2]...]
        xs = [p[0] for p in box]
        ys = [p[1] for p in box]
        return min(xs), min(ys), max(xs), max(ys)
    elif len(box) == 4: 
        return box[0], box[1], box[2], box[3]
    return (0, 0, 0, 0)

def extract_raw_line_lanes(ocr_results):
    """
    Spatially parses raw OCR tokens to isolate lines and map columns.
    Uses horizontal Y-Clustering to locate the exact table header row.
    """
    header_keywords = ["DESCRIPTION", "HSN", "SAC", "QUANTITY", "QTY", "RATE", "AMOUNT", "SL", "NO", "PER", "DISC"]
    header_candidates = []
    
    for item in ocr_results:
        text = item.get("text", "").strip()
        text_upper = text.upper()
        
        # Fuzzy substring lookup to robustly handle slashed headers like "HSN/SAC"
        if any(kw in text_upper for kw in header_keywords) or "DESCRIPTION OF GOODS" in text_upper:
            xmin, ymin, xmax, ymax = get_box_bounds(item.get("box"))
            header_candidates.append({
                "label": text,
                "ymin": ymin,
                "ymax": ymax,
                "y_center": (ymin + ymax) / 2,
                "xmin": xmin,
                "xmax": xmax,
                "x_center": (xmin + xmax) / 2
            })

    if not header_candidates:
        print("❌ [ERROR] No header candidates detected in layout.")
        return {"headers": [], "rows": []}

    bands = []
    for cand in header_candidates:
        placed = False
        for band in bands:
            avg_y = sum(c["y_center"] for c in band) / len(band)
            if abs(cand["y_center"] - avg_y) <= 35:
                band.append(cand)
                placed = True
                break
        if not placed:
            bands.append([cand])

    def score_header_band(band):
        score = len(band)
        for c in band:
            lbl = c["label"].upper()
            if any(term in lbl for term in ["DESCRIPTION", "PARTICULARS", "GOODS"]):
                score += 15
            if "RATE" in lbl or "AMOUNT" in lbl:
                score += 5
        return score

    best_band = max(bands, key=score_header_band)
    header_columns = sorted(best_band, key=lambda c: c["xmin"])
    
    header_y_top = min(c['ymin'] for c in header_columns) - 10
    header_y_bottom = max(c['ymax'] for c in header_columns) + 10
    
    cutoff_y = float('inf')
    for item in ocr_results:
        text = item.get("text", "").upper().strip()
        _, ymin, _, _ = get_box_bounds(item.get("box"))
        if any(kw in text for kw in ["TOTAL", "CGST", "SGST", "ROUND"]) and ymin > header_y_bottom:
            cutoff_y = min(cutoff_y, ymin)

    print(f"📋 [DEBUG] Header lane established: {header_y_top} to {header_y_bottom}. Cutoff bottom at {cutoff_y}")
    print(f"📋 [DEBUG COLUMNS DETECTED] Headers: {[c['label'] for c in header_columns]}")
    
    max_page_width = max([item.get("box", [0,0,0,0])[2] for item in ocr_results]) if ocr_results else 1500
    amount_column_left_edge = int(max_page_width * 0.6) 

    amt_baselines = []
    for item in ocr_results:
        text = item.get("text", "").strip()
        xmin, ymin, xmax, ymax = get_box_bounds(item.get("box"))
        y_center = (ymin + ymax) / 2
        if header_y_bottom < y_center < cutoff_y and xmin > amount_column_left_edge:
            if AMOUNT_PATTERN.match(text):
                val = sanitize_ocr_amount(text)
                if val > 0.0:
                    amt_baselines.append({
                        "y_center": y_center, 
                        "amount": val, 
                        "xmin": xmin
                    })

    amt_baselines = sorted(amt_baselines, key=lambda r: r["y_center"])

    unique_rows = []
    for b in amt_baselines:
        duplicate_found = False
        for idx, existing in enumerate(unique_rows):
            if abs(b["y_center"] - existing["y_center"]) <= 20:
                if b["xmin"] > existing["xmin"]:
                    unique_rows[idx] = b
                duplicate_found = True
                break
        if not duplicate_found:
            unique_rows.append(b)

    print(f"📊 [DEBUG LANES] Found {len(unique_rows)} unique line-item row baselines.")

    raw_lines_for_llm = []
    EXCLUDE_KEYWORDS = ["CGST", "SGST", "IGST", "UTGST", "CESS", "ROUND", "TOTAL", "DISCOUNT", "FREIGHT", "PACKING", "TRANSPORT", "DELIVER"]
    
    for idx, row in enumerate(unique_rows):
        row_elements = []
        lane_top, lane_bottom = row["y_center"] - 20, row["y_center"] + 20
        
        for item in ocr_results:
            text = item.get("text", "").strip()
            xmin, ymin, xmax, ymax = get_box_bounds(item.get("box"))
            c_ycenter = (ymin + ymax) / 2
            
            if lane_top <= c_ycenter <= lane_bottom:
                row_elements.append({
                    "text": text,
                    "xmin": xmin,
                    "xmax": xmax,
                    "x_center": (xmin + xmax) / 2
                })
                
        if row_elements:
            row_elements.sort(key=lambda e: e["xmin"])
            
            is_ledger_or_tax = False
            for elem in row_elements:
                elem_text_upper = elem["text"].upper()
                if any(kw in elem_text_upper for kw in EXCLUDE_KEYWORDS):
                    is_ledger_or_tax = True
                    break
            
            if is_ledger_or_tax:
                print(f"🚫 [PIPELINE PRE-FILTER] Skipping non-inventory ledger/tax line item: {[e['text'] for e in row_elements]}")
                continue
            
            mapped_cells = {}
            for elem in row_elements:
                closest_header = min(header_columns, key=lambda c: abs(elem["x_center"] - c["x_center"]))["label"]
                
                if any(term in closest_header.upper() for term in ["SI", "NO", "SL", "S.NO"]):
                    if not re.match(r'^\s*\d{1,3}\s*$', elem["text"]):
                        closest_header = "Description of Goods"

                if closest_header not in mapped_cells: 
                    mapped_cells[closest_header] = []
                mapped_cells[closest_header].append(elem["text"])
        
            print(f"   ↳ Row {idx + 1} Structured Mapping: {mapped_cells}")
            
            raw_lines_for_llm.append({
                "line_index": idx + 1,
                "mapped_fields": mapped_cells,
                "confirmed_amount": float(row["amount"])
            })

    return {
        "headers": [c["label"] for c in header_columns], 
        "rows": raw_lines_for_llm
    }