
import { Agent, Category, LLMModel, Tool, Review, User, Transaction, CreditPackage } from './types';

export const mockUser: User = {
    name: 'Demo User',
    creditBalance: 250,
    favoriteAgentIds: new Set(['AG-217', 'AG-073']),
};

export const mockTransactions: Transaction[] = [
    { id: 'txn_1', date: '2024-07-20', description: 'Credit Package Purchase (500 + 50 Bonus)', type: 'purchase', amount: 550, status: 'Completed' },
    { id: 'txn_2', date: '2024-07-19', description: 'Run: Logo Design Assistant', type: 'spend', amount: -30, status: 'Completed' },
    { id: 'txn_3', date: '2024-07-19', description: 'Run: Market Research Analyst', type: 'spend', amount: -25, status: 'Completed' },
    { id: 'txn_4', date: '2024-07-18', description: 'Run: Content Proofer', type: 'spend', amount: -5, status: 'Completed' },
    { id: 'txn_5', date: '2024-07-15', description: 'Credit Package Purchase (100)', type: 'purchase', amount: 100, status: 'Completed' },
];

export const creditPackages: CreditPackage[] = [
    { id: 'pkg_1', credits: 500, price: 5, bonus: 10, isBestValue: false },
    { id: 'pkg_2', credits: 1200, price: 10, bonus: 20, isBestValue: true },
    { id: 'pkg_3', credits: 3000, price: 20, bonus: 25, isBestValue: false },
    { id: 'pkg_4', credits: 10000, price: 50, bonus: 30, isBestValue: false },
];

export const categories: Category[] = ['Writing', 'Business', 'Development', 'Creative', 'Data', 'Productivity', 'Fun', 'Analysis', 'Editing', 'Tools'];

export const mockCreatorStats = {
    totalAgents: 8,
    totalRuns: 78300,
    totalEarnings: 4520, // in USD
    avgRating: 4.8
};

export const mockLLMModels: LLMModel[] = [
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'google' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'google' },
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai' },
    { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'anthropic' },
    { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'anthropic' },
];

export const mockTools: { id: Tool, name: string, description: string }[] = [
    { id: 'web_search', name: 'Web Search', description: 'Allows the agent to search the web for real-time information.' },
    { id: 'calculator', name: 'Calculator', description: 'Enables the agent to perform mathematical calculations.' },
];

const generateMockReviews = (count: number, baseRating: number): Review[] => {
    const reviews: Review[] = [];
    const firstNames = ['Alex', 'Jordan', 'Taylor', 'Casey', 'Riley', 'Jamie'];
    const lastInitials = ['S', 'M', 'K', 'P', 'L', 'W'];
    for (let i = 0; i < count; i++) {
        reviews.push({
            id: `rev_${Math.random().toString(36).substr(2, 9)}`,
            user: {
                name: `${firstNames[i % firstNames.length]} ${lastInitials[i % lastInitials.length]}.`,
                avatarUrl: `https://placehold.co/32x32/1F2937/FFFFFF/png?text=${firstNames[i % firstNames.length][0]}`,
            },
            rating: Math.max(1, Math.min(5, Math.round(baseRating + (Math.random() - 0.5)))),
            comment: `This is a great agent! It really helped me with my task. ${'Highly recommended. '.repeat(Math.floor(Math.random() * 3))}`,
            date: `${i + 1} week${i > 0 ? 's' : ''} ago`,
        });
    }
    return reviews;
};


export const mockAgents: Agent[] = [
  {
    id: 'AG-217',
    name: 'Content Proofer',
    creator: { 
        name: 'TextCortex', 
        username: 'textcortex',
        avatarUrl: 'https://placehold.co/32x32/7C3AED/FFFFFF/png?text=T',
        bio: 'TextCortex is a leading provider of AI-powered writing assistants, helping thousands of professionals improve their content.'
    },
    description: 'A meticulous AI agent that proofreads your content for grammar, spelling, and style.',
    longDescription: 'Content Proofer goes beyond basic spell-checking. It analyzes sentence structure, tone of voice, and clarity to provide actionable suggestions. Ideal for students, professionals, and content creators who need polished, error-free text. Supports multiple languages and document formats.',
    rating: 4.9,
    reviewCount: 120,
    runs: 2500,
    imageUrl: 'https://placehold.co/400x250/7C3AED/FFFFFF?text=Proof+Agent',
    tags: ['Writing', 'Editing', 'Productivity'],
    price: 5,
    successRate: 99.8,
    avgRunTime: 15,
    status: 'Live',
    inputSchema: [
        {
            id: 'content_1',
            name: 'content_to_proof',
            label: 'Content to Proofread',
            type: 'textarea',
            placeholder: 'Paste your text here...',
            required: true,
        }
    ],
    mockResult: JSON.stringify({
        corrected_text: "This is the corrected version of the text you provided. All grammar, spelling, and style errors have been fixed.",
        summary_of_changes: [
            "Fixed 5 spelling mistakes.",
            "Corrected 3 grammatical errors.",
            "Improved sentence structure for clarity."
        ]
    }, null, 2),
    reviews: generateMockReviews(3, 4.9),
  },
  {
    id: 'AG-115',
    name: 'Market Research Analyst',
    creator: { 
        name: 'Synthesia', 
        username: 'synthesia',
        avatarUrl: 'https://placehold.co/32x32/4F46E5/FFFFFF/png?text=S',
        bio: 'Synthesia is building the future of AI-driven data analysis tools.'
    },
    description: 'Gathers and analyzes market data to provide actionable insights and reports.',
    longDescription: 'Leveraging real-time data from multiple sources, this agent compiles comprehensive market analysis reports. It identifies trends, competitor strategies, and customer sentiment, providing you with a strategic advantage. The final output is a structured report with charts and key takeaways.',
    rating: 4.8,
    reviewCount: 95,
    runs: 18000,
    imageUrl: 'https://placehold.co/400x250/4F46E5/FFFFFF?text=Research+AI',
    tags: ['Business', 'Data', 'Analysis'],
    price: 25,
    successRate: 97.5,
    avgRunTime: 180,
    status: 'Live',
    inputSchema: [
        {
            id: 'topic_1',
            name: 'research_topic',
            label: 'Research Topic',
            type: 'text',
            placeholder: 'e.g., "Future of AI in healthcare"',
            required: true,
        },
        {
            id: 'industry_1',
            name: 'industry',
            label: 'Industry',
            type: 'select',
            required: true,
            options: [
                { value: 'healthcare', label: 'Healthcare' },
                { value: 'finance', label: 'Finance' },
                { value: 'technology', label: 'Technology' },
                { value: 'retail', label: 'Retail' },
            ]
        }
    ],
    mockResult: JSON.stringify({
        market_size: "$150 Billion by 2030",
        key_trends: ["Personalized medicine", "AI-driven diagnostics", "Telehealth adoption"],
        top_competitors: ["Competitor A", "Competitor B", "Competitor C"],
        conclusion: "The market for AI in healthcare is poised for significant growth, driven by technological advancements and increasing demand for efficient healthcare solutions."
    }, null, 2),
    reviews: generateMockReviews(4, 4.8),
  },
  {
    id: 'AG-099',
    name: 'Creative Story Generator',
    creator: { 
        name: 'Jasper', 
        username: 'jasper',
        avatarUrl: 'https://placehold.co/32x32/F59E0B/FFFFFF/png?text=J',
        bio: 'Jasper is at the forefront of generative AI for creative content.'
    },
    description: 'Generates unique and engaging story plots, characters, and dialogues.',
    longDescription: 'Unleash your creativity with this powerful story generator. Provide a simple prompt, and the agent will craft detailed character backstories, intricate plot twists, and compelling dialogue. Perfect for writers, game developers, and anyone looking for inspiration.',
    rating: 4.7,
    reviewCount: 250,
    runs: 10000,
    imageUrl: 'https://placehold.co/400x250/F59E0B/FFFFFF?text=Story+Bot',
    tags: ['Creative', 'Writing', 'Fun'],
    price: 10,
    successRate: 98.0,
    avgRunTime: 45,
    status: 'Live',
    inputSchema: [
      {
        id: 'prompt_1',
        name: 'story_prompt',
        label: 'Story Prompt',
        type: 'textarea',
        placeholder: 'A detective who can talk to ghosts...',
        required: true,
      },
      {
        id: 'genre_1',
        name: 'genre',
        label: 'Genre',
        type: 'select',
        required: true,
        options: [
            { value: 'fantasy', label: 'Fantasy' },
            { value: 'sci-fi', label: 'Sci-Fi' },
            { value: 'mystery', label: 'Mystery' },
            { value: 'horror', label: 'Horror' },
        ]
      }
    ],
    mockResult: JSON.stringify({
        title: "The Whispering Specter",
        logline: "In the rain-slicked streets of Neo-Veridia, a cynical detective who communicates with the dead must solve the murder of a tech mogul, whose ghost is the only witness.",
        character: {
            name: "Detective Kaelen 'Kae' Reed",
            description: "Haunted by the ghost of his former partner, Kae is a gruff, tech-noir detective who trusts the dead more than the living."
        }
    }, null, 2),
    reviews: generateMockReviews(2, 4.7),
  },
  {
    id: 'AG-224',
    name: 'Code Debugger',
    creator: { 
        name: 'Replit', 
        username: 'replit',
        avatarUrl: 'https://placehold.co/32x32/10B981/FFFFFF/png?text=R',
        bio: 'Replit is making programming more accessible with powerful cloud tools.'
    },
    description: 'Analyzes your code, identifies bugs, and suggests fixes to streamline development.',
    longDescription: 'Feed your code snippets to this intelligent debugger. It supports Python, JavaScript, and Java, identifying logical errors, syntax issues, and potential performance bottlenecks. It provides clear explanations and suggested fixes, saving you hours of frustration.',
    rating: 4.9,
    reviewCount: 310,
    runs: 15000,
    imageUrl: 'https://placehold.co/400x250/10B981/FFFFFF?text=Code+Fixer',
    tags: ['Development', 'Code', 'Tools'],
    price: 15,
    successRate: 99.1,
    avgRunTime: 25,
    status: 'Live',
    inputSchema: [
      {
        id: 'code_1',
        name: 'code_snippet',
        label: 'Code Snippet',
        type: 'textarea',
        placeholder: 'Paste your code here...',
        required: true,
      },
      {
        id: 'language_1',
        name: 'language',
        label: 'Programming Language',
        type: 'select',
        required: true,
        options: [
            { value: 'python', label: 'Python' },
            { value: 'javascript', label: 'JavaScript' },
            { value: 'java', label: 'Java' },
            { value: 'csharp', label: 'C#' },
        ]
      }
    ],
    mockResult: JSON.stringify({
        analysis: "An 'IndexError' was found on line 42.",
        explanation: "The loop iterates one time too many, attempting to access an index that is out of the list's bounds.",
        suggested_fix: "Change 'for i in range(len(my_list) + 1):' to 'for i in range(len(my_list)):'.",
    }, null, 2),
    reviews: [],
  },
  {
    id: 'AG-101',
    name: 'SQL Query Builder',
    creator: { 
        name: 'PlanetScale', 
        username: 'planetscale',
        avatarUrl: 'https://placehold.co/32x32/3B82F6/FFFFFF/png?text=P',
        bio: 'PlanetScale offers a serverless database platform for developers.'
    },
    description: 'Translates natural language into complex SQL queries for your database.',
    longDescription: 'Simply describe the data you need in plain English, and this agent will generate optimized SQL queries for PostgreSQL, MySQL, and SQL Server. It handles complex joins, aggregations, and subqueries, making database interaction accessible to everyone on your team.',
    rating: 4.8,
    reviewCount: 180,
    runs: 9500,
    imageUrl: 'https://placehold.co/400x250/3B82F6/FFFFFF?text=SQL+Gen',
    tags: ['Development', 'Data', 'Tools'],
    price: 20,
    successRate: 98.5,
    avgRunTime: 10,
    status: 'Paused',
    inputSchema: [
      {
        id: 'nl_query_1',
        name: 'natural_language_query',
        label: 'Describe the data you need',
        type: 'textarea',
        placeholder: 'e.g., "Show me the top 5 customers by total sales in the last quarter"',
        required: true,
      }
    ],
    mockResult: "SELECT\n  c.customer_name,\n  SUM(o.total_amount) AS total_sales\nFROM\n  customers c\nJOIN\n  orders o ON c.customer_id = o.customer_id\nWHERE\n  o.order_date >= DATE('now', '-3 months')\nGROUP BY\n  c.customer_name\nORDER BY\n  total_sales DESC\nLIMIT 5;",
    reviews: generateMockReviews(1, 4.8),
  },
  {
    id: 'AG-150',
    name: 'Social Media Post Scheduler',
    creator: { 
        name: 'Buffer', 
        username: 'buffer',
        avatarUrl: 'https://placehold.co/32x32/EC4899/FFFFFF/png?text=B',
        bio: 'Buffer helps businesses build their brand and connect with customers on social media.'
    },
    description: 'Automates content scheduling across Twitter, LinkedIn, and Instagram.',
    longDescription: 'This agent not only schedules your posts but also suggests optimal posting times based on your audience engagement. It can generate relevant hashtags and even suggest content ideas based on trending topics in your industry. A must-have for social media managers.',
    rating: 4.6,
    reviewCount: 75,
    runs: 5000,
    imageUrl: 'https://placehold.co/400x250/EC4899/FFFFFF?text=Social+AI',
    tags: ['Business', 'Productivity'],
    price: 12,
    successRate: 99.9,
    avgRunTime: 5,
    status: 'Live',
    inputSchema: [],
    mockResult: "This agent requires integration with your social media accounts. Please proceed to the next step to authenticate.",
    reviews: [],
  },
  {
    id: 'AG-073',
    name: 'Logo Design Assistant',
    creator: { 
        name: 'Midjourney', 
        username: 'midjourney',
        avatarUrl: 'https://placehold.co/32x32/F97316/FFFFFF/png?text=M',
        bio: 'Midjourney is an independent research lab exploring new mediums of thought.'
    },
    description: 'Generates professional logo concepts based on your brand description.',
    longDescription: 'Describe your company and its values, and this AI will generate a variety of unique, professional logo concepts. You can specify styles, colors, and imagery to guide the creative process. Get dozens of ideas in minutes, not weeks.',
    rating: 4.9,
    reviewCount: 450,
    runs: 22000,
    imageUrl: 'https://placehold.co/400x250/F97316/FFFFFF?text=Logo+Maker',
    tags: ['Creative', 'Business'],
    price: 30,
    successRate: 95.0,
    avgRunTime: 90,
    status: 'Live',
    inputSchema: [
      {
        id: 'company_name_1',
        name: 'company_name',
        label: 'Company Name',
        type: 'text',
        placeholder: 'e.g., "Aperture Labs"',
        required: true,
      },
       {
        id: 'style_1',
        name: 'style',
        label: 'Logo Style',
        type: 'select',
        required: true,
        options: [
            { value: 'minimalist', label: 'Minimalist' },
            { value: 'corporate', label: 'Corporate' },
            { value: 'playful', label: 'Playful' },
            { value: 'vintage', label: 'Vintage' },
        ]
      }
    ],
    mockResult: "Image generation is not supported in this demo. Here are some concepts: [Concept 1: A clean, geometric aperture icon], [Concept 2: A playful wordmark with a science-themed twist].",
    reviews: generateMockReviews(5, 4.9),
  },
    {
    id: 'AG-044',
    name: 'Personalized Workout Planner',
    creator: { 
        name: 'Strava', 
        username: 'strava',
        avatarUrl: 'https://placehold.co/32x32/EF4444/FFFFFF/png?text=S',
        bio: 'Strava is the leading social platform for athletes.'
    },
    description: 'Creates custom weekly fitness plans tailored to your goals and abilities.',
    longDescription: 'Input your fitness goals, available equipment, and time commitment, and this agent will design a balanced and effective weekly workout plan. It includes detailed exercise instructions and can adjust the plan based on your progress and feedback.',
    rating: 4.7,
    reviewCount: 155,
    runs: 8000,
    imageUrl: 'https://placehold.co/400x250/EF4444/FFFFFF?text=Fitness+Bot',
    tags: ['Fun', 'Productivity'],
    price: 8,
    successRate: 99.5,
    avgRunTime: 20,
    status: 'Draft',
    inputSchema: [
       {
        id: 'goal_1',
        name: 'fitness_goal',
        label: 'Primary Fitness Goal',
        type: 'select',
        required: true,
        options: [
            { value: 'build_muscle', label: 'Build Muscle' },
            { value: 'lose_weight', label: 'Lose Weight' },
            { value: 'improve_endurance', label: 'Improve Endurance' },
        ]
      },
       {
        id: 'days_1',
        name: 'days_per_week',
        label: 'Days per week',
        type: 'number',
        placeholder: 'e.g., 3',
        required: true,
      }
    ],
    mockResult: JSON.stringify({
        monday: "Upper Body Strength (Push)",
        tuesday: "Rest",
        wednesday: "Lower Body Strength",
        thursday: "Rest",
        friday: "Upper Body Strength (Pull)",
        saturday: "Cardio / Active Recovery",
        sunday: "Rest"
    }, null, 2),
    reviews: [],
  },
  {
    id: 'AG-183',
    name: 'Financial Report Summarizer',
    creator: { 
        name: 'TextCortex', 
        username: 'textcortex',
        avatarUrl: 'https://placehold.co/32x32/7C3AED/FFFFFF/png?text=T',
        bio: 'TextCortex is a leading provider of AI-powered writing assistants, helping thousands of professionals improve their content.'
    },
    description: 'Digests long financial documents into concise, easy-to-understand summaries.',
    longDescription: 'This agent can process quarterly earnings reports, shareholder letters, and other dense financial documents. It extracts key metrics, identifies major trends, and provides a bulleted summary of the most important information, making it easy to stay informed.',
    rating: 4.9,
    reviewCount: 210,
    runs: 11000,
    imageUrl: 'https://placehold.co/400x250/8B5CF6/FFFFFF?text=Finance+AI',
    tags: ['Business', 'Analysis'],
    price: 28,
    successRate: 98.2,
    avgRunTime: 120,
    status: 'Live',
    inputSchema: [
      {
        id: 'report_1',
        name: 'financial_report_text',
        label: 'Financial Report Text',
        type: 'textarea',
        placeholder: 'Paste the full text of the financial report here...',
        required: true,
      }
    ],
    mockResult: JSON.stringify({
        key_metrics: {
            revenue: "$1.2B (+15% YoY)",
            net_income: "$150M (+22% YoY)",
            eps: "$1.25",
        },
        summary: "The company reported strong year-over-year growth in both revenue and net income, exceeding analyst expectations. Growth was primarily driven by strong performance in the cloud division."
    }, null, 2),
    reviews: [],
  },
  {
    id: 'AG-230',
    name: 'Travel Itinerary Crafter',
    creator: { 
        name: 'Synthesia', 
        username: 'synthesia',
        avatarUrl: 'https://placehold.co/32x32/4F46E5/FFFFFF/png?text=S',
        bio: 'Synthesia is building the future of AI-driven data analysis tools.'
    },
    description: 'Builds detailed, day-by-day travel plans with bookings and recommendations.',
    longDescription: 'Plan your next trip effortlessly. Specify your destination, budget, and interests, and this agent will create a complete itinerary, including suggestions for flights, accommodations, activities, and dining. It even creates a logical route to minimize travel time between locations.',
    rating: 4.8,
    reviewCount: 190,
    runs: 9200,
    imageUrl: 'https://placehold.co/400x250/06B6D4/FFFFFF?text=Travel+Bot',
    tags: ['Fun', 'Productivity'],
    price: 18,
    successRate: 97.8,
    avgRunTime: 60,
    status: 'Live',
    inputSchema: [],
    mockResult: "This agent is highly complex and a mock result cannot be generated. Please try the full version.",
    reviews: [],
  },
  {
    id: 'AG-128',
    name: 'API Documentation Writer',
    creator: { 
        name: 'PlanetScale', 
        username: 'planetscale',
        avatarUrl: 'https://placehold.co/32x32/3B82F6/FFFFFF/png?text=P',
        bio: 'PlanetScale offers a serverless database platform for developers.'
    },
    description: 'Automatically generates clear and comprehensive API docs from your code.',
    longDescription: 'Save countless hours of manual documentation work. This agent analyzes your API codebase (supporting OpenAPI/Swagger specs) and generates user-friendly documentation with endpoint descriptions, parameter details, and code examples in multiple languages.',
    rating: 4.9,
    reviewCount: 350,
    runs: 17500,
    imageUrl: 'https://placehold.co/400x250/F59E0B/FFFFFF?text=API+Docs',
    tags: ['Development', 'Writing', 'Tools'],
    price: 22,
    successRate: 99.3,
    avgRunTime: 75,
    status: 'Live',
    inputSchema: [],
    mockResult: "This agent requires a file upload. This feature is not available in the demo.",
    reviews: [],
  },
  {
    id: 'AG-169',
    name: 'Meeting Minute Taker',
    creator: { 
        name: 'Replit', 
        username: 'replit',
        avatarUrl: 'https://placehold.co/32x32/10B981/FFFFFF/png?text=R',
        bio: 'Replit is making programming more accessible with powerful cloud tools.'
    },
    description: 'Transcribes meetings in real-time and provides summaries with action items.',
    longDescription: 'Provide an audio or video recording of a meeting, and this agent will deliver a full transcription, identify different speakers, and generate a concise summary highlighting key decisions and action items. It integrates seamlessly with Zoom and Google Meet.',
    rating: 4.7,
    reviewCount: 130,
    runs: 6500,
    imageUrl: 'https://placehold.co/400x250/14B8A6/FFFFFF?text=Meeting+AI',
    tags: ['Business', 'Productivity', 'Editing'],
    price: 15,
    successRate: 98.8,
    avgRunTime: 300,
    status: 'Draft',
    inputSchema: [],
    mockResult: "This agent requires a file upload. This feature is not available in the demo.",
    reviews: [],
  }
];
