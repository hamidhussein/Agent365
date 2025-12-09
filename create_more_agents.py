import requests

# Login to get token
login_response = requests.post(
    "http://localhost:8000/api/v1/auth/login",
    json={"email": "creator@test.com", "password": "Test123456"}
)
token = login_response.json()["access_token"]
print(f"✅ Logged in as creator")

headers = {"Authorization": f"Bearer {token}"}

# Define 17 diverse agents across all categories
agents = [
    # CREATIVE Category (5 agents)
    {
        "name": "Logo Design Master",
        "description": "Creates professional logos and brand identities with AI-powered design suggestions and iterations",
        "long_description": "An expert AI designer that generates unique, professional logos tailored to your brand. Provides multiple variations and can iterate based on feedback.",
        "category": "creative",
        "tags": ["design", "branding", "logo", "graphics"],
        "price_per_run": 25,
        "config": {"model": "gpt-4", "temperature": 0.8, "max_tokens": 2000, "timeout_seconds": 150, "required_inputs": [], "output_schema": {}},
        "capabilities": ["Logo generation", "Brand identity", "Color palette selection", "Typography recommendations"],
        "demo_available": True
    },
    {
        "name": "Social Media Caption Generator",
        "description": "Generates engaging social media captions with hashtags for Instagram, Twitter, and LinkedIn posts",
        "long_description": "Perfect for social media managers and influencers. Creates platform-specific captions that drive engagement and include relevant hashtags.",
        "category": "creative",
        "tags": ["social media", "marketing", "captions", "hashtags"],
        "price_per_run": 5,
        "config": {"model": "gpt-4", "temperature": 0.9, "max_tokens": 500, "timeout_seconds": 60, "required_inputs": [], "output_schema": {}},
        "capabilities": ["Caption generation", "Hashtag research", "Platform optimization", "Engagement tips"],
        "demo_available": True
    },
    {
        "name": "Video Script Writer",
        "description": "Writes compelling video scripts for YouTube, TikTok, and educational content with hooks and CTAs",
        "long_description": "Specialized in creating engaging video scripts that capture attention and drive action. Includes scene descriptions and timing suggestions.",
        "category": "creative",
        "tags": ["video", "scripting", "youtube", "content"],
        "price_per_run": 18,
        "config": {"model": "gpt-4", "temperature": 0.7, "max_tokens": 3000, "timeout_seconds": 180, "required_inputs": [], "output_schema": {}},
        "capabilities": ["Script writing", "Hook creation", "CTA optimization", "Scene planning"],
        "demo_available": False
    },
    {
        "name": "Product Name Generator",
        "description": "Creates catchy, memorable product names with domain availability checks and trademark insights",
        "long_description": "Helps startups and businesses find the perfect name for their products. Generates creative options and provides branding recommendations.",
        "category": "creative",
        "tags": ["naming", "branding", "startup", "product"],
        "price_per_run": 15,
        "config": {"model": "gpt-4", "temperature": 0.85, "max_tokens": 1500, "timeout_seconds": 120, "required_inputs": [], "output_schema": {}},
        "capabilities": ["Name generation", "Branding analysis", "Domain suggestions", "Trademark insights"],
        "demo_available": True
    },
    {
        "name": "Email Marketing Copywriter",
        "description": "Crafts high-converting email campaigns with subject lines, body copy, and A/B test variations",
        "long_description": "Specialized in email marketing that converts. Creates compelling subject lines, persuasive body copy, and provides A/B testing suggestions.",
        "category": "creative",
        "tags": ["email", "marketing", "copywriting", "conversion"],
        "price_per_run": 12,
        "config": {"model": "gpt-4", "temperature": 0.75, "max_tokens": 2500, "timeout_seconds": 150, "required_inputs": [], "output_schema": {}},
        "capabilities": ["Email copywriting", "Subject line optimization", "A/B testing", "Conversion optimization"],
        "demo_available": True
    },
    
    # RESEARCH Category (4 agents)
    {
        "name": "Market Research Analyst",
        "description": "Conducts comprehensive market research with competitor analysis, trends, and opportunity identification",
        "long_description": "Analyzes market landscapes, identifies trends, and provides actionable insights for business strategy. Includes competitor benchmarking.",
        "category": "research",
        "tags": ["market research", "competitors", "trends", "strategy"],
        "price_per_run": 30,
        "config": {"model": "gpt-4", "temperature": 0.4, "max_tokens": 4000, "timeout_seconds": 240, "required_inputs": [], "output_schema": {}},
        "capabilities": ["Market analysis", "Competitor research", "Trend identification", "Strategic recommendations"],
        "demo_available": False
    },
    {
        "name": "Academic Literature Reviewer",
        "description": "Reviews academic papers and generates comprehensive literature reviews with citations and summaries",
        "long_description": "Perfect for researchers and students. Analyzes academic papers, extracts key findings, and creates structured literature reviews.",
        "category": "research",
        "tags": ["academic", "research", "papers", "citations"],
        "price_per_run": 22,
        "config": {"model": "gpt-4", "temperature": 0.3, "max_tokens": 5000, "timeout_seconds": 300, "required_inputs": [], "output_schema": {}},
        "capabilities": ["Paper analysis", "Literature review", "Citation management", "Key findings extraction"],
        "demo_available": True
    },
    {
        "name": "Patent Research Assistant",
        "description": "Searches and analyzes patents to identify prior art, innovation opportunities, and IP landscape",
        "long_description": "Helps inventors and companies navigate the patent landscape. Identifies existing patents, finds gaps, and suggests innovation opportunities.",
        "category": "research",
        "tags": ["patents", "IP", "innovation", "legal"],
        "price_per_run": 35,
        "config": {"model": "gpt-4", "temperature": 0.2, "max_tokens": 4500, "timeout_seconds": 280, "required_inputs": [], "output_schema": {}},
        "capabilities": ["Patent search", "Prior art analysis", "IP landscape mapping", "Innovation gap identification"],
        "demo_available": False
    },
    {
        "name": "Industry News Aggregator",
        "description": "Curates and summarizes latest industry news, trends, and developments from multiple sources",
        "long_description": "Keeps you updated with the latest in your industry. Aggregates news from multiple sources and provides concise, actionable summaries.",
        "category": "research",
        "tags": ["news", "trends", "industry", "updates"],
        "price_per_run": 8,
        "config": {"model": "gpt-4", "temperature": 0.5, "max_tokens": 3000, "timeout_seconds": 180, "required_inputs": [], "output_schema": {}},
        "capabilities": ["News aggregation", "Trend analysis", "Summary generation", "Source verification"],
        "demo_available": True
    },
    
    # ANALYSIS Category (4 agents)
    {
        "name": "Financial Statement Analyzer",
        "description": "Analyzes financial statements, calculates key ratios, and provides investment insights and recommendations",
        "long_description": "Expert in financial analysis. Evaluates balance sheets, income statements, and cash flows to provide investment recommendations.",
        "category": "analysis",
        "tags": ["finance", "investing", "analysis", "ratios"],
        "price_per_run": 28,
        "config": {"model": "gpt-4", "temperature": 0.2, "max_tokens": 4000, "timeout_seconds": 220, "required_inputs": [], "output_schema": {}},
        "capabilities": ["Financial analysis", "Ratio calculation", "Investment insights", "Risk assessment"],
        "demo_available": False
    },
    {
        "name": "Customer Sentiment Analyzer",
        "description": "Analyzes customer reviews and feedback to extract sentiment, themes, and actionable insights",
        "long_description": "Processes customer feedback at scale. Identifies sentiment trends, common themes, and provides recommendations for improvement.",
        "category": "analysis",
        "tags": ["sentiment", "reviews", "feedback", "NLP"],
        "price_per_run": 16,
        "config": {"model": "gpt-4", "temperature": 0.3, "max_tokens": 3500, "timeout_seconds": 200, "required_inputs": [], "output_schema": {}},
        "capabilities": ["Sentiment analysis", "Theme extraction", "Trend identification", "Actionable recommendations"],
        "demo_available": True
    },
    {
        "name": "SEO Performance Auditor",
        "description": "Audits website SEO performance, identifies issues, and provides optimization recommendations",
        "long_description": "Comprehensive SEO analysis tool. Evaluates on-page and technical SEO, identifies issues, and provides prioritized recommendations.",
        "category": "analysis",
        "tags": ["SEO", "website", "optimization", "audit"],
        "price_per_run": 20,
        "config": {"model": "gpt-4", "temperature": 0.4, "max_tokens": 4000, "timeout_seconds": 240, "required_inputs": [], "output_schema": {}},
        "capabilities": ["SEO audit", "Issue identification", "Optimization recommendations", "Competitor comparison"],
        "demo_available": True
    },
    {
        "name": "Sales Pipeline Optimizer",
        "description": "Analyzes sales pipeline data to identify bottlenecks, predict conversions, and optimize sales processes",
        "long_description": "Helps sales teams improve performance. Analyzes pipeline data, identifies bottlenecks, and provides data-driven recommendations.",
        "category": "analysis",
        "tags": ["sales", "pipeline", "optimization", "CRM"],
        "price_per_run": 24,
        "config": {"model": "gpt-4", "temperature": 0.3, "max_tokens": 3500, "timeout_seconds": 200, "required_inputs": [], "output_schema": {}},
        "capabilities": ["Pipeline analysis", "Bottleneck identification", "Conversion prediction", "Process optimization"],
        "demo_available": False
    },
    
    # AUTOMATION Category (2 agents)
    {
        "name": "Email Response Automator",
        "description": "Automatically drafts professional email responses based on context, tone, and previous conversations",
        "long_description": "Saves time on email management. Analyzes incoming emails and generates contextually appropriate responses in your writing style.",
        "category": "automation",
        "tags": ["email", "automation", "productivity", "communication"],
        "price_per_run": 6,
        "config": {"model": "gpt-4", "temperature": 0.6, "max_tokens": 1500, "timeout_seconds": 100, "required_inputs": [], "output_schema": {}},
        "capabilities": ["Email drafting", "Tone matching", "Context analysis", "Template generation"],
        "demo_available": True
    },
    {
        "name": "Meeting Notes Summarizer",
        "description": "Converts meeting transcripts into structured notes with action items, decisions, and key points",
        "long_description": "Never miss important meeting details. Processes transcripts and creates organized summaries with clear action items and deadlines.",
        "category": "automation",
        "tags": ["meetings", "notes", "productivity", "summarization"],
        "price_per_run": 10,
        "config": {"model": "gpt-4", "temperature": 0.4, "max_tokens": 2500, "timeout_seconds": 150, "required_inputs": [], "output_schema": {}},
        "capabilities": ["Transcript processing", "Action item extraction", "Summary generation", "Decision tracking"],
        "demo_available": True
    },
    
    # SUPPORT Category (2 agents)
    {
        "name": "Customer Support Bot",
        "description": "Provides instant customer support responses with FAQ answers, troubleshooting, and ticket routing",
        "long_description": "24/7 customer support automation. Handles common queries, provides troubleshooting steps, and escalates complex issues appropriately.",
        "category": "support",
        "tags": ["support", "customer service", "chatbot", "FAQ"],
        "price_per_run": 4,
        "config": {"model": "gpt-4", "temperature": 0.5, "max_tokens": 2000, "timeout_seconds": 120, "required_inputs": [], "output_schema": {}},
        "capabilities": ["FAQ responses", "Troubleshooting", "Ticket routing", "Sentiment detection"],
        "demo_available": True
    },
    {
        "name": "Technical Documentation Assistant",
        "description": "Helps users navigate technical documentation, explains complex concepts, and provides code examples",
        "long_description": "Makes technical documentation accessible. Explains complex concepts in simple terms and provides practical examples and use cases.",
        "category": "support",
        "tags": ["documentation", "technical", "education", "support"],
        "price_per_run": 7,
        "config": {"model": "gpt-4", "temperature": 0.4, "max_tokens": 3000, "timeout_seconds": 180, "required_inputs": [], "output_schema": {}},
        "capabilities": ["Concept explanation", "Code examples", "Use case generation", "Troubleshooting guidance"],
        "demo_available": True
    }
]

# Create all agents
created_count = 0
failed_count = 0

for i, agent_data in enumerate(agents, 1):
    try:
        response = requests.post(
            "http://localhost:8000/api/v1/agents",
            json=agent_data,
            headers=headers
        )
        if response.status_code == 201:
            created_count += 1
            print(f"✅ {i}/17: Created '{agent_data['name']}'")
        else:
            failed_count += 1
            print(f"❌ {i}/17: Failed to create '{agent_data['name']}' - {response.status_code}")
            print(f"   Error: {response.text[:100]}")
    except Exception as e:
        failed_count += 1
        print(f"❌ {i}/17: Error creating '{agent_data['name']}': {str(e)[:100]}")

# Verify total agents
total_response = requests.get("http://localhost:8000/api/v1/agents")
total = total_response.json()['total']

print(f"\n{'='*60}")
print(f"✅ Successfully created: {created_count}/17 agents")
if failed_count > 0:
    print(f"❌ Failed: {failed_count}/17 agents")
print(f"📊 Total agents in marketplace: {total}")
print(f"{'='*60}")
