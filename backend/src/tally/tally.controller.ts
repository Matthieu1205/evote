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
    return this.tallyService.runTally(id, publish ?? false, user.userId);
  }

  @Get(':id/results')
  getResults(@Param('id') id: string) {
    return this.tallyService.getResults(id);
  }

  @Get(':id/live-results')
  getLiveResults(@Param('id') id: string) {
    return this.tallyService.computeTally(id);
  }
}
