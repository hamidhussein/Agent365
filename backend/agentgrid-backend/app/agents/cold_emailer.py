from typing import Dict, Any, List
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from app.agents.base import BaseAgent, AgentInput, AgentOutput
from app.agents.registry import register_agent

# Agent ID (All 2s for easy identification)
COLD_EMAIL_AGENT_ID = "22222222-2222-2222-2222-222222222222"

@register_agent(COLD_EMAIL_AGENT_ID)
class ColdEmailerAgent(BaseAgent):
    @property
    def name(self) -> str:
        return "Cold Email Generator"

    @property
    def description(self) -> str:
        return "Drafts high-conversion cold outreach emails tailored to your prospect."

    @property
    def inputs(self) -> List[AgentInput]:
        return [
            AgentInput(name="recipient_name", type="string", description="Name of the person you are emailing", placeholder="John Doe"),
            AgentInput(name="recipient_company", type="string", description="Company they work for", placeholder="Acme Corp"),
            AgentInput(name="my_product", type="string", description="What you are selling or pitching", placeholder="AI Sales Assistant"),
            AgentInput(name="value_proposition", type="string", description="Key benefit or value add", placeholder="Automates lead qualification by 50%")
        ]

    @property
    def outputs(self) -> List[AgentOutput]:
        return [
            AgentOutput(name="subject_line", type="string", description="Catchy email subject"),
            AgentOutput(name="email_body", type="string", description="The main email content")
        ]

    def run(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # 1. Validate Inputs
        recipient_name = inputs.get("recipient_name", "there")
        recipient_company = inputs.get("recipient_company", "their company")
        my_product = inputs.get("my_product", "")
        value_prop = inputs.get("value_proposition", "")

        if not my_product:
            raise ValueError("I need to know what product you are pitching!")

        # 2. Setup LLM
        llm = ChatOpenAI(model="gpt-4", temperature=0.7)

        # 3. Create Prompt
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a world-class copywriter specializing in B2B cold outreach. Your emails are concise, personalized, and focus on the recipient's value, not features. Avoid buzzwords."),
            ("user", "Write a cold email to {recipient_name} at {recipient_company}.\nI am pitching: {my_product}\nThe key value proposition is: {value_prop}\n\nProvide the output in two parts: Subject Line and Body.")
        ])

        # 4. Generate
        chain = prompt | llm
        response = chain.invoke({
            "recipient_name": recipient_name,
            "recipient_company": recipient_company,
            "my_product": my_product,
            "value_prop": value_prop
        })
        
        content = response.content.strip()
        
        # 5. Parse Output (Simple separation)
        # We handle cases where LLM puts "Subject: ..." and "Body: ..."
        subject = "Quick question"
        body = content

        if "Subject:" in content:
            parts = content.split("Subject:", 1)[1].split("\n", 1)
            subject = parts[0].strip()
            if len(parts) > 1:
                body = parts[1].strip()
                # Remove "Body:" if present
                if body.startswith("Body:"):
                    body = body[5:].strip()
        
        return {
            "subject_line": subject,
            "email_body": body
        }
