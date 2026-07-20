import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';
import { TallyService } from '../tally/tally.service';
import { ElectionsService } from './elections.service';

@Injectable()
export class ElectionsScheduler {
  private readonly logger = new Logger(ElectionsScheduler.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private tally: TallyService,
    private elections: ElectionsService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async autoTransitionStatuses() {
    const now = new Date();

    // PLANIFIE → OUVERT si startAt est dépassé
    const toOpen = await this.prisma.election.findMany({
      where: { status: 'PLANIFIE', startAt: { lte: now } },
    });

    for (const election of toOpen) {
      await this.prisma.election.update({
        where: { id: election.id },
        data: { status: 'OUVERT' },
      });
      await this.audit.log({
        action: 'ELECTION_STATUS_OUVERT',
        entity: 'Election',
        entityId: election.id,
        organizationId: election.organizationId,
        meta: { auto: true },
      });
      this.logger.log(`Scrutin "${election.title}" automatiquement ouvert.`);

      await this.elections.notifyVotersElectionOpen(
        election.organizationId,
        election.title,
      );
    }

    // OUVERT → CLOS si endAt est dépassé
    const toClose = await this.prisma.election.findMany({
      where: { status: 'OUVERT', endAt: { lte: now } },
    });

    for (const election of toClose) {
      await this.prisma.election.update({
        where: { id: election.id },
        data: { status: 'CLOS' },
      });
      await this.audit.log({
        action: 'ELECTION_STATUS_CLOS',
        entity: 'Election',
        entityId: election.id,
        organizationId: election.organizationId,
        meta: { auto: true },
      });
      this.logger.log(`Scrutin "${election.title}" automatiquement clôturé.`);
    }

    // CLOS → PUBLIE (dépouillement + publication) si resultsPublishAt est dépassé
    const toPublish = await this.prisma.election.findMany({
      where: { status: 'CLOS', resultsPublishAt: { lte: now } },
    });

    for (const election of toPublish) {
      try {
        await this.tally.runTally(election.organizationId, election.id, true);
        this.logger.log(
          `Scrutin "${election.title}" automatiquement dépouillé et publié.`,
        );
      } catch (e) {
        this.logger.error(
          `Échec du dépouillement automatique du scrutin "${election.title}"`,
          e instanceof Error ? e.stack : String(e),
        );
      }
    }

    if (toOpen.length + toClose.length + toPublish.length > 0) {
      this.logger.log(
        `Transitions auto : ${toOpen.length} ouverts, ${toClose.length} clôturés, ${toPublish.length} publiés.`,
      );
    }
  }
}
