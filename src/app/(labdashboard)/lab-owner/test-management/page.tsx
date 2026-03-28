'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FlaskConical, 
  TestTube, 
  Layers, 
  ListTree, 
  FileText, 
  TableProperties, 
  Cylinder, 
  BookOpen // ✅ Import Icon for Guide
} from "lucide-react";

// Import all tab components
import DepartmentsTab from "./tabs/departments-tab";
import SamplesTab from "./tabs/samples-tab";
import HeadingsTab from "./tabs/headings-tab";
import TestsTab from "./tabs/tests-tab";
import ParametersTab from "./tabs/parameters-tab"; 
import CustomFieldsTab from "./tabs/custom-fields-tab";
import ContainersTab from "./tabs/containers-tab"; 
import GuideTab from "./tabs/guide"; // ✅ Import the Guide Tab

export default function TestManagementPage() {
  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Test Management</h1>
        <p className="text-muted-foreground">
          Manage your test menu, parameters, reference ranges, and master data.
        </p>
      </div>

      {/* Main Tab Interface */}
      <Tabs defaultValue="tests" className="space-y-4">
        
        {/* Scrollable Tab List */}
        <div className="overflow-x-auto pb-2">
            <TabsList className="h-12 w-full justify-start gap-2 bg-transparent p-0">
                <TabsTrigger value="tests" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 h-10 border shadow-sm">
                    <FileText className="mr-2 h-4 w-4" /> Tests
                </TabsTrigger>
                <TabsTrigger value="parameters" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 h-10 border shadow-sm">
                    <ListTree className="mr-2 h-4 w-4" /> Parameters
                </TabsTrigger>
                
                <TabsTrigger value="custom-fields" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 h-10 border shadow-sm">
                    <TableProperties className="mr-2 h-4 w-4" /> Custom Fields
                </TabsTrigger>

                <TabsTrigger value="headings" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 h-10 border shadow-sm">
                    <Layers className="mr-2 h-4 w-4" /> Headings
                </TabsTrigger>
                
                <TabsTrigger value="containers" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 h-10 border shadow-sm">
                    <Cylinder className="mr-2 h-4 w-4" /> Containers
                </TabsTrigger>

                <TabsTrigger value="samples" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 h-10 border shadow-sm">
                    <TestTube className="mr-2 h-4 w-4" /> Sample Types
                </TabsTrigger>
                <TabsTrigger value="departments" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 h-10 border shadow-sm">
                    <FlaskConical className="mr-2 h-4 w-4" /> Departments
                </TabsTrigger>

                {/* ✅ NEW: GUIDE TAB TRIGGER (Right Aligned or distinct) */}
                <TabsTrigger value="guide" className="ml-auto bg-slate-100 data-[state=active]:bg-emerald-600 data-[state=active]:text-white border-emerald-200 text-emerald-700 px-4 py-2 h-10 border shadow-sm">
                    <BookOpen className="mr-2 h-4 w-4" /> How to Use
                </TabsTrigger>
            </TabsList>
        </div>

        {/* --- TAB CONTENT --- */}
        
        {/* 1. TEST MENU */}
        <TabsContent value="tests" className="space-y-4">
            <TestsTab />
        </TabsContent>

        {/* 2. PARAMETER LIBRARY */}
        <TabsContent value="parameters" className="space-y-4">
            <ParametersTab />
        </TabsContent>

        {/* 3. CUSTOM FIELDS */}
        <TabsContent value="custom-fields" className="space-y-4">
            <CustomFieldsTab />
        </TabsContent>

        {/* 4. TEST HEADINGS */}
        <TabsContent value="headings">
            <HeadingsTab />
        </TabsContent>

        {/* 5. CONTAINERS */}
        <TabsContent value="containers">
            <ContainersTab />
        </TabsContent>

        {/* 6. SAMPLE TYPES */}
        <TabsContent value="samples">
            <SamplesTab />
        </TabsContent>

        {/* 7. DEPARTMENTS */}
        <TabsContent value="departments">
            <DepartmentsTab />
        </TabsContent>

        {/* ✅ 8. GUIDE TAB CONTENT */}
        <TabsContent value="guide">
            <GuideTab />
        </TabsContent>

      </Tabs>
    </div>
  );
}