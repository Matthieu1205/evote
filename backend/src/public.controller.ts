import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';

@Controller('public')
export class PublicController {
  /**
   * Contenu marketing générique de la page d'accueil — la plateforme étant
   * multi-tenant, aucune donnée propre à une organisation n'est exposée ici.
   */
  @Public()
  @Get('home')
  getHomeData() {
    return {
      tagline:
        'La plateforme de vote électronique sécurisée pour les organisations professionnelles.',
    };
  }
}
