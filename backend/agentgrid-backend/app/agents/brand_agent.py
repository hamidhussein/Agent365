from typing import Dict, Any, List
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from app.agents.base import BaseAgent, AgentInput, AgentOutput
from app.agents.registry import register_agent

# Brand Agent ID (All 5s)
BRAND_AGENT_ID = "55555555-5555-5555-5555-555555555555"

@register_agent(BRAND_AGENT_ID)
class BrandNamerAgent(BaseAgent):
    @property
    def name(self) -> str:
        return "Startup Brand Namer"

    @property
    def description(self) -> str:
        return "Generates catchy, available-sounding brand names and slogans."

    @property
    def inputs(self) -> List[AgentInput]:
        return [
            AgentInput(name="keywords", type="string", description="Core keywords (e.g., 'fast, food, healthy')", placeholder="fast, healthy, delivery, salad"),
            AgentInput(name="vibe", type="string", description="Tone (e.g., 'Modern', 'Luxury', 'Playful')", placeholder="Modern, Eco-friendly")
        ]

    @property
    def outputs(self) -> List[AgentOutput]:
        return [
            AgentOutput(name="names_list", type="string", description="List of 10 name ideas"),
            AgentOutput(name="slogans", type="string", description="List of 3 slogans")
        ]

    def run(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        keywords = inputs.get("keywords", "")
        vibe = inputs.get("vibe", "Modern")

        llm = ChatOpenAI(model="gpt-4", temperature=0.9) # High temp for creativity

        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a creative naming agency. Generate unique, memorable startup names."),
            ("user", "Keywords: {keywords}\nVibe: {vibe}\n\nGenerate 10 Name Ideas and 3 Slogans.\nFormat:\nNAMES:\n- Name 1\n- Name 2\n...\nSLOGANS:\n- Slogan 1\n...")
        ])

        chain = prompt | llm
        response = chain.invoke({"keywords": keywords, "vibe": vibe})
        content = response.content
        
        names = ""
        slogans = ""
        
        if "NAMES:" in content:
            parts = content.split("NAMES:", 1)[1]
            if "SLOGANS:" in parts:
                n_part, s_part = parts.split("SLOGANS:", 1)
                names = n_part.strip()
                slogans = s_part.strip()
            else:
                names = parts.strip()
        else:
             # Fallback
             names = content
             slogans = ""
        
        return {
            "names_list": names,
            "slogans": slogans
        }
