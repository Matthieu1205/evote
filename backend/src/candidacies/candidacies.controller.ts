import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { CandidaciesService } from './candidacies.service';
import { CreateCandidacyDto } from './dto/create-candidacy.dto';
import { ReviewCandidacyDto } from './dto/review-candidacy.dto';
import { CreateConditionDto, UpdateConditionDto } from './dto/create-condition.dto';
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

    return this.candidaciesService.findAll(currentUser.organizationId, {
      positionId,
      electionId,
      status: status as CandidacyStatus | undefined,
      userId: restrictToUser,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  // ─── Conditions (avant :id pour éviter le conflit de route) ─────────────

  @Get('conditions')
  getConditions(@CurrentUser() user: SessionUser) {
    return this.candidaciesService.getConditions(user.organizationId);
  }

  @Roles(Role.ADMIN)
  @Post('conditions')
  createCondition(@Body() dto: CreateConditionDto, @CurrentUser() user: SessionUser) {
    return this.candidaciesService.createCondition(user.organizationId, dto);
  }

  @Roles(Role.ADMIN)
  @Put('conditions/:id')
  updateCondition(
    @Param('id') id: string,
    @Body() dto: UpdateConditionDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.candidaciesService.updateCondition(user.organizationId, id, dto);
  }

  @Roles(Role.ADMIN)
  @Delete('conditions/:id')
  deleteCondition(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.candidaciesService.deleteCondition(user.organizationId, id);
  }

  // ─── Candidatures ─────────────────────────────────────────────────────────

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.candidaciesService.findOne(user.organizationId, id);
  }

  @Roles(Role.ELECTEUR, Role.CANDIDAT, Role.COMMISSION, Role.ADMIN)
  @Post()
  create(@Body() dto: CreateCandidacyDto, @CurrentUser() user: SessionUser) {
    return this.candidaciesService.create(
      user.organizationId,
      dto,
      user.userId,
    );
  }

  @Roles(Role.COMMISSION, Role.ADMIN)
  @Put(':id/validate')
  validate(
    @Param('id') id: string,
    @Body() dto: ReviewCandidacyDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.candidaciesService.validate(
      user.organizationId,
      id,
      dto,
      user.userId,
    );
  }

  @Roles(Role.COMMISSION, Role.ADMIN)
  @Put(':id/reject')
  reject(
    @Param('id') id: string,
    @Body() dto: ReviewCandidacyDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.candidaciesService.reject(
      user.organizationId,
      id,
      dto,
      user.userId,
    );
  }

  @Put(':id/withdraw')
  withdraw(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.candidaciesService.withdraw(
      user.organizationId,
      id,
      user.userId,
    );
  }
}
