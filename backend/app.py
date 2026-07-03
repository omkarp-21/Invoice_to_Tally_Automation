from flask import Flask, request, jsonify
from flask_cors import CORS
import os

from main import process_invoice
from tally import sync_ledgers
from lookup import find_vendor_by_gstin, search_vendor

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Cache Tally masters in memory

print("Synchronizing Tally masters...")

vendors, ledgers = sync_ledgers()

print(f"Loaded {len(vendors)} vendors.")
print(f"Loaded {len(ledgers)} ledgers.")


@app.route("/", methods=["GET"])
def home():

    return jsonify({
        "status": "Backend running"
    })


@app.route("/extract", methods=["POST"])
def extract_invoice():

    if "invoice" not in request.files:

        return jsonify({
            "success": False,
            "message": "No invoice uploaded."
        }), 400

    file = request.files["invoice"]

    if file.filename == "":

        return jsonify({
            "success": False,
            "message": "Empty filename."
        }), 400

    filepath = os.path.join(
        UPLOAD_FOLDER,
        file.filename
    )

    file.save(filepath)

    try:

        result = process_invoice(filepath)

        return jsonify({
            "success": True,
            "data": result
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


@app.route("/vendors", methods=["GET"])
def api_vendors():

    return jsonify({
        "success": True,
        "vendors": vendors
    })


@app.route("/ledgers", methods=["GET"])
def api_ledgers():

    non_vendor_ledgers = [
        l for l in ledgers
        if (l.get("parent") or "").strip() != "Sundry Creditors"
    ]

    return jsonify({
        "success": True,
        "ledgers": non_vendor_ledgers
    })


@app.route("/create_voucher", methods=["POST"])
def api_create_voucher():
    data = request.get_json()

    if not data or not isinstance(data, dict):
        return jsonify({
            "success": False,
            "message": "Validation failed.",
            "errors": ["Request payload must be a valid JSON object."]
        }), 400

    try:
        from voucher import import_purchase_voucher
        result = import_purchase_voucher(data)
        
        if not result.get("success") and (result.get("message") == "Validation failed." or result.get("message") == "Grand total validation failed."):
            return jsonify(result), 400
            
        return jsonify(result)

    except NotImplementedError as e:
        return jsonify({
            "success": False,
            "implemented": False,
            "message": str(e)
        }), 501
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Internal server error: {str(e)}"
        }), 500


@app.route("/refresh_tally", methods=["POST"])
def refresh_tally():

    global vendors
    global ledgers

    vendors, ledgers = sync_ledgers()

    return jsonify({
        "success": True,
        "vendors": len(vendors),
        "ledgers": len(ledgers),
    })


if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )