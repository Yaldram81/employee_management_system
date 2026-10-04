import { db } from '@/lib/db';
import { isHashed, hashPassword, requireRole } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/migrate-passwords
 * Migrates all plaintext passwords to bcrypt hashes.
 * Admin-only endpoint — can be called once after deployment.
 */
export async function POST(request: NextRequest) {
  return requireRole(request, ['admin'], async () => {
    try {
      const users = await db.user.findMany({
        select: { id: true, passwordHash: true, email: true },
      });

      let migrated = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const user of users) {
        if (isHashed(user.passwordHash)) {
          skipped++;
          continue;
        }

        try {
          // Hash the plaintext password as-is
          const hashed = await hashPassword(user.passwordHash);
          await db.user.update({
            where: { id: user.id },
            data: { passwordHash: hashed },
          });
          migrated++;
        } catch (err) {
          errors.push(`Failed to migrate ${user.email}: ${err}`);
        }
      }

      return NextResponse.json({
        status: 'success',
        message: `Migration complete: ${migrated} migrated, ${skipped} already hashed, ${errors.length} errors`,
        data: { migrated, skipped, errors: errors.length > 0 ? errors : undefined },
      });
    } catch (error) {
      console.error('Password migration error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Migration failed' },
        { status: 500 }
      );
    }
  });
}
