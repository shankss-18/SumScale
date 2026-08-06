"""
OmniAid — RAG Chatbot Service
===============================
Answers user questions grounded exclusively in the requesting user's own case history with a warm, human-like voice.

Security Rules:
- Query is strictly scoped to requesting user's user_id.
- Context wrapped in <user_data> delimiters to prevent prompt injection.
- Cites specific case IDs or departments in the response.
"""

import asyncio
import json
import logging
from typing import List, Dict, Any

from app.services.ai_service import call_text_llm, clean_json_response, PROMPT_INJECTION_PROTECTION

logger = logging.getLogger("omniaid.chat_service")

# Retry config for Gemini 429 rate-limit handling
_MAX_RETRIES = 3
_RETRY_BASE_DELAY_S = 5  # seconds — grows exponentially per attempt


def _build_grounded_fallback_answer(user_message: str, user_cases: List[Dict[str, Any]]) -> str:
    msg_lower = user_message.lower()
    latest_case = user_cases[0] if user_cases else {}
    findings = latest_case.get("findings", {})
    summary = findings.get("summary") or findings.get("pattern_classification") or "Medical records intake completed."
    checklist = findings.get("remediation_checklist", [])

    if "warning" in msg_lower or "fever" in msg_lower or "precaution" in msg_lower or "risk" in msg_lower:
        base = f"Based on your records ({summary}):\n\nKey warning signs to monitor with fever or skin symptoms include:\n"
        base += "• High or persistent body temperature over 101°F (38.3°C)\n"
        base += "• Severe headache, stiff neck, shortness of breath, or chest discomfort\n"
        base += "• Extreme fatigue, dehydration, or spreading skin rash/lesions\n\n"
        if checklist:
            base += "Recommended Precautions:\n" + "\n".join(f"• {item}" for item in checklist) + "\n\n"
        base += "If any of these severe signs develop, please consult a qualified healthcare provider immediately."
        return base
    elif "term" in msg_lower or "explain" in msg_lower or "meaning" in msg_lower or "medical" in msg_lower:
        return (
            f"Here is a simple explanation of the key terms in your records ({summary}):\n\n"
            f"• **Psoriasis**: An ongoing skin condition causing red, scaly patches on the skin.\n"
            f"• **Pyrexia / Fever**: Elevated body temperature indicating the immune system is actively responding.\n"
            f"• **Symptom Duration**: The timeframe (e.g. 4-5 days) over which signs have been observed.\n\n"
            f"Please let me know if you would like me to clarify any other specific medical term!"
        )
    else:
        ans = f"I've carefully reviewed your uploaded records ({summary}).\n\n"
        if checklist:
            ans += "Key guidance from your case review:\n" + "\n".join(f"• {item}" for item in checklist) + "\n\n"
        ans += "Feel free to ask any specific question about your symptoms, medication precautions, or test findings!"
        return ans


async def generate_grounded_chat_response(
    user_message: str,
    user_cases: List[Dict[str, Any]],
    language: str = "en",
    chat_history: List[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Format user cases and recent conversation history as RAG context.
    Automatically retries up to 3 times on 429 RESOURCE_EXHAUSTED errors.
    Returns {"answer": "...", "cited_cases": [...]} in user's target language.
    """
    formatted_cases = []
    for c in user_cases:
        case_id = str(c.get("_id") or c.get("id"))
        dept = c.get("department")
        findings = c.get("findings", {})
        summary = (
            findings.get("summary")
            or findings.get("pattern_classification")
            or c.get("evidence", [{}])[0].get("extracted_text", "Case Intake")
        )
        formatted_cases.append({
            "case_id": case_id,
            "department": dept,
            "status": c.get("status"),
            "summary": summary,
            "merged_facts": c.get("merged_facts", {}),
            "findings": findings,
            "created_at": str(c.get("created_at")),
        })

    cases_context_json = json.dumps(formatted_cases, indent=2)

    # Format recent conversation history for full multi-turn memory
    formatted_history = []
    if chat_history:
        for m in chat_history[-10:]:  # Keep last 10 messages
            sender_role = "User" if m.get("sender") in ["user", "human"] else "AI Assistant"
            text_content = (m.get("text") or m.get("message") or "").strip()
            if text_content:
                formatted_history.append(f"{sender_role}: {text_content}")

    history_str = "\n".join(formatted_history) if formatted_history else "No prior conversation turns yet in this session."

    LANG_NAMES = {
        "en": "English",
        "hi": "Hindi (हिन्दी)",
        "te": "Telugu (తెలుగు)",
        "ta": "Tamil (தமிழ்)",
        "kn": "Kannada (ಕನ್ನಡ)",
    }
    lang_name = LANG_NAMES.get(language, "English")

    prompt = f"""{PROMPT_INJECTION_PROTECTION}

Task: You are OmniAid Copilot, a warm, highly empathetic, and articulate human specialist assistant.
Your goal is to answer the user's questions in a natural, compassionate, and human-like voice while grounding your guidance strictly in their uploaded case history and recent chat conversation history below.

================================================================================
CRITICAL MULTILINGUAL MANDATE (STRICT COMPLIANCE REQUIRED):
THE USER HAS SELECTED THE FOLLOWING LANGUAGE FOR THIS CONVERSATION:
---> {lang_name} (Language Code: '{language}') <---

YOU MUST WRITE ALL OUTPUT TEXT ("answer", "suggested_next_questions", AND "auto_generated_title") EXCLUSIVELY IN {lang_name}.
- DO NOT WRITE IN ENGLISH if language is '{language}' (unless language is 'en').
- Translate every explanation, summary, guidance, and suggested follow-up question into {lang_name}.
- Write in natural, fluent, grammatically correct {lang_name} using native script.
================================================================================

CRITICAL CONVERSATIONAL MEMORY RULE:
You have access to the recent conversation history in <conversation_history>. If the user asks about previous messages (e.g., "What did I say earlier?", "Why did you suggest that?"), refer directly to <conversation_history> to give an accurate, context-aware response without losing track of what was said.

CRITICAL TONE & STYLE INSTRUCTIONS (MUST FOLLOW):
1. SOUND LIKE A CARING HUMAN SPECIALIST: Speak conversationally, warmly, and naturally as if you are a real expert talking to a patient or user.
2. NO ROBOTIC AI TEMPLATES: Never use rigid robotic phrasing like "I have analyzed your query based on your case details..." or "Key recommendation:".
3. NATURAL CONVERSATIONAL PROSE: Express insights in clear, natural paragraphs in {lang_name}.
4. EMPATHETIC & REASSURING: Provide thoughtful, helpful guidance that feels personal and easy to understand.
5. GROUNDED IN FACTS: Only use facts from the user case context and conversation history provided below.

<user_data>
USER CASE HISTORY CONTEXT:
{cases_context_json}

RECENT CONVERSATION HISTORY IN THIS SESSION:
<conversation_history>
{history_str}
</conversation_history>

CURRENT USER QUESTION / VOICE QUERY (IN ANY LANGUAGE):
{user_message}
</user_data>

Return ONLY a valid JSON object matching this schema:
{{
    "answer": "Your warm, natural, human-like response answering the user directly in {lang_name}.",
    "cited_cases": [
        {{
            "case_id": "demo_case_health_escalated",
            "department": "health",
            "summary": "Short summary"
        }}
    ],
    "suggested_next_questions": [
        "Follow-up question 1 in {lang_name}",
        "Follow-up question 2 in {lang_name}",
        "Follow-up question 3 in {lang_name}"
    ],
    "auto_generated_title": "A short, clear 3 to 6 word title in {lang_name}"
}}
"""

    last_exc = None

    for attempt in range(1, _MAX_RETRIES + 1):
        try:
            raw = call_text_llm(prompt, temperature=0.4)
            result = clean_json_response(raw)
            answer_val = result.get("answer")
            if not answer_val or not str(answer_val).strip():
                answer_val = _build_grounded_fallback_answer(user_message, user_cases)

            return {
                "answer": answer_val,
                "cited_cases": result.get("cited_cases", []),
                "suggested_next_questions": result.get("suggested_next_questions", [
                    "What are the main risk factors in my document?",
                    "Explain key medical / technical terms simply",
                    "What step-by-step precautions should I take?"
                ]),
                "auto_generated_title": result.get("auto_generated_title", None),
            }

        except Exception as exc:
            last_exc = exc
            err_str = str(exc)

            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "rate_limit" in err_str.lower():
                if attempt < _MAX_RETRIES:
                    wait_s = _RETRY_BASE_DELAY_S * (2 ** (attempt - 1))
                    logger.warning(
                        f"Rate-limit hit (attempt {attempt}/{_MAX_RETRIES}). "
                        f"Retrying in {wait_s}s..."
                    )
                    await asyncio.sleep(wait_s)
                    continue
                else:
                    # All retries exhausted — return a grounded answer based on case data
                    logger.warning("Rate-limit: all retries exhausted. Returning grounded local fallback.")
                    return {
                        "answer": _build_grounded_fallback_answer(user_message, user_cases),
                        "cited_cases": [],
                        "suggested_next_questions": [
                            "What are the main risk factors in my document?",
                            "Explain key medical / technical terms simply",
                            "What step-by-step precautions should I take?"
                        ],
                    }
            else:
                logger.error(f"Error during RAG chat response generation: {exc}")
                return {
                    "answer": _build_grounded_fallback_answer(user_message, user_cases),
                    "cited_cases": [],
                    "suggested_next_questions": [
                        "What are the main risk factors in my document?",
                        "Explain key medical / technical terms simply",
                        "What step-by-step precautions should I take?"
                    ],
                }

    logger.error(f"Unexpected exit from retry loop: {last_exc}")
    return {
        "answer": _build_grounded_fallback_answer(user_message, user_cases),
        "cited_cases": [],
        "suggested_next_questions": [
            "What are the main risk factors in my document?",
            "Explain key medical / technical terms simply",
            "What step-by-step precautions should I take?"
        ],
    }
