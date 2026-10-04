'use client';

import { useState, useMemo, useCallback } from 'react';
import { useEMSStore } from '@/lib/store';
import { GlassCard } from './glass-card';
import { StatusBadge } from './status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Team, TeamMemberRecord } from '@/lib/types';
import {
  Plus, Search, Users, Shield, Trash2, Edit3, UserPlus, X,
  Loader2, Crown, UserCheck, ChevronRight, Palette,
} from 'lucide-react';

// ─── Color Options ────────────────────────────────────────────
const TEAM_COLORS = [
  '#10b981', '#06b6d4', '#f59e0b', '#f43f5e', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
];

export function TeamBuilderPanel() {
  const { user, users, tasks, departments } = useEMSStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editTeam, setEditTeam] = useState<Team | null>(null);
  const [detailTeam, setDetailTeam] = useState<Team | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [deleteTeam, setDeleteTeam] = useState<Team | null>(null);

  // ─── Form state ────────────────────────────────────────────
  const [form, setForm] = useState({
    name: '',
    description: '',
    color: TEAM_COLORS[0],
    members: [] as Array<{ userId: string; role: 'LEAD' | 'MEMBER' }>,
  });

  const [addMemberUserId, setAddMemberUserId] = useState<string>('');
  const [addMemberRole, setAddMemberRole] = useState<'LEAD' | 'MEMBER'>('MEMBER');

  // ─── Compute teams from tasks (since we don't have a teams API yet) ──
  const teams = useMemo(() => {
    const teamMap: Record<string, Team & { memberCount: number; taskCount: number; members: TeamMemberRecord[] }> = {};
    tasks.forEach(task => {
      if (!task.teamId) return;
      if (!teamMap[task.teamId]) {
        teamMap[task.teamId] = {
          id: task.teamId,
          name: task.teamName || task.teamId,
          color: TEAM_COLORS[Object.keys(teamMap).length % TEAM_COLORS.length],
          createdBy: user?.id || '',
          members: [],
          taskCount: 0,
          memberCount: 0,
          createdAt: new Date().toISOString(),
        };
      }
      teamMap[task.teamId].taskCount++;
      if (task.assigneeId && !teamMap[task.teamId].members.some(m => m.userId === task.assigneeId)) {
        teamMap[task.teamId].members.push({
          id: `${task.teamId}-${task.assigneeId}`,
          teamId: task.teamId,
          userId: task.assigneeId,
          role: 'MEMBER',
          userName: task.assigneeName || '',
        });
        teamMap[task.teamId].memberCount = teamMap[task.teamId].members.length;
      }
    });
    return Object.values(teamMap);
  }, [tasks, user?.id]);

  // ─── Filtered teams ────────────────────────────────────────
  const filteredTeams = useMemo(() => {
    if (!searchQuery) return teams;
    return teams.filter(t =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [teams, searchQuery]);

  // ─── Handlers ──────────────────────────────────────────────
  const openCreateDialog = () => {
    setForm({ name: '', description: '', color: TEAM_COLORS[0], members: [] });
    setCreateDialogOpen(true);
  };

  const openEditDialog = (team: Team) => {
    setEditTeam(team);
    setForm({
      name: team.name,
      description: team.description || '',
      color: team.color || TEAM_COLORS[0],
      members: (team.members || []).map(m => ({ userId: m.userId, role: m.role })),
    });
    setCreateDialogOpen(true);
  };

  const openDetailSheet = (team: Team) => {
    setDetailTeam(team);
    setDetailSheetOpen(true);
  };

  const handleSaveTeam = () => {
    if (!form.name.trim()) {
      toast.error('Team name is required');
      return;
    }
    toast.success(editTeam ? 'Team updated' : 'Team created');
    setCreateDialogOpen(false);
    setEditTeam(null);
  };

  const handleDeleteTeam = () => {
    if (!deleteTeam) return;
    toast.success(`Team "${deleteTeam.name}" deleted`);
    setDeleteTeam(null);
  };

  const addMemberToForm = () => {
    if (!addMemberUserId) return;
    if (form.members.some(m => m.userId === addMemberUserId)) {
      toast.error('Member already added');
      return;
    }
    setForm({
      ...form,
      members: [...form.members, { userId: addMemberUserId, role: addMemberRole }],
    });
    setAddMemberUserId('');
    setAddMemberRole('MEMBER');
  };

  const removeMemberFromForm = (userId: string) => {
    setForm({
      ...form,
      members: form.members.filter(m => m.userId !== userId),
    });
  };

  const handleAddMemberToTeam = () => {
    if (!addMemberUserId || !detailTeam) return;
    toast.success(`Added ${users.find(u => u.id === addMemberUserId)?.name || 'member'} to team`);
    setAddMemberUserId('');
  };

  const handleRemoveMemberFromTeam = (userId: string) => {
    if (!detailTeam) return;
    toast.success('Member removed from team');
  };

  const getUserName = (userId: string) => {
    return users.find(u => u.id === userId)?.name || 'Unknown';
  };

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-cyan-400" />
          <h3 className="text-lg font-semibold">Team Builder</h3>
          <Badge variant="outline" className="border-cyan-500/20 text-cyan-400 text-xs">
            {teams.length} teams
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-48 pl-8 text-xs bg-white/5 border-white/10 focus:border-cyan-500/30"
            />
          </div>
          <Button
            size="sm"
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-500"
            onClick={openCreateDialog}
          >
            <Plus className="h-3.5 w-3.5" /> Create Team
          </Button>
        </div>
      </div>

      {/* ── Team Cards Grid ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filteredTeams.map((team, i) => {
            const leadMember = (team.members || []).find(m => m.role === 'LEAD');
            return (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
              >
                <GlassCard className="p-5 relative overflow-hidden" hover onClick={() => openDetailSheet(team)}>
                  {/* Color accent */}
                  <div
                    className="absolute top-0 left-0 w-1 h-full"
                    style={{ backgroundColor: team.color || TEAM_COLORS[0] }}
                  />

                  <div className="flex items-start justify-between mb-3 ml-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: team.color || TEAM_COLORS[0] }}
                      />
                      <h4 className="font-medium text-sm">{team.name}</h4>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm" variant="ghost"
                        className="h-7 w-7 p-0 hover:bg-cyan-500/10"
                        onClick={(e) => { e.stopPropagation(); openEditDialog(team); }}
                      >
                        <Edit3 className="h-3.5 w-3.5 text-cyan-400" />
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        className="h-7 w-7 p-0 hover:bg-rose-500/10"
                        onClick={(e) => { e.stopPropagation(); setDeleteTeam(team); }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                      </Button>
                    </div>
                  </div>

                  {team.description && (
                    <p className="text-xs text-muted-foreground mb-3 ml-2 line-clamp-2">{team.description}</p>
                  )}

                  {/* Member avatars */}
                  <div className="flex items-center -space-x-2 mb-3 ml-2">
                    {(team.members || []).slice(0, 5).map((member, mi) => (
                      <Avatar key={mi} className="h-7 w-7 border-2 border-background">
                        <AvatarFallback className="text-[8px] bg-gradient-to-br from-emerald-600 to-cyan-600 text-white">
                          {(member.userName || getUserName(member.userId)).charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {(team.members || []).length > 5 && (
                      <div className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center text-[8px] text-muted-foreground border-2 border-background">
                        +{(team.members || []).length - 5}
                      </div>
                    )}
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-4 ml-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {team.memberCount || (team.members || []).length} member{(team.memberCount || (team.members || []).length) !== 1 ? 's' : ''}
                    </span>
                    <span>{team.taskCount || 0} tasks</span>
                    {leadMember && (
                      <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-amber-500/20 text-amber-400">
                        <Crown className="h-2.5 w-2.5 mr-0.5" />
                        {leadMember.userName || getUserName(leadMember.userId)}
                      </Badge>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {filteredTeams.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'No teams match your search' : 'No teams created yet'}
            </p>
            <Button
              size="sm" variant="outline"
              className="mt-3 gap-1.5 border-white/10 hover:bg-emerald-500/10 text-xs"
              onClick={openCreateDialog}
            >
              <Plus className="h-3.5 w-3.5" /> Create First Team
            </Button>
          </div>
        )}
      </div>

      {/* ── Create / Edit Team Dialog ────────────────────────── */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => {
        if (!open) { setEditTeam(null); }
        setCreateDialogOpen(open);
      }}>
        <DialogContent className="glass-strong border-white/20 sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="rounded-lg p-2 bg-cyan-500/10">
                <Users className="h-4 w-4 text-cyan-400" />
              </div>
              {editTeam ? 'Edit Team' : 'Create Team'}
            </DialogTitle>
            <DialogDescription>
              {editTeam ? 'Update team details and members.' : 'Create a new team and add members.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-2">
              <Label>Team Name <span className="text-rose-400">*</span></Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Frontend Squad"
                className="bg-white/5 border-white/10 focus:border-cyan-500/30"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What does this team do?"
                className="bg-white/5 border-white/10 min-h-[60px] focus:border-cyan-500/30"
              />
            </div>

            {/* Color Picker */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                Team Color
              </Label>
              <div className="flex items-center gap-2">
                {TEAM_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      "h-8 w-8 rounded-full transition-all hover:scale-110",
                      form.color === color && "ring-2 ring-white ring-offset-2 ring-offset-background scale-110"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setForm({ ...form, color })}
                  />
                ))}
              </div>
            </div>

            <Separator className="bg-white/5" />

            {/* Add Members */}
            <div className="space-y-3">
              <Label className="flex items-center gap-1">
                <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
                Add Members
              </Label>
              <div className="flex items-center gap-2">
                <Select value={addMemberUserId} onValueChange={setAddMemberUserId}>
                  <SelectTrigger className="bg-white/5 border-white/10 flex-1">
                    <SelectValue placeholder="Select user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users
                      .filter(u => !form.members.some(m => m.userId === u.id) && u.id)
                      .map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Select value={addMemberRole} onValueChange={(v) => setAddMemberRole(v as 'LEAD' | 'MEMBER')}>
                  <SelectTrigger className="bg-white/5 border-white/10 w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LEAD">Lead</SelectItem>
                    <SelectItem value="MEMBER">Member</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="icon" variant="outline" className="shrink-0 border-white/10 hover:bg-emerald-500/10" onClick={addMemberToForm}>
                  <Plus className="h-4 w-4 text-emerald-400" />
                </Button>
              </div>

              {/* Member list */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {form.members.map((member) => {
                  const userName = users.find(u => u.id === member.userId)?.name || 'Unknown';
                  return (
                    <div key={member.userId} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[8px] bg-gradient-to-br from-emerald-600 to-cyan-600 text-white">
                            {userName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{userName}</span>
                        <Badge variant="outline" className={cn(
                          "text-[10px] h-4 px-1.5",
                          member.role === 'LEAD'
                            ? "border-amber-500/20 text-amber-400"
                            : "border-white/10 text-muted-foreground"
                        )}>
                          {member.role === 'LEAD' ? <><Crown className="h-2.5 w-2.5 mr-0.5" /> Lead</> : 'Member'}
                        </Badge>
                      </div>
                      <Button
                        size="sm" variant="ghost"
                        className="h-6 w-6 p-0 hover:bg-rose-500/10"
                        onClick={() => removeMemberFromForm(member.userId)}
                      >
                        <X className="h-3.5 w-3.5 text-rose-400" />
                      </Button>
                    </div>
                  );
                })}
                {form.members.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">No members added yet</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="border-white/10">
              Cancel
            </Button>
            <Button
              onClick={handleSaveTeam}
              disabled={!form.name.trim()}
              className="gap-2 bg-emerald-600 hover:bg-emerald-500"
            >
              {editTeam ? 'Save Changes' : 'Create Team'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Team Detail Sheet ─────────────────────────────────── */}
      <Sheet open={detailSheetOpen} onOpenChange={setDetailSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg bg-background/95 backdrop-blur-xl border-l border-white/10 overflow-y-auto">
          {detailTeam && (
            <>
              <SheetHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="h-4 w-4 rounded-full shrink-0"
                    style={{ backgroundColor: detailTeam.color || TEAM_COLORS[0] }}
                  />
                  <SheetTitle className="text-lg">{detailTeam.name}</SheetTitle>
                </div>
                <SheetDescription className="text-xs">
                  {detailTeam.description || 'No description'}
                </SheetDescription>
              </SheetHeader>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 rounded-lg bg-white/5">
                  <p className="text-xs text-muted-foreground">Members</p>
                  <p className="text-lg font-bold">{detailTeam.memberCount || (detailTeam.members || []).length}</p>
                </div>
                <div className="p-3 rounded-lg bg-white/5">
                  <p className="text-xs text-muted-foreground">Tasks</p>
                  <p className="text-lg font-bold">{detailTeam.taskCount || 0}</p>
                </div>
              </div>

              <Separator className="mb-4 bg-white/5" />

              {/* Add Member */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold mb-2">Add Member</h4>
                <div className="flex items-center gap-2">
                  <Select value={addMemberUserId} onValueChange={setAddMemberUserId}>
                    <SelectTrigger className="bg-white/5 border-white/10 flex-1">
                      <SelectValue placeholder="Select user..." />
                    </SelectTrigger>
                    <SelectContent>
                      {users
                        .filter(u => !(detailTeam.members || []).some(m => m.userId === u.id) && u.id)
                        .map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" className="gap-1 border-white/10 hover:bg-emerald-500/10 text-xs" onClick={handleAddMemberToTeam}>
                    <UserPlus className="h-3.5 w-3.5 text-emerald-400" /> Add
                  </Button>
                </div>
              </div>

              {/* Members List */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Team Members</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {(detailTeam.members || []).map((member) => {
                    const userName = member.userName || getUserName(member.userId);
                    return (
                      <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-[10px] bg-gradient-to-br from-emerald-600 to-cyan-600 text-white">
                              {userName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{userName}</p>
                            <Badge variant="outline" className={cn(
                              "text-[10px] h-4 px-1.5 mt-0.5",
                              member.role === 'LEAD'
                                ? "border-amber-500/20 text-amber-400"
                                : "border-white/10 text-muted-foreground"
                            )}>
                              {member.role === 'LEAD' ? <><Crown className="h-2.5 w-2.5 mr-0.5 inline" /> Lead</> : 'Member'}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          size="sm" variant="ghost"
                          className="h-7 text-xs gap-1 text-rose-400 hover:bg-rose-500/10"
                          onClick={() => handleRemoveMemberFromTeam(member.userId)}
                        >
                          <X className="h-3 w-3" /> Remove
                        </Button>
                      </div>
                    );
                  })}
                  {(detailTeam.members || []).length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No members in this team</p>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Delete Confirmation ───────────────────────────────── */}
      <AlertDialog open={!!deleteTeam} onOpenChange={(open) => { if (!open) setDeleteTeam(null); }}>
        <AlertDialogContent className="glass-strong border-white/20">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-medium text-foreground">&quot;{deleteTeam?.name}&quot;</span>?
              This action cannot be undone. Team tasks will become unassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTeam} className="bg-rose-600 hover:bg-rose-500">
              Delete Team
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
