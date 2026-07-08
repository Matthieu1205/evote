import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { PublicController } from './public.controller';
import { UploadController } from './upload.controller';
import { CryptoModule } from './crypto/crypto.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ElectionsModule } from './elections/elections.module';
import { CandidaciesModule } from './candidacies/candidacies.module';
import { VotesModule } from './votes/votes.module';
import { TallyModule } from './tally/tally.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AuditLogModule } from './audit/audit-log.module';
import { OrganizationsModule } from './organizations/organizations.module';

@Module({
  controllers: [PublicController, UploadController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  imports: [
    // Configuration (.env)
    ConfigModule.forRoot({ isGlobal: true }),

    // Rate limiting — désactivé en développement local
    ThrottlerModule.forRoot([{
      name: 'default',
      ttl: 60_000,
      limit: process.env.NODE_ENV === 'development' ? 1000 : 60,
      skipIf: () => process.env.NODE_ENV === 'development',
    }]),

    // Infrastructure (globaux)
    PrismaModule,
    CryptoModule,
    CommonModule,

    // Domaines métier
    AuthModule,
    UsersModule,
    ElectionsModule,
    CandidaciesModule,
    VotesModule,
    TallyModule,
    DashboardModule,
    AuditLogModule,
    OrganizationsModule,
  ],
})
export class AppModule {}
