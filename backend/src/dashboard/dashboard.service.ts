import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TallyService } from '../tally/tally.service';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private tally: TallyService,
  ) {}

  /**
   * GET /api/dashboard/stats
   * Statistiques générales de la plateforme.
   */
  async getStats(organizationId: string) {
    const [
      totalMembers,
      activeMembers,
      eligibleMembers,
      totalElections,
      openElections,
      totalCandidacies,
      pendingCandidacies,
      totalVotes,
    ] = await Promise.all([
      this.prisma.user.count({ where: { organizationId } }),
      this.prisma.user.count({
        where: { organizationId, status: 'ACTIF' },
      }),
      this.prisma.user.count({
        where: { organizationId, isEligible: true, status: 'ACTIF' },
      }),
      this.prisma.election.count({ where: { organizationId } }),
      this.prisma.election.count({
        where: { organizationId, status: 'OUVERT' },
      }),
      this.prisma.candidacy.count({ where: { organizationId } }),
      this.prisma.candidacy.count({
        where: { organizationId, status: 'SOUMISE' },
      }),
      this.prisma.voteRecord.count({ where: { organizationId } }),
    ]);

    return {
      members: {
        total: totalMembers,
        active: activeMembers,
        eligible: eligibleMembers,
      },
      elections: { total: totalElections, open: openElections },
      candidacies: { total: totalCandidacies, pending: pendingCandidacies },
      votes: { total: totalVotes },
    };
  }

  /**
   * GET /api/dashboard/charts
   * Données pour les graphiques du tableau de bord.
   */
  async getCharts(organizationId: string) {
    // Membres par rôle
    const membersByRole = await this.prisma.user.groupBy({
      by: ['role'],
      where: { organizationId },
      _count: { id: true },
    });

    // Membres par statut
    const membersByStatus = await this.prisma.user.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: { id: true },
    });

    // Élections par statut
    const electionsByStatus = await this.prisma.election.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: { id: true },
    });

    // Candidatures par statut
    const candidaciesByStatus = await this.prisma.candidacy.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: { id: true },
    });

    const now = new Date();

    // Votes des 24 dernières heures (par heure)
    const h24Ago = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const votesH24 = await this.prisma.voteRecord.findMany({
      where: { organizationId, votedAt: { gte: h24Ago } },
      select: { votedAt: true },
    });
    const byHourMap: Record<string, number> = {};
    for (const v of votesH24) {
      const key = v.votedAt.toISOString().slice(0, 13); // "2024-01-15T14"
      byHourMap[key] = (byHourMap[key] ?? 0) + 1;
    }
    const votesByHour = Object.entries(byHourMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([hour, count]) => ({ hour, count }));

    // Votes des 7 derniers jours (par jour)
    const d7Ago = new Date(now);
    d7Ago.setDate(d7Ago.getDate() - 7);
    const votes7d = await this.prisma.voteRecord.findMany({
      where: { organizationId, votedAt: { gte: d7Ago } },
      select: { votedAt: true },
      orderBy: { votedAt: 'asc' },
    });
    const byDayMap: Record<string, number> = {};
    for (const v of votes7d) {
      const day = v.votedAt.toISOString().slice(0, 10);
      byDayMap[day] = (byDayMap[day] ?? 0) + 1;
    }

    return {
      membersByRole: membersByRole.map((r) => ({
        role: r.role,
        count: r._count.id,
      })),
      membersByStatus: membersByStatus.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
      electionsByStatus: electionsByStatus.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
      candidaciesByStatus: candidaciesByStatus.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
      votesByHour,
      votesByDay: Object.entries(byDayMap).map(([date, count]) => ({
        date,
        count,
      })),
    };
  }

  /**
   * GET /api/dashboard/live-scores
   * Scores en direct pour les élections ouvertes (OUVERT ou DEPOUILLE).
   */
  async getLiveScores(organizationId: string) {
    const openElections = await this.prisma.election.findMany({
      where: {
        organizationId,
        status: { in: ['OUVERT', 'DEPOUILLE', 'PUBLIE'] },
      },
      select: { id: true, title: true, status: true, currentRound: true },
    });

    const scores = await Promise.all(
      openElections.map(async (election) => {
        try {
          // Calcul des scores sans déchiffrement complet (juste les tendances)
          const voteCount = await this.prisma.voteRecord.count({
            where: {
              organizationId,
              electionId: election.id,
              round: election.currentRound,
            },
          });
          const eligibleCount = await this.prisma.user.count({
            where: { organizationId, isEligible: true, status: 'ACTIF' },
          });

          return {
            electionId: election.id,
            title: election.title,
            status: election.status,
            round: election.currentRound,
            voteCount,
            eligibleCount,
            turnout: eligibleCount > 0 ? (voteCount / eligibleCount) * 100 : 0,
          };
        } catch {
          return null;
        }
      }),
    );

    return scores.filter(Boolean);
  }

  /**
   * GET /api/dashboard/recent-activity
   * Activité récente (derniers logs d'audit).
   */
  async getRecentActivity(organizationId: string, limit = 10) {
    return this.prisma.auditLog.findMany({
      where: { organizationId },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: { firstName: true, lastName: true, ordreNumber: true },
        },
      },
    });
  }
}
