import os
import uuid
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.agent import Agent
from app.models.user import User
from app.models.enums import AgentStatus, AgentCategory
from app.agents.examples import ECHO_AGENT_ID
# from app.agents.seo_agent import SEO_AGENT_ID

# Database URL
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./agentgrid.db")

connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
engine = create_engine(DATABASE_URL, pool_pre_ping=True, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def wait_for_db(max_retries=30, delay=3):
    """Wait for the database to be ready before seeding."""
    import time
    from sqlalchemy.exc import OperationalError
    
    print("Checking database connection...")
    for i in range(max_retries):
        try:
            # Try to connect
            with engine.connect() as connection:
                print("Database connection established!")
                return
        except OperationalError as e:
            print(f"Database not ready yet (Attempt {i+1}/{max_retries}). Retrying in {delay}s...")
            time.sleep(delay)
    
    print("Could not connect to database after multiple retries. Seeding may fail.")

def seed_echo_agent():
    # Wait for DB first
    # (We call this once in main)
    db = SessionLocal()
    try:
        # 1. Get a creator (or create one)
        creator = db.query(User).filter(User.email == "admin@agentgrid.ai").first()
        if not creator:
            print("Creating default admin user...")
            from app.core.security import get_password_hash
            from app.models.enums import UserRole
            creator = User(
                id=uuid.uuid4(),
                email="admin@agentgrid.ai",
                username="admin",
                full_name="Axeecom",
                hashed_password=get_password_hash("admin123"),
                role=UserRole.ADMIN.value if hasattr(UserRole.ADMIN, 'value') else UserRole.ADMIN,
                credits=100
            )
            db.add(creator)
            db.commit()
            db.refresh(creator)
        else:
             # Force update name if changed
             if creator.full_name != "Axeecom":
                 print(f"Updating Admin Name from {creator.full_name} to Axeecom")
                 creator.full_name = "Axeecom"
                 db.commit()

        # 2. Check if agent exists
        existing_agent = db.query(Agent).filter(Agent.id == uuid.UUID(ECHO_AGENT_ID)).first()
        if existing_agent:
            print(f"Echo Agent {ECHO_AGENT_ID} already exists.")
            # FORCE CREATOR UPDATE
            if existing_agent.creator_id != creator.id:
                 existing_agent.creator_id = creator.id
                 db.commit()
            return

        # 3. Create Agent
        echo_agent = Agent(
            id=uuid.UUID(ECHO_AGENT_ID),
            name="Echo Agent",
            description="A simple agent that echoes back your input.",
            long_description="This agent is a demonstration of the manual agent integration. It takes a message as input and returns it as output.",
            category=AgentCategory.AUTOMATION.value,
            tags=["demo", "echo"],
            price_per_run=1.0,
            status=AgentStatus.ACTIVE,
            config={
                "model": "gpt-4",
                "temperature": 0.7,
                "max_tokens": 1000,
                "timeout_seconds": 60,
                "required_inputs": [
                    {
                        "name": "message",
                        "type": "string",
                        "description": "The message to echo back.",
                        "required": True
                    }
                ]
            },
            creator_id=creator.id,
            version="1.0.0"
        )
        
        db.add(echo_agent)
        db.commit()
        print(f"Successfully seeded Echo Agent: {ECHO_AGENT_ID}")

    except Exception as e:
        print(f"Error seeding agent: {e}")
        db.rollback()
    finally:
        db.close()

# from app.agents.seo_agent import SEO_AGENT_ID

# ... (existing imports)

def seed_seo_agent():
    db = SessionLocal()
    try:
        # 1. Get a creator (or create one)
        creator = db.query(User).filter(User.email == "admin@agentgrid.ai").first()
        if not creator:
            creator = db.query(User).first()
        
        if not creator:
            print("No users found. Please runs echo agent seed first or register a user.")
            return

        # 2. Check if agent exists
        existing_agent = db.query(Agent).filter(Agent.id == uuid.UUID(SEO_AGENT_ID)).first()
        if existing_agent:
            print(f"SEO Agent {SEO_AGENT_ID} already exists.")
            # Force update creator
            if existing_agent.creator_id != creator.id:
                 existing_agent.creator_id = creator.id
                 db.commit()
            return

        # 3. Create Agent
        seo_agent = Agent(
            id=uuid.UUID(SEO_AGENT_ID),
            name="SEO Audit Agent",
            description="Crawls a website, performs SEO analysis, generates LLM summary and recommendations, outputs JSON + optional PDF report.",
            long_description="A comprehensive SEO audit tool that crawls your website, analyzes key metrics (H1s, meta tags, load time), and uses GPT-4 to provide actionable recommendations. Can generate a PDF report.",
            category=AgentCategory.ANALYSIS.value,
            tags=["seo", "audit", "marketing", "analysis"],
            price_per_run=5.0,
            status=AgentStatus.ACTIVE,
            config={
                "model": "gpt-4o-mini",
                "temperature": 0.3,
                "max_tokens": 2000,
                "timeout_seconds": 300,
                "required_inputs": [
                    {
                        "name": "url",
                        "type": "string",
                        "description": "Website URL to audit",
                        "required": True
                    },
                    {
                        "name": "max_pages",
                        "type": "number",
                        "description": "Maximum pages to crawl (default: 20)",
                        "required": False
                    },
                    {
                        "name": "openai_api_key",
                        "type": "string",
                        "description": "LLM API key",
                        "required": True
                    },
                    {
                        "name": "generate_pdf",
                        "type": "boolean",
                        "description": "Whether to return PDF report",
                        "required": False
                    }
                ]
            },
            capabilities=["SEO Audit", "Site Crawling", "Content Analysis"],
            limitations=["Requires publicly accessible URLs", "Max 20 pages"],
            demo_available=True,
            creator_id=creator.id,
            version="1.0.0"
        )
        
        db.add(seo_agent)
        db.commit()
        print(f"Successfully seeded SEO Agent: {SEO_AGENT_ID}")

    except Exception as e:
        print(f"Error seeding SEO agent: {e}")
        db.rollback()
    finally:
        db.close()

# New Agent UUID
YOUTUBE_AGENT_ID = "11111111-1111-1111-1111-111111111111"

def seed_youtube_agent():
    db = SessionLocal()
    try:
        # 1. Get creator
        creator = db.query(User).filter(User.email == "admin@agentgrid.ai").first()
        if not creator:
            creator = db.query(User).first()
        
        if not creator:
            print("No users found.")
            return

        # 2. Check existence
        existing_agent = db.query(Agent).filter(Agent.id == uuid.UUID(YOUTUBE_AGENT_ID)).first()
        if existing_agent:
            print(f"YouTube Agent {YOUTUBE_AGENT_ID} already exists. Updating config...")
            existing_agent.config = {
                "model": "gpt-4",
                "temperature": 0.5,
                "max_tokens": 4000,
                "timeout_seconds": 120,
                "required_inputs": [
                    {
                        "name": "video_url",
                        "type": "string",
                        "description": "YouTube Video URL (e.g. https://www.youtube.com/watch?v=...)",
                        "required": True
                    }
                ]
            }
            existing_agent.creator_id = creator.id
            db.commit()
            print(f"Updated config for YouTube Agent: {YOUTUBE_AGENT_ID}")
            return

        # 3. Create Agent
        agent = Agent(
            id=uuid.UUID(YOUTUBE_AGENT_ID),
            name="YouTube Summarizer",
            description="Transform any YouTube video into a concise summary with key takeaways.",
            long_description="Stop wasting time watching long videos. This agent extracts the transcript from any YouTube URL and uses GPT-4 to generate a structured summary, including a TL;DR, key takeaways, and a detailed breakdown of the content.",
            category=AgentCategory.RESEARCH.value,
            tags=["youtube", "summary", "research", "video"],
            price_per_run=2.0,
            status=AgentStatus.ACTIVE,
            config={
                "model": "gpt-4",
                "temperature": 0.5,
                "max_tokens": 4000,
                "timeout_seconds": 120,
                "required_inputs": [
                    {
                        "name": "video_url",
                        "type": "string",
                        "description": "YouTube Video URL (e.g. https://www.youtube.com/watch?v=...)",
                        "required": True
                    }
                ]
            },
            capabilities=["Transcript Extraction", "Content Summarization"],
            limitations=["Videos with disabled captions specifically may fail", "Very long videos > 1 hour may be truncated"],
            demo_available=True,
            creator_id=creator.id,
            version="1.0.0"
        )
        
        db.add(agent)
        db.commit()
        print(f"Successfully seeded YouTube Agent: {YOUTUBE_AGENT_ID}")

    except Exception as e:
        print(f"Error seeding YouTube agent: {e}")
        db.rollback()
    finally:
        db.close()


# Cold Emailer ID (All 2s)
COLD_EMAIL_AGENT_ID = "22222222-2222-2222-2222-222222222222"

def seed_cold_email_agent():
    db = SessionLocal()
    try:
        creator = db.query(User).filter(User.email == "admin@agentgrid.ai").first() or db.query(User).first()
        if not creator: return

        # Define Config with Placeholders
        config = {
            "model": "gpt-4",
            "temperature": 0.7,
            "max_tokens": 1000,
            "timeout_seconds": 60,
            "required_inputs": [
                {"name": "recipient_name", "type": "string", "description": "Name of the person you are emailing", "placeholder": "John Doe", "required": True},
                {"name": "recipient_company", "type": "string", "description": "Company they work for", "placeholder": "Acme Corp", "required": True},
                {"name": "my_product", "type": "string", "description": "What you are selling or pitching", "placeholder": "AI Sales Assistant", "required": True},
                {"name": "value_proposition", "type": "string", "description": "Key benefit or value add", "placeholder": "Automates lead qualification by 50%", "required": True}
            ]
        }

        existing_agent = db.query(Agent).filter(Agent.id == uuid.UUID(COLD_EMAIL_AGENT_ID)).first()
        if existing_agent:
            print(f"Updating Cold Email Agent {COLD_EMAIL_AGENT_ID}...")
            existing_agent.category = AgentCategory.WRITING.value
            existing_agent.price_per_run = 1.0
            existing_agent.config = config
            existing_agent.status = AgentStatus.ACTIVE
            existing_agent.creator_id = creator.id
            db.commit()
            return

        agent = Agent(
            id=uuid.UUID(COLD_EMAIL_AGENT_ID),
            name="Cold Email Generator",
            description="Drafts high-conversion cold outreach emails tailored to your prospect.",
            long_description="A professional copywriting assistant that generates personalized B2B cold emails. Provide the recipient's details and your value proposition, and it will craft a subject line and body optimized for high open and reply rates.",
            category=AgentCategory.WRITING.value,
            tags=["writing", "sales", "email", "marketing"],
            price_per_run=1.0,
            status=AgentStatus.ACTIVE,
            config=config,
            capabilities=["Copywriting", "Sales Persuasion"],
            limitations=["Text only"],
            demo_available=True,
            creator_id=creator.id,
            version="1.0.0"
        )
        db.add(agent)
        db.commit()
        print(f"Seeded Cold Email Agent: {COLD_EMAIL_AGENT_ID}")
    except Exception as e:
        print(f"Error seeding Cold Email agent: {e}")
        db.rollback()
    finally:
        db.close()


# SWOT Agent ID (All 3s)
SWOT_AGENT_ID = "33333333-3333-3333-3333-333333333333"

def seed_swot_agent():
    db = SessionLocal()
    try:
        creator = db.query(User).filter(User.email == "admin@agentgrid.ai").first() or db.query(User).first()
        if not creator: return

        # Define Config with Placeholders
        config = {
            "model": "gpt-4",
            "temperature": 0.5,
            "max_tokens": 2000,
            "timeout_seconds": 120,
            "required_inputs": [
                 {"name": "business_description", "type": "string", "description": "Describe the business, product, or idea.", "placeholder": "A subscription service for gourmet dog food delivered monthly.", "required": True}
            ]
        }

        existing_agent = db.query(Agent).filter(Agent.id == uuid.UUID(SWOT_AGENT_ID)).first()
        if existing_agent:
             print(f"Updating SWOT Agent...")
             existing_agent.category = AgentCategory.BUSINESS.value
             existing_agent.price_per_run = 1.0
             existing_agent.config = config
             existing_agent.status = AgentStatus.ACTIVE
             existing_agent.creator_id = creator.id
             db.commit()
             return

        agent = Agent(
            id=uuid.UUID(SWOT_AGENT_ID),
            name="SWOT Strategy Analyst",
            description="Generates a structured SWOT analysis (Strengths, Weaknesses, Opportunities, Threats) for any business idea.",
            long_description="A strategic planning tool that uses GPT-4 to analyze business descriptions and output a comprehensive SWOT matrix. Ideal for entrepreneurs and consultants.",
            category=AgentCategory.BUSINESS.value,
            tags=["business", "strategy", "analysis", "consulting"],
            price_per_run=1.0,
            status=AgentStatus.ACTIVE,
            config=config,
            capabilities=["Strategic Analysis", "Market Research"],
            limitations=["Analysis based on user input description"],
            demo_available=True,
            creator_id=creator.id,
            version="1.0.0"
        )
        db.add(agent)
        db.commit()
        print(f"Seeded {SWOT_AGENT_ID}")
    except Exception as e:
        print(f"Error seeding SWOT: {e}")
        db.rollback()
    finally:
        db.close()


# Regex Agent ID (All 4s)
REGEX_AGENT_ID = "44444444-4444-4444-4444-444444444444"

def seed_regex_agent():
    db = SessionLocal()
    try:
        # Check if agent exists and DELETE it
        existing_agent = db.query(Agent).filter(Agent.id == uuid.UUID(REGEX_AGENT_ID)).first()
        if existing_agent:
             print(f"Deleting Regex Agent {REGEX_AGENT_ID} from DB...")
             db.delete(existing_agent)
             db.commit()
        else:
            print("Regex Agent not found, skipping delete.")

    except Exception as e:
         print(f"Error deleting Regex: {e}")
         db.rollback()
    finally: db.close()

# Brand Agent ID (All 5s)
BRAND_AGENT_ID = "55555555-5555-5555-5555-555555555555"

def seed_brand_agent():
    db = SessionLocal()
    try:
        creator = db.query(User).filter(User.email == "admin@agentgrid.ai").first() or db.query(User).first()
        if not creator: return

        # Define Config with Placeholders
        config = {
            "model": "gpt-4",
            "temperature": 0.9,
            "max_tokens": 1000,
            "timeout_seconds": 60,
            "required_inputs": [
                 {"name": "keywords", "type": "string", "description": "Core keywords", "placeholder": "fast, healthy, delivery, salad", "required": True},
                 {"name": "vibe", "type": "string", "description": "Tone (e.g., 'Modern', 'Luxury')", "placeholder": "Modern, Eco-friendly", "required": True}
            ]
        }

        existing_agent = db.query(Agent).filter(Agent.id == uuid.UUID(BRAND_AGENT_ID)).first()
        if existing_agent:
             print(f"Updating Brand Agent...")
             existing_agent.category = AgentCategory.CREATIVE.value
             existing_agent.price_per_run = 1.0
             existing_agent.config = config
             existing_agent.status = AgentStatus.ACTIVE
             existing_agent.creator_id = creator.id
             db.commit()
             return

        agent = Agent(
            id=uuid.UUID(BRAND_AGENT_ID),
            name="Startup Brand Namer",
            description="Generates catchy, available-sounding brand names and slogans.",
            long_description="Need a name for your next unicorn? Provide some keywords and a vibe, and get a list of creative, modern brand names along with matching slogans.",
            category=AgentCategory.CREATIVE.value,
            tags=["branding", "startup", "creative", "marketing"],
            price_per_run=1.0,
            status=AgentStatus.ACTIVE,
            config=config,
            creator_id=creator.id,
            version="1.0.0"
        )
        db.add(agent)
        db.commit()
    except Exception as e:
        print(f"Error seeding Brand: {e}")
        db.rollback()
    finally: db.close()

# Meeting Agent ID (All 6s)
MEETING_AGENT_ID = "66666666-6666-6666-6666-666666666666"

def seed_meeting_agent():
    db = SessionLocal()
    try:
        creator = db.query(User).filter(User.email == "admin@agentgrid.ai").first() or db.query(User).first()
        if not creator: return

        # Define Config with Placeholders
        config = {
            "model": "gpt-4",
            "temperature": 0.3,
            "max_tokens": 2000,
            "timeout_seconds": 120,
            "required_inputs": [
                 {"name": "notes", "type": "string", "description": "Raw meeting notes", "placeholder": "John: Let's launch on Monday.\nJane: We need more testing.", "required": True}
            ]
        }

        existing_agent = db.query(Agent).filter(Agent.id == uuid.UUID(MEETING_AGENT_ID)).first()
        if existing_agent:
             print(f"Updating Meeting Agent...")
             existing_agent.category = AgentCategory.PRODUCTIVITY.value
             existing_agent.price_per_run = 1.0
             existing_agent.config = config
             existing_agent.status = AgentStatus.ACTIVE
             existing_agent.creator_id = creator.id
             db.commit()
             return

        agent = Agent(
            id=uuid.UUID(MEETING_AGENT_ID),
            name="Meeting Minutes Generator",
            description="Turns raw, messy meeting notes into professional Minutes with Action Items.",
            long_description="Paste your unstructured meeting notes or transcript here. The agent will organize them into a clear agenda, key points, and a dedicated table of Action Items.",
            category=AgentCategory.PRODUCTIVITY.value,
            tags=["productivity", "business", "meeting", "summary"],
            price_per_run=1.0,
            status=AgentStatus.ACTIVE,
            config=config,
            creator_id=creator.id,
            version="1.0.0"
        )
        db.add(agent)
        db.commit()
    except Exception as e:
        print(f"Error seeding Meeting: {e}")
        db.rollback()
    finally: db.close()


# SQL Agent ID (All 7s)
SQL_AGENT_ID = "77777777-7777-7777-7777-777777777777"

def seed_sql_agent():
    db = SessionLocal()
    try:
        creator = db.query(User).filter(User.email == "admin@agentgrid.ai").first() or db.query(User).first()
        if not creator: return

        # Define Config with Placeholders
        config = {
            "model": "gpt-4",
            "temperature": 0.0,
            "max_tokens": 1000,
            "timeout_seconds": 60,
            "required_inputs": [
                 {"name": "question", "type": "string", "description": "What data do you want?", "placeholder": "Show top 5 customers by total spend in 2024", "required": True},
                 {"name": "schema_context", "type": "string", "description": "Table schema definition", "placeholder": "Table orders (id, user_id, amount, created_at)", "required": False}
            ]
        }

        existing_agent = db.query(Agent).filter(Agent.id == uuid.UUID(SQL_AGENT_ID)).first()
        if existing_agent:
             print(f"Updating SQL Agent...")
             existing_agent.category = AgentCategory.DATA.value
             existing_agent.price_per_run = 1.0
             existing_agent.config = config
             existing_agent.status = AgentStatus.ACTIVE
             existing_agent.creator_id = creator.id
             db.commit()
             return

        agent = Agent(
            id=uuid.UUID(SQL_AGENT_ID),
            name="SQL Query Generator",
            description="Converts natural language questions into safe SQL queries for any schema.",
            long_description="A developer tool that writes complex SQL queries for you. Just describe what you need ('average sales per region last quarter') and paste your schema, and it will generate the optimized SQL code.",
            category=AgentCategory.DATA.value,
            tags=["sql", "database", "coding", "data"],
            price_per_run=1.0,
            status=AgentStatus.ACTIVE,
            config=config,
            creator_id=creator.id,
            version="1.0.0"
        )
        db.add(agent)
        db.commit()
    except Exception as e:
        print(f"Error seeding SQL: {e}")
        db.rollback()
    finally: db.close()



# Data Cleanser Agent (ID provided by user)
DATA_CLEANSER_AGENT_ID = "a7f3c2d1-8e4b-4a9c-b5d6-3f2e1a9c8b7d"

def seed_data_cleanser_agent():
    db = SessionLocal()
    try:
        creator = db.query(User).filter(User.email == "admin@agentgrid.ai").first() or db.query(User).first()
        if not creator: return

        config = {
            "model": "gpt-4o-mini",
            "temperature": 0.2,
            "max_tokens": 2000,
            "timeout_seconds": 120,
            "required_inputs": [
                {
                    "name": "file_data",
                    "type": "file",
                    "description": "Upload data file (CSV, Excel, or JSON). Will be base64 encoded automatically.",
                    "required": True
                },
                {
                    "name": "file_type",
                    "type": "select",
                    "description": "File format to process",
                    "required": True,
                    "options": [
                        {"value": "csv", "label": "csv"},
                        {"value": "xlsx", "label": "xlsx"},
                        {"value": "xls", "label": "xls"},
                        {"value": "json", "label": "json"}
                    ]
                },
                {
                    "name": "numeric_strategy",
                    "type": "select",
                    "description": "Missing numeric handling strategy (default: median)",
                    "required": False,
                    "options": [{"value": s, "label": s} for s in ["mean", "median", "mode", "forward_fill", "zero"]]
                },
                {
                    "name": "categorical_strategy",
                    "type": "select",
                    "description": "Missing categorical handling strategy (default: mode)",
                    "required": False,
                    "options": [{"value": s, "label": s} for s in ["mode", "unknown", "forward_fill"]]
                },
                {
                    "name": "duplicate_strategy",
                    "type": "select",
                    "description": "Duplicate handling strategy (default: first)",
                    "required": False,
                    "options": [{"value": s, "label": s} for s in ["first", "last", "most_complete"]]
                },
                {
                    "name": "standardize_dates",
                    "type": "select",
                    "description": "Standardize date formats to YYYY-MM-DD",
                    "required": False,
                    "options": [{"value": "true", "label": "true"}, {"value": "false", "label": "false"}]
                },
                {
                    "name": "standardize_text",
                    "type": "select",
                    "description": "Standardize text casing",
                    "required": False,
                    "options": [{"value": "true", "label": "true"}, {"value": "false", "label": "false"}]
                },
                {
                    "name": "remove_outliers",
                    "type": "select",
                    "description": "Replace statistical outliers with median",
                    "required": False,
                    "options": [{"value": "true", "label": "true"}, {"value": "false", "label": "false"}]
                },
                {
                    "name": "use_ai",
                    "type": "select",
                    "description": "Use AI-powered analysis (requires OPENAI_API_KEY)",
                    "required": False,
                    "options": [{"value": "true", "label": "true"}, {"value": "false", "label": "false"}]
                },
                {
                    "name": "openai_api_key",
                    "type": "string",
                    "description": "Optional OpenAI API key to enable AI-powered recommendations for this run",
                    "required": False
                }
            ]
        }

        existing_agent = db.query(Agent).filter(Agent.id == uuid.UUID(DATA_CLEANSER_AGENT_ID)).first()
        if existing_agent:
            print(f"Updating Data Cleanser Agent...")
            existing_agent.category = AgentCategory.DATA.value
            existing_agent.price_per_run = 1.0
            existing_agent.config = config
            existing_agent.status = AgentStatus.ACTIVE
            existing_agent.creator_id = creator.id
            db.commit()
            return

        agent = Agent(
            id=uuid.UUID(DATA_CLEANSER_AGENT_ID),
            name="DataCleanser Agent",
            description="AI-powered data cleaning agent that detects and fixes data quality issues in CSV, Excel, and JSON files.",
            long_description="AI-powered data cleaning agent that detects and fixes data quality issues in CSV, Excel, and JSON files. Returns a cleaned CSV (base64), a cleaning report, detected issues, and a quick preview of the cleaned rows.",
            category=AgentCategory.DATA.value,
            tags=["data", "cleaning", "preprocessing", "csv"],
            price_per_run=1.0,
            status=AgentStatus.ACTIVE,
            config=config,
            capabilities=["Missing Value Imputation", "Outlier Detection", "Format Standardization"],
            limitations=["Max file size 10MB (base64 limit)"],
            demo_available=True,
            creator_id=creator.id,
            version="1.0.0"
        )
        db.add(agent)
        db.commit()
        print(f"Seeded Data Cleanser Agent: {DATA_CLEANSER_AGENT_ID}")
    except Exception as e:
        print(f"Error seeding Data Cleanser: {e}")
        db.rollback()
    finally: db.close()

if __name__ == "__main__":
    wait_for_db()
    seed_echo_agent()
    # seed_seo_agent()
    # seed_youtube_agent()
    # seed_cold_email_agent()
    # seed_swot_agent()
    # seed_regex_agent()
    # seed_brand_agent()
    # seed_meeting_agent()
    # seed_sql_agent()
    # seed_data_cleanser_agent()
