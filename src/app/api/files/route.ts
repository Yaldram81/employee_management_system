/**
 * File Upload API — Handles file uploads for requests, complaints, leaves, etc.
 * 
 * POST /api/files — Upload a file (multipart/form-data)
 * GET  /api/files — List files for an entity or serve a specific file
 * DELETE /api/files — Delete a file
 * 
 * Files are stored locally in the `uploads/` directory with metadata in the database.
 */

import { db } from '@/lib/db';
import { withMiddleware } from '@/lib/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, unlink, readFile } from 'fs/promises';
import { join, extname } from 'path';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = join(process.cwd(), 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.txt', '.csv', '.json',
  '.zip', '.rar', '.7z',
];

interface FileRecord {
  id: string;
  entityType: string;
  entityId: string;
  category: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
}

async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
  const entityTypes = ['request', 'complaint', 'leave', 'task', 'profile', 'investment', 'onboarding'];
  for (const type of entityTypes) {
    const dir = join(UPLOAD_DIR, type);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }
}

/** POST /api/files — Upload a file */
export async function POST(request: NextRequest) {
  return withMiddleware(request, {
    requireAuth: true,
    rateLimit: { windowMs: 60000, maxRequests: 30 },
  }, async (user) => {
    try {
      await ensureUploadDir();

      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const entityType = formData.get('entityType') as string;
      const entityId = formData.get('entityId') as string;
      const category = (formData.get('category') as string) || 'general';

      if (!file) {
        return NextResponse.json({ status: 'error', message: 'No file provided' }, { status: 400 });
      }
      if (!entityType || !entityId) {
        return NextResponse.json({ status: 'error', message: 'entityType and entityId are required' }, { status: 400 });
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { status: 'error', message: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
          { status: 400 }
        );
      }

      const ext = extname(file.name).toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return NextResponse.json(
          { status: 'error', message: `File type not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` },
          { status: 400 }
        );
      }

      const fileId = randomUUID();
      const storedName = `${fileId}${ext}`;
      const entityDir = join(UPLOAD_DIR, entityType);
      const filePath = join(entityDir, storedName);

      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);

      const fileUrl = `/api/files?entityType=${entityType}&entityId=${entityId}&fileId=${fileId}`;

      const fileRecord: FileRecord = {
        id: fileId, entityType, entityId, category,
        originalName: file.name, storedName,
        mimeType: file.type || 'application/octet-stream',
        size: file.size, url: fileUrl,
        uploadedBy: user!.userId,
        uploadedAt: new Date().toISOString(),
      };

      // Store metadata in SystemSetting
      const recordKey = `files:${entityType}:${entityId}`;
      const existing = await db.systemSetting.findUnique({ where: { key: recordKey } });
      const records: FileRecord[] = existing ? JSON.parse(existing.value) : [];
      records.push(fileRecord);

      if (existing) {
        await db.systemSetting.update({ where: { key: recordKey }, data: { value: JSON.stringify(records) } });
      } else {
        await db.systemSetting.create({ data: { key: recordKey, value: JSON.stringify(records) } });
      }

      // Update parent entity attachment URLs
      if (entityType === 'request') {
        const req = await db.request.findUnique({ where: { id: entityId } });
        if (req) {
          const urls = req.attachmentUrls ? JSON.parse(req.attachmentUrls) : [];
          urls.push(fileUrl);
          await db.request.update({ where: { id: entityId }, data: { attachmentUrls: JSON.stringify(urls) } });
        }
      } else if (entityType === 'complaint') {
        const complaint = await db.complaint.findUnique({ where: { id: entityId } });
        if (complaint) {
          const urls = complaint.attachmentUrls ? JSON.parse(complaint.attachmentUrls) : [];
          urls.push(fileUrl);
          await db.complaint.update({ where: { id: entityId }, data: { attachmentUrls: JSON.stringify(urls) } });
        }
      }

      return NextResponse.json({
        status: 'success',
        data: {
          id: fileId, originalName: file.name, size: file.size,
          mimeType: file.type, url: fileUrl, category,
        },
      });
    } catch (error) {
      console.error('File upload error:', error);
      return NextResponse.json({ status: 'error', message: 'File upload failed' }, { status: 500 });
    }
  });
}

/** GET /api/files — List files or serve a specific file */
export async function GET(request: NextRequest) {
  return withMiddleware(request, {
    requireAuth: true,
    rateLimit: { windowMs: 60000, maxRequests: 120 },
  }, async (_user) => {
    try {
      const { searchParams } = request.nextUrl;
      const entityType = searchParams.get('entityType');
      const entityId = searchParams.get('entityId');
      const fileId = searchParams.get('fileId');

      // Serve a specific file
      if (fileId && entityType) {
        const recordKey = `files:${entityType}:${entityId}`;
        const existing = await db.systemSetting.findUnique({ where: { key: recordKey } });
        if (!existing) {
          return NextResponse.json({ status: 'error', message: 'File not found' }, { status: 404 });
        }

        const records: FileRecord[] = JSON.parse(existing.value);
        const record = records.find((r) => r.id === fileId);
        if (!record) {
          return NextResponse.json({ status: 'error', message: 'File not found' }, { status: 404 });
        }

        const filePath = join(UPLOAD_DIR, entityType, record.storedName);
        if (!existsSync(filePath)) {
          return NextResponse.json({ status: 'error', message: 'File not found on disk' }, { status: 404 });
        }

        const fileBuffer = await readFile(filePath);
        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': record.mimeType,
            'Content-Disposition': `inline; filename="${record.originalName}"`,
            'Cache-Control': 'public, max-age=86400',
          },
        });
      }

      // List files for an entity
      if (entityType && entityId) {
        const recordKey = `files:${entityType}:${entityId}`;
        const existing = await db.systemSetting.findUnique({ where: { key: recordKey } });
        const records: FileRecord[] = existing ? JSON.parse(existing.value) : [];

        return NextResponse.json({
          status: 'success',
          data: records.map((r) => ({
            id: r.id, originalName: r.originalName, size: r.size,
            mimeType: r.mimeType, url: r.url, category: r.category,
            uploadedBy: r.uploadedBy, uploadedAt: r.uploadedAt,
          })),
        });
      }

      return NextResponse.json({ status: 'error', message: 'entityType and entityId are required' }, { status: 400 });
    } catch (error) {
      console.error('File list error:', error);
      return NextResponse.json({ status: 'error', message: 'Failed to list files' }, { status: 500 });
    }
  });
}

/** DELETE /api/files — Delete a file */
export async function DELETE(request: NextRequest) {
  return withMiddleware(request, {
    requireAuth: true,
    allowedRoles: ['admin', 'manager'],
    rateLimit: { windowMs: 60000, maxRequests: 30 },
  }, async (_user) => {
    try {
      const { searchParams } = request.nextUrl;
      const id = searchParams.get('id');
      const entityType = searchParams.get('entityType');
      const entityId = searchParams.get('entityId');

      if (!id || !entityType || !entityId) {
        return NextResponse.json(
          { status: 'error', message: 'id, entityType, and entityId are required' },
          { status: 400 }
        );
      }

      const recordKey = `files:${entityType}:${entityId}`;
      const existing = await db.systemSetting.findUnique({ where: { key: recordKey } });
      if (!existing) {
        return NextResponse.json({ status: 'error', message: 'File not found' }, { status: 404 });
      }

      const records: FileRecord[] = JSON.parse(existing.value);
      const record = records.find((r) => r.id === id);
      if (!record) {
        return NextResponse.json({ status: 'error', message: 'File not found' }, { status: 404 });
      }

      // Delete from disk
      const filePath = join(UPLOAD_DIR, entityType, record.storedName);
      if (existsSync(filePath)) {
        await unlink(filePath);
      }

      // Update database
      const updated = records.filter((r) => r.id !== id);
      await db.systemSetting.update({
        where: { key: recordKey },
        data: { value: JSON.stringify(updated) },
      });

      return NextResponse.json({ status: 'success', message: 'File deleted' });
    } catch (error) {
      console.error('File delete error:', error);
      return NextResponse.json({ status: 'error', message: 'Failed to delete file' }, { status: 500 });
    }
  });
}
