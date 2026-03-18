"""
PersonaFlow - Agent Behavior Engine
====================================
Centralizes all agent behavior logic:
  - Role-specific system prompt building
  - Behavior config parsing (strict_mode, response_length, etc.)
  - Scope enforcement templates
  - Response length constraints by conversation mode
"""
import json

# ── Role detection keywords ──────────────────────────────────────────────────
_ROLE_KEYWORDS = {
    'interviewer': ['interviewer', 'interview', 'hiring', 'recruiter', 'hr'],
    'coach':       ['coach', 'coaching', 'trainer', 'mentor', 'interview coach'],
    'teacher':     ['teacher', 'tutor', 'instructor', 'educator', 'professor', 'lecturer'],
    'evaluator':   ['evaluator', 'observer', 'assessor', 'judge', 'scorer', 'reviewer'],
}

# ── Response length budgets ───────────────────────────────────────────────────
_LENGTH_RULES = {
    'video': (
        "RESPONSE LENGTH — CRITICAL:\n"
        "You are in a LIVE VOICE CALL. Keep every response to 1-2 SHORT sentences maximum.\n"
        "Think of how a real person speaks in a live conversation — brief, natural, direct.\n"
        "Never write lists, bullet points, or multi-paragraph explanations.\n"
        "If a topic needs more detail, give ONE key point and offer to continue if they want more."
    ),
    'text': (
        "RESPONSE LENGTH:\n"
        "Keep answers concise and conversational. Max 3-4 sentences per response.\n"
        "Avoid lengthy explanations unless the user explicitly asks for more detail.\n"
        "Use short paragraphs, not walls of text."
    ),
}


def get_behavior_config(agent):
    """
    Parse agent's output_config for behavior-related settings.

    Supported fields in output_config JSON:
        strict_mode         (bool)   — refuse all out-of-scope questions
        allow_out_of_scope  (bool)   — override to allow off-topic answers
        max_answer_length   (int)    — word limit hint for LLM
        behavior            (str)    — 'question_only' | 'teach' | 'evaluate' | 'converse'
    """
    try:
        config = json.loads(agent.output_config) if agent.output_config else {}
    except Exception:
        config = {}

    return {
        'strict_mode':        config.get('strict_mode', True),
        'allow_out_of_scope': config.get('allow_out_of_scope', False),
        'max_answer_length':  config.get('max_answer_length', None),
        'behavior':           config.get('behavior', 'converse'),
        'evaluation':         config.get('evaluation', False),
        'summary':            config.get('summary', True),
        'transcript':         config.get('transcript', True),
        'criteria':           config.get('criteria', []),
    }


def detect_role_type(role_text):
    """Detect the semantic role type from the agent's role string."""
    role_lower = (role_text or '').lower()
    for role_type, keywords in _ROLE_KEYWORDS.items():
        if any(kw in role_lower for kw in keywords):
            return role_type
    return 'default'


def _role_behavior_section(role_type, behavior_config):
    """Return role-specific behavioral instructions for the system prompt."""
    behavior = behavior_config.get('behavior', 'converse')

    if role_type == 'interviewer':
        return (
            "ROLE-SPECIFIC BEHAVIOR — INTERVIEWER:\n"
            "- Ask ONE interview question at a time. Wait for the candidate's full answer.\n"
            "- Do NOT give away correct answers unless explicitly allowed in the rules.\n"
            "- After each answer, either follow up with a probing question or move to the next topic.\n"
            "- Evaluate critically but professionally.\n"
            "- Keep questions relevant to the defined role and knowledge domain."
        )
    elif role_type == 'coach':
        return (
            "ROLE-SPECIFIC BEHAVIOR — INTERVIEW COACH:\n"
            "- Ask interview questions, then provide example answers and improvement tips.\n"
            "- Be encouraging but honest about weaknesses.\n"
            "- Teach the candidate HOW to improve their responses.\n"
            "- Give structured feedback: (1) What was good, (2) What to improve, (3) Example answer."
        )
    elif role_type == 'teacher':
        return (
            "ROLE-SPECIFIC BEHAVIOR — TEACHER:\n"
            "- Explain concepts step by step in simple language.\n"
            "- Ask follow-up questions to check the student's understanding.\n"
            "- Use analogies and examples to clarify difficult ideas.\n"
            "- Do not overwhelm the student — one concept at a time."
        )
    elif role_type == 'evaluator':
        return (
            "ROLE-SPECIFIC BEHAVIOR — EVALUATOR/OBSERVER:\n"
            "- Observe the user's responses carefully.\n"
            "- Provide structured feedback and scoring where applicable.\n"
            "- Be objective, specific, and actionable in your feedback.\n"
            "- Focus on measurable criteria defined in your knowledge/task description."
        )
    else:
        # Default conversational agent
        if behavior == 'question_only':
            return (
                "ROLE-SPECIFIC BEHAVIOR:\n"
                "- Only ask questions — do NOT provide answers or explanations.\n"
                "- Your job is to gather information from the user through questions.\n"
                "- Ask one question at a time and wait for the answer."
            )
        return (
            "ROLE-SPECIFIC BEHAVIOR:\n"
            "- Engage naturally and conversationally.\n"
            "- Ask follow-up questions to understand the user better.\n"
            "- Provide helpful, relevant responses within your defined scope."
        )


def build_system_prompt(agent, mode='text'):
    """
    Build the complete system prompt for an agent, incorporating:
      - Core identity (name, role, goal, tone)
      - Task description and knowledge
      - Agent rules
      - Role-specific behavior (interviewer/teacher/coach/evaluator)
      - Strict scope enforcement
      - Response length constraints based on mode (video/text)
      - Behavior config settings (strict_mode, max_answer_length, etc.)

    Args:
        agent: Agent model object
        mode: 'video' | 'text' — controls response length rules
    """
    behavior_config = get_behavior_config(agent)
    role_type = detect_role_type(agent.role)

    # Parse rules
    rules = json.loads(agent.rules) if agent.rules else []
    rules_text = "\n".join([f"- {rule}" for rule in rules]) if rules else "No specific rules defined."

    # Scope description
    scope_description = f"{agent.role}"
    if agent.goal:
        scope_description += f" focused on: {agent.goal}"
    if agent.knowledge:
        scope_description += f"\nKnowledge domain: {agent.knowledge}"

    # Out-of-scope handling
    strict_mode = behavior_config['strict_mode'] and not behavior_config['allow_out_of_scope']
    if strict_mode:
        scope_block = (
            f"STRICT SCOPE ENFORCEMENT:\n"
            f"You are ONLY allowed to respond within your defined scope:\n"
            f"  → Role: {agent.role}\n"
            f"  → Goal: {agent.goal or 'as defined above'}\n"
            f"  → Domain: {agent.knowledge or agent.task_description or agent.role}\n\n"
            f"If a user asks ANYTHING outside this scope, respond exactly like:\n"
            f"  \"I'm here as a {agent.role}. That's outside my area — I can help you with "
            f"{agent.goal or agent.role}. Would you like to ask something related?\"\n\n"
            f"DO NOT: answer general knowledge questions, break character, or pretend to be a general assistant."
        )
    else:
        scope_block = (
            f"SCOPE PREFERENCE:\n"
            f"Focus primarily on your role as {agent.role} and domain: "
            f"{agent.knowledge or agent.goal or agent.role}.\n"
            f"You may use your best judgment for closely related questions."
        )

    # Max length hint
    length_hint = ""
    if behavior_config.get('max_answer_length'):
        length_hint = f"\nKeep responses under {behavior_config['max_answer_length']} words."

    # Response length rules based on conversation mode
    length_rule = _LENGTH_RULES.get(mode, _LENGTH_RULES['text']) + length_hint

    # Role-specific section
    role_section = _role_behavior_section(role_type, behavior_config)

    prompt = f"""You are {agent.name}, a {agent.role}.

GOAL: {agent.goal or 'Assist the user effectively within your defined scope.'}

PERSONALITY & TONE: {agent.tone or 'professional'}

TASK DESCRIPTION:
{agent.task_description or 'Engage in helpful conversation within your scope.'}

KNOWLEDGE & DOMAIN:
{agent.knowledge or 'No additional knowledge provided.'}

RULES & CONSTRAINTS:
{rules_text}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{role_section}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{scope_block}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{length_rule}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BEHAVIOR GUIDELINES:
1. Stay in character as {agent.name} at all times
2. Follow all rules strictly
3. Be helpful, natural, and engaging within your scope
4. Never use bullet points or numbered lists unless specifically asked
5. Respond as you would in a real spoken conversation — naturally and concisely"""

    return prompt
