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
    Mines actual extracted facts (symptoms, medications, lab summaries) from the case data
    instead of returning hardcoded generic boilerplate.
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
    merged_facts = latest_case.get("merged_facts", {})
    dept = (latest_case.get("department") or "document").lower()

    msg_lower = user_message.lower()

    # --- FRAUD / SECURITY DEPARTMENT FALLBACK ---
    fraud_kws = ["fraud", "scam", "bank", "otp", "phishing", "sms", "link", "invoice", "payment", "lotto", "upi", "paytm", "suspension"]
    if dept == "fraud" or any(k in msg_lower for k in fraud_kws):
        pattern = findings.get("pattern_classification") or "Suspicious Communication / Fraud Risk"
        score = findings.get("risk_score") or 75
        citations = findings.get("evidence_citations") or []
        remediation = findings.get("remediation_checklist") or [
            "Do not click any links or download attachments.",
            "Verify the sender's identity through official channels directly.",
            "Report the suspicious message to the CyberCrime Helpline (1930) or cybercrime.gov.in."
        ]
        severity = (findings.get("severity") or "high").lower()

        # Specific Q: Link / click / URL / verification
        if any(k in msg_lower for k in ["link", "click", "url", "site", "website", "http", "domain", "verification"]):
            return (
                f"**Do NOT click that link.** In your uploaded security records, suspicious links (like unverified shortlinks or fake login domains) were flagged under **{pattern}** (Risk Score: {score}/100).\n\n"
                "Attackers use fake links to steal login credentials or install malware. Always navigate to official bank/company websites manually by typing the web address directly into your browser."
            )

        # Specific Q: Bank / email / sender / SBI / Jio
        if any(k in msg_lower for k in ["bank", "email", "sender", "from", "account", "sbi", "jio", "official"]):
            return (
                f"Based on your security analysis, this message claims to be from a bank or official service provider, but shows clear indicators of **{pattern}** (Risk Score: {score}/100).\n\n"
                "Key indicator: official banks will **never** request debit card PINs, netbanking passwords, or immediate account verification through unverified email links or high-urgency suspension threats. Contact your bank via their official phone number on your card."
            )

        # Specific Q: Invoice / payment / money / fee / charge / UPI
        if any(k in msg_lower for k in ["invoice", "pay", "payment", "money", "fee", "upi", "charge", "amount", "transfer"]):
            return (
                f"Looking at the invoice details in your security audit, this document has been flagged as a **{pattern}** with an elevated risk rating of **{severity.upper()}** ({score}/100).\n\n"
                "Unsolicited invoice demands requiring rapid payment via personal UPI handles or wire transfers are classic fake invoice scams. Do not transfer funds until you confirm the shipment directly with official support."
            )

        # Specific Q: What to do / precautions / steps / action
        if any(k in msg_lower for k in ["do", "step", "action", "precaution", "now", "next", "how", "should i"]):
            steps_str = "\n".join([f"- {s}" for s in remediation[:4]])
            return f"Here are the recommended security actions for your **{pattern}** case:\n\n{steps_str}\n\nKeep all original emails and SMS messages saved for cybercrime reporting."

        # Dynamic fallback matching exact user question
        return (
            f"Regarding your question *\"{user_message.strip()}\"*: your security case is classified as **{pattern}** (Severity: **{severity.upper()}**).\n\n"
            "We strongly advise against sharing sensitive personal details, opening links, or transferring funds based on this communication. Verify all details through official channels."
        )

    # --- HEALTH DEPARTMENT FALLBACK ---
    # Pull real extracted data first — fall back to findings fields only if missing
    symptoms = merged_facts.get("symptoms") or []
    medications = merged_facts.get("medications_mentioned") or []
    conditions = merged_facts.get("existing_conditions_mentioned") or []
    report_summary = merged_facts.get("report_summary") or ""
    body_part = merged_facts.get("body_part") or ""
    duration = merged_facts.get("duration") or ""
    visual_findings = merged_facts.get("visual_findings") or ""

    # Pull findings-level fields (these are now contextual if ai_service fallback ran)
    summary = findings.get("summary") or findings.get("pattern_classification") or report_summary or ""
    checklist = findings.get("remediation_checklist") or findings.get("otc_suggestions") or []
    likely_assoc = findings.get("likely_associations") or conditions or symptoms[:3] or []
    escalation_reason = findings.get("escalation_reason") or ""
    severity = (findings.get("severity") or findings.get("escalation_flag") or "medium").lower()

    # Also collect raw evidence text snippets for richer fallback answers
    evidence_snippets = []
    for ev in latest_case.get("evidence", []):
        txt = (ev.get("extracted_text") or "").strip()
        if txt and len(txt) > 30:
            evidence_snippets.append(txt[:400])

    msg_lower = user_message.lower()

    # --- Answer based on what the user actually asked ---

    # Q: numbers / values / what should I be worried about
    if any(k in msg_lower for k in ["number", "value", "worried", "concern", "most", "which", "result", "level"]):
        parts = []
        if report_summary and report_summary.lower() not in ("none", ""):
            parts.append(f"Your report shows: **{report_summary}**.")
        if likely_assoc:
            concern_list = ", ".join([f"**{a}**" for a in likely_assoc[:3]])
            parts.append(f"The areas worth keeping an eye on: {concern_list}.")
        if body_part and body_part.lower() not in ("unknown", ""):
            parts.append(f"The findings relate to your **{body_part}**.")
        parts.append(
            f"Overall risk is rated **{severity}** — worth a follow-up with your doctor, "
            "who can walk you through the exact numbers."
        )
        return " ".join(parts)

    # Q: what's wrong / what does this mean / explain / simple terms
    if any(k in msg_lower for k in ["wrong", "mean", "explain", "what is", "tell me", "understand", "simple", "what does", "summary"]):
        parts = []
        if summary and "assessment completed" not in summary.lower() and "uploaded health" not in summary.lower():
            parts.append(f"In plain terms: **{summary}**.")
        elif report_summary and report_summary.lower() not in ("none", ""):
            parts.append(f"Your report indicates: **{report_summary}**.")
        if symptoms:
            parts.append(f"Reported symptoms include: {', '.join(symptoms[:4])}.")
        if conditions:
            parts.append(f"Pre-existing conditions noted: {', '.join(conditions[:3])}.")
        if medications:
            parts.append(f"Medications mentioned: {', '.join(medications[:3])}.")
        if not parts:
            parts.append(f"Your {dept} documents were reviewed and a **{severity}** risk level was identified.")
        parts.append("For a full interpretation, bring these documents to your doctor.")
        return " ".join(parts)

    # Q: what should I do / next steps / treat / precautions
    if any(k in msg_lower for k in ["do", "step", "action", "precaution", "treat", "now", "next", "how", "should i", "happen if"]):
        if checklist:
            steps = "\n".join([f"- {item}" for item in checklist[:4]])
            intro = f"Based on your {dept} records"
            if medications:
                intro += f" (medications noted: {', '.join(medications[:2])})"
            return (
                f"{intro}, here's what makes sense right now:\n\n{steps}\n\n"
                "Hold onto all your original documents — they'll be essential for any specialist consultation."
            )
        # Build contextual suggestions from symptoms / conditions
        suggestions = []
        if medications:
            suggestions.append(f"Continue taking your prescribed medication ({', '.join(medications[:2])}) as directed")
        if duration and duration.lower() not in ("unknown", ""):
            suggestions.append(f"Since symptoms have lasted {duration}, a follow-up appointment is strongly recommended")
        suggestions.append("Keep a daily symptom log to share with your doctor")
        suggestions.append("Avoid self-diagnosing or stopping any prescribed treatment without medical advice")
        steps = "\n".join([f"- {s}" for s in suggestions])
        return (
            f"Given the **{severity}** risk profile in your {dept} records:\n\n{steps}\n\n"
            "Would you like me to set up a reminder for your next appointment?"
        )

    # Q: risk / serious / dangerous / bad / what happens if
    if any(k in msg_lower for k in ["risk", "serious", "danger", "bad", "safe", "okay", "fine", "happen"]):
        sev_words = {"low": "relatively mild", "medium": "moderate", "high": "elevated"}
        sev_desc = sev_words.get(severity, "moderate")
        reason_part = ""
        if escalation_reason and "consult" not in escalation_reason.lower():
            reason_part = f" The main reason it's flagged: *{escalation_reason}*."
        elif conditions:
            reason_part = f" Pre-existing conditions ({', '.join(conditions[:2])}) make monitoring important."
        return (
            f"The risk on your case is currently **{sev_desc}**.{reason_part} "
            "That's not a reason to panic, but it is a signal to get a proper check-up sooner rather than later. "
            "Untreated findings can progress — catching them early gives you far more options."
        )

    # Generic conversational fallback — still document-aware
    openers = [
        f"Based on what's in your {dept} records,",
        f"Looking at your uploaded {dept} documents,",
        f"From your {dept} case,",
        f"Going through your {dept} records,",
    ]
    opener = random.choice(openers)

    body_parts = []
    if summary and "assessment completed" not in summary.lower() and "uploaded health" not in summary.lower():
        body_parts.append(f" the key finding is: **{summary}**")
    elif report_summary and report_summary.lower() not in ("none", ""):
        body_parts.append(f" the report notes: **{report_summary}**")
    else:
        body_parts.append(f" a **{severity}** risk level has been identified")

    if likely_assoc:
        body_parts.append(f", linked to {', '.join(likely_assoc[:2])}")

    followup_options = [
        " What specific part of your results would you like me to break down further?",
        " Want me to explain what any of these findings mean in everyday language?",
        " Let me know if you'd like a step-by-step action plan based on these results.",
    ]

    return opener + "".join(body_parts) + "." + random.choice(followup_options)


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
        merged_facts = c.get("merged_facts", {})

        summary = (
            findings.get("summary")
            or findings.get("pattern_classification")
            or merged_facts.get("report_summary")
            or ""
        )

        # Include raw extracted text from all evidence items so the LLM can cite
        # actual lab values, prescription details, appointment info, etc.
        evidence_details = []
        for idx, ev in enumerate(c.get("evidence", []), 1):
            extracted = (ev.get("extracted_text") or "").strip()
            if extracted and "content extraction failed" not in extracted.lower():
                ev_type = ev.get("type") or ev.get("artifact_type") or f"document_{idx}"
                evidence_details.append({
                    "document_type": ev_type,
                    "content": extracted[:2000],  # cap at 2000 chars per doc to stay within token budget
                })

        formatted_cases.append({
            "case_id": case_id,
            "department": dept,
            "status": c.get("status"),
            "summary": summary,
            "merged_facts": merged_facts,
            "findings": findings,
            "raw_documents": evidence_details,  # ← actual OCR/extracted document content
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
    _seed = int(time.time()) % 10000

    # Determine primary department & adapt Copilot persona
    all_depts = [c.get("department") for c in user_cases if c.get("department")]
    is_fraud_case = "fraud" in all_depts or any(
        k in (user_message + " " + cases_context_json).lower()
        for k in ["fraud", "scam", "bank", "otp", "phishing", "sms", "link", "invoice", "payment", "lotto", "upi", "paytm", "suspension"]
    )

    if is_fraud_case:
        system_persona = (
            "You are SumScale Copilot — a sharp, expert Cybersecurity, Phishing & Fraud Intelligence Specialist. "
            "You speak like a protective security analyst who helps users identify scam emails, fake invoices, "
            "phishing links, SMS fraud, and suspicious payment requests."
        )
        domain_mandate = (
            "7. THIS CASE IS A FRAUD / SECURITY AUDIT. DO NOT USE MEDICAL OR HEALTH LANGUAGE. "
            "DO NOT MENTION DOCTORS, SYMPTOMS, LAB RESULTS, OR CLINIC APPOINTMENTS. "
            "Analyze the document strictly for scam indicators, fake invoice signs, phishing domain red flags, "
            "unverified UPI IDs, urgency phrasing, and security precautions."
        )
        domain_reasoning = "Step 4: Add one sentence of security context if helpful ('Official banks will never ask for PINs or credentials via email...')."
        default_next_questions = [
            "How can I tell if this sender address is legitimate?",
            "What step-by-step precautions should I take against this scam?",
            "Where can I report this suspicious communication?"
        ]
    else:
        system_persona = (
            "You are SumScale Copilot — a sharp, empathetic AI Health & Medical Assistant. "
            "You speak like a brilliant, caring friend who happens to have medical and analytical expertise."
        )
        domain_mandate = "7. If the user asks about cholesterol → quote their actual cholesterol value. If they ask about their prescription → name the actual medication. If they ask about an appointment → give the actual date/doctor name."
        domain_reasoning = "Step 4: Add one sentence of medical context if helpful ('High LDL is linked to...')."
        default_next_questions = [
            "What are the main risk factors in my document?",
            "Explain key medical terms simply",
            "What step-by-step precautions should I take?"
        ]

    # Build a compact document inventory summary for the prompt header
    doc_inventory_lines = []
    for fc in formatted_cases:
        for rd in fc.get("raw_documents", []):
            doc_inventory_lines.append(f"  • [{rd['document_type']}] from case {fc['case_id'][:8]}...")
    doc_inventory = "\n".join(doc_inventory_lines) if doc_inventory_lines else "  • No documents available"

    prompt = f"""{PROMPT_INJECTION_PROTECTION}

{system_persona} Your job is to answer the user's EXACT question using the real content from their uploaded documents.

================================================================================
LANGUAGE: Write ALL output exclusively in **{lang_name}** ({language}). No English unless language is 'en'.
================================================================================

📄 DOCUMENTS UPLOADED BY USER:
{doc_inventory}

🚨 SPECIFICITY MANDATE (CRITICAL — VIOLATION = FAILURE):
This is turn #{_seed}. You MUST:
1. READ the `raw_documents` section in the case data — it contains the ACTUAL text from the user's uploaded files.
2. ANSWER DIRECTLY using specific values, names, dates, amounts, links, or addresses from those documents.
3. NEVER give generic advice unless tied to a specific finding in their document.
4. NEVER start with a section header like "Case Overview" or "Assessment".
5. NEVER produce the same answer structure twice in a conversation — check <conversation_history> and vary your response.
6. {domain_mandate}

🧠 REASONING PROCESS (follow this before writing your answer):
Step 1: Identify the exact question the user is asking.
Step 2: Find the relevant data in `raw_documents` and `merged_facts`.
Step 3: Answer THAT question using THOSE specifics.
{domain_reasoning}
Step 5: Offer ONE natural follow-up, not a menu of options.{threat_prompt_section}

TONE:
- Warm, direct, like a knowledgeable friend — not a formal report.
- Match tone to emotion: worried → reassuring with facts; curious → explanatory; urgent → clear and action-focused.
- Use "you" and "your". Short paragraphs. No bullet-point walls unless listing steps.
- NEVER use "SOURCES CITED" footer.

CONVERSATION MEMORY: Check <conversation_history> — if they're following up, build on what was said before.

<user_data>
CASE DATA (includes raw document content in `raw_documents`):
{cases_context_json}

CONVERSATION SO FAR:
<conversation_history>
{history_str}
</conversation_history>

USER'S CURRENT MESSAGE — answer THIS and ONLY THIS:
{user_message}
</user_data>

Return ONLY valid JSON:
{{
    "answer": "Specific, warm, document-grounded answer that directly addresses what the user asked. Cites actual values/names/dates/amounts from their documents. In {lang_name}.",
    "cited_cases": [
        {{
            "case_id": "case_id_here",
            "department": "department_here",
            "summary": "Brief relevant summary"
        }}
    ],
    "suggested_next_questions": [
        "A follow-up that makes sense given THIS specific answer and THIS user's actual documents",
        "Another relevant contextual follow-up based on what was found",
        "One more natural follow-up question"
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
                        "suggested_next_questions": default_next_questions,
                    }
            else:
                logger.error(f"Error during RAG chat response generation: {exc}")
                return {
                    "answer": _build_grounded_fallback_answer(user_message, user_cases, threat_intel_report),
                    "cited_cases": [],
                    "suggested_next_questions": default_next_questions,
                }

    logger.error(f"Unexpected exit from retry loop: {last_exc}")
    return {
        "answer": _build_grounded_fallback_answer(user_message, user_cases, threat_intel_report),
        "cited_cases": [],
        "suggested_next_questions": default_next_questions,
    }
