import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TallyService } from './tally.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { SessionUser } from '../common/decorators/session-user.interface';
import { Role } from '@prisma/client';

@Controller('elections')
export class TallyController {
  constructor(private tallyService: TallyService) {}

  @Roles(Role.COMMISSION, Role.ADMIN)
  @Post(':id/tally')
  @HttpCode(HttpStatus.OK)
  runTally(
    @Param('id') id: string,
    @Body('publish') publish: boolean,
    @CurrentUser() user: SessionUser,
  ) {
    return this.tallyService.runTally(
      user.organizationId,
      id,
      publish ?? false,
      user.userId,
    );
  }

  // Résultats officiels : accessibles à tout membre authentifié, mais le
  // service filtre selon le statut et le rôle (un électeur ne voit que les
  // résultats PUBLIÉS ; la commission/l'admin/l'observateur peuvent consulter
  // dès le DÉPOUILLEMENT).
  @Get(':id/results')
  getResults(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.tallyService.getResults(
      user.organizationId,
      id,
      user.role as Role,
    );
  }

  // Résultats en temps réel (monitoring pendant/après le scrutin) : réservés
  // strictement aux rôles de surveillance. NE JAMAIS exposer à un électeur —
  // fuite du dépouillement pendant que le vote est ouvert (effet bandwagon).
  @Roles(Role.COMMISSION, Role.ADMIN, Role.OBSERVATEUR)
  @Get(':id/live-results')
  getLiveResults(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.tallyService.computeTally(user.organizationId, id);
  }
}
