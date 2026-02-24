// lib/redis.ts
import { Redis } from "@upstash/redis";

export const redis = Redis.fromEnv();
// Automatically uses KV_REST_API_URL + KV_REST_API_TOKEN from your env
