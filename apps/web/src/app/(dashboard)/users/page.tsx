"use client";

import { useState, useEffect, useCallback } from "react";
import {
  UserPlus, Shield, Stethoscope, Ban, CheckCircle, Trash2, Loader2,
  Users, RefreshCw, MoreHorizontal, KeyRound, Mail, Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";
import type { UserProfile, Facility, AppRole } from "@repo/types";

interface ManagedUser extends UserProfile {
  banned: boolean;
  confirmed: boolean;
  lastSignIn: string | null;
  createdAt: string;
  facilityName: string | null;
}

export default function UserManagementPage() {
  const { userId, isCareVaultAdmin } = useAuth();
  const api = useApi();

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [facilityFilter, setFacilityFilter] = useState("all");
  const [inviteForm, setInviteForm] = useState({
    email: "", fullName: "", role: "clinician" as AppRole, facilityId: "",
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<ManagedUser[]>("/users");
      setUsers(data);
    } catch { toast.error("Failed to load users"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchUsers();
    if (isCareVaultAdmin) {
      api.get<Facility[]>("/facilities").then(setFacilities).catch(() => {});
    }
  }, []);

  const handleInvite = async () => {
    const facilitylessRoles = ["carevault_admin", "researcher"];
    const needsFacility = !facilitylessRoles.includes(inviteForm.role);
    if (needsFacility && isCareVaultAdmin && !inviteForm.facilityId) {
      toast.error("Please select a facility for this user");
      return;
    }
    setInviting(true);
    try {
      await api.post("/users/invite", {
        email: inviteForm.email,
        fullName: inviteForm.fullName,
        role: inviteForm.role,
        facilityId: needsFacility ? (inviteForm.facilityId || undefined) : undefined,
      });
      toast.success(`Invite sent to ${inviteForm.email}`);
      setInviteOpen(false);
      setInviteForm({ email: "", fullName: "", role: "clinician", facilityId: "" });
      fetchUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setInviting(false);
    }
  };

  const doAction = async (userId: string, fn: () => Promise<unknown>, successMsg: string) => {
    setActionLoading(userId);
    try {
      await fn();
      toast.success(successMsg);
      fetchUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!isCareVaultAdmin || facilityFilter === "all") return true;
    if (facilityFilter === "none") return !u.facilityName;
    return u.facilityName === facilities.find((f) => f.id === facilityFilter)?.name;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground">Manage clinicians and administrators</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </Button>
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><UserPlus size={14} /> Invite User</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite New User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={inviteForm.fullName} onChange={(e) => setInviteForm((f) => ({ ...f, fullName: e.target.value }))} placeholder="Dr. Amina Ibrahim" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={inviteForm.email} onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))} placeholder="amina@hospital.ng" />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={inviteForm.role} onValueChange={(v) => setInviteForm((f) => ({ ...f, role: v as AppRole }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clinician">Clinician</SelectItem>
                      <SelectItem value="facility_admin">Facility Admin</SelectItem>
                      {isCareVaultAdmin && <SelectItem value="researcher">Researcher</SelectItem>}
                      {isCareVaultAdmin && <SelectItem value="carevault_admin">CareVault Admin</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                {isCareVaultAdmin && !["carevault_admin", "researcher"].includes(inviteForm.role) && (
                  <div className="space-y-2">
                    <Label>Assign to Facility</Label>
                    <Select value={inviteForm.facilityId} onValueChange={(v) => setInviteForm((f) => ({ ...f, facilityId: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select a facility" /></SelectTrigger>
                      <SelectContent>
                        {facilities.map((fac) => <SelectItem key={fac.id} value={fac.id}>{fac.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button
                  onClick={handleInvite}
                  disabled={inviting || !inviteForm.email || !inviteForm.fullName}
                  className="w-full"
                >
                  {inviting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                  {inviting ? "Sending…" : "Send Invite Email"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isCareVaultAdmin && (
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground whitespace-nowrap">Filter by Facility:</Label>
          <Select value={facilityFilter} onValueChange={setFacilityFilter}>
            <SelectTrigger className="w-[250px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Facilities</SelectItem>
              <SelectItem value="none">No Facility Assigned</SelectItem>
              {facilities.map((fac) => <SelectItem key={fac.id} value={fac.id}>{fac.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="rounded-xl border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Users size={32} />
            <p className="mt-2 text-sm">No users found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                {isCareVaultAdmin && <TableHead>Facility</TableHead>}
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.fullName || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                  {isCareVaultAdmin && <TableCell className="text-sm text-muted-foreground">{u.facilityName || "—"}</TableCell>}
                  <TableCell>
                    <Select
                      value={u.role}
                      onValueChange={(v) => doAction(u.id, () => api.patch(`/users/${u.id}/role`, { role: v }), "Role updated")}
                      disabled={u.id === userId || actionLoading === u.id}
                    >
                      <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clinician"><span className="flex items-center gap-1.5"><Stethoscope size={12} /> Clinician</span></SelectItem>
                        <SelectItem value="facility_admin"><span className="flex items-center gap-1.5"><Building2 size={12} /> Facility Admin</span></SelectItem>
                        {isCareVaultAdmin && <SelectItem value="researcher"><span className="flex items-center gap-1.5"><Stethoscope size={12} /> Researcher</span></SelectItem>}
                        {isCareVaultAdmin && <SelectItem value="carevault_admin"><span className="flex items-center gap-1.5"><Shield size={12} /> CareVault Admin</span></SelectItem>}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {u.banned ? (
                      <Badge variant="destructive" className="text-xs">Deactivated</Badge>
                    ) : !u.confirmed ? (
                      <Badge variant="outline" className="text-xs text-warning border-warning/30">Pending Invite</Badge>
                    ) : (
                      <Badge className="bg-accent text-accent-foreground text-xs">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {u.lastSignIn ? new Date(u.lastSignIn).toLocaleDateString() : "Never"}
                  </TableCell>
                  <TableCell className="text-right">
                    {u.id !== userId && (
                      actionLoading === u.id ? (
                        <Loader2 size={14} className="animate-spin text-muted-foreground" />
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal size={14} /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => doAction(u.id, () => api.post(`/users/${u.id}/reset-password`), "Password reset sent")}>
                              <KeyRound size={14} className="mr-2" /> Reset Password
                            </DropdownMenuItem>
                            {!u.confirmed && (
                              <DropdownMenuItem onClick={() => doAction(u.id, () => api.post(`/users/${u.id}/resend-invite`), "Invite resent")}>
                                <Mail size={14} className="mr-2" /> Resend Invite
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => doAction(u.id, () => api.post(`/users/${u.id}/${u.banned ? "activate" : "deactivate"}`), u.banned ? "User activated" : "User deactivated")}>
                              {u.banned ? <><CheckCircle size={14} className="mr-2" /> Activate</> : <><Ban size={14} className="mr-2 text-destructive" /> Deactivate</>}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => {
                                if (!confirm(`Delete ${u.email}? This cannot be undone.`)) return;
                                doAction(u.id, () => api.delete(`/users/${u.id}`), "User deleted");
                              }}
                            >
                              <Trash2 size={14} className="mr-2" /> Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
