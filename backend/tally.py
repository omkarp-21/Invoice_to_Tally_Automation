import re
import requests
import xml.etree.ElementTree as ET

TALLY_URL = "http://localhost:9000"


def sanitize_tally_xml(xml: str) -> str:
    """
    Removes illegal XML 1.0 numeric character references emitted by Tally.
    Keeps valid ones like &#10; and &#13;.
    """

    return re.sub(
        r'&#(?:0|1|2|3|4|5|6|7|8|11|12|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31);',
        '',
        xml
    )


def sync_ledgers():
    xml_payload = """
    <ENVELOPE>
        <HEADER>
            <VERSION>1</VERSION>
            <TALLYREQUEST>Export</TALLYREQUEST>
            <TYPE>Collection</TYPE>
            <ID>Ledger</ID>
        </HEADER>

        <BODY>
            <DESC>

                <STATICVARIABLES>
                    <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                </STATICVARIABLES>

                <TDL>
                    <TDLMESSAGE>

                        <COLLECTION NAME="Ledger">
                            <TYPE>Ledger</TYPE>

                            <FETCH>
                                Name,
                                Parent,
                                MasterID,
                                GUID,
                                PartyGSTIN
                            </FETCH>

                        </COLLECTION>

                    </TDLMESSAGE>
                </TDL>

            </DESC>
        </BODY>
    </ENVELOPE>
    """

    headers = {
        "Content-Type": "text/xml; charset=utf-8"
    }

    try:
        response = requests.post(
            TALLY_URL,
            data=xml_payload,
            headers=headers,
            timeout=10
        )

        response.raise_for_status()
        with open("response_raw.xml", "w", encoding="utf-8") as f:
            f.write(response.text)
        cleaned_xml = sanitize_tally_xml(response.text)
        with open("response_clean.xml", "w", encoding="utf-8") as f:
            f.write(cleaned_xml)

        root = ET.fromstring(cleaned_xml)
        ledgers = []

        for ledger in root.findall(".//LEDGER"):

            ledgers.append({

                "name": ledger.findtext("./LANGUAGENAME.LIST/NAME.LIST/NAME")
                        or ledger.attrib.get("NAME"),

                "parent": ledger.findtext("PARENT"),

                "gstin": ledger.findtext("PARTYGSTIN"),

                "master_id": ledger.findtext("MASTERID"),

                "guid": ledger.findtext("GUID")
            })

        print(f"\n✓ Parsed {len(ledgers)} ledgers successfully.\n")
        vendors = []

        for ledger in ledgers:
            parent = (ledger["parent"] or "").strip()

            if parent == "Sundry Creditors":
                vendors.append(ledger)
        return vendors, ledgers

    except ET.ParseError as e:

        print("\nXML Parse Error")
        print(e)

        return [], []

    except requests.RequestException as e:

        print("\nHTTP Error")
        print(e)

        return [], []

def get_current_company():
    xml_payload = """
    <ENVELOPE>

        <HEADER>
            <VERSION>1</VERSION>
            <TALLYREQUEST>Export</TALLYREQUEST>
            <TYPE>System</TYPE>
            <ID>Company</ID>
        </HEADER>

        <BODY>
            <DESC>

                <STATICVARIABLES>
                    <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                </STATICVARIABLES>

                <TDL>
                    <TDLMESSAGE>

                        <COLLECTION NAME="Company">

                            <TYPE>Company</TYPE>

                            <FETCH>
                                Name,
                                GUID,
                                StateName
                            </FETCH>

                        </COLLECTION>

                    </TDLMESSAGE>
                </TDL>

            </DESC>
        </BODY>

    </ENVELOPE>
    """

    headers = {
        "Content-Type": "text/xml; charset=utf-8"
    }

    try:
        response = requests.post(
            TALLY_URL,
            data=xml_payload,
            headers=headers,
            timeout=10
        )
        print(response.text)
        response.raise_for_status()
        cleaned_xml = sanitize_tally_xml(response.text)
        root = ET.fromstring(cleaned_xml)
        company = root.find(".//COMPANY")

        if company is None:
            raise RuntimeError("No company is currently loaded in Tally.")

        return {
            "name": company.findtext("./NAME"),
            "guid": company.findtext("./GUID"),
            "state": company.findtext("./STATENAME")
        }

    except ET.ParseError as e:
        raise RuntimeError(f"Failed to parse Tally XML: {e}")

    except requests.RequestException as e:
        raise RuntimeError(f"Failed to communicate with Tally: {e}")

def post_xml_to_tally(xml_payload):

    headers = {
        "Content-Type": "text/xml; charset=utf-8"
    }

    try:

        response = requests.post(
            TALLY_URL,
            data=xml_payload,
            headers=headers,
            timeout=10
        )

        response.raise_for_status()

        # Save response for debugging
        with open("tally_response.xml", "w", encoding="utf-8") as f:
            f.write(response.text)

        root = ET.fromstring(response.text)

        created = int(root.findtext(".//CREATED", "0"))
        altered = int(root.findtext(".//ALTERED", "0"))
        deleted = int(root.findtext(".//DELETED", "0"))
        errors = int(root.findtext(".//ERRORS", "0"))

        line_errors = [
            node.text
            for node in root.findall(".//LINEERROR")
            if node.text
        ]

        return {
            "success": errors == 0 and (created > 0 or altered > 0),
            "created": created,
            "altered": altered,
            "deleted": deleted,
            "errors": errors,
            "line_errors": line_errors,
            "raw_response": response.text
        }

    except requests.RequestException as e:

        return {
            "success": False,
            "message": str(e)
        }

    except ET.ParseError as e:

        return {
            "success": False,
            "message": f"Failed to parse Tally response: {e}",
            "raw_response": response.text if "response" in locals() else None
        }

if __name__ == "__main__":
    vendors, ledgers = sync_ledgers()
