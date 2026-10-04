import { NextRequest, NextResponse } from 'next/server';
import { requireRole, optionalAuth } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/teams — List all teams with members
export async function GET(request: NextRequest) {
  const user = optionalAuth(request);
  try {
    const teams = await db.team.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        department: { select: { id: true, name: true, color: true } },
      },
    });

    // Manually fetch members for each team
    const teamsWithMembers = await Promise.all(
      teams.map(async (team) => {
        try {
          const members = await db.teamMember.findMany({
            where: { teamId: team.id },
            include: {
              user: { select: { id: true, name: true, email: true, role: true, position: true, departmentId: true, department: { select: { name: true } } } },
            },
            orderBy: { role: 'desc' },
          });
          const taskCount = await db.task.count({ where: { teamId: team.id } });
          return {
            ...team,
            members,
            memberCount: members.length,
            taskCount,
            departmentName: team.department?.name || null,
          };
        } catch {
          return {
            ...team,
            members: [],
            memberCount: 0,
            taskCount: 0,
            departmentName: team.department?.name || null,
          };
        }
      })
    );

    return NextResponse.json({
      status: 'success',
      data: teamsWithMembers,
    });
  } catch (error) {
    console.error('Get teams error:', error);
    return NextResponse.json({ status: 'success', data: [] });
  }
}

// POST /api/teams — Create a new team
export async function POST(request: NextRequest) {
  return requireRole(request, ['admin', 'manager'], async (user) => {
    try {
      const { name, description, color, icon, departmentId, members } = await request.json();
      if (!name || !name.trim()) {
        return NextResponse.json({ status: 'error', message: 'Team name is required' }, { status: 400 });
      }

      const team = await db.team.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          color: color || '#10b981',
          icon: icon || 'UsersRound',
          departmentId: departmentId || null,
          createdBy: user.userId,
          members: members?.length ? {
            create: members.map((m: { userId: string; role: string }) => ({
              userId: m.userId,
              role: m.role || 'MEMBER',
            })),
          } : undefined,
        },
        include: {
          members: { include: { user: { select: { id: true, name: true, email: true, role: true, position: true } } } },
          department: { select: { id: true, name: true, color: true } },
        },
      });

      return NextResponse.json({ status: 'success', data: { ...team, departmentName: team.department?.name || null } });
    } catch (error) {
      console.error('Create team error:', error);
      return NextResponse.json({ status: 'error', message: 'Failed to create team' }, { status: 500 });
    }
  });
}

// PATCH /api/teams — Update a team
export async function PATCH(request: NextRequest) {
  return requireRole(request, ['admin', 'manager'], async () => {
    try {
      const { id, name, description, color, icon, departmentId, isActive, addMembers, removeMembers } = await request.json();
      if (!id) {
        return NextResponse.json({ status: 'error', message: 'Team ID is required' }, { status: 400 });
      }

      // Verify team exists
      const existingTeam = await db.team.findUnique({ where: { id } });
      if (!existingTeam) {
        return NextResponse.json({ status: 'error', message: 'Team not found' }, { status: 404 });
      }

      // Remove members first
      if (removeMembers?.length) {
        await db.teamMember.deleteMany({
          where: { teamId: id, userId: { in: removeMembers } },
        });
      }

      // Add members — deduplicate by userId, last role wins
      if (addMembers?.length) {
        const memberMap = new Map<string, string>();
        for (const m of addMembers) {
          memberMap.set(m.userId, m.role || 'MEMBER');
        }
        const dedupedMembers = Array.from(memberMap.entries()).map(([userId, role]) => ({
          teamId: id,
          userId,
          role,
        }));

        // Check which members already exist to avoid unique constraint errors
        const existingMembers = await db.teamMember.findMany({
          where: { teamId: id, userId: { in: dedupedMembers.map(m => m.userId) } },
          select: { userId: true, role: true },
        });
        const existingUserIds = new Set(existingMembers.map(m => m.userId));

        // Update existing members' roles
        for (const em of existingMembers) {
          const newRole = memberMap.get(em.userId);
          if (newRole && newRole !== em.role) {
            await db.teamMember.update({
              where: { id: (await db.teamMember.findFirst({ where: { teamId: id, userId: em.userId } }))!.id },
              data: { role: newRole },
            });
          }
        }

        // Create truly new members
        const newMembers = dedupedMembers.filter(m => !existingUserIds.has(m.userId));
        if (newMembers.length > 0) {
          await db.teamMember.createMany({
            data: newMembers,
            skipDuplicates: true,
          });
        }
      }

      // Only update team record if there are actual team fields to update
      const teamUpdateData: Record<string, unknown> = {};
      if (name) teamUpdateData.name = name.trim();
      if (description !== undefined) teamUpdateData.description = description?.trim() || null;
      if (color !== undefined) teamUpdateData.color = color;
      if (icon !== undefined) teamUpdateData.icon = icon;
      if (departmentId !== undefined) teamUpdateData.departmentId = departmentId || null;
      if (isActive !== undefined) teamUpdateData.isActive = isActive;

      const includeClause = {
        members: { include: { user: { select: { id: true, name: true, email: true, role: true, position: true } } } },
        department: { select: { id: true, name: true, color: true } },
      };

      let team;
      if (Object.keys(teamUpdateData).length > 0) {
        team = await db.team.update({
          where: { id },
          data: teamUpdateData,
          include: includeClause,
        });
      } else {
        // Just fetch the team with members if no team-level updates
        team = await db.team.findUnique({
          where: { id },
          include: includeClause,
        });
      }

      if (!team) {
        return NextResponse.json({ status: 'error', message: 'Team not found after update' }, { status: 404 });
      }

      return NextResponse.json({ status: 'success', data: { ...team, departmentName: team.department?.name || null } });
    } catch (error) {
      console.error('Update team error:', error);
      return NextResponse.json({ status: 'error', message: 'Failed to update team' }, { status: 500 });
    }
  });
}

// DELETE /api/teams — Delete a team
export async function DELETE(request: NextRequest) {
  return requireRole(request, ['admin'], async () => {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      if (!id) {
        return NextResponse.json({ status: 'error', message: 'Team ID is required' }, { status: 400 });
      }

      // Unlink tasks from this team before deleting
      await db.task.updateMany({ where: { teamId: id }, data: { teamId: null } });
      await db.teamMember.deleteMany({ where: { teamId: id } });
      await db.team.delete({ where: { id } });

      return NextResponse.json({ status: 'success', message: 'Team deleted' });
    } catch (error) {
      console.error('Delete team error:', error);
      return NextResponse.json({ status: 'error', message: 'Failed to delete team' }, { status: 500 });
    }
  });
}
