"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Users,
  Plus,
  Search,
  MoreHorizontal,
  Mail,
  UserCog,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ShieldAlert,
  Key,
  User,
  Building,
  Edit,
  ActivitySquare,
  Clock,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

// --- VALIDATION SCHEMAS ---
const staffSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email").optional(), // Optional for edits
  phone: z.string().min(10, "Invalid phone"),
  password: z.string().optional(),
  role: z.enum(["TECHNICIAN", "RECEPTIONIST", "DOCTOR", "LAB_MANAGER"]),
  position: z.string().min(2, "Position title required"),
  department: z.string().optional(),
  salary: z.coerce.number().min(0).optional(),
});

type StaffFormValues = z.infer<typeof staffSchema>;

export default function StaffManagementPage() {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editData, setEditData] = useState<{ isOpen: boolean; staff: any }>({
    isOpen: false,
    staff: null,
  });
  const [activityData, setActivityData] = useState<{
    isOpen: boolean;
    staff: any;
  }>({ isOpen: false, staff: null });
  const [isPasswordOpen, setIsPasswordOpen] = useState<{
    isOpen: boolean;
    staff: any;
  }>({ isOpen: false, staff: null });
  const [search, setSearch] = useState("");

  // 1. FETCH STAFF
  const { data: staffList = [], isLoading } = useQuery({
    queryKey: ["staff-directory"],
    queryFn: async () => {
      const res = await fetch("/api/workspace/staff");
      if (!res.ok) throw new Error("Failed to fetch staff");
      return res.json();
    },
  });

  // 2. ADD STAFF MUTATION
  const addMutation = useMutation({
    mutationFn: async (data: StaffFormValues) => {
      const res = await fetch("/api/workspace/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok)
        throw new Error((await res.json()).error || "Failed to add staff");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Staff member added successfully!");
      setIsAddOpen(false);
      queryClient.invalidateQueries({ queryKey: ["staff-directory"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // 3. UPDATE / ACTION MUTATION
  const actionMutation = useMutation({
    mutationFn: async (data: {
      staffId: string;
      userId: string;
      action: string;
      [key: string]: any;
    }) => {
      const res = await fetch(`/api/workspace/staff`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Action failed");
      return res.json();
    },
    onSuccess: (data, variables) => {
      toast.success(data.message || "Updated successfully");
      setIsPasswordOpen({ isOpen: false, staff: null });
      setEditData({ isOpen: false, staff: null });
      queryClient.invalidateQueries({ queryKey: ["staff-directory"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Filter Logic
  const filteredStaff = staffList.filter(
    (s: any) =>
      s.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
      s.employeeId?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50 font-sans relative overflow-hidden selection:bg-indigo-100">
      <div className="absolute top-0 inset-x-0 h-64 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/40 via-slate-50 to-transparent pointer-events-none z-0" />

      <div className="flex-1 flex flex-col p-4 sm:p-6 z-10 overflow-hidden max-w-[1600px] mx-auto w-full">
        {/* --- HEADER --- */}
        <div className="flex-none mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/70 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/60 shadow-sm">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-inner shrink-0">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2 leading-tight">
                Staff Directory
                <Badge
                  variant="secondary"
                  className="bg-indigo-50 text-indigo-700 font-mono text-xs">
                  {staffList.length} Members
                </Badge>
              </h1>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Manage access, roles, and branch assignments.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search staff ID, name..."
                className="pl-9 h-10 bg-white border-slate-200 rounded-xl focus:border-indigo-500 shadow-sm text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button
              onClick={() => setIsAddOpen(true)}
              className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 h-10 rounded-xl text-sm font-bold shadow-md shadow-indigo-500/25 whitespace-nowrap">
              <Plus className="h-4 w-4 mr-1.5" /> Add Staff
            </Button>
          </div>
        </div>

        {/* --- DATA TABLE --- */}
        <div className="flex-1 flex flex-col shadow-sm border border-slate-200/80 overflow-hidden rounded-2xl bg-white">
          <div className="flex-1 overflow-auto relative custom-scrollbar">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="sticky top-0 z-20 bg-slate-50/90 backdrop-blur-md text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 w-[250px]">Employee</th>
                  <th className="px-4 py-4 w-[120px]">Employee ID</th>
                  <th className="px-4 py-4 w-[180px]">Role & Position</th>
                  <th className="px-4 py-4 w-[150px]">Branch</th>
                  <th className="px-4 py-4 w-[120px] text-center">Status</th>
                  <th className="px-6 py-4 text-right w-[100px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="h-64 text-center">
                      <Loader2 className="animate-spin h-8 w-8 mx-auto text-indigo-600 mb-3" />
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-widest animate-pulse">
                        Loading Directory...
                      </span>
                    </td>
                  </tr>
                ) : filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="h-64 text-center">
                      <Search className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                      <p className="font-bold text-slate-600">
                        No staff members found.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((staff: any) => (
                    <tr
                      key={staff.id}
                      className="group hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-slate-200">
                            <AvatarFallback className="bg-indigo-50 text-indigo-700 font-bold text-xs">
                              {staff.user.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <div className="font-bold text-slate-900 truncate">
                              {staff.user.name}
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5 truncate">
                              <Mail className="h-3 w-3 shrink-0" />{" "}
                              {staff.user.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 text-slate-700 font-mono font-bold text-xs bg-slate-100 px-2 py-1 rounded w-max border border-slate-200">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          {staff.employeeId || "PENDING"}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="font-bold text-slate-700 text-xs">
                          {staff.position}
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[9px] mt-1 bg-slate-50 text-slate-500 uppercase tracking-wider">
                          {staff.user.role.replace("_", " ")}
                        </Badge>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                          <Building className="h-3.5 w-3.5 text-slate-400" />
                          {staff.branch?.name || "Main Branch"}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-center">
                        {staff.user.isActive ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-none px-2 text-[10px] uppercase tracking-wider font-bold shadow-sm">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Active
                          </Badge>
                        ) : (
                          <Badge className="bg-rose-100 text-rose-700 border-none px-2 text-[10px] uppercase tracking-wider font-bold shadow-sm">
                            <ShieldAlert className="h-3 w-3 mr-1" /> Suspended
                          </Badge>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 data-[state=open]:bg-indigo-50 data-[state=open]:text-indigo-600 transition-colors">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-48 p-1.5 shadow-xl border-slate-100 rounded-xl">
                            <DropdownMenuLabel className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                              Manage
                            </DropdownMenuLabel>

                            <DropdownMenuItem
                              className="cursor-pointer font-medium rounded-lg text-slate-700 py-2"
                              onClick={() =>
                                setEditData({ isOpen: true, staff })
                              }>
                              <Edit className="mr-2 h-4 w-4 text-blue-500" />{" "}
                              Edit Details
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              className="cursor-pointer font-medium rounded-lg text-slate-700 py-2"
                              onClick={() =>
                                setActivityData({ isOpen: true, staff })
                              }>
                              <ActivitySquare className="mr-2 h-4 w-4 text-indigo-500" />{" "}
                              View Activity
                            </DropdownMenuItem>

                            <DropdownMenuSeparator className="bg-slate-100 my-1" />

                            <DropdownMenuItem
                              className="cursor-pointer font-medium rounded-lg text-slate-700 py-2"
                              onClick={() =>
                                setIsPasswordOpen({ isOpen: true, staff })
                              }>
                              <Key className="mr-2 h-4 w-4 text-amber-500" />{" "}
                              Reset Password
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              className="cursor-pointer font-medium rounded-lg text-slate-700 py-2"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Are you sure you want to ${staff.user.isActive ? "SUSPEND" : "ACTIVATE"} this user?`,
                                  )
                                ) {
                                  actionMutation.mutate({
                                    staffId: staff.id,
                                    userId: staff.user.id,
                                    action: "TOGGLE_STATUS",
                                    isActive: !staff.user.isActive,
                                  });
                                }
                              }}>
                              <UserCog className="mr-2 h-4 w-4 text-rose-500" />
                              {staff.user.isActive
                                ? "Suspend Access"
                                : "Restore Access"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- MODALS --- */}
      <AddStaffModal
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSubmit={addMutation.mutate}
        isLoading={addMutation.isPending}
      />

      <EditStaffModal
        open={editData.isOpen}
        staff={editData.staff}
        onClose={() => setEditData({ isOpen: false, staff: null })}
        onSubmit={(data: any) =>
          actionMutation.mutate({ ...data, action: "UPDATE_DETAILS" })
        }
        isLoading={actionMutation.isPending}
      />

      <ActivityLogModal
        open={activityData.isOpen}
        staff={activityData.staff}
        onClose={() => setActivityData({ isOpen: false, staff: null })}
      />

      <ChangePasswordModal
        open={isPasswordOpen.isOpen}
        staff={isPasswordOpen.staff}
        onClose={() => setIsPasswordOpen({ isOpen: false, staff: null })}
        onSubmit={(newPassword: string) =>
          actionMutation.mutate({
            staffId: isPasswordOpen.staff.id,
            userId: isPasswordOpen.staff.user.id,
            action: "CHANGE_PASSWORD",
            newPassword,
          })
        }
        isLoading={actionMutation.isPending}
      />
    </div>
  );
}

// ==========================================
// SUB-COMPONENT: ADD STAFF MODAL
// ==========================================
function AddStaffModal({ open, onOpenChange, onSubmit, isLoading }: any) {
  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      role: "TECHNICIAN",
      name: "",
      email: "",
      phone: "",
      password: "",
      position: "",
      department: "",
      salary: undefined,
    },
  });

  if (!open) setTimeout(() => form.reset(), 200);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none rounded-2xl shadow-2xl">
        <div className="bg-slate-50 p-6 border-b border-slate-100">
          <DialogTitle className="text-xl font-bold text-slate-800">
            Add Staff Member
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 mt-1">
            System will auto-generate a 9-digit Employee ID.
          </DialogDescription>
        </div>
        <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                Full Name
              </Label>
              <Input {...form.register("name")} className="h-10 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Phone</Label>
              <Input {...form.register("phone")} className="h-10 rounded-xl" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">
              Email (Login ID)
            </Label>
            <Input
              {...form.register("email")}
              type="email"
              className="h-10 rounded-xl"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                System Role
              </Label>
              <Select
                onValueChange={(val: any) => form.setValue("role", val)}
                defaultValue={form.getValues("role")}>
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="TECHNICIAN">Technician</SelectItem>
                  <SelectItem value="RECEPTIONIST">Receptionist</SelectItem>
                  <SelectItem value="LAB_MANAGER">Lab Manager</SelectItem>
                  <SelectItem value="DOCTOR">Doctor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                Position Title
              </Label>
              <Input
                {...form.register("position")}
                className="h-10 rounded-xl"
              />
            </div>
          </div>
          <div className="space-y-1.5 p-4 bg-amber-50 rounded-xl border border-amber-100 mt-2">
            <Label className="text-xs font-bold text-amber-900">
              Custom Password (Optional)
            </Label>
            <Input
              {...form.register("password")}
              placeholder="Leave blank for Password@123"
              className="h-10 rounded-xl bg-white"
            />
          </div>
          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="rounded-xl">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-indigo-600 hover:bg-indigo-700 rounded-xl px-6">
              {isLoading ? (
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}{" "}
              Create Account
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// SUB-COMPONENT: EDIT STAFF MODAL
// ==========================================
function EditStaffModal({ open, staff, onClose, onSubmit, isLoading }: any) {
  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
  });

  useEffect(() => {
    if (open && staff) {
      form.reset({
        name: staff.user.name,
        phone: staff.user.phone || "",
        role: staff.user.role,
        position: staff.position,
        department: staff.department || "",
        salary: staff.salary ? Number(staff.salary) : undefined,
      });
    }
  }, [open, staff, form]);

  const submitHandler = (data: any) => {
    onSubmit({ staffId: staff.id, userId: staff.user.id, ...data });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) onClose();
      }}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none rounded-2xl shadow-2xl">
        <div className="bg-slate-50 p-6 border-b border-slate-100">
          <DialogTitle className="text-xl font-bold text-slate-800">
            Edit Details
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 mt-1">
            Updating profile for {staff?.user?.name}
          </DialogDescription>
        </div>
        <form
          onSubmit={form.handleSubmit(submitHandler)}
          className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                Full Name
              </Label>
              <Input {...form.register("name")} className="h-10 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Phone</Label>
              <Input {...form.register("phone")} className="h-10 rounded-xl" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                System Role
              </Label>
              <Select
                onValueChange={(val: any) => form.setValue("role", val)}
                defaultValue={form.getValues("role")}>
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="TECHNICIAN">Technician</SelectItem>
                  <SelectItem value="RECEPTIONIST">Receptionist</SelectItem>
                  <SelectItem value="LAB_MANAGER">Lab Manager</SelectItem>
                  <SelectItem value="DOCTOR">Doctor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                Position Title
              </Label>
              <Input
                {...form.register("position")}
                className="h-10 rounded-xl"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                Department
              </Label>
              <Input
                {...form.register("department")}
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Salary</Label>
              <Input
                {...form.register("salary")}
                type="number"
                className="h-10 rounded-xl"
              />
            </div>
          </div>
          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="rounded-xl">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-indigo-600 hover:bg-indigo-700 rounded-xl px-6">
              {isLoading ? (
                <Loader2 className="animate-spin h-4 w-4" />
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// SUB-COMPONENT: CHANGE PASSWORD MODAL
// ==========================================
function ChangePasswordModal({
  open,
  staff,
  onClose,
  onSubmit,
  isLoading,
}: any) {
  const [password, setPassword] = useState("");
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(password);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) {
          onClose();
          setPassword("");
        }
      }}>
      <DialogContent className="sm:max-w-[400px] p-0 border-none rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-amber-500 p-6 flex items-center gap-3 text-white">
          <Key className="h-8 w-8 opacity-80" />
          <div>
            <DialogTitle className="text-xl font-bold">
              Reset Password
            </DialogTitle>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">
              New Password
            </Label>
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="text"
              className="h-10 rounded-xl"
            />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="rounded-xl">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || password.length < 6}
              className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl">
              {isLoading ? (
                <Loader2 className="animate-spin h-4 w-4" />
              ) : (
                "Update Password"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// SUB-COMPONENT: ACTIVITY LOG MODAL
// ==========================================
function ActivityLogModal({ open, staff, onClose }: any) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["staff-activity", staff?.user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/workspace/staff/${staff.user.id}/activity`);
      if (!res.ok) throw new Error("Failed to fetch logs");
      return res.json();
    },
    enabled: !!staff?.user?.id && open, // Only fetch when modal is open
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) onClose();
      }}>
      <DialogContent className="sm:max-w-[500px] p-0 border-none rounded-2xl shadow-2xl overflow-hidden bg-slate-50">
        <div className="bg-white p-6 border-b border-slate-200 flex justify-between items-center">
          <div>
            <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <ActivitySquare className="h-5 w-5 text-indigo-500" /> Activity
              Log
            </DialogTitle>
            <DialogDescription className="text-xs mt-1">
              Recent actions by {staff?.user?.name}
            </DialogDescription>
          </div>
        </div>

        <ScrollArea className="h-[400px] p-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Loader2 className="animate-spin h-6 w-6 mb-2" /> Loading logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
              <Clock className="h-8 w-8 mb-2 opacity-50" /> No activity recorded
              yet.
            </div>
          ) : (
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
              {logs.map((log: any) => (
                <div
                  key={log.id}
                  className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-indigo-100 text-indigo-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    <ActivitySquare className="h-4 w-4" />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                        {log.action.replace("_", " ")}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {format(new Date(log.createdAt), "MMM dd, h:mm a")}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {log.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
