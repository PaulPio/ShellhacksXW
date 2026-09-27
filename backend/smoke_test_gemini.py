"""
One-shot smoke test, per the plan: confirm the installed google-genai SDK
and the gemini-3.8-flash model actually honor response_schema strict JSON
BEFORE building the real image ingest parser. Run standalone, prints the
raw result.
"""

import os

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

response = client.models.generate_content(
    model="gemini-3.8-flash",
    contents="Reply with ok=true.",
    config=types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema={
            "type": "object",
            "properties": {"ok": {"type": "boolean"}},
            "required": ["ok"],
        },
    ),
)

print("raw text:", response.text)
