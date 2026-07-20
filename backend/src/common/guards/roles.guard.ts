import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '@prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const userRole = request.session.role as Role | undefined;

    if (!userRole || !requiredRoles.includes(userRole)) {
      throw new ForbiddenException(
        'Vous ne disposez pas des droits nécessaires pour cette action.',
      );
    }

    // Défense en profondeur : un rôle SUPER_ADMIN n'est légitime que pour un
    // compte de l'organisation plateforme. Empêche une session SUPER_ADMIN
    // obtenue de façon anormale (bug ailleurs, session corrompue) sur un
    // tenant classique d'accéder aux routes réservées à la plateforme.
    if (userRole === Role.SUPER_ADMIN && !request.session.isPlatform) {
      throw new ForbiddenException(
        'Vous ne disposez pas des droits nécessaires pour cette action.',
      );
    }
    return true;
  }
}
