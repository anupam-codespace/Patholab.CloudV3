"use client";

import { createContext, useContext } from "react";

const WorkspaceDataContext = createContext<any>(null);

export function WorkspaceDataProvider({
  children,
  initialData,
}: {
  children: React.ReactNode;
  initialData: any;
}) {
  return (
    <WorkspaceDataContext.Provider value={initialData}>
      {children}
    </WorkspaceDataContext.Provider>
  );
}

export function useWorkspaceData() {
  return useContext(WorkspaceDataContext);
}
