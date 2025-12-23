from typing import Dict, Any, List
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from app.agents.base import BaseAgent, AgentInput, AgentOutput
from app.agents.registry import register_agent

# SWOT Agent ID (All 3s)
SWOT_AGENT_ID = "33333333-3333-3333-3333-333333333333"

@register_agent(SWOT_AGENT_ID)
class SWOTAnalysisAgent(BaseAgent):
    @property
    def name(self) -> str:
        return "SWOT Strategy Analyst"

    @property
    def description(self) -> str:
        return "Generates a structured SWOT analysis (Strengths, Weaknesses, Opportunities, Threats) for any business idea."

    @property
    def inputs(self) -> List[AgentInput]:
        return [
            AgentInput(name="business_description", type="string", description="Describe the business, product, or idea.", placeholder="A subscription service for gourmet dog food delivered monthly.")
        ]

    @property
    def outputs(self) -> List[AgentOutput]:
        return [
            AgentOutput(name="summary", type="string", description="Executive Summary"),
            AgentOutput(name="strengths", type="string", description="Bullet points of strengths"),
            AgentOutput(name="weaknesses", type="string", description="Bullet points of weaknesses"),
            AgentOutput(name="opportunities", type="string", description="Bullet points of opportunities"),
            AgentOutput(name="threats", type="string", description="Bullet points of threats")
        ]

    def run(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        business = inputs.get("business_description", "")
        if not business:
            raise ValueError("I need a business description to analyze!")

        llm = ChatOpenAI(model="gpt-4", temperature=0.5)

        # We ask for JSON-like structure in the prompt to make parsing easier
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an expert McKinsey strategy consultant. Perform a rigorous SWOT analysis. Be critical and realistic."),
            ("user", "Analyze the following business: {business}\n\nOutput ONLY a structured analysis with these headings:\n# SUMMARY\n...\n# STRENGTHS\n...\n# WEAKNESSES\n...\n# OPPORTUNITIES\n...\n# THREATS\n...")
        ])

        chain = prompt | llm
        response = chain.invoke({"business": business})
        content = response.content

        # Simple manual parsing based on headings
        sections = {"summary": "", "strengths": "", "weaknesses": "", "opportunities": "", "threats": ""}
        current_section = None

        for line in content.split('\n'):
            line = line.strip()
            if line.startswith("# SUMMARY"):
                current_section = "summary"
                continue
            elif line.startswith("# STRENGTHS"):
                current_section = "strengths"
                continue
            elif line.startswith("# WEAKNESSES"):
                current_section = "weaknesses"
                continue
            elif line.startswith("# OPPORTUNITIES"):
                current_section = "opportunities"
                continue
            elif line.startswith("# THREATS"):
                current_section = "threats"
                continue
            
            if current_section:
                sections[current_section] += line + "\n"

        return {k: v.strip() for k, v in sections.items()}
