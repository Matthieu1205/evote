import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';
import { AuditService } from '../common/audit.service';

export interface CandidateResult {
  userId: string;
  name: string;
  photoUrl?: string | null;
  votes: number;
  percent: number;
  elected: boolean;
}

export interface PositionResult {
  positionId: string;
  positionTitle: string;
  seats: number;
  totalVotes: number;
  candidates: CandidateResult[];
  needsRunoff: boolean;
}

export interface TallyResult {
  electionId: string;
  round: number;
  ballotsCount: number;
  eligibleCount: number;
  turnout: number;
  positions: PositionResult[];
  computedAt: string;
}

interface BallotChoices {
  choices: Record<string, string[]>;
}

@Injectable()
export class TallyService {
  constructor(
    private prisma: PrismaService,
    private crypto: CryptoService,
    private audit: AuditService,
  ) {}

  async computeTally(
    organizationId: string,
    electionId: string,
    round?: number,
  ): Promise<TallyResult> {
    const election = await this.prisma.election.findFirst({
      where: { id: electionId, organizationId },
      include: {
        positions: {
          orderBy: { order: 'asc' },
          include: {
            candidacies: {
              where: { status: 'VALIDEE' },
              include: { user: true },
            },
          },
        },
      },
    });
    if (!election)
      throw new NotFoundException(`Élection ${electionId} introuvable.`);

    const r = round ?? election.currentRound;

    const ballots = await this.prisma.ballot.findMany({
      where: { electionId, organizationId, round: r },
    });

    const eligibleCount = await this.prisma.user.count({
      where: {
        organizationId,
        isEligible: true,
        status: 'ACTIF',
        ...(election.eligibleSection
          ? { section: election.eligibleSection }
          : {}),
      },
    });

    // Initialise les compteurs
    const counters = new Map<string, Map<string, number>>();
    const positionVotes = new Map<string, number>();
    for (const pos of election.positions) {
      counters.set(pos.id, new Map());
      positionVotes.set(pos.id, 0);
    }

    for (const b of ballots) {
      let payload: BallotChoices;
      try {
        payload = this.crypto.decryptBallot<BallotChoices>({
          ciphertext: b.ciphertext,
          iv: b.iv,
          authTag: b.authTag,
        });
      } catch {
        continue; // bulletin corrompu, ignoré
      }
      for (const [positionId, choices] of Object.entries(
        payload.choices ?? {},
      )) {
        const cnt = counters.get(positionId);
        if (!cnt) continue;
        if (choices.length > 0) {
          positionVotes.set(
            positionId,
            (positionVotes.get(positionId) ?? 0) + 1,
          );
        }
        for (const candidacyId of choices) {
          cnt.set(candidacyId, (cnt.get(candidacyId) ?? 0) + 1);
        }
      }
    }

    const positions: PositionResult[] = election.positions.map((pos) => {
      const cnt = counters.get(pos.id)!;
      const totalVotes = positionVotes.get(pos.id) ?? 0;

      const candidates: CandidateResult[] = pos.candidacies
        .map((c) => {
          const votes = cnt.get(c.id) ?? 0;
          return {
            userId: c.userId,
            name: `${c.user.firstName} ${c.user.lastName}`,
            photoUrl: c.photoUrl,
            votes,
            percent: totalVotes > 0 ? (votes / totalVotes) * 100 : 0,
            elected: false,
          };
        })
        .sort((a, b) => b.votes - a.votes);

      let needsRunoff = false;
      for (let i = 0; i < Math.min(pos.seats, candidates.length); i++) {
        const c = candidates[i];
        if (election.majorityRule === 'ABSOLUE' && c.percent <= 50) {
          needsRunoff = true;
          break;
        }
        c.elected = true;
      }
      if (needsRunoff) {
        for (const c of candidates) c.elected = false;
      }

      return {
        positionId: pos.id,
        positionTitle: pos.title,
        seats: pos.seats,
        totalVotes,
        candidates,
        needsRunoff,
      };
    });

    return {
      electionId,
      round: r,
      ballotsCount: ballots.length,
      eligibleCount,
      turnout: eligibleCount > 0 ? (ballots.length / eligibleCount) * 100 : 0,
      positions,
      computedAt: new Date().toISOString(),
    };
  }

  /**
   * Effectuer le dépouillement officiel et passer l'élection à DEPOUILLE/PUBLIE.
   */
  async runTally(
    organizationId: string,
    electionId: string,
    publish: boolean,
    actorId: string,
  ): Promise<TallyResult> {
    const election = await this.prisma.election.findFirst({
      where: { id: electionId, organizationId },
    });
    if (!election)
      throw new NotFoundException(`Élection ${electionId} introuvable.`);
    if (!['CLOS', 'DEPOUILLE'].includes(election.status)) {
      throw new ForbiddenException(
        'Le dépouillement ne peut être effectué que sur une élection clôturée.',
      );
    }

    const result = await this.computeTally(organizationId, electionId);

    const newStatus = publish ? 'PUBLIE' : 'DEPOUILLE';
    await this.prisma.election.update({
      where: { id: electionId },
      data: { status: newStatus },
    });

    await this.audit.log({
      actorId,
      action: publish ? 'TALLY_PUBLISHED' : 'TALLY_COMPUTED',
      entity: 'Election',
      entityId: electionId,
      meta: {
        round: result.round,
        ballotsCount: result.ballotsCount,
        turnout: result.turnout,
      },
      organizationId,
    });

    return result;
  }

  /**
   * Récupérer les résultats d'une élection dépouillée.
   */
  async getResults(
    organizationId: string,
    electionId: string,
  ): Promise<TallyResult> {
    const election = await this.prisma.election.findFirst({
      where: { id: electionId, organizationId },
    });
    if (!election)
      throw new NotFoundException(`Élection ${electionId} introuvable.`);
    if (!['DEPOUILLE', 'PUBLIE'].includes(election.status)) {
      throw new ForbiddenException(
        'Les résultats ne sont pas encore disponibles.',
      );
    }
    return this.computeTally(organizationId, electionId);
  }
}
