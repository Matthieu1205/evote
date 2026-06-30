import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { SessionUser } from '../common/decorators/session-user.interface';
import { Role, MemberStatus } from '@prisma/client';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Roles(Role.ADMIN, Role.COMMISSION, Role.OBSERVATEUR)
  @Get()
  findAll(
    @CurrentUser() user: SessionUser,
    @Query('role') role?: Role,
    @Query('status') status?: MemberStatus,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.usersService.findAll(user.organizationId, {
      role,
      status,
      search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Roles(Role.ADMIN)
  @Get('export')
  async exportCsv(@Res() res: Response, @CurrentUser() user: SessionUser) {
    const csv = await this.usersService.exportCsv(user.organizationId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="membres-evote-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    res.send('﻿' + csv);
  }

  @Roles(Role.ADMIN, Role.COMMISSION)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.usersService.findOne(user.organizationId, id);
  }

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateUserDto, @CurrentUser() user: SessionUser) {
    return this.usersService.create(user.organizationId, dto, user.userId);
  }

  @Roles(Role.ADMIN)
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.usersService.update(
      user.organizationId,
      id,
      dto,
      user.userId,
    );
  }

  @Roles(Role.ADMIN)
  @Post(':id/reset-password')
  resetPassword(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.usersService.resetPassword(
      user.organizationId,
      id,
      user.userId,
    );
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.usersService.remove(user.organizationId, id, user.userId);
  }
}
