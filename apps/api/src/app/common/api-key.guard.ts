import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

import { API_ENV, type ApiEnvironment } from '../config/env';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, @Inject(API_ENV) private readonly env: ApiEnvironment) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const candidate = request.header('x-api-key');
    if (!candidate || !this.env.apiKeys.some((key) => this.matches(candidate, key))) {
      throw new UnauthorizedException('Invalid or missing API key');
    }
    return true;
  }

  private matches(candidate: string, expected: string) {
    const left = Buffer.from(candidate);
    const right = Buffer.from(expected);
    return left.length === right.length && timingSafeEqual(left, right);
  }
}
