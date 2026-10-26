import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { fileTypeFromBuffer } from 'file-type';
import { randomUUID } from 'node:crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from './config.js';
import { authenticate, requirePermission, limit } from './middleware.js';
import { AppError, db, audit } from './lib.js';
export const uploads = Router();
const s3 = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  forcePathStyle: true,
  credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
});
uploads.post(
  '/',
  authenticate,
  requirePermission('product:create'),
  limit('upload', 10),
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  }).single('image'),
  async (req, res) => {
    if (!req.file) throw new AppError(400, 'FILE', 'Select an image');
    const type = await fileTypeFromBuffer(req.file.buffer);
    if (!type || !['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(type.mime))
      throw new AppError(400, 'FILE_TYPE', 'Only JPEG, PNG, WebP and AVIF are allowed');
    const id = randomUUID();
    const images = await Promise.all(
      [480, 960, 1600].map(async (width) => {
        const buffer = await sharp(req.file!.buffer, { limitInputPixels: 25000000 })
          .rotate()
          .resize({ width, withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer();
        const key = `products/${id}-${width}.webp`;
        const command = new PutObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: key,
          Body: buffer,
          ContentType: 'image/webp',
          CacheControl: 'public,max-age=31536000,immutable',
        });
        const signed = await getSignedUrl(s3, command, { expiresIn: 60 });
        const result = await fetch(signed, {
          method: 'PUT',
          body: new Uint8Array(buffer),
          headers: { 'Content-Type': 'image/webp' },
        });
        if (!result.ok) throw new AppError(503, 'STORAGE', 'Image storage is unavailable');
        return { width, url: `${env.S3_PUBLIC_URL}/${key}` };
      }),
    );
    await db.$transaction((tx) => audit(tx, req, 'product', 'upload', id, undefined, { images }));
    res.status(201).json({ data: { url: images[2].url, images } });
  },
);
