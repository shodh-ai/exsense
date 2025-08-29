"use client";

import React from "react";
import { Button } from "@/components/button";
import { useAdminUsers, useToggleUserDisabled } from "@/hooks/useApi";

export default function AdminUsersPage() {
  const { data: users = [], isLoading, error } = useAdminUsers();
  const toggleMutation = useToggleUserDisabled();

  const toggle = (u: any) => {
    toggleMutation.mutate({ userId: u.id, isDisabled: u.isDisabled });
  };

  return (
    <div className="w-full h-full p-6 overflow-y-auto">
      <h1 className="text-xl font-bold text-[#394169] mb-4">Users</h1>
      {isLoading && <p>Loading users...</p>}
      {error && <p className="text-red-500">{String((error as any)?.message || error)}</p>}
      <ul className="space-y-2">
        {users.map((u) => (
          <li key={u.id} className="p-3 border rounded-lg flex items-center gap-2">
            <span className="flex-1 text-sm text-[#394169]">{u.name || u.email} — {u.role} {u.isDisabled ? "(disabled)" : ""}</span>
            <Button variant="outline" onClick={() => toggle(u)} disabled={toggleMutation.isPending}>
              {u.isDisabled ? "Enable" : "Disable"}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
