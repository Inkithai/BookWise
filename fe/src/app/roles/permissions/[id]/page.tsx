// app/roles/permissions/[id]/page.tsx
// app/roles/permissions/[id]/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from '@/components/common/sidebar/Sidebar';
import { Footer } from '@/components/common/Footer';
import { RefreshCw } from "lucide-react";
import PermissionsTable from "@/components/roles/permission/PermissionsTable";
import { roleService } from "@/services/service"; // Add this import
import { toast } from "sonner";

export default function Page() {
  const params = useParams();
  const router = useRouter();
  const roleId = parseInt(params.id as string, 10);
  const [roleName, setRoleName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const fetchRoleName = async () => {
    if (!roleId || isNaN(roleId)) {
      toast.error("Invalid role ID");
      router.push("/roles");
      return;
    }

    try {
      const response = await roleService.getRoleById(roleId); // Use roleService.getRoleById
      setRoleName(response.data.data.name);
    } catch (error) {
      toast.error("Failed to fetch role details");
      console.error(error);
      router.push("/roles");
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchRoleName();
  }, [roleId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <div className="flex flex-1">
          <Sidebar />
          <div className="flex-1 overflow-x-hidden flex flex-col">
            <main className="flex-1 p-6">
              <div className="flex justify-center items-center h-48">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading role details...</span>
              </div>
            </main>
            <Footer />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 overflow-x-hidden flex flex-col">
          <main className="flex-1 p-6">
            <div className="space-y-6">
              <PermissionsTable roleId={roleId} roleName={roleName} />
            </div>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}