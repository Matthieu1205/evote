import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export class CastVoteDto {
  @IsString()
  @IsNotEmpty()
  electionId: string;

  /**
   * choices : { [positionId]: [userId, ...] }
   * Chaque positionId mappe vers un tableau d'IDs de candidats choisis.
   */
  @IsObject()
  choices: Record<string, string[]>;

  /**
   * OTP de vote (cahier des charges §8 — authentification forte avant vote)
   */
  @IsString()
  @IsNotEmpty()
  otp: string;
}
