import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS } from './redis.constants';

export interface LimitResult {
  allowed: boolean;
  retryAfter: number;
}

@Injectable()
export class RateLimiter {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async hit(key: string, limit: number, windowSeconds: number): Promise<LimitResult> {
    const [[, count], [, ttl]] = (await this.redis
      .multi()
      .incr(`rl:${key}`)
      .ttl(`rl:${key}`)
      .exec()) as [[null, number], [null, number]];
    if (ttl < 0) await this.redis.expire(`rl:${key}`, windowSeconds);
    return { allowed: count <= limit, retryAfter: ttl < 0 ? windowSeconds : ttl };
  }

  async consume(key: string, limit: number, windowSeconds: number, message: (retryAfter: number) => string) {
    const result = await this.hit(key, limit, windowSeconds);
    if (!result.allowed) throw tooManyRequests(message(result.retryAfter), result.retryAfter);
  }

  async cooldown(key: string, seconds: number, message: (retryAfter: number) => string) {
    const ok = await this.redis.set(`cd:${key}`, '1', 'EX', seconds, 'NX');
    if (!ok) {
      const ttl = await this.redis.ttl(`cd:${key}`);
      throw tooManyRequests(message(Math.max(ttl, 1)), Math.max(ttl, 1));
    }
  }

  async count(key: string): Promise<{ count: number; ttl: number }> {
    const [count, ttl] = await Promise.all([this.redis.get(`rl:${key}`), this.redis.ttl(`rl:${key}`)]);
    return { count: Number(count ?? 0), ttl };
  }

  async reset(key: string) {
    await this.redis.del(`rl:${key}`);
  }
}

export function tooManyRequests(message: string, retryAfter: number) {
  return new HttpException({ statusCode: 429, message, retryAfter }, HttpStatus.TOO_MANY_REQUESTS);
}
