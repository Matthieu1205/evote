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
    @Query('status') status?: ElectionStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.electionsService.findAll({
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.electionsService.findOne(id);
  }

  @Roles(Role.ADMIN, Role.COMMISSION)
  @Post()
  create(@Body() dto: CreateElectionDto, @CurrentUser() user: SessionUser) {
    return this.electionsService.create(dto, user.userId);
  }

  @Roles(Role.ADMIN, Role.COMMISSION)
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateElectionDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.electionsService.update(id, dto, user.userId);
  }

  @Roles(Role.ADMIN, Role.COMMISSION)
  @Put(':id/status')
  changeStatus(
    @Param('id') id: string,
    @Body('status') status: ElectionStatus,
    @CurrentUser() user: SessionUser,
  ) {
    return this.electionsService.changeStatus(id, status, user.userId);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.electionsService.remove(id, user.userId);
  }
}
