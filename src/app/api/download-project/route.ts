import { NextResponse } from 'next/server';
import archiver from 'archiver';
import { Readable } from 'stream';
import path from 'path';
import fs from 'fs';

const PROJECT_ROOT = process.cwd();

// Directories and files to exclude from the zip
const EXCLUDE_PATTERNS = [
  'node_modules',
  '.next',
  '.git',
  '.turbo',
  '.env',
  '.env.local',
  '.env.development.local',
  '.env.production.local',
  'dev.log',
  'upload',
  'mini-services',
  'worklog.md',
  'custom.db',
  'dev.db',
  'dev.db-journal',
  'ems-source-code.zip',
];

function shouldExclude(entryPath: string): boolean {
  // entryPath could be an absolute path or a relative archive path
  const normalized = entryPath.replace(/\\/g, '/');
  return EXCLUDE_PATTERNS.some((pattern) => {
    // Match exact filename/dirname at any path level
    const segments = normalized.split('/');
    return segments.some((segment) => segment === pattern) ||
      normalized.startsWith(pattern + '/') ||
      normalized === pattern;
  });
}

export async function GET() {
  try {
    const archive = archiver('zip', {
      zlib: { level: 6 }, // Balanced compression
    });

    // Collect errors
    const errors: string[] = [];
    archive.on('warning', (err) => {
      if (err.code !== 'ENOENT') {
        errors.push(err.message);
      }
    });
    archive.on('error', (err) => {
      errors.push(err.message);
    });

    // Add project files
    const srcDir = path.join(PROJECT_ROOT, 'src');
    if (fs.existsSync(srcDir)) {
      archive.directory(srcDir, 'src', (entry) => {
        if (shouldExclude(entry.name)) {
          return false as unknown as archiver.EntryData;
        }
        return entry;
      });
    }

    // Add prisma directory
    const prismaDir = path.join(PROJECT_ROOT, 'prisma');
    if (fs.existsSync(prismaDir)) {
      archive.directory(prismaDir, 'prisma', (entry) => {
        if (shouldExclude(entry.name)) {
          return false as unknown as archiver.EntryData;
        }
        return entry;
      });
    }

    // Add public directory
    const publicDir = path.join(PROJECT_ROOT, 'public');
    if (fs.existsSync(publicDir)) {
      archive.directory(publicDir, 'public', (entry) => {
        if (shouldExclude(entry.name)) {
          return false as unknown as archiver.EntryData;
        }
        return entry;
      });
    }

    // Add db directory (schema only, not the actual db file)
    const dbDir = path.join(PROJECT_ROOT, 'db');
    if (fs.existsSync(dbDir)) {
      archive.directory(dbDir, 'db', (entry) => {
        if (shouldExclude(entry.name)) {
          return false as unknown as archiver.EntryData;
        }
        return entry;
      });
    }

    // Add key root files
    const rootFiles = [
      'package.json',
      'package-lock.json',
      'bun.lockb',
      'tsconfig.json',
      'next.config.ts',
      'tailwind.config.ts',
      'postcss.config.mjs',
      'components.json',
      'instrumentation.ts',
      'instrumentation.node.ts',
      '.gitignore',
      '.eslintrc.json',
    ];

    for (const file of rootFiles) {
      const filePath = path.join(PROJECT_ROOT, file);
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: file });
      }
    }

    // Add a README with project info
    const readmeContent = `# EMS - Employee Management System

## Tech Stack
- Next.js 16 (App Router + Turbopack)
- TypeScript 5
- Tailwind CSS 4 + shadcn/ui
- Prisma ORM (SQLite)
- NextAuth.js v4

## Getting Started
1. Install dependencies: \`bun install\`
2. Set up database: \`bun run db:push\`
3. Seed data: \`bun run db:seed\`
4. Start dev server: \`bun run dev\`

## Login Credentials
- Admin: admin@ems.com / admin123
- Manager: manager@ems.com / manager123
- Employee: james@ems.com / emp123

## Generated
- Date: ${new Date().toISOString()}
- Source: EMS Project Source Code Export
`;

    archive.append(readmeContent, { name: 'README.md' });

    // Finalize archive
    archive.finalize();

    // Convert archive stream to buffer
    const chunks: Buffer[] = [];
    const readable = Readable.from(archive);

    for await (const chunk of readable) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    const buffer = Buffer.concat(chunks);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `ems-project-${timestamp}.zip`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('[download-project] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create project archive' },
      { status: 500 }
    );
  }
}
