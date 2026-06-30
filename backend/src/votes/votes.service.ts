import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';
import { OtpService } from '../common/otp.service';
import { AuditService } from '../common/audit.service';
import { CastVoteDto } from './dto/cast-vote.dto';

@Injectable()
export class VotesService {
  constructor(
    private prisma: PrismaService,
    private crypto: CryptoService,
    private otp: OtpService,
    private audit: AuditService,
  ) {}

  /**
   * Vérifier si un électeur a déjà voté pour un scrutin/tour donné.
   */
  async hasVoted(
    organizationId: string,
    electionId: string,
    userId: string,
    round?: number,
  ): Promise<{ hasVoted: boolean; round: number }> {
    const election = await this.prisma.election.findFirst({
      where: { id: electionId, organizationId },
    });
    if (!election)
      throw new NotFoundException(`Élection ${electionId} introuvable.`);

    const r = round ?? election.currentRound;
    const record = await this.prisma.voteRecord.findUnique({
      where: {
        electionId_userId_round: { electionId, userId, round: r },
      },
    });

    return { hasVoted: !!record, round: r };
  }

  /**
   * POST /votes — Voter.
   * Chiffre le bulletin en AES-256-GCM, enregistre l'émargement séparément.
   */
  async castVote(
    organizationId: string,
    dto: CastVoteDto,
    userId: string,
    ip?: string,
  ): Promise<{ message: string }> {
    // 1. Charger et vérifier l'élection
    const election = await this.prisma.election.findFirst({
      where: { id: dto.electionId, organizationId },
      include: { positions: true },
    });
    if (!election) throw new NotFoundException('Élection introuvable.');
    if (election.status !== 'OUVERT') {
      throw new ForbiddenException("Cette élection n'est pas ouverte au vote.");
    }

    // 2. Vérifier l'éligibilité de l'électeur
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId },
    });
    if (!user || !user.isEligible || user.status !== 'ACTIF') {
      throw new ForbiddenException("Vous n'êtes pas éligible à voter.");
    }
    if (election.eligibleSection && user.section !== election.eligibleSection) {
      throw new ForbiddenException(
        "Vous n'êtes pas dans la section éligible pour ce scrutin.",
      );
    }

    // 3. Vérifier anti-double vote
    const round = election.currentRound;
    const alreadyVoted = await this.prisma.voteRecord.findUnique({
      where: {
        electionId_userId_round: { electionId: dto.electionId, userId, round },
      },
    });
    if (alreadyVoted) {
      throw new ConflictException('Vous avez déjà voté pour ce scrutin.');
    }

    // 4. Vérifier l'OTP de vote
    const validOtp = await this.otp.verifyOtp(
      userId,
      'VOTE',
      dto.otp,
      dto.electionId,
    );
    if (!validOtp) {
      await this.audit.log({
        actorId: userId,
        action: 'VOTE_OTP_FAILED',
        entity: 'Election',
        entityId: dto.electionId,
        ip,
        organizationId,
      });
      throw new ForbiddenException('Code OTP de vote invalide ou expiré.');
    }

    // 5. Valider les choix (positions valides, pas plus de sièges)
    for (const [positionId, choices] of Object.entries(dto.choices)) {
      const position = election.positions.find((p) => p.id === positionId);
      if (!position) {
        throw new ForbiddenException(
          `Poste ${positionId} invalide pour cette élection.`,
        );
      }
      if (choices.length > position.seats) {
        throw new ForbiddenException(
          `Trop de choix pour le poste "${position.title}" (max ${position.seats}).`,
        );
      }
    }

    // 6. Chiffrer et enregistrer le bulletin (sans lien vers l'électeur)
    const payload = { choices: dto.choices };
    const encrypted = this.crypto.encryptBallot(payload);

    // 7. Transaction : bulletin + émargement
    await this.prisma.$transaction([
      this.prisma.ballot.create({
        data: {
          electionId: dto.electionId,
          organizationId,
          round,
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          authTag: encrypted.authTag,
        },
      }),
      this.prisma.voteRecord.create({
        data: { electionId: dto.electionId, organizationId, userId, round },
      }),
    ]);

    await this.audit.log({
      actorId: userId,
      action: 'VOTE_CAST',
      entity: 'Election',
      entityId: dto.electionId,
      meta: { round },
      ip,
      organizationId,
    });

    return { message: 'Vote enregistré avec succès.' };
  }

  /**
   * Demander un OTP avant de voter.
   */
  async requestVoteOtp(
    organizationId: string,
    electionId: string,
    userId: string,
  ): Promise<{ message: string }> {
    const election = await this.prisma.election.findFirst({
      where: { id: electionId, organizationId },
    });
    if (!election) throw new NotFoundException('Élection introuvable.');
    if (election.status !== 'OUVERT') {
      throw new ForbiddenException("Cette élection n'est pas ouverte au vote.");
    }

    await this.otp.issueOtp(userId, 'VOTE', electionId);
    return { message: 'Code OTP de vote envoyé.' };
  }
}
