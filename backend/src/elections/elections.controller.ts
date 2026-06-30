import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ElectionsService } from './elections.service';
import { CreateElectionDto } from './dto/create-election.dto';
import { UpdateElectionDto } from './dto/update-election.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { SessionUser } from '../common/decorators/session-user.interface';
import { Role, ElectionStatus } from '@prisma/client';

@Controller('elections')
export class ElectionsController {
  constructor(private electionsService: ElectionsService) {}

  @Get()
  findAll(
    @CurrentUser() user: SessionUser,
    @Query('status') status?: ElectionStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.electionsService.findAll(user.organizationId, {
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.electionsService.findOne(user.organizationId, id);
  }

  @Roles(Role.ADMIN, Role.COMMISSION)
  @Post()
  create(@Body() dto: CreateElectionDto, @CurrentUser() user: SessionUser) {
    return this.electionsService.create(
      user.organizationId,
      dto,
      user.userId,
    );
  }

  @Roles(Role.ADMIN, Role.COMMISSION)
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateElectionDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.electionsService.update(
      user.organizationId,
      id,
      dto,
      user.userId,
    );
  }

  @Roles(Role.ADMIN, Role.COMMISSION)
  @Put(':id/status')
  changeStatus(
    @Param('id') id: string,
    @Body('status') status: ElectionStatus,
    @CurrentUser() user: SessionUser,
  ) {
    return this.electionsService.changeStatus(
      user.organizationId,
      id,
      status,
      user.userId,
    );
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.electionsService.remove(user.organizationId, id, user.userId);
  }
}
