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
// Note: CatalogTab has been safely removed since we unified the UI!

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

  return (
    <div className="flex-1 space-y-4 md:space-y-6 p-4 md:p-6 pt-6 max-w-[1600px] mx-auto w-full">
      {/* Page Header - Scales down on mobile */}
      <div className="flex flex-col gap-1.5 md:gap-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
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
        <div className="w-full overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <TabsList className="flex h-auto w-max md:w-full justify-start gap-2 bg-transparent p-0">
            {/* Unified Tests & Pricing Tab */}
            <TabsTrigger
              value="tests"
              className="shrink-0 whitespace-nowrap data-[state=active]:bg-blue-600 data-[state=active]:text-white px-4 py-2.5 h-10 border shadow-sm rounded-md transition-all">
              <FileText className="mr-2 h-4 w-4" /> Tests & Pricing
            </TabsTrigger>

            <TabsTrigger
              value="parameters"
              className="shrink-0 whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2.5 h-10 border shadow-sm rounded-md transition-all">
              <ListTree className="mr-2 h-4 w-4" /> Parameters
            </TabsTrigger>

            <TabsTrigger
              value="custom-fields"
              className="shrink-0 whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2.5 h-10 border shadow-sm rounded-md transition-all">
              <TableProperties className="mr-2 h-4 w-4" /> Custom Fields
            </TabsTrigger>

            <TabsTrigger
              value="headings"
              className="shrink-0 whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2.5 h-10 border shadow-sm rounded-md transition-all">
              <Layers className="mr-2 h-4 w-4" /> Headings
            </TabsTrigger>

            <TabsTrigger
              value="containers"
              className="shrink-0 whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2.5 h-10 border shadow-sm rounded-md transition-all">
              <Cylinder className="mr-2 h-4 w-4" /> Containers
            </TabsTrigger>

            <TabsTrigger
              value="samples"
              className="shrink-0 whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2.5 h-10 border shadow-sm rounded-md transition-all">
              <TestTube className="mr-2 h-4 w-4" /> Sample Types
            </TabsTrigger>

            <TabsTrigger
              value="departments"
              className="shrink-0 whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2.5 h-10 border shadow-sm rounded-md transition-all">
              <FlaskConical className="mr-2 h-4 w-4" /> Departments
            </TabsTrigger>

            {/* GUIDE TAB */}
            <TabsTrigger
              value="guide"
              className="shrink-0 whitespace-nowrap md:ml-auto bg-slate-100 data-[state=active]:bg-emerald-600 data-[state=active]:text-white border-emerald-200 text-emerald-700 px-4 py-2.5 h-10 border shadow-sm rounded-md transition-all">
              <BookOpen className="mr-2 h-4 w-4" /> How to Use
            </TabsTrigger>
          </TabsList>
        </div>

        {/* --- TAB CONTENT AREAS --- */}
        <TabsContent
          value="tests"
          className="space-y-4 border-none p-0 mt-2 md:mt-0 outline-none focus-visible:ring-0">
          <TestsTab />
        </TabsContent>

        <TabsContent
          value="parameters"
          className="space-y-4 border-none p-0 mt-2 md:mt-0 outline-none focus-visible:ring-0">
          <ParametersTab />
        </TabsContent>

        <TabsContent
          value="custom-fields"
          className="space-y-4 border-none p-0 mt-2 md:mt-0 outline-none focus-visible:ring-0">
          <CustomFieldsTab />
        </TabsContent>

        <TabsContent
          value="headings"
          className="border-none p-0 mt-2 md:mt-0 outline-none focus-visible:ring-0">
          <HeadingsTab />
        </TabsContent>

        <TabsContent
          value="containers"
          className="border-none p-0 mt-2 md:mt-0 outline-none focus-visible:ring-0">
          <ContainersTab />
        </TabsContent>

        <TabsContent
          value="samples"
          className="border-none p-0 mt-2 md:mt-0 outline-none focus-visible:ring-0">
          <SamplesTab />
        </TabsContent>

        <TabsContent
          value="departments"
          className="border-none p-0 mt-2 md:mt-0 outline-none focus-visible:ring-0">
          <DepartmentsTab />
        </TabsContent>

        <TabsContent
          value="guide"
          className="border-none p-0 mt-2 md:mt-0 outline-none focus-visible:ring-0">
          <GuideTab />
        </TabsContent>
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
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-500 animate-pulse">
            Loading Module Configuration...
          </p>
        </div>
      }>
      <TestManagementContent />
    </Suspense>
  );
}
