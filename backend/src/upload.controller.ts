import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { mkdirSync, existsSync } from 'fs';

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { diskStorage } = require('multer');
/* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

const ALLOWED = /^(image\/(jpeg|png|webp)|video\/(mp4|webm|quicktime))$/;
const MAX_VIDEO = 80 * 1024 * 1024;
const MAX_PHOTO = 5 * 1024 * 1024;

interface MulterFile {
  originalname: string;
  mimetype: string;
  size: number;
  filename?: string;
  // multer-storage-cloudinary stores the URL in `path`
  path?: string;
  // Cloudinary raw response fields (may or may not be present depending on version)
  secure_url?: string;
  public_id?: string;
}

type FilenameCb = (err: Error | null, filename: string) => void;
type FilterCb = (err: Error | null, accept: boolean) => void;

const useCloudinary = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

// Configure Cloudinary si les variables sont présentes
if (useCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Stockage Cloudinary
// eslint-disable-next-line @typescript-eslint/no-unsafe-call
const cloudinaryStorage = useCloudinary
  ? new CloudinaryStorage({
      cloudinary,
      params: (req: unknown, file: MulterFile) => ({
        folder: 'evote',
        resource_type: file.mimetype.startsWith('video/') ? 'video' : 'image',
        public_id: randomUUID(),
      }),
    })
  : null;

// Stockage disque local (fallback dev)
const UPLOAD_DIR = join(process.cwd(), 'uploads');
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

// eslint-disable-next-line @typescript-eslint/no-unsafe-call
const localStorage = diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req: unknown, file: MulterFile, cb: FilenameCb) => {
    const ext = extname(file.originalname).toLowerCase() || '.bin';
    cb(null, `${randomUUID()}${ext}`);
  },
});

@Controller('upload')
export class UploadController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: useCloudinary ? cloudinaryStorage : localStorage,
      limits: { fileSize: MAX_VIDEO },
      fileFilter: (_req: unknown, file: MulterFile, cb: FilterCb) => {
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

    // multer-storage-cloudinary stocke l'URL dans file.path (et parfois secure_url)
    if (useCloudinary) {
      const cloudUrl = file.secure_url ?? file.path;
      if (cloudUrl) return { url: cloudUrl };
    }

    // Fallback : URL locale via proxy Vercel
    const base = process.env.FRONTEND_URL ?? 'http://localhost:3001';
    return { url: `${base}/uploads/${file.filename}` };
  }
}
