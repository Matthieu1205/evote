import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as crypto from 'crypto';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();

    // Accepter un token Bearer (fallback quand le proxy Vercel supprime Set-Cookie).
    const authHeader = request.headers['authorization'] as string | undefined;
    if (authHeader?.startsWith('Bearer ')) {
      const payload = this.verifyToken(authHeader.slice(7));
      if (payload) {
        request.session.userId = payload.userId as string;
        request.session.role = payload.role as string;
        request.session.ordreNumber = payload.ordreNumber as string;
        request.session.organizationId = payload.organizationId as string;
        return true;
      }
    }

    if (!request.session.userId || !request.session.organizationId) {
      throw new UnauthorizedException('Session expirée ou non authentifié.');
    }
    return true;
  }

  private verifyToken(token: string): Record<string, unknown> | null {
    const secret = process.env.SESSION_SECRET || 'evote-secret-change-me';
    const dot = token.indexOf('.');
    if (dot === -1) return null;
    const data = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url');
    try {
      const bufSig = Buffer.from(sig, 'base64url');
      const bufExp = Buffer.from(expected, 'base64url');
      if (bufSig.length !== bufExp.length) return null;
      if (!crypto.timingSafeEqual(bufSig, bufExp)) return null;
      const parsed = JSON.parse(Buffer.from(data, 'base64url').toString()) as Record<string, unknown>;
      if (typeof parsed.exp === 'number' && Date.now() > parsed.exp) return null;
      return parsed;
    } catch {
      return null;
    }
  }
}
