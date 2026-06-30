import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { VotesService } from './votes.service';
import { CastVoteDto } from './dto/cast-vote.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { SessionUser } from '../common/decorators/session-user.interface';
import { Throttle } from '@nestjs/throttler';

@Controller('votes')
export class VotesController {
  constructor(private votesService: VotesService) {}

  @Get('check/:electionId')
  hasVoted(
    @Param('electionId') electionId: string,
    @CurrentUser() user: SessionUser,
    @Query('round') round?: string,
  ) {
    return this.votesService.hasVoted(
      user.organizationId,
      electionId,
      user.userId,
      round ? parseInt(round) : undefined,
    );
  }

  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @Post('request-otp/:electionId')
  @HttpCode(HttpStatus.OK)
  requestVoteOtp(
    @Param('electionId') electionId: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.votesService.requestVoteOtp(
      user.organizationId,
      electionId,
      user.userId,
    );
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  castVote(
    @Body() dto: CastVoteDto,
    @CurrentUser() user: SessionUser,
    @Req() req: Request,
  ) {
    return this.votesService.castVote(
      user.organizationId,
      dto,
      user.userId,
      req.ip,
    );
  }
}
