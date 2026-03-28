"use client";

import { useState } from "react";
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
  Phone,
  Trash2,
  UserCog,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

// --- VALIDATION SCHEMA ---
const staffSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(10, "Invalid phone"),
  role: z.enum(["TECHNICIAN", "RECEPTIONIST", "DOCTOR"]),
  position: z.string().min(2, "Position title required"),
  department: z.string().optional(),
  salary: z.coerce.number().min(0).optional(),
});

type StaffFormValues = z.infer<typeof staffSchema>;

// ✅ KEY FIX: Must export default function
export default function StaffPage() {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [search, setSearch] = useState("");

  // 1. FETCH STAFF
  const { data: staffList, isLoading } = useQuery({
    queryKey: ["staff"],
    queryFn: async () => {
      const res = await fetch("/api/lab-owner/staff");
      if (!res.ok) throw new Error("Failed to fetch staff");
      return res.json();
    },
  });

  // 2. ADD STAFF MUTATION
  const addMutation = useMutation({
    mutationFn: async (data: StaffFormValues) => {
      const res = await fetch("/api/lab-owner/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      toast.success("Staff added successfully!");
      setIsAddOpen(false);
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // 3. DELETE/UPDATE MUTATION
  const actionMutation = useMutation({
    mutationFn: async ({
      id,
      action,
      data,
    }: {
      id: string;
      action: "DELETE" | "UPDATE";
      data?: any;
    }) => {
      const method = action === "DELETE" ? "DELETE" : "PATCH";
      const body = data ? JSON.stringify(data) : undefined;

      const res = await fetch(`/api/lab-owner/staff/${id}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body,
      });

      if (!res.ok) throw new Error("Action failed");
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.action === "DELETE" ? "Staff removed" : "Staff updated",
      );
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: () => toast.error("Failed to perform action"),
  });

  // Filter Logic
  const filteredStaff = Array.isArray(staffList)
    ? staffList.filter(
        (s: any) =>
          s.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
          s.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
          s.position?.toLowerCase().includes(search.toLowerCase()),
      )
    : [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="h-8 w-8 text-blue-600" /> Staff Management
          </h1>
          <p className="text-slate-500">
            Manage technicians, receptionists, and doctors.
          </p>
        </div>
        <Button
          onClick={() => setIsAddOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 gap-2">
          <Plus className="h-4 w-4" /> Add New Staff
        </Button>
      </div>

      {/* TOOLBAR */}
      <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm max-w-md">
        <Search className="h-4 w-4 text-slate-400 ml-2" />
        <Input
          placeholder="Search staff by name, email..."
          className="border-0 focus-visible:ring-0"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* STAFF TABLE */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Staff Member</TableHead>
              <TableHead>Role & Position</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <Loader2 className="animate-spin h-8 w-8 mx-auto text-blue-600" />
                </TableCell>
              </TableRow>
            ) : filteredStaff.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-32 text-center text-slate-500">
                  No staff found. Add your first member.
                </TableCell>
              </TableRow>
            ) : (
              filteredStaff.map((staff: any) => (
                <TableRow key={staff.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">
                          {staff.user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-bold text-slate-900">
                          {staff.user.name}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {staff.user.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{staff.position}</div>
                    <Badge variant="outline" className="text-[10px] mt-1">
                      {staff.user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{staff.department || "-"}</TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {format(new Date(staff.joinDate), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell>
                    {staff.isActive ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Active
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                        <XCircle className="h-3 w-3 mr-1" /> Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() =>
                            actionMutation.mutate({
                              id: staff.id,
                              action: "UPDATE",
                              data: { isActive: !staff.isActive },
                            })
                          }>
                          <UserCog className="mr-2 h-4 w-4" />{" "}
                          {staff.isActive
                            ? "Deactivate Account"
                            : "Activate Account"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600 focus:bg-red-50"
                          onClick={() => {
                            if (confirm("Remove staff member?"))
                              actionMutation.mutate({
                                id: staff.id,
                                action: "DELETE",
                              });
                          }}>
                          <Trash2 className="mr-2 h-4 w-4" /> Remove Staff
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ADD STAFF MODAL */}
      <AddStaffModal
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSubmit={addMutation.mutate}
        isLoading={addMutation.isPending}
      />
    </div>
  );
}

// --- SUB-COMPONENT: FORM MODAL ---
function AddStaffModal({ open, onOpenChange, onSubmit, isLoading }: any) {
  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: { role: "TECHNICIAN" },
  });

  const handleSubmit = (data: StaffFormValues) => {
    onSubmit(data);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Staff Member</DialogTitle>
          <DialogDescription>
            Create a user account and assign a role. Default password will be{" "}
            <span className="font-mono bg-slate-100 px-1 rounded">
              Password@123
            </span>
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Full Name</Label>
              <Input {...form.register("name")} placeholder="e.g. John Doe" />
              {form.formState.errors.name && (
                <p className="text-red-500 text-xs">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input {...form.register("phone")} placeholder="9876543210" />
              {form.formState.errors.phone && (
                <p className="text-red-500 text-xs">
                  {form.formState.errors.phone.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Email (Login ID)</Label>
            <Input
              {...form.register("email")}
              type="email"
              placeholder="john@lab.com"
            />
            {form.formState.errors.email && (
              <p className="text-red-500 text-xs">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>System Role</Label>
              <Select
                onValueChange={(val: any) => form.setValue("role", val)}
                defaultValue="TECHNICIAN">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TECHNICIAN">Technician</SelectItem>
                  <SelectItem value="RECEPTIONIST">Receptionist</SelectItem>
                  <SelectItem value="DOCTOR">Doctor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Position Title</Label>
              <Input
                {...form.register("position")}
                placeholder="e.g. Senior Phlebotomist"
              />
              {form.formState.errors.position && (
                <p className="text-red-500 text-xs">
                  {form.formState.errors.position.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Department</Label>
              <Input
                {...form.register("department")}
                placeholder="e.g. Hematology"
              />
            </div>
            <div className="space-y-1">
              <Label>Salary (Monthly)</Label>
              <Input
                {...form.register("salary")}
                type="number"
                placeholder="0.00"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 w-full">
              {isLoading ? (
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Create Account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
