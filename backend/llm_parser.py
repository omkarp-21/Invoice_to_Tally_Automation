# llm_parser.py

import json
import ollama


SYSTEM_PROMPT = """
You are a deterministic invoice semantic correction engine.

Rules:
- Return ONLY valid JSON.
- Never generate code.
- Never explain.
- Never use markdown.
- Never invent values.
- Missing values -> null.
"""


def _clean_json(text: str):
    text = text.strip()

    if text.startswith("```"):
        lines = text.splitlines()

        if lines[0].startswith("```"):
            lines = lines[1:]

        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]

        text = "\n".join(lines).strip()

    return json.loads(text)


def _correct_single_row(headers, row, model_name):

    payload = {
        "headers": headers,
        "row": row
    }

    prompt = f"""
Transform this parsed invoice row into structured JSON.

The parser already detected the row.

It may have assigned values to incorrect columns.

Tasks:

- Correct obvious column mistakes.
- Merge description fragments.
- If description starts with an integer that is clearly a serial number,
  move it into serial_no.
- Quantity -> numeric only.
- Unit -> text only.
- Rate -> numeric.
- Discount -> numeric.
- Amount must equal confirmed_amount.

Return ONLY this object.

{{
    "serial_no": null,
    "description": "",
    "hsn": "",
    "quantity": null,
    "unit": "",
    "rate": null,
    "discount_percent": null,
    "amount": null
}}

Input:

{json.dumps(payload, indent=2)}
"""

    response = ollama.chat(
        model=model_name,
        messages=[
            {
                "role": "system",
                "content": SYSTEM_PROMPT
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        options={
            "temperature": 0,
            "num_predict": 120
        }
    )

    return _clean_json(response["message"]["content"])


def structure_lines_with_llm(parsed_table, model_name="qwen2.5:7b"):

    if not parsed_table:
        return []

    headers = parsed_table["headers"]
    rows = parsed_table["rows"]

    final_items = []

    for idx, row in enumerate(rows):

        print(f"🤖 Correcting row {idx+1}/{len(rows)}")

        try:

            item = _correct_single_row(
                headers,
                row,
                model_name
            )

            final_items.append(item)

        except Exception as e:

            print(f"⚠ Row {idx+1} failed: {e}")

    return final_items