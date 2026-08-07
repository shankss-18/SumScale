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
    latest_case = user_cases[0] if user_cases else {}
    findings = latest_case.get("findings", {})
    summary = findings.get("summary") or findings.get("pattern_classification") or "your uploaded records"

    if "assessment completed" in summary.lower():
        summary = "your uploaded case evidence and findings"

    checklist = findings.get("remediation_checklist") or findings.get("otc_suggestions") or []
    likely_assoc = findings.get("likely_associations") or []
    escalation_reason = findings.get("escalation_reason") or ""
    severity = (findings.get("severity") or findings.get("escalation_flag") or "medium").lower()

    evidence_text = ""
    if latest_case.get("evidence"):
        raw_ev = latest_case["evidence"][0].get("extracted_text", "")
        if "extraction failed" not in raw_ev.lower():
            evidence_text = raw_ev

    if threat_report:
        res = f"I have run a real-time threat intelligence verification on your query.\n\n{threat_report}\n\n"
        res += "Please review the risk scores above and take necessary precautions if any entity shows suspicious or malicious ratings."
        return res

    msg_lower = user_message.lower()

    # Intent 1: Risk Factors / Severity / Danger / Why / Reason
    is_risk_or_reason_query = any(k in msg_lower for k in ["risk", "factor", "severity", "danger", "level", "threat", "reason", "cause", "why"])

    # Intent 2: Problem / Diagnosis / Condition / Issue / Report
    is_problem_query = any(k in msg_lower for k in ["problem", "issue", "diagnosis", "condition", "what wrong", "symptom", "disease", "sick", "illness", "report", "finding"])

    # Intent 3: Precautions / Steps / Remedies / What to do
    is_precaution_query = any(k in msg_lower for k in ["precaution", "step", "action", "guidance", "treatment", "cure", "remedy", "what to do", "how to treat", "how to handle"])

    paragraphs = []

    if is_risk_or_reason_query:
        if likely_assoc:
            assoc_str = ", ".join(likely_assoc)
            paragraphs.append(f"Based on your uploaded case records, the primary pattern identified is **{assoc_str}**. The evaluated risk rating for this record is **{severity.upper()}**.")
        else:
            paragraphs.append(f"Looking closely at your uploaded records regarding **{summary}**, the evaluation indicates a **{severity.upper()}** severity level.")

        if escalation_reason:
            paragraphs.append(f"The primary reason behind this assessment: {escalation_reason}")
        else:
            paragraphs.append("While these findings are generally manageable, it is essential to monitor your symptoms closely and seek professional guidance if anything changes.")

    elif is_problem_query:
        paragraphs.append(f"After analyzing your uploaded documents, the primary condition noted in your records is **{summary}**.")
        if likely_assoc:
            paragraphs.append(f"This is commonly associated with **{', '.join(likely_assoc)}**. The overall assessed risk level for this finding is **{severity.upper()}**.")
        if escalation_reason:
            paragraphs.append(f"Key note from your case report: {escalation_reason}")

    elif is_precaution_query:
        paragraphs.append(f"To address your condition ({summary}) safely and effectively, here are the key step-by-step precautions you should keep in mind:")
        if checklist:
            for item in checklist:
                paragraphs.append(f"• {item}")
        elif escalation_reason:
            paragraphs.append(f"• {escalation_reason}")
            paragraphs.append("• Consult a qualified doctor or healthcare specialist for further evaluation.")
        else:
            paragraphs.append("• Stay well hydrated and get adequate rest.")
            paragraphs.append("• Keep a close eye on any changing symptoms.")
            paragraphs.append("• Keep all original medical test reports safely stored.")

    else:
        paragraphs.append(f"I have reviewed your case records regarding **{summary}**.")
        if likely_assoc:
            paragraphs.append(f"The analysis highlights key indicators such as **{', '.join(likely_assoc)}**, with a **{severity.upper()}** risk rating.")
        if checklist:
            paragraphs.append("Key self-care guidance:")
            for item in checklist:
                paragraphs.append(f"• {item}")
        elif escalation_reason:
            paragraphs.append(f"Assessment detail: {escalation_reason}")
        if evidence_text:
            paragraphs.append(f"Record excerpt: {evidence_text[:250]}")

    paragraphs.append("\nWould you like me to set up an email notification or add a follow-up reminder to your Google Calendar for this case?")

    return "\n\n".join(paragraphs)


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

    prompt = f"""{PROMPT_INJECTION_PROTECTION}

Task: You are OmniAid Copilot, a warm, highly empathetic, and articulate human specialist assistant.
Your goal is to answer the user's questions in a natural, compassionate, and human-like voice while grounding your guidance strictly in their uploaded case history, threat verification data, and recent chat conversation history below.

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

CRITICAL ARTIFACT ANTECEDENT DISAMBIGUATION RULE:
When the user asks questions referring to "these", "this", "the messages", "the two messages", "these items", or similar without a clear antecedent (e.g., "Are these two messages related to each other?"), YOU MUST ALWAYS INTERPRET IT AS REFERRING TO THE UPLOADED CASE ARTIFACTS / EVIDENCE (e.g. SMS screenshot, email, voice note, PDF), NOT to the AI's prior chat responses. Compare the actual uploaded artifacts directly (e.g., shared scam pattern, shared urgency tactic, shared UPI/contact info, or medical findings) rather than comparing prior chat turns.

CRITICAL TONE & STYLE INSTRUCTIONS (MUST FOLLOW):
1. SOUND LIKE A CARING HUMAN SPECIALIST: Speak conversationally, warmly, and naturally as if you are a real expert talking to a patient or user.
2. NO ROBOTIC AI TEMPLATES: Never use rigid robotic phrasing like "I have analyzed your query based on your case details..." or "Key recommendation:".
3. NATURAL CONVERSATIONAL PROSE: Express insights in clear, natural paragraphs in {lang_name}.
4. EMPATHETIC & REASSURING: Provide thoughtful, helpful guidance that feels personal and easy to understand.
5. GROUNDED IN FACTS: Only use facts from the user case context, threat verification data, and conversation history provided below.{threat_prompt_section}
6. PROACTIVE REMINDER & ALERT OFFER: Ask the user if they would like to set up constant notifications or reminders for this case (e.g., "Would you like me to set up constant notifications or reminders for this case? You can enable instant free Email Alerts via Gmail, SMS, or add follow-up reminders directly to your Google Calendar with 1 click.").
7. NO "SOURCES CITED" FOOTERS: Do NOT append any "SOURCES CITED:" section, bullet list of sources, or citation text at the bottom of your response. Keep your answer concise, clean, and direct.

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
        "What step-by-step precautions should I take?",
        "Set up email & Google Calendar reminders for this case",
        "Explain key terms simply"
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
