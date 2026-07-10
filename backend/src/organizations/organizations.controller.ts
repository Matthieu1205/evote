import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { CreateOrgAdminDto } from './dto/create-org-admin.dto';
import { RegisterOrganizationDto } from './dto/register-organization.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { SessionUser } from '../common/decorators/session-user.interface';
import { Role } from '@prisma/client';

@Controller('organizations')
export class OrganizationsController {
  constructor(private organizationsService: OrganizationsService) {}

  @Public()
  @Get('lookup')
  lookup(@Query('slug') slug: string) {
    return this.organizationsService.lookup(slug);
  }

  @Public()
  @Post('register')
  register(@Body() dto: RegisterOrganizationDto) {
    return this.organizationsService.register(dto);
  }

  @Roles(Role.SUPER_ADMIN)
  @Get()
  findAll() {
    return this.organizationsService.findAll();
  }

  @Roles(Role.SUPER_ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.organizationsService.findOne(id);
  }

  @Roles(Role.SUPER_ADMIN)
  @Post()
  create(@Body() dto: CreateOrganizationDto, @CurrentUser() user: SessionUser) {
    return this.organizationsService.create(dto, user.userId);
  }

  @Roles(Role.ADMIN)
  @Put('me')
  updateOwn(@Body() dto: UpdateOrganizationDto, @CurrentUser() user: SessionUser) {
    return this.organizationsService.updateOwn(
      user.organizationId,
      dto,
      user.userId,
    );
  }

  @Roles(Role.SUPER_ADMIN)
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.organizationsService.update(id, dto, user.userId);
  }

  @Roles(Role.SUPER_ADMIN)
  @Post(':id/admins')
  createAdmin(
    @Param('id') id: string,
    @Body() dto: CreateOrgAdminDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.organizationsService.createAdmin(id, dto, user.userId);
  }
}
