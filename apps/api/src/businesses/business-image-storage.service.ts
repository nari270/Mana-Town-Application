import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const uploadLimit = 5 * 1024 * 1024;
const mimeExtensions = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

export type UploadedBusinessImage = {
  buffer: Buffer;
  mimetype: string;
};

@Injectable()
export class BusinessImageStorageService {
  private client?: S3Client;

  private configuration() {
    const bucket = process.env.S3_BUCKET;
    if (!bucket) {
      throw new ServiceUnavailableException(
        'Business image storage is not configured.',
      );
    }
    if (!this.client) {
      const accessKeyId = process.env.S3_ACCESS_KEY_ID;
      const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
      if (Boolean(accessKeyId) !== Boolean(secretAccessKey)) {
        throw new ServiceUnavailableException(
          'Business image storage credentials are incomplete.',
        );
      }
      this.client = new S3Client({
        region: process.env.S3_REGION || 'us-east-1',
        ...(process.env.S3_ENDPOINT
          ? { endpoint: process.env.S3_ENDPOINT }
          : {}),
        ...(accessKeyId && secretAccessKey
          ? { credentials: { accessKeyId, secretAccessKey } }
          : {}),
        forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
      });
    }
    return { bucket, client: this.client };
  }

  async upload(businessId: string, file: UploadedBusinessImage) {
    if (file.buffer.length === 0 || file.buffer.length > uploadLimit) {
      throw new BadRequestException(
        'Business photos must be no larger than 5 MB.',
      );
    }
    const extension = mimeExtensions.get(file.mimetype);
    if (!extension || !this.hasValidSignature(file.buffer, file.mimetype)) {
      throw new BadRequestException('Upload a valid JPEG, PNG or WebP image.');
    }

    const { bucket, client } = this.configuration();
    const objectKey = `businesses/${businessId}/${randomUUID()}.${extension}`;
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );
    return objectKey;
  }

  async delete(objectKey: string) {
    const { bucket, client } = this.configuration();
    await client.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }),
    );
  }

  async readUrl(objectKey: string) {
    const { bucket, client } = this.configuration();
    return getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: bucket, Key: objectKey }),
      { expiresIn: 3600 },
    );
  }

  private hasValidSignature(buffer: Buffer, contentType: string) {
    if (contentType === 'image/jpeg') {
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }
    if (contentType === 'image/png') {
      return buffer
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    }
    return (
      contentType === 'image/webp' &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    );
  }
}
