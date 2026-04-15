import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  UserPlus,
  Shield,
  Stethoscope,
  Ban,
  CheckCircle,
  Trash2,
  Loader2,
  Users,
  RefreshCw,
  MoreHorizontal,
  KeyRound,
  Mail,
  Building2,
} from "lucide-react";

interface ManagedUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  banned: boolean;
  confirmed: boolean;
  last_sign_in: string | null;
  created_at: string;
}

export default function UserManagement() {
  const { user, isCareVaultAdmin } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    full_name: "",
    role: "clinician",
  });
  const [inviting, setInviting] = useState(false);
  const [facilityId, setFacilityId] = useState<string | null>(null);

  const callManageUsers = async (action: string, payload: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.functions.invoke("manage-users", {
      body: { action, ...payload },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await callManageUsers("list");
      setUsers(data.users || []);
    } catch (err: any) {
      toast({ title: "Error loading users", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchFacilityId = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("facility_id")
      .eq("id", user.id)
      .single();
    setFacilityId(data?.facility_id || null);
  };

  useEffect(() => {
    fetchFacilityId();
    fetchUsers();
  }, [user]);

  const handleInvite = async () => {
    if (!facilityId) {
      toast({ title: "No facility assigned", description: "You must be assigned to a facility first.", variant: "destructive" });
      return;
    }
    setInviting(true);
    try {
      await callManageUsers("invite", {
        email: inviteForm.email,
        full_name: inviteForm.full_name,
        role: inviteForm.role,
        facility_id: facilityId,
      });
      toast({ title: "Invitation sent", description: `An invite email has been sent to ${inviteForm.email}.` });
      setInviteOpen(false);
      setInviteForm({ email: "", full_name: "", role: "clinician" });
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Invite failed", description: err.message, variant: "destructive" });
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setActionLoading(userId);
    try {
      await callManageUsers("update_role", { user_id: userId, role: newRole });
      toast({ title: "Role updated" });
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleBan = async (userId: string, currentlyBanned: boolean) => {
    setActionLoading(userId);
    try {
      await callManageUsers(currentlyBanned ? "activate" : "deactivate", { user_id: userId });
      toast({ title: currentlyBanned ? "User activated" : "User deactivated" });
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetPassword = async (userId: string, email: string) => {
    setActionLoading(userId);
    try {
      const data = await callManageUsers("reset_password", { user_id: userId });
      toast({ title: "Password reset sent", description: data.message || `Reset link sent to ${email}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleResendInvite = async (userId: string, email: string) => {
    setActionLoading(userId);
    try {
      const data = await callManageUsers("resend_invite", { user_id: userId });
      toast({ title: "Invite resent", description: data.message || `Invite resent to ${email}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (userId: string, email: string) => {
    if (!confirm(`Permanently delete user ${email}? This cannot be undone.`)) return;
    setActionLoading(userId);
    try {
      await callManageUsers("delete", { user_id: userId });
      toast({ title: "User deleted" });
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  if (!facilityId && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 animate-fade-in">
        <Users size={40} className="text-muted-foreground" />
        <h2 className="text-lg font-semibold text-foreground">No Facility Assigned</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          You must be assigned to a facility before you can manage users. Contact a system administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage clinicians and administrators in your facility
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus size={14} />
                Invite User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite New User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    value={inviteForm.full_name}
                    onChange={(e) => setInviteForm((f) => ({ ...f, full_name: e.target.value }))}
                    placeholder="Dr. Amina Ibrahim"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="amina@hospital.ng"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={inviteForm.role}
                    onValueChange={(v) => setInviteForm((f) => ({ ...f, role: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clinician">Clinician</SelectItem>
                      <SelectItem value="facility_admin">Facility Admin</SelectItem>
                      {isCareVaultAdmin && <SelectItem value="carevault_admin">CareVault Admin</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleInvite} disabled={inviting || !inviteForm.email || !inviteForm.full_name} className="w-full">
                  {inviting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                  {inviting ? "Sending Invite..." : "Send Invite Email"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Users size={32} />
            <p className="mt-2 text-sm">No users found in your facility</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                  <TableCell>
                    <Select
                      value={u.role}
                      onValueChange={(v) => handleRoleChange(u.id, v)}
                      disabled={u.id === user?.id || actionLoading === u.id}
                    >
                      <SelectTrigger className="w-[160px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clinician">
                          <span className="flex items-center gap-1.5">
                            <Stethoscope size={12} /> Clinician
                          </span>
                        </SelectItem>
                        <SelectItem value="facility_admin">
                          <span className="flex items-center gap-1.5">
                            <Building2 size={12} /> Facility Admin
                          </span>
                        </SelectItem>
                        {isCareVaultAdmin && (
                          <SelectItem value="carevault_admin">
                            <span className="flex items-center gap-1.5">
                              <Shield size={12} /> CareVault Admin
                            </span>
                          </SelectItem>
                        )}
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
                    {u.last_sign_in
                      ? new Date(u.last_sign_in).toLocaleDateString()
                      : "Never"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {u.id !== user?.id && (
                      <div className="flex items-center justify-end gap-1">
                        {actionLoading === u.id ? (
                          <Loader2 size={14} className="animate-spin text-muted-foreground" />
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal size={14} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleResetPassword(u.id, u.email)}>
                                <KeyRound size={14} className="mr-2" /> Reset Password
                              </DropdownMenuItem>
                              {!u.confirmed && (
                                <DropdownMenuItem onClick={() => handleResendInvite(u.id, u.email)}>
                                  <Mail size={14} className="mr-2" /> Resend Invite
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleToggleBan(u.id, u.banned)}>
                                {u.banned ? (
                                  <><CheckCircle size={14} className="mr-2" /> Activate</>
                                ) : (
                                  <><Ban size={14} className="mr-2 text-destructive" /> Deactivate</>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDelete(u.id, u.email)}
                              >
                                <Trash2 size={14} className="mr-2" /> Delete User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
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
