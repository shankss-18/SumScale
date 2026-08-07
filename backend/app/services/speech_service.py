"""
OmniAid — Multimodal Extractor Service
======================================
Extracts text content from uploaded files (PDFs, images, audio, plain text)
using Gemini 2.5 Flash multimodal capabilities.

Wrapped in strict error handling and timeouts.
"""

import logging
from pathlib import Path
from google import genai
from google.genai import types

from app.config import settings
from app.services.ai_service import get_genai_client, PROMPT_INJECTION_PROTECTION

logger = logging.getLogger("omniaid.multimodal_extractor")


async def extract_text_from_file(file_path: Path, mime_type: str) -> str:
    """
    Extracts text/transcript from PDF, image, audio, or text file.
    Uses Gemini 2.5 Flash multimodal input for image/audio/pdf,
    or direct UTF-8 reading for plain text / CSV.
    """
    # Plain text / CSV files read directly
    if mime_type.startswith("text/") or mime_type in ("text/plain", "text/csv", "application/csv") or file_path.suffix.lower() in (".txt", ".csv"):
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()[:10000]
        except Exception as e:
            logger.error(f"Failed to read text file {file_path}: {e}")
            return f"[Text extraction failed for {file_path.name}]"

    # For binary files (PDF, images, audio), pass to Gemini Part
    client = get_genai_client()

    try:
        with open(file_path, "rb") as f:
            file_bytes = f.read()

        file_part = types.Part.from_bytes(
            data=file_bytes,
            mime_type=mime_type,
        )

        prompt = f"""{PROMPT_INJECTION_PROTECTION}

Task: Transcribe or extract all visible text, spoken audio, symptoms, or document details from the attached file.
Language Recognition Rule: The file or spoken audio may be in any Indian language (Hindi, Telugu, Tamil, Kannada) or English. Accurately transcribe and recognize all spoken audio or document text into a clear, comprehensive summary preserving key technical and medical terms.
Return plain text summary/transcription ONLY.
"""

        # Try extraction with fallback models — gemini-1.5-* deprecated March 2025
        _multimodal_models = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.0-flash-lite"]
        extracted = None
        last_err = None

        for model_name in _multimodal_models:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=[file_part, prompt],
                    config=types.GenerateContentConfig(
                        temperature=0.1,
                        max_output_tokens=4096,
                    ),
                )
                if response and response.text:
                    extracted = response.text.strip()
                    logger.info(f"Multimodal extraction success via {model_name} for {file_path.name}")
                    break
            except Exception as e:
                logger.warning(f"Multimodal extraction failed with {model_name} for {file_path.name}: {type(e).__name__}: {e}")
                last_err = e

        if not extracted:
            logger.error(f"All multimodal models failed for {file_path.name}: {last_err}")
            return f"[Content extraction failed for {file_path.name}]"

        return extracted[:10000]

    except Exception as e:
        logger.error(f"Multimodal extraction failed for {file_path.name} ({mime_type}): {e}")
        return f"[Content extraction failed for {file_path.name}]"
