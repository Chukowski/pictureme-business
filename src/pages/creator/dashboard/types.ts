import { PublicCreation } from "@/services/contentApi";
import { User } from "@/services/eventsApi";

export type RemixMode = 'full' | 'video' | 'prompt';

export type FeedCreation = PublicCreation & {
    url?: string;
    model_id?: string;
    previewUrl?: string;
    is_hero?: boolean;
};

export type CreatorHomeState = 'idle' | 'active' | 'exploring' | 'out_of_tokens';

export interface UserCreation {
    id: number;
    url: string;
    thumbnail_url?: string;
    type: string;
    prompt?: string;
    model?: string;
    model_id?: string;
    aspect_ratio?: string;
    created_at: string;
    is_published?: boolean;
    visibility?: string;
}

export interface UserMetadata {
    last_prompt?: string;
    last_model?: string;
    last_mode?: 'image' | 'video';
    last_creation_id?: number;
}
