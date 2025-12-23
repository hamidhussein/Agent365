# Agent Creation Prompt

Copy and paste the following prompt when you want me (the AI) to deploy a new agent for you. It ensures I follow the strict deployment protocol.

---

**PROMPT START**

I want to add a new agent to AgentGrid. Here is the Agent Code:

```python
[PASTE AGENT CODE HERE]
```

Please deploy this agent by following the **AgentGrid Deployment Protocol**:

1.  **Backend Implementation**:
    *   Create the file in `app/agents/`.
    *   Update `requirements.txt` if dependencies are missing.
    *   Register the agent in `app/agents/__init__.py`.

2.  **Database Seeding**:
    *   Update `seed_agents.py`.
    *   Create a `seed_[agent_name]_agent` function.
    *   **CRITICAL**: Ensure `required_inputs` in the seed config matches the agent code.
    *   **CRITICAL**: If using `select` inputs, ensure `options` are formatted as `[{"value": "x", "label": "X"}]`, NOT strings.
    *   Call the seed function in the `__main__` block.

3.  **Frontend Considerations**:
    *   Verify `agentMapper.ts` handles the input types.
    *   Ensure the Agent `run()` method returns structured JSON (Dictionary) to leverage the "Beautiful Visuals" features (Cards, Code Blocks, Markdown). Use "Magic Keys" (`sql_query`, `current_code`, `subject`) if applicable.

4.  **Verification**:
    *   Instruct me to deploy Backend (`npx -y @railway/cli up --service backend`).

**PROMPT END**
