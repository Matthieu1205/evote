import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { mkdirSync, existsSync } from 'fs';

const UPLOAD_DIR = join(process.cwd(), 'uploads');
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = /^(image\/(jpeg|png|webp)|video\/(mp4|webm|quicktime))$/;
const MAX_VIDEO = 80 * 1024 * 1024;
const MAX_PHOTO = 5 * 1024 * 1024;

interface MulterFile {
  originalname: string;
  mimetype: string;
  size: number;
  filename: string;
}

type FilenameCb = (err: Error | null, filename: string) => void;
type FilterCb = (err: Error | null, accept: boolean) => void;

@Controller('upload')
export class UploadController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file: MulterFile, cb: FilenameCb) => {
          const ext = extname(file.originalname).toLowerCase() || '.bin';
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: MAX_VIDEO },
      fileFilter: (_req, file: MulterFile, cb: FilterCb) => {
        if (!ALLOWED.test(file.mimetype)) {
          cb(
            new BadRequestException(
              'Format non supporté. Utilisez JPG, PNG, WEBP, MP4 ou WEBM.',
            ),
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  upload(@UploadedFile() file: MulterFile) {
    if (!file) throw new BadRequestException('Aucun fichier reçu.');

    if (file.mimetype.startsWith('image/') && file.size > MAX_PHOTO) {
      throw new BadRequestException('Photo trop grande (max 5 Mo).');
    }

    const base = process.env.BACKEND_URL ?? 'http://localhost:3001';
    return { url: `${base}/uploads/${file.filename}` };
  }
}
