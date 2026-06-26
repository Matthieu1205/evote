import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';
import { PrismaService } from './prisma/prisma.service';

@Controller('public')
export class PublicController {
  constructor(private prisma: PrismaService) {}

  @Public()
  @Get('home')
  async getHomeData() {
    const [candidacies, memberCount, election] = await Promise.all([
      this.prisma.candidacy.findMany({
        where: {
          status: 'VALIDEE',
          position: {
            election: {
              status: {
                in: ['PLANIFIE', 'OUVERT', 'CLOS', 'DEPOUILLE', 'PUBLIE'],
              },
            },
          },
        },
        include: {
          user: { select: { firstName: true, lastName: true } },
          position: { select: { title: true } },
        },
        take: 12,
        orderBy: { submittedAt: 'desc' },
      }),
      this.prisma.user.count({ where: { role: 'ELECTEUR', status: 'ACTIF' } }),
      this.prisma.election.findFirst({
        where: { status: { in: ['PLANIFIE', 'OUVERT'] } },
        orderBy: { startAt: 'asc' },
        select: { title: true, startAt: true, endAt: true, status: true },
      }),
    ]);

    return {
      candidates: candidacies.map((c) => ({
        id: c.id,
        name: `${c.user.firstName} ${c.user.lastName}`,
        position: c.position.title,
        photoUrl: c.photoUrl,
        biography: c.biography,
        program: c.program,
      })),
      memberCount,
      election: election
        ? {
            title: election.title,
            startAt: election.startAt.toISOString(),
            endAt: election.endAt.toISOString(),
            status: election.status,
          }
        : null,
    };
  }
}
