"""
PersonaFlow AI Service
Handles AI conversation logic.
Supports OpenRouter API (free models).
"""
import requests
import json
from config import Config
from agent_behavior import build_system_prompt

class AIService:
    def __init__(self):
        self.api_key = Config.OPENROUTER_API_KEY
        self.model = Config.OPENROUTER_MODEL
        self.base_url = "https://openrouter.ai/api/v1/chat/completions"

    # ── Unified API call ─────────────────────────────────────────────

    def _call_api(self, system_prompt, contents, timeout=60):
        """
        Send a request to OpenRouter API.
        `contents` should be a list of {'role': 'user'|'assistant', 'content': str}
        """
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "http://localhost:5000",
            "X-Title": "PersonaFlow"
        }

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        for msg in contents:
            messages.append({"role": msg["role"], "content": msg["content"]})

        payload = {
            "model": self.model,
            "messages": messages
        }

        response = requests.post(self.base_url, headers=headers, json=payload, timeout=timeout)

        if response.status_code == 200:
            data = response.json()
            try:
                return data['choices'][0]['message']['content']
            except (KeyError, IndexError):
                return None
        elif response.status_code in [400, 401, 403]:
            return "API Key is missing or invalid. Please check your backend configuration."
        elif response.status_code == 429:
            return "API rate limit reached. Please wait a moment and try again."
        else:
            return f"AI API Error (HTTP {response.status_code}): {response.text[:200]}"

    # ── Public methods ───────────────────────────────────────────────

    def generate_response(self, agent, messages, user_message, mode='text'):
        """
        Generate AI response based on agent personality and conversation history.
        mode: 'video' | 'text' — controls response length (video = 1-2 sentences)
        """
        system_prompt = build_system_prompt(agent, mode=mode)
        conversation = self._build_conversation(messages, user_message)

        try:
            result = self._call_api(system_prompt, conversation, timeout=60)
            if result is None:
                return 'I apologize, but I encountered an issue parsing the response.'
            return result
        except requests.exceptions.Timeout:
            return "I apologize, but my response is taking too long. Please try again."
        except Exception as e:
            print(f"AI Service Error: {e}")
            return "I apologize, but I encountered an unexpected error. Please try again."

    def _build_conversation(self, messages, user_message):
        """Convert message history to chat format."""
        conversation = []
        for msg in messages:
            role = "assistant" if msg.role == "agent" else "user"
            conversation.append({"role": role, "content": msg.content})

        conversation.append({"role": "user", "content": user_message})

        # Deduplicate back-to-back same-role messages
        if not conversation:
            return conversation

        deduped = []
        for msg in conversation:
            if deduped and deduped[-1]["role"] == msg["role"]:
                deduped[-1]["content"] += f"\n\n{msg['content']}"
            else:
                deduped.append(msg)

        return deduped

    def generate_summary(self, agent, messages):
        """Generate conversation summary."""
        transcript = "\n".join([
            f"{'Agent' if m.role == 'agent' else 'User'}: {m.content}"
            for m in messages
        ])

        prompt = f"""Analyze the following conversation between {agent.name} (a {agent.role}) and a user.
Generate a concise summary of the key points discussed.

CONVERSATION:
{transcript}

Provide a 2-3 paragraph summary focusing on:
1. The main topics discussed
2. Key information exchanged
3. Any outcomes or decisions made"""

        try:
            result = self._call_api(None, [{"role": "user", "content": prompt}], timeout=120)
            if result is None:
                return 'Summary generation failed.'
            return result
        except Exception as e:
            print(f"Summary generation error: {e}")
            return "Summary generation failed."

    def generate_feedback(self, agent, messages, scores):
        """Generate feedback and recommendations."""
        transcript = "\n".join([
            f"{'Agent' if m.role == 'agent' else 'User'}: {m.content}"
            for m in messages
        ])

        output_config = json.loads(agent.output_config) if agent.output_config else {}
        criteria = output_config.get('criteria', [])

        criteria_text = "\n".join([
            f"- {c.get('name', 'Unknown')}: {scores.get(c.get('name', ''), 0)}/100"
            for c in criteria
        ])

        prompt = f"""Analyze this conversation and provide constructive feedback.

AGENT: {agent.name} ({agent.role})
GOAL: {agent.goal}

CONVERSATION:
{transcript}

EVALUATION SCORES:
{criteria_text if criteria_text else 'No specific criteria evaluated.'}

Provide:
1. Strengths observed in the conversation
2. Areas for improvement
3. Specific actionable recommendations

Keep feedback constructive and helpful."""

        try:
            result = self._call_api(None, [{"role": "user", "content": prompt}], timeout=120)
            if result is None:
                return 'Feedback generation failed.'
            return result
        except Exception as e:
            print(f"Feedback generation error: {e}")
            return "Feedback generation failed."

    def generate_report_chat_response(self, agent, conversations, reports, chat_history, user_message):
        """
        Generate AI response for the per-agent report chatbot.
        Answers questions about the agent's conversation data.
        """
        total_convs = len(conversations)
        completed = [c for c in conversations if c.status == 'completed']

        scored_reports = [r for r in reports if r.overall_score is not None]
        avg_score = (sum(r.overall_score for r in scored_reports) / len(scored_reports)) if scored_reports else None

        perf_list = []
        for r in sorted(scored_reports, key=lambda x: x.overall_score, reverse=True):
            conv = next((c for c in conversations if c.id == r.conversation_id), None)
            if conv:
                perf_list.append({
                    'name': conv.participant_name or 'Anonymous',
                    'score': round(r.overall_score),
                    'date': conv.started_at.strftime('%b %d, %Y') if conv.started_at else '?',
                    'summary': (r.summary or '')[:200]
                })

        perf_text = ""
        if perf_list:
            perf_text = "PARTICIPANT PERFORMANCE RANKINGS:\n"
            for i, p in enumerate(perf_list, 1):
                perf_text += f"{i}. {p['name']} — Score: {p['score']}/100 (Date: {p['date']})\n"
                if p['summary']:
                    perf_text += f"   Summary: {p['summary']}\n"
        else:
            perf_text = "No scored conversations available yet."

        recent_text = ""
        recent = sorted(conversations, key=lambda c: c.started_at, reverse=True)[:5]
        if recent:
            recent_text = "RECENT CONVERSATIONS:\n"
            for c in recent:
                recent_text += f"- {c.participant_name or 'Anonymous'} ({c.started_at.strftime('%b %d') if c.started_at else '?'}): {c.status}, {len(c.messages)} messages\n"

        system_prompt = f"""You are a data analyst assistant for the agent "{agent.name}" ({agent.role}).
You have access to all conversation and performance data for this agent.
Answer the user's questions about this data clearly and concisely.

AGENT OVERVIEW:
- Name: {agent.name}
- Role: {agent.role}
- Goal: {agent.goal or 'N/A'}
- Total Conversations: {total_convs}
- Completed Conversations: {len(completed)}
- Conversations with Scores: {len(scored_reports)}
- Average Score: {f"{avg_score:.1f}/100" if avg_score is not None else "N/A"}

{perf_text}

{recent_text}

INSTRUCTIONS:
- Answer questions about this agent's performance data, participant rankings, scores, trends
- If asked for "top N", provide the top N from the rankings above
- If asked for a PDF or DOCX, say: "Click the Download PDF or Download DOCX button below to export"
- Be concise and data-driven
- Format lists clearly with numbers or bullets"""

        contents = []
        for h in chat_history[-10:]:
            role = "assistant" if h['role'] == "agent" else "user"
            contents.append({"role": role, "content": h['content']})

        contents.append({"role": "user", "content": user_message})

        # Deduplicate same roles back to back
        deduped = []
        for msg in contents:
            if deduped and deduped[-1]["role"] == msg["role"]:
                deduped[-1]["content"] += f"\n\n{msg['content']}"
            else:
                deduped.append(msg)

        try:
            result = self._call_api(system_prompt, deduped, timeout=90)
            if result is None:
                return 'Unable to generate response.'
            return result
        except Exception as e:
            print(f"Report chat error: {e}")
            return "Report analysis failed. Please try again."

# Global instance
ai_service = AIService()
