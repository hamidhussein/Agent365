# Creator Studio metadata suggestion helpers (extracted from creator_studio.py)
from __future__ import annotations

import json
from typing import Any

def build_agent_suggest_prompt(payload: dict[str, Any]) -> str:
    name = str(payload.get("name", "")).strip()
    description = str(payload.get("description", "")).strip()
    instruction = str(payload.get("instruction", "")).strip()
    notes = str(payload.get("notes", "")).strip()
    model_id = str(payload.get("model", "")).lower()

    parts = [f"Agent name: {name}"]
    
    if description:
        parts.append(f"Current description: {description}")
    if instruction:
        parts.append(f"Current instructions: {instruction}")
        
    if notes:
        parts.append(f"Creator's requests/notes for this update: {notes}")
        parts.append("Action: Refine the agent based on these notes while keeping the existing quality.")
    elif description or instruction:
        parts.append("Action: Improve and polish the current agent metadata.")
    else:
        parts.append("Action: Generate a fresh, high-quality description and instruction set.")

    capabilities = payload.get("enabledCapabilities")
    if capabilities:
        enabled = []
        if capabilities.get("webBrowsing"): enabled.append("Web Search")
        if capabilities.get("codeExecution"): enabled.append("Code Execution")
        if capabilities.get("apiIntegrations"): enabled.append("API Integrations")
        if enabled:
            parts.append(f"\nNote for AI: The following special features are ENABLED for this agent: {', '.join(enabled)}. Please ensure your generated description and instructions reflect these capabilities.")

    # Guidance based on model capabilities
    if "gpt" in model_id or "gemini" in model_id:
        parts.append("\nNote for AI: The selected model supports Code Execution, Web Browsing, and Advanced File Handling. You can suggest technical or data-heavy tasks.")
    elif "claude" in model_id:
        parts.append("\nNote for AI: The selected model is excellent at conversational nuances and text analysis but has limited web/code execution support. Focus on personality and deep reasoning.")
    elif "deepseek" in model_id:
        parts.append("\nNote for AI: The selected model is specialized in Deep Analysis and Coding. Emphasize these strengths in the instructions.")
    else:
        parts.append("\nNote for AI: Focus on general text generation and summarization, as this model has limited tool support.")

    parts.append("\nGuidelines:")
    parts.append("- Output ONLY valid JSON with keys: \"description\", \"instruction\".")
    parts.append("- Description: 1-2 professional sentences focused on user outcomes.")
    parts.append("- Instruction: A single string using '-' bullet points for clarity (8-12 rules).")
    parts.append("- DO NOT mention specific model names or technical providers in the description/instruction themselves.")
    parts.append("- Include: tone of voice, scope of knowledge, when to ask for clarification, and a polite fallback for out-of-scope requests.")

    return "\n".join(parts)

def parse_agent_suggest_response(raw: str, name: str) -> dict[str, str]:
    content = raw.strip()
    data = None
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        start = content.find("{")
        end = content.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                data = json.loads(content[start:end + 1])
            except json.JSONDecodeError:
                data = None
    if not isinstance(data, dict):
        fallback_desc = f"{name} assistant."
        fallback_instr = f"You are {name}. Be helpful, concise, and accurate."
        return {"description": fallback_desc, "instruction": fallback_instr}
    description = str(data.get("description", "")).strip() or f"{name} assistant."
    instruction = str(data.get("instruction", "")).strip() or f"You are {name}. Be helpful, concise, and accurate."
    return {"description": description, "instruction": instruction}

def format_size(size_bytes: int) -> str:
    if size_bytes < 1024:
        return f"{size_bytes} B"
    return f"{size_bytes / 1024:.1f} KB"
