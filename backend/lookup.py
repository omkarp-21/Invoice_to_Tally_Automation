import re
from rapidfuzz import process, fuzz

OCR_EQUIVALENTS = {
    ('0', 'O'), ('O', '0'),
    ('1', 'I'), ('I', '1'),
    ('1', 'L'), ('L', '1'),
    ('2', 'Z'), ('Z', '2'),
    ('5', 'S'), ('S', '5'),
    ('8', 'B'), ('B', '8'),
    ('6', 'G'), ('G', '6'),
    ('Q', 'O'), ('O', 'Q'),
}

def normalize_gstin(gstin: str) -> str:
    if not gstin:
        return ""

    return re.sub(r"\s+", "", gstin.upper())

def gstin_similarity(a: str, b: str) -> float:
    a = normalize_gstin(a)
    b = normalize_gstin(b)
    if len(a) != len(b):
        return 0.0
    score = 0
    max_score = len(a) * 3
    for ca, cb in zip(a, b):
        if ca == cb:
            score += 3
        elif (ca, cb) in OCR_EQUIVALENTS:
            score += 2
        else:
            score -= 2

    score = max(score, 0)

    return round(score / max_score * 100, 2)


def build_vendor_index(vendors):
    index = {}
    for i, vendor in enumerate(vendors):
        gstin = normalize_gstin(vendor.get("gstin"))
        if gstin:
            index[gstin] = i
    return index


def find_vendor_by_gstin(vendors, vendor_index, gstin):
    gstin = normalize_gstin(gstin)
    if gstin in vendor_index:
        idx = vendor_index[gstin]
        return {
            "found": True,
            "confidence": 100.0,
            "index": idx,
            "vendor": vendors[idx]
        }
    best_score = -1
    best_index = None

    for idx, vendor in enumerate(vendors):
        vendor_gstin = normalize_gstin(vendor.get("gstin"))
        if not vendor_gstin:
            continue
        score = gstin_similarity(gstin, vendor_gstin)
        if score > best_score:
            best_score = score
            best_index = idx

    if best_index is None:

        return {
            "found": False,
            "confidence": 0,
            "index": None,
            "vendor": None
        }

    return {
        "found": best_score >= 90,
        "confidence": best_score,
        "index": best_index,
        "vendor": vendors[best_index]
    }

def search_vendor(query, vendors, limit=5):
    if not query:
        return []
    choices = {
        vendor["name"]: vendor
        for vendor in vendors
    }
    matches = process.extract(
        query,
        choices.keys(),
        scorer=fuzz.WRatio,
        limit=limit
    )
    return [
        choices[name]
        for name, score, _ in matches
    ]

if __name__ == "__main__":
    vendors = [
        {
            "name": "Farohar Engineering",
            "gstin": "27AADFF3944P1ZY"
        },
        {
            "name": "ABC Industries",
            "gstin": "27AAJCM8681M1ZL"
        },
        {
            "name": "XYZ Fabricators",
            "gstin": "27AACCX9999M1ZT"
        }
    ]
    vendor_index = build_vendor_index(vendors)
    result = find_vendor_by_gstin(
        vendors,
        vendor_index,
        "27AADFF3944P1ZV"
    )
    print(result)