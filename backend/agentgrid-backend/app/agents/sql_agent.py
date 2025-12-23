from typing import Dict, Any, List
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from app.agents.base import BaseAgent, AgentInput, AgentOutput
from app.agents.registry import register_agent

# SQL Agent ID (All 7s)
SQL_AGENT_ID = "77777777-7777-7777-7777-777777777777"

@register_agent(SQL_AGENT_ID)
class SQLTranslatorAgent(BaseAgent):
    @property
    def name(self) -> str:
        return "SQL Query Generator"

    @property
    def description(self) -> str:
        return "Converts natural language questions into safe SQL queries for any schema."

    @property
    def inputs(self) -> List[AgentInput]:
        return [
            AgentInput(name="question", type="string", description="What data do you want? (e.g. 'Show active users sorted by created_at')", placeholder="Show top 5 customers by total spend in 2024"),
            AgentInput(name="schema_context", type="string", description="Optional table schema/definitions", placeholder="Table orders (id, user_id, amount, created_at)")
        ]

    @property
    def outputs(self) -> List[AgentOutput]:
        return [
            AgentOutput(name="sql_query", type="string", description="The SQL query"),
            AgentOutput(name="explanation", type="string", description="Brief explanation")
        ]

    def run(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        question = inputs.get("question", "")
        schema = inputs.get("schema_context", "Table 'users' with columns: id, email, created_at, status") # Default context for demo

        if not question:
            raise ValueError("I need a question to generate SQL!")

        llm = ChatOpenAI(model="gpt-4", temperature=0.0)

        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an expert SQL developer. Generate valid, standard SQL (PostgreSQL compatible)."),
            ("user", "Schema/Context: {schema}\nQuestion: {question}\n\nOutput strict format:\nSQL:\n<the query>\nEXPLANATION:\n<the explanation>")
        ])

        chain = prompt | llm
        response = chain.invoke({"schema": schema, "question": question})
        content = response.content
        
        sql = "Error"
        explanation = ""
        
        if "SQL:" in content:
            parts = content.split("SQL:", 1)[1]
            if "EXPLANATION:" in parts:
                s_part, e_part = parts.split("EXPLANATION:", 1)
                explanation = e_part.strip()
            else:
                sql = parts.strip()
        else:
            # Fallback: if no typical format, assume the whole things is SQL if it looks like it, or fail gracefully
            if "SELECT" in content.upper():
                sql = content.replace('```sql', '').replace('```', '').strip()
                explanation = "Generated directly."
            else:
                 explanation = content
        
        return {
            "sql_query": sql,
            "explanation": explanation
        }
