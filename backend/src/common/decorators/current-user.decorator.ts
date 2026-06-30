import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { SessionUser } from './session-user.interface';

export type { SessionUser };

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SessionUser => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return {
      userId: request.session.userId ?? '',
      role: request.session.role ?? '',
      ordreNumber: request.session.ordreNumber ?? '',
      organizationId: request.session.organizationId ?? '',
    };
  },
);
