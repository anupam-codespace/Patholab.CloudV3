"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export function DeleteTestButton({ testId }: { testId: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to archive this test? It will no longer be available for new bookings.",
      )
    )
      return;

    setIsDeleting(true);
    toast.loading("Archiving test...", { id: "delete-test" });

    try {
      const res = await fetch(`/api/admin/global-tests/${testId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");

      toast.success("Test archived successfully", { id: "delete-test" });
      router.refresh(); // Refresh the server component table
    } catch (error) {
      toast.error("Error archiving test", { id: "delete-test" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      disabled={isDeleting}
      className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50">
      {isDeleting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </Button>
  );
}
