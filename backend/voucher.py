import os
from dotenv import load_dotenv

from tally import post_xml_to_tally
from datetime import datetime
from xml.sax.saxutils import escape

load_dotenv()

CURRENT_COMPANY = os.getenv("CURRENT_COMPANY")

def debit(amount):
    return -abs(float(amount))

def credit(amount):
    return abs(float(amount))

def xml_escape(value):
    if value is None:
        return ""

    return escape(str(value))

def format_date(date_str):
    # Converts date from dd-mm-yyyy to yyyymmdd
    return datetime.strptime(
        date_str,
        "%Y-%m-%d"
    ).strftime("%Y%m%d")


def format_amount(amount):
    return f"{float(amount):.2f}"

def build_ledger_entry(
    ledger_name,
    amount,
    is_party=False
):
    return f"""
    <LEDGERENTRIES.LIST>

        <LEDGERNAME>{xml_escape(ledger_name)}</LEDGERNAME>

        <GSTCLASS/>

        <ISPARTYLEDGER>{"Yes" if is_party else "No"}</ISPARTYLEDGER>

        <ISDEEMEDPOSITIVE>{"No" if is_party else "Yes"}</ISDEEMEDPOSITIVE>

        <ISLASTDEEMEDPOSITIVE>{"No" if is_party else "Yes"}</ISLASTDEEMEDPOSITIVE>

        <AMOUNT>{format_amount(amount)}</AMOUNT>

    </LEDGERENTRIES.LIST>
    """

def build_header(voucher):

    return f"""
    <DATE>{format_date(voucher["invoiceDate"])}</DATE>

    <VOUCHERTYPENAME>Purchase</VOUCHERTYPENAME>
    <REFERENCE>{xml_escape(voucher["invoiceNumber"])}</REFERENCE>

    <PARTYNAME>{xml_escape(voucher["vendor"]["name"])}</PARTYNAME>

    <PARTYLEDGERNAME>{xml_escape(voucher["vendor"]["name"])}</PARTYLEDGERNAME>

    <PARTYGSTIN>{xml_escape(voucher["vendor"]["gstin"])}</PARTYGSTIN>

    <PERSISTEDVIEW>Invoice Voucher View</PERSISTEDVIEW>

    <ISINVOICE>Yes</ISINVOICE>
    """

def build_party_entry(voucher):

    vendor = voucher["vendor"]

    return build_ledger_entry(
        ledger_name=vendor["name"],
        amount=credit(
            voucher["summary"]["grandTotal"]
        ),
        is_party=True
    )

def build_purchase_entries(voucher):

    entries = []

    for group in voucher["groups"]:

        entries.append(
            build_ledger_entry(
                ledger_name=group["accountHead"]["name"],
                amount=debit(group["subtotal"])
            )
        )

    return "".join(entries)

def build_tax_entries(voucher):

    entries = []

    tax = voucher["tax"]

    if tax["mode"] == "CGST":

        total_cgst = sum(
            float(group["taxes"]["cgst"])
            for group in voucher["groups"]
        )

        total_sgst = sum(
            float(group["taxes"]["sgst"])
            for group in voucher["groups"]
        )

        entries.append(
            build_ledger_entry(
                ledger_name=tax["cgstLedger"]["name"],
                amount=debit(total_cgst)
            )
        )

        entries.append(
            build_ledger_entry(
                ledger_name=tax["sgstLedger"]["name"],
                amount=debit(total_sgst)
            )
        )

    else:

        total_igst = sum(
            float(group["taxes"]["igst"])
            for group in voucher["groups"]
        )

        entries.append(
            build_ledger_entry(
                ledger_name=tax["igstLedger"]["name"],
                amount=debit(total_igst)
            )
        )

    return "".join(entries)

def build_purchase_voucher_xml(voucher):

    return f"""<?xml version="1.0" encoding="UTF-8"?>

    <ENVELOPE>
        <HEADER>
            <TALLYREQUEST>Import Data</TALLYREQUEST>
        </HEADER>
        <BODY>
            <IMPORTDATA>
                <REQUESTDESC>
                    <REPORTNAME>Vouchers</REPORTNAME>
                    <STATICVARIABLES>
                        <SVCURRENTCOMPANY>{CURRENT_COMPANY}</SVCURRENTCOMPANY>
                    </STATICVARIABLES>
                </REQUESTDESC>
                <REQUESTDATA>
                    <TALLYMESSAGE xmlns:UDF="TallyUDF">
                        <VOUCHER
                            VCHTYPE="Purchase"
                            ACTION="Create"
                            OBJVIEW="Invoice Voucher View"
                        >
                            {build_header(voucher)}
                            {build_party_entry(voucher)}
                            {build_purchase_entries(voucher)}
                            {build_tax_entries(voucher)}
                        </VOUCHER>
                    </TALLYMESSAGE>
                </REQUESTDATA>
            </IMPORTDATA>
        </BODY>
    </ENVELOPE>
    """

def import_purchase_voucher(voucher_data):
    """
    Executes business rules, financial validations, and submits the voucher to Tally.
    """
    errors = []

    # 1. Business Validation
    if not voucher_data.get("invoiceNumber"):
        errors.append("Invoice Number is required.")
    if not voucher_data.get("invoiceDate"):
        errors.append("Invoice Date is required.")

    vendor = voucher_data.get("vendor", {})
    if not vendor or not vendor.get("name"):
        errors.append("Vendor name is required.")
    if not vendor or not vendor.get("guid"):
        errors.append("Vendor GUID is required for Tally integration.")

    groups = voucher_data.get("groups", [])
    if not groups:
        errors.append("At least one item group is required.")
    else:
        for i, group in enumerate(groups):
            group_name = group.get("name") or f"Group {i+1}"
            if not group.get("accountHead") or not group.get("accountHead", {}).get("name"):
                errors.append(f"Account Head is required for group '{group_name}'.")
            if not group.get("items"):
                errors.append(f"Items list cannot be empty for group '{group_name}'.")
            if group.get("total") is None or group.get("total") <= 0:
                errors.append(f"Valid total is required for group '{group_name}'.")

    # Validate GST Config
    tax = voucher_data.get("tax", {})
    tax_mode = tax.get("mode", "CGST")
    if tax_mode == "CGST":
        cgst_ledger = tax.get("cgstLedger")
        if not cgst_ledger or not cgst_ledger.get("name") or not cgst_ledger.get("guid"):
            errors.append("CGST Ledger is required and must have a valid name and GUID in CGST+SGST mode.")
        sgst_ledger = tax.get("sgstLedger")
        if not sgst_ledger or not sgst_ledger.get("name") or not sgst_ledger.get("guid"):
            errors.append("SGST Ledger is required and must have a valid name and GUID in CGST+SGST mode.")
    elif tax_mode == "IGST":
        igst_ledger = tax.get("igstLedger")
        if not igst_ledger or not igst_ledger.get("name") or not igst_ledger.get("guid"):
            errors.append("IGST Ledger is required and must have a valid name and GUID in IGST mode.")

    if errors:
        return {
            "success": False,
            "message": "Validation failed.",
            "errors": errors
        }

    # 2. Financial Validation
    try:
        calculated_total = sum(float(group.get("total", 0)) for group in groups)
        grand_total = float(voucher_data.get("summary", {}).get("grandTotal", 0))

        # Precision float comparison
        if abs(calculated_total - grand_total) > 0.01:
            return {
                "success": False,
                "message": "Grand total validation failed.",
                "errors": [
                    f"Summary total ({grand_total}) does not equal the sum of group totals ({calculated_total})."
                ]
            }
    except (ValueError, TypeError) as e:
        return {
            "success": False,
            "message": "Validation failed.",
            "errors": [f"Invalid numerical formatting in voucher totals: {str(e)}"]
        }

    xml_payload = build_purchase_voucher_xml(voucher_data)
    return post_xml_to_tally(xml_payload)

if __name__ == "__main__":

    voucher = {'invoiceNumber': '1234', 'invoiceDate': '2026-06-24', 'vendor': {'name': 'Magod Fusion Technologies Pvt Ltd', 'gstin': '27AAJCM8681M1ZL', 'master_id': ' 11058', 'guid': '2c1caa08-4118-4edd-85d1-5f953d4592eb-00002b32'}, 'tax': {'mode': 'CGST', 'cgstRate': 9, 'sgstRate': 9, 'igstRate': 18, 'cgstLedger': {'name': 'Purchase CGST 1.5%', 'guid': '2c1caa08-4118-4edd-85d1-5f953d4592eb-00005fe1', 'master_id': ' 24545'}, 'sgstLedger': {'name': 'Purchase SGST 1.5%', 'guid': '2c1caa08-4118-4edd-85d1-5f953d4592eb-00005fe2', 'master_id': ' 24546'}, 'igstLedger': None}, 'groups': [{'id': 'group_1782552650136', 'name': 'Purchase - Labour Blacodizing', 'accountHead': {'name': 'Purchase - Labour Blacodizing', 'master_id': ' 11122', 'guid': '2c1caa08-4118-4edd-85d1-5f953d4592eb-00002b72'}, 'items': [{'amount': 18270, 'description': 'Laser Hardening', 'discount_percent': 50, 'hsn': '998898', 'quantity': 12, 'rate': 3045, 'serial_no': None, 'unit': 'Nos', 'id': 'item_0_1782552509149'}, {'amount': 11550, 'description': 'LaserHardening', 'discount_percent': 50, 'hsn': '998898', 'quantity': 5, 'rate': 4620, 'serial_no': None, 'unit': 'Nos', 'id': 'item_1_1782552509149'}, {'amount': 14680.05, 'description': '3 Laser Hardening', 'discount_percent': 59, 'hsn': '998898', 'quantity': 11, 'rate': 3255, 'serial_no': None, 'unit': 'Nos', 'id': 'item_2_1782552509149'}], 'subtotal': 44500.05, 'taxes': {'cgst': 4005, 'sgst': 4005, 'igst': 0}, 'total': 52510.05}, {'id': 'group_1782552659098', 'name': 'Purchase - Labour - Laser Hardening PBT', 'accountHead': {'name': 'Purchase - Labour - Laser Hardening PBT', 'master_id': ' 24973', 'guid': '2c1caa08-4118-4edd-85d1-5f953d4592eb-0000618d'}, 'items': [{'amount': 16422, 'description': '4 Laser Hardening', 'discount_percent': 60, 'hsn': '998898', 'quantity': 10, 'rate': 4105.5, 'serial_no': None, 'unit': 'Nos', 'id': 'item_3_1782552509149'}, {'amount': 6404.58, 'description': 'Laser Hardening', 'discount_percent': 61, 'hsn': '998898', 'quantity': 4, 'rate': 4105.5, 'serial_no': None, 'unit': 'Nos', 'id': 'item_4_1782552509149'}], 'subtotal': 22826.58, 'taxes': {'cgst': 2054.39, 'sgst': 2054.39, 'igst': 0}, 'total': 26935.36}], 'summary': {'subtotal': 67326.63, 'cgst': 6059.389999999999, 'sgst': 6059.389999999999, 'igst': 0, 'grandTotal': 79445.41}}

    print("="*50)
    response = import_purchase_voucher(voucher)
    print(response["xml"])
    print("="*50)
    
