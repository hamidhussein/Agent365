import { Agent, User } from '../../../types';

export type BackendAgent = {
    id: string;
    name: string;
    description: string;
    long_description?: string | null;
    category: string;
    tags: string[];
    price_per_run: number;
    rating: number;
    total_runs: number;
    total_reviews: number;
    status: string;
    is_public?: boolean;
    source?: string;
    config?: {
        model?: string;
        temperature?: number;
        max_tokens?: number;
        timeout_seconds?: number;
        required_inputs?: Array<Record<string, unknown>>;
        output_schema?: Record<string, unknown>;
    };
    capabilities?: string[];
    limitations?: string[];
    demo_available?: boolean;
    version: string;
    thumbnail_url?: string | null;
    allow_reviews?: boolean;
    review_cost?: number;
    creator_id: string;
    creator?: {
        id: string;
        username: string;
        full_name?: string;
        avatar_url?: string;
        bio?: string;
        email?: string;
    };
    created_at: string;
    updated_at: string;
};

const createPlaceholderCreator = (id: string): User => {
    const shortId = id?.slice(0, 6) ?? 'creator';
    return {
        id: id,
        email: '',
        role: 'user',
        name: `Creator ${shortId}`,
        username: id ?? shortId,
        full_name: `Creator ${shortId}`,
        avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${shortId}`,
        bio: 'Creator profile coming soon.',
        creditBalance: 0,
        favoriteAgentIds: [],
    };
};

export const mapBackendAgent = (agent: BackendAgent): Agent => {
    const placeholderImage = `https://placehold.co/600x400/111827/FFFFFF/png?text=${encodeURIComponent(agent.name?.[0] ?? 'A')}`;
    const successRate =
        agent.total_runs > 0
            ? Math.min(99, Math.max(70, Math.round((agent.rating ?? 0) * 18)))
            : 95;

    const statusMap: Record<string, Agent['status']> = {
        active: 'Live',
        inactive: 'Paused',
    };

    const inputSchema = (agent.config?.required_inputs || []).map((input: any) => ({
        id: input.name,
        name: input.name,
        label: input.description || input.name,
        type: input.type === 'string' ? 'text' : input.type,
        placeholder: input.description,
        required: input.required !== false,
        options: input.options?.map((opt: any) =>
            typeof opt === 'string'
                ? { value: opt, label: opt }
                : opt
        ),
    }));

    // Map backend creator to frontend User if available
    const creatorUser: User = agent.creator ? {
        id: agent.creator.id,
        email: agent.creator.email || '',
        username: agent.creator.username,
        full_name: agent.creator.full_name || agent.creator.username,
        name: agent.creator.full_name || agent.creator.username, // Frontend required field
        avatar_url: agent.creator.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(agent.creator.username)}`,
        bio: agent.creator.bio,
        role: 'user',
        creditBalance: 0,
        favoriteAgentIds: [],
    } : createPlaceholderCreator(agent.creator_id ?? agent.id);

    return {
        id: agent.id,
        name: agent.name,
        creator: creatorUser,
        description: agent.description,
        longDescription: agent.long_description ?? agent.description,
        category: agent.category ?? 'General',
        rating: agent.rating ?? 0,
        reviewCount: agent.total_reviews ?? 0,
        runs: agent.total_runs ?? 0,
        imageUrl: agent.thumbnail_url ?? placeholderImage,
        tags: Array.isArray(agent.tags) ? agent.tags : [],
        price: agent.price_per_run ?? 0,
        successRate,
        avgRunTime: agent.config?.timeout_seconds ?? 60,
        status: statusMap[agent.status] ?? 'Draft',
        source: agent.source || 'manual',
        isPublic: agent.is_public ?? false,
        inputSchema,
        allow_reviews: agent.allow_reviews ?? false,
        review_cost: agent.review_cost ?? 5,
        mockResult: 'Run results will appear here.',
        reviews: [],
    };
};
