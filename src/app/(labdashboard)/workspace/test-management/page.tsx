"use client";

import { Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FlaskConical,
  TestTube,
  Layers,
  ListTree,
  FileText,
  TableProperties,
  Cylinder,
  BookOpen,
} from "lucide-react";

// Import all tab components
import DepartmentsTab from "./tabs/departments-tab";
import SamplesTab from "./tabs/samples-tab";
import HeadingsTab from "./tabs/headings-tab";
import TestsTab from "./tabs/tests-tab";
import ParametersTab from "./tabs/parameters-tab";
import CustomFieldsTab from "./tabs/custom-fields-tab";
import ContainersTab from "./tabs/containers-tab";
import GuideTab from "./tabs/guide";

function TestManagementContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read the active tab from the URL, default to "tests"
  const activeTab = searchParams.get("tab") || "tests";

  // Update the URL whenever a user clicks a new tab
  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    // Using replace instead of push keeps the browser history clean
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Reusable High-Contrast Class for Standard Tabs
  const standardTabClass =
    "shrink-0 whitespace-nowrap flex items-center px-4 py-2.5 h-10 rounded-md transition-all font-medium text-sm border shadow-sm " +
    "bg-card text-muted-foreground border-border hover:bg-muted/30 hover:text-foreground " +
    "data-[state=active]:bg-blue-700 data-[state=active]:text-primary-foreground data-[state=active]:border-blue-700 data-[state=active]:shadow-md";

  return (
    <div className="flex-1 space-y-4 md:space-y-6 p-4 md:p-6 pt-6 max-w-[1600px] mx-auto w-full">
      {/* Page Header - Scales down on mobile */}
      <div className="flex flex-col gap-1.5 md:gap-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          Test Management
        </h1>
        <p className="text-sm md:text-base text-muted-foreground max-w-3xl">
          Manage your test menu, parameters, reference ranges, and global
          pricing overrides.
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full space-y-4 md:space-y-6">
        {/* MOBILE RESPONSIVE TAB LIST */}
        <div className="w-full overflow-x-auto pb-3 -mx-4 px-4 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <TabsList className="flex h-auto w-max md:w-full justify-start gap-2.5 bg-transparent p-0">
            <TabsTrigger value="tests" className={standardTabClass}>
              <FileText className="mr-2 h-4 w-4" /> Tests & Pricing
            </TabsTrigger>

            <TabsTrigger value="parameters" className={standardTabClass}>
              <ListTree className="mr-2 h-4 w-4" /> Parameters
            </TabsTrigger>

            <TabsTrigger value="custom-fields" className={standardTabClass}>
              <TableProperties className="mr-2 h-4 w-4" /> Custom Fields
            </TabsTrigger>

            <TabsTrigger value="headings" className={standardTabClass}>
              <Layers className="mr-2 h-4 w-4" /> Headings
            </TabsTrigger>

            <TabsTrigger value="containers" className={standardTabClass}>
              <Cylinder className="mr-2 h-4 w-4" /> Containers
            </TabsTrigger>

            <TabsTrigger value="samples" className={standardTabClass}>
              <TestTube className="mr-2 h-4 w-4" /> Sample Types
            </TabsTrigger>

            <TabsTrigger value="departments" className={standardTabClass}>
              <FlaskConical className="mr-2 h-4 w-4" /> Departments
            </TabsTrigger>

            {/* GUIDE TAB (Distinctive Green Theme) */}
            <TabsTrigger
              value="guide"
              className={
                "shrink-0 whitespace-nowrap flex items-center md:ml-auto px-4 py-2.5 h-10 rounded-md transition-all font-medium text-sm border shadow-sm " +
                "bg-emerald-50 text-primary border-emerald-200 hover:bg-emerald-100 hover:text-emerald-800 " +
                "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-emerald-600 data-[state=active]:shadow-md"
              }>
              <BookOpen className="mr-2 h-4 w-4" /> How to Use
            </TabsTrigger>
          </TabsList>
        </div>

        {/* --- TAB CONTENT AREAS --- */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-0 md:p-1 overflow-hidden">
          <TabsContent
            value="tests"
            className="m-0 border-none p-0 outline-none focus-visible:ring-0">
            <TestsTab />
          </TabsContent>

          <TabsContent
            value="parameters"
            className="m-0 border-none p-0 outline-none focus-visible:ring-0">
            <ParametersTab />
          </TabsContent>

          <TabsContent
            value="custom-fields"
            className="m-0 border-none p-0 outline-none focus-visible:ring-0">
            <CustomFieldsTab />
          </TabsContent>

          <TabsContent
            value="headings"
            className="m-0 border-none p-0 outline-none focus-visible:ring-0">
            <HeadingsTab />
          </TabsContent>

          <TabsContent
            value="containers"
            className="m-0 border-none p-0 outline-none focus-visible:ring-0">
            <ContainersTab />
          </TabsContent>

          <TabsContent
            value="samples"
            className="m-0 border-none p-0 outline-none focus-visible:ring-0">
            <SamplesTab />
          </TabsContent>

          <TabsContent
            value="departments"
            className="m-0 border-none p-0 outline-none focus-visible:ring-0">
            <DepartmentsTab />
          </TabsContent>

          <TabsContent
            value="guide"
            className="m-0 border-none p-0 outline-none focus-visible:ring-0">
            <GuideTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

// Export a wrapper that provides the Suspense boundary
export default function TestManagementPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-muted-foreground animate-pulse">
            Loading Module Configuration...
          </p>
        </div>
      }>
      <TestManagementContent />
    </Suspense>
  );
}
