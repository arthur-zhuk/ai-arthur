import { createChatHandler } from "@/lib/chat/server";
import { createRateLimiter } from "@/lib/chat/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;
// Limits are per visitor and site-wide. Set UPSTASH_REDIS_REST_URL/TOKEN to share them across instances.
export const POST = createChatHandler({ rateLimiter: createRateLimiter() });
