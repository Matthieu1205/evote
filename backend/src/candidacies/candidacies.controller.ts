import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { CandidaciesService } from './candidacies.service';
import { CreateCandidacyDto } from './dto/create-candidacy.dto';
import { ReviewCandidacyDto } from './dto/review-candidacy.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { SessionUser } from '../common/decorators/session-user.interface';
import { CandidacyStatus, Role } from '@prisma/client';

@Controller('candidacies')
export class CandidaciesController {
  constructor(private candidaciesService: CandidaciesService) {}

  @Get()
  findAll(
    @CurrentUser() currentUser: SessionUser,
    @Query('positionId') positionId?: string,
    @Query('electionId') electionId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    // ELECTEUR et CANDIDAT ne voient que leurs propres candidatures
    const restrictToUser = ['ELECTEUR', 'CANDIDAT'].includes(currentUser.role)
      ? currentUser.userId
      : undefined;

    return this.candidaciesService.findAll({
      positionId,
      electionId,
      status: status as CandidacyStatus | undefined,
      userId: restrictToUser,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.candidaciesService.findOne(id);
  }

  @Roles(Role.ELECTEUR, Role.CANDIDAT, Role.COMMISSION, Role.ADMIN)
  @Post()
  create(@Body() dto: CreateCandidacyDto, @CurrentUser() user: SessionUser) {
    return this.candidaciesService.create(dto, user.userId);
  }

  @Roles(Role.COMMISSION, Role.ADMIN)
  @Put(':id/validate')
  validate(
    @Param('id') id: string,
    @Body() dto: ReviewCandidacyDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.candidaciesService.validate(id, dto, user.userId);
  }

  @Roles(Role.COMMISSION, Role.ADMIN)
  @Put(':id/reject')
  reject(
    @Param('id') id: string,
    @Body() dto: ReviewCandidacyDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.candidaciesService.reject(id, dto, user.userId);
  }

  @Put(':id/withdraw')
  withdraw(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.candidaciesService.withdraw(id, user.userId);
  }
}
