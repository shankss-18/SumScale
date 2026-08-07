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


def _build_grounded_fallback_answer(user_message: str, user_cases: List[Dict[str, Any]], threat_report: str = "") -> str:
    """
    Generates a message-SPECIFIC fallback answer when the LLM call fails.
    Reads the user's actual question and tries to answer it from case data,
    instead of always returning the same generic boilerplate.
    """
    import random

    if threat_report:
        return (
            f"I ran a live threat intelligence check on that for you.\n\n{threat_report}\n\n"
            "Take a look at the risk scores above — if anything shows as suspicious or malicious, "
            "please don't engage with it further and report it to the relevant authorities."
        )

    latest_case = user_cases[0] if user_cases else {}
    findings = latest_case.get("findings", {})
    dept = (latest_case.get("department") or "document").lower()
    summary = findings.get("summary") or findings.get("pattern_classification") or ""
    checklist = findings.get("remediation_checklist") or findings.get("otc_suggestions") or []
    likely_assoc = findings.get("likely_associations") or []
    escalation_reason = findings.get("escalation_reason") or ""
    severity = (findings.get("severity") or findings.get("escalation_flag") or "medium").lower()

    msg_lower = user_message.lower()

    # --- Answer based on what the user actually asked ---

    # Q: numbers / values / what should I be worried about
    if any(k in msg_lower for k in ["number", "value", "worried", "concern", "most", "which"]):
        if likely_assoc:
            concern = likely_assoc[0]
            others = ", ".join(likely_assoc[1:3]) if len(likely_assoc) > 1 else None
            ans = f"Looking at your report, the value I'd keep an eye on most closely is related to **{concern}**."
            if others:
                ans += f" There are also some notes around {others} that are worth watching."
            ans += f" The overall risk level on your case has been flagged as **{severity}**, so it's not something to panic about, but definitely worth following up with your doctor."
            return ans
        return (
            f"Based on your {dept} records, the findings show a **{severity}** risk level overall. "
            "I'd recommend sharing these results directly with your doctor so they can walk you through the specific values that need attention."
        )

    # Q: what does this mean / explain
    if any(k in msg_lower for k in ["mean", "explain", "what is", "tell me", "understand", "what does"]):
        if summary and "assessment completed" not in summary.lower():
            return (
                f"So essentially, your {dept} records are showing: **{summary}**. "
                + (f"This is often associated with {', '.join(likely_assoc)}, " if likely_assoc else "")
                + "which in plain terms means your body (or document) is flagging something that needs a professional look. "
                f"The risk level is currently rated **{severity}** — so while it's not an emergency, acting on it sooner rather than later is the right call."
            )
        return (
            f"Your {dept} document has been analyzed and a **{severity}** risk level was identified. "
            "In simple terms, the findings suggest there are some areas worth discussing with a qualified specialist."
        )

    # Q: what should I do / next steps / precautions
    if any(k in msg_lower for k in ["do", "step", "action", "precaution", "now", "next", "how", "should i"]):
        if checklist:
            steps = "\n".join([f"- {item}" for item in checklist[:4]])
            return (
                f"Here's what I'd suggest based on your {dept} records:\n\n{steps}\n\n"
                "And one more thing — make sure you hold onto all your original documents and reports. "
                "They'll be important for any follow-up consultations."
            )
        return (
            f"Given the **{severity}** risk profile in your {dept} records, here's what makes sense right now: "
            "keep yourself well-rested and hydrated, note down any new symptoms or changes you observe, "
            "and book a follow-up with a specialist if things don't improve. "
            "Would you like me to set up a reminder for that?"
        )

    # Q: risk / serious / dangerous / bad
    if any(k in msg_lower for k in ["risk", "serious", "danger", "bad", "safe", "okay", "fine"]):
        sev_words = {"low": "relatively mild", "medium": "moderate", "high": "elevated"}
        sev_desc = sev_words.get(severity, "moderate")
        if escalation_reason:
            return (
                f"The risk level on your case is **{sev_desc}**. The main reason it's flagged this way is: "
                f"*{escalation_reason}*. That doesn't mean you need to panic — but it does mean getting a professional "
                "opinion sooner rather than later would be the smart move."
            )
        return (
            f"Your records show a **{sev_desc}** risk level. Overall, it's not critical, but it's not something to ignore either. "
            "I'd treat this as a signal to schedule a proper check-up."
        )

    # Generic conversational fallback — still message-aware
    openers = [
        f"Good question! Based on what's in your {dept} records,",
        f"Looking at your {dept} case,",
        f"From what I can see in your uploaded {dept} documents,",
        f"Happy to help with that. Your {dept} records show",
    ]
    opener = random.choice(openers)

    if summary and "assessment completed" not in summary.lower():
        body = f" the key finding is: **{summary}**."
    else:
        body = f" a **{severity}** overall risk level has been identified."

    if likely_assoc:
        body += f" This appears linked to {', '.join(likely_assoc[:2])}."

    followup_options = [
        "Would you like me to walk you through what this means in plain language, or set up a follow-up reminder?",
        "Let me know if you'd like a step-by-step action plan or want me to set up an email alert for this case.",
        "Feel free to ask me anything specific — I'm here to help you make sense of it all.",
    ]

    return opener + body + " " + random.choice(followup_options)


import re
from app.services.fraud_verify import verify_entity

_URL_RE = re.compile(r"https?://[^\s\"'<>]+|www\.[^\s\"'<>]+")
_PHONE_RE = re.compile(r"(?:\+91[\-\s]?)?[6-9]\d{9}\b")
_IP_RE = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")


async def _check_fraud_in_chat(user_message: str, user_cases: List[Dict[str, Any]], db: Any = None) -> str:
    """
    Scans user message (and cases) for URLs, phone numbers, IPs, or domains,
    runs verify_entity on them, and formats a human-readable threat analysis table with scores.
    """
    found_entities = []
    
    # Extract URLs from message
    for url in _URL_RE.findall(user_message):
        found_entities.append(("url", url.strip()))
        
    # Extract Phone numbers from message
    if not found_entities:
        for ph in _PHONE_RE.findall(user_message):
            clean_ph = ph.strip().replace(" ", "").replace("-", "")
            if len(clean_ph) == 10 and clean_ph[0] in "6789":
                found_entities.append(("phone", clean_ph))
                
    # Extract IPs from message
    if not found_entities:
        for ip in _IP_RE.findall(user_message):
            found_entities.append(("ip", ip.strip()))
            
    # Check if user explicitly asks to verify/check a link, phone, or threat entity
    msg_lower = user_message.lower()
    is_explicit_verify_query = any(k in msg_lower for k in ["verify number", "verify phone", "check link", "check url", "is this phone safe", "is this number safe", "check ip", "verify entity"])
    
    if not found_entities and is_explicit_verify_query:
        for c in user_cases:
            evidence_list = c.get("evidence", [])
            for ev in evidence_list:
                text = ev.get("extracted_text", "")
                urls = _URL_RE.findall(text)
                if urls:
                    found_entities.append(("url", urls[0].strip()))
                    break
                phones = _PHONE_RE.findall(text)
                if phones:
                    clean_p = phones[0].strip().replace(" ", "").replace("-", "")
                    if len(clean_p) == 10 and clean_p[0] in "6789":
                        found_entities.append(("phone", clean_p))
                        break
            if found_entities:
                break

    if not found_entities:
        return ""

    results_formatted = []
    for etype, val in found_entities[:2]:  # check up to 2 entities
        try:
            verdict = await verify_entity(etype, val, db)
            badge = "🟢 SAFE" if verdict.verdict == "safe" else ("🟡 SUSPICIOUS" if verdict.verdict == "suspicious" else "🔴 MALICIOUS")
            
            details = [
                f"### 🛡️ Fraud & Security Intelligence Report for `{val}`",
                f"**Overall Verdict**: **{badge}** | **Risk Score: {verdict.risk_score}/100**",
                "",
                "| Threat Intelligence Source | Status / Finding | Severity Level |",
                "| :--- | :--- | :--- |"
            ]
            
            for ev in verdict.evidence:
                sev_icon = "🟢" if ev.severity == "safe" else ("🟡" if ev.severity == "suspicious" else ("🔴" if ev.severity == "malicious" else "⚪"))
                details.append(f"| **{ev.source}** | {sev_icon} {ev.finding} | `{ev.severity.upper()}` |")
                
            if verdict.phone_check and verdict.phone_check.available:
                pc = verdict.phone_check
                details.append(f"| **IPQualityScore Phone Validation** | Carrier: {pc.carrier or 'Unknown'} (VOIP: {pc.is_voip}, Disposable: {pc.is_disposable}) | Fraud Score: `{pc.risk_score}/100` |")
                
            if verdict.virus_total and verdict.virus_total.available:
                vt = verdict.virus_total
                details.append(f"| **VirusTotal Engine Consensus** | {vt.malicious_count}/{vt.total_engines} engines flagged as malicious | `MALICIOUS COUNT: {vt.malicious_count}` |")
                
            if verdict.domain_age and verdict.domain_age.available:
                da = verdict.domain_age
                details.append(f"| **WhoisXML Domain Age Check** | Domain Age: {da.age_days} days (Created: {da.created_date or 'N/A'}) | `{'NEW DOMAIN (RISK)' if da.is_new else 'ESTABLISHED'}` |")

            if verdict.shared_intel and verdict.shared_intel.found:
                details.append(f"| **SumScale Community Intel** | Reported by {verdict.shared_intel.report_count} users | `{'AUTO-FLAGGED' if verdict.shared_intel.auto_flagged else 'REPORTED'}` |")
                
            results_formatted.append("\n".join(details))
        except Exception as exc:
            logger.warning(f"Error verifying entity {val} in chat: {exc}")

    return "\n\n---\n\n".join(results_formatted)


async def generate_grounded_chat_response(
    user_message: str,
    user_cases: List[Dict[str, Any]],
    language: str = "en",
    chat_history: List[Dict[str, Any]] = None,
    db: Any = None,
) -> Dict[str, Any]:
    """
    Format user cases and recent conversation history as RAG context.
    Automatically performs live threat intelligence entity verification if URLs, phones, or fraud queries are detected.
    Automatically retries up to 3 times on 429 RESOURCE_EXHAUSTED errors.
    Returns {"answer": "...", "cited_cases": [...]} in user's target language.
    """
    # 1. Run live threat verification if applicable
    threat_intel_report = await _check_fraud_in_chat(user_message, user_cases, db)

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

    threat_prompt_section = ""
    if threat_intel_report:
        threat_prompt_section = f"\n\nLIVE THREAT INTELLIGENCE VERIFICATION RESULTS:\n{threat_intel_report}\n\nIMPORTANT: Include the above Threat Intelligence Report table with risk scores, IPQualityScore, VirusTotal, and WhoisXML details prominently in your response so the user gets complete trust, transparency, and numerical risk scores."

    import time
    # Uniqueness seed: prevents LLM from caching/repeating the same response
    _seed = int(time.time()) % 10000

    prompt = f"""{PROMPT_INJECTION_PROTECTION}

You are SumScale Copilot — a sharp, warm, conversational AI specialist. You speak like a knowledgeable friend who really gets what the user is going through, NOT like a formal report generator.

================================================================================
LANGUAGE: Write ALL output exclusively in **{lang_name}** ({language}). No English unless language is 'en'.
================================================================================

🚨 ANTI-REPEAT RULE (CRITICAL — VIOLATION = FAILURE):
This is response #{_seed}. Your answer for THIS specific question MUST be UNIQUE and directly address EXACTLY what the user asked.
NEVER start with "Case Context & Overview", "Recommended Approach", or "Actionable Next Steps".
NEVER generate a generic overview. ONLY answer what was ACTUALLY asked.

CONVERSATION MEMORY: The user's conversation history is in <conversation_history>. Read it — if they're asking a follow-up, acknowledge what was said before and build on it naturally.

ARTIFACT RULE: If user says "these", "this", "them" — they mean their UPLOADED DOCUMENTS, not the chat history.

TONE RULES — READ CAREFULLY:
- Talk like a caring human expert friend. Natural, warm, direct.
- Match your tone to the question. Worried user → reassuring. Curious → explanatory. Urgent → clear and action-focused.
- Use "you" and "your" naturally. No corporate-speak.
- Short paragraphs. No rigid "Paragraph 1 / Paragraph 2" structure.
- End with ONE natural follow-up offer, not a robotic reminder prompt.{threat_prompt_section}
- NEVER use "SOURCES CITED" footer.

<user_data>
CASE HISTORY:
{cases_context_json}

CONVERSATION SO FAR:
<conversation_history>
{history_str}
</conversation_history>

USER'S CURRENT MESSAGE (answer THIS specifically):
{user_message}
</user_data>

Return ONLY valid JSON:
{{
    "answer": "Direct, warm, conversational answer to EXACTLY what the user asked. In {lang_name}. NOT a generic overview.",
    "cited_cases": [
        {{
            "case_id": "case_id_here",
            "department": "department_here",
            "summary": "Brief relevant summary"
        }}
    ],
    "suggested_next_questions": [
        "A follow-up question specific to THIS conversation",
        "Another relevant follow-up",
        "One more contextual question"
    ],
    "auto_generated_title": "3-6 word title capturing THIS specific question in {lang_name}"
}}
"""

    last_exc = None

    for attempt in range(1, _MAX_RETRIES + 1):
        try:
            raw = call_text_llm(prompt, temperature=0.75)
            result = clean_json_response(raw)
            answer_val = result.get("answer")
            if not answer_val or not str(answer_val).strip():
                answer_val = _build_grounded_fallback_answer(user_message, user_cases, threat_intel_report)

            # Clean any SOURCES CITED block from AI output text to keep responses concise
            parts = re.split(r"(?:\*\*|###|##|#|\s|^)*sources\s+cited:?", str(answer_val), flags=re.IGNORECASE)
            clean_answer = parts[0].strip()

            return {
                "answer": clean_answer,
                "cited_cases": result.get("cited_cases", []),
                "suggested_next_questions": result.get("suggested_next_questions", [
                    "What step-by-step precautions should I take?",
                    "Set up email & Google Calendar reminders for this case",
                    "Explain key terms simply"
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
                        "answer": _build_grounded_fallback_answer(user_message, user_cases, threat_intel_report),
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
                    "answer": _build_grounded_fallback_answer(user_message, user_cases, threat_intel_report),
                    "cited_cases": [],
                    "suggested_next_questions": [
                        "What are the main risk factors in my document?",
                        "Explain key medical / technical terms simply",
                        "What step-by-step precautions should I take?"
                    ],
                }

    logger.error(f"Unexpected exit from retry loop: {last_exc}")
    return {
        "answer": _build_grounded_fallback_answer(user_message, user_cases, threat_intel_report),
        "cited_cases": [],
        "suggested_next_questions": [
            "What are the main risk factors in my document?",
            "Explain key medical / technical terms simply",
            "What step-by-step precautions should I take?"
        ],
    }
