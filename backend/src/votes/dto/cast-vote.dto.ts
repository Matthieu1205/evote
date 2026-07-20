import {
  IsNotEmpty,
  IsObject,
  IsString,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';

const MAX_POSITIONS = 50;
const MAX_CHOICES_PER_POSITION = 50;
const MAX_ID_LENGTH = 100;

function isValidChoicesMap(value: unknown): boolean {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > MAX_POSITIONS) return false;

  for (const [positionId, choices] of entries) {
    if (typeof positionId !== 'string' || !positionId) return false;
    if (!Array.isArray(choices)) return false;
    if (choices.length > MAX_CHOICES_PER_POSITION) return false;
    for (const candidacyId of choices) {
      if (
        typeof candidacyId !== 'string' ||
        !candidacyId ||
        candidacyId.length > MAX_ID_LENGTH
      ) {
        return false;
      }
    }
  }
  return true;
}

function IsChoicesMap(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isChoicesMap',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate: isValidChoicesMap,
        defaultMessage: () =>
          'choices doit être un objet { positionId: candidacyId[] } valide.',
      },
    });
  };
}

export class CastVoteDto {
  @IsString()
  @IsNotEmpty()
  electionId: string;

  /**
   * choices : { [positionId]: [candidacyId, ...] }
   * Chaque positionId mappe vers un tableau d'IDs de candidatures choisies.
   */
  @IsObject()
  @IsChoicesMap()
  choices: Record<string, string[]>;

  /**
   * OTP de vote (cahier des charges §8 — authentification forte avant vote)
   */
  @IsString()
  @IsNotEmpty()
  otp: string;
}
