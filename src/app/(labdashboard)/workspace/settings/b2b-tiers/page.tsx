"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Trash2,
  Save,
  Shield,
  Loader2,
  CheckCircle2,
  Info,
  Layers,
} from "lucide-react";
import toast from "react-hot-toast";

// Import Server Actions
import { getTierRules, updateTierRules } from "@/actions/b2b-tier-settings";
import { getTests } from "@/actions/test-catalog";

const TIERS = [
  { id: "STANDARD", label: "Standard", color: "bg-gray-100 text-gray-700" },
  { id: "BRONZE", label: "Bronze", color: "bg-amber-100 text-amber-800" },
  { id: "SILVER", label: "Silver", color: "bg-slate-200 text-slate-800" },
  { id: "GOLD", label: "Gold", color: "bg-yellow-100 text-yellow-700" },
  { id: "PLATINUM", label: "Platinum", color: "bg-indigo-100 text-primary" },
];

export default function B2BTiersSettingsPage() {
  const queryClient = useQueryClient();
  const [activeTier, setActiveTier] = useState("GOLD");

  const [tierRules, setTierRules] = useState<Record<string, any[]>>({});
  const [testSearch, setTestSearch] = useState("");

  // 1. Fetch Catalog
  const { data: allTests, isLoading: isTestsLoading } = useQuery({
    queryKey: ["tests"],
    queryFn: async () => await getTests(),
  });

  // 2. Fetch Existing Rules
  const { data: dbRules, isLoading: isRulesLoading } = useQuery({
    queryKey: ["tierRules"],
    queryFn: async () => await getTierRules(),
  });

  // Sync DB rules to local state when fetched
  useEffect(() => {
    if (dbRules) {
      setTierRules(dbRules);
    }
  }, [dbRules]);

  // 3. Save Mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: { tier: string; rules: any[] }) => {
      await updateTierRules(payload.tier, payload.rules);
    },
    onSuccess: () => {
      toast.success(`${activeTier} tier rules saved successfully!`);
      queryClient.invalidateQueries({ queryKey: ["tierRules"] });
    },
    onError: () => toast.error("Failed to save tier rules."),
  });

  // --- ACTIONS ---

  const addTestToTier = (test: any) => {
    const currentRules = tierRules[activeTier] || [];
    if (currentRules.some((r) => r.testTemplateId === test.id)) {
      return toast.error("Test is already configured for this tier.");
    }
    const updatedRules = [
      ...currentRules,
      {
        testTemplateId: test.id,
        testName: test.name,
        basePrice: test.price,
        ruleType: "NET_PRICE",
        value: test.price,
      },
    ];
    setTierRules({ ...tierRules, [activeTier]: updatedRules });
    setTestSearch("");
  };

  // ✅ NEW: Bulk Add All Tests to Active Tier
  const handleAddAllTests = () => {
    if (!allTests || allTests.length === 0)
      return toast.error("No tests in catalog");

    const currentRules = tierRules[activeTier] || [];
    const existingTestIds = new Set(currentRules.map((r) => r.testTemplateId));

    // Find tests that aren't already in the list
    const newRules = allTests
      .filter((t: any) => !existingTestIds.has(t.id))
      .map((t: any) => ({
        testTemplateId: t.id,
        testName: t.name,
        basePrice: t.price,
        ruleType: "NET_PRICE",
        value: t.price,
      }));

    if (newRules.length === 0) {
      return toast.success("All tests are already added.");
    }

    setTierRules({
      ...tierRules,
      [activeTier]: [...currentRules, ...newRules],
    });
    toast.success(`Added ${newRules.length} tests to ${activeTier} Tier`);
  };

  // ✅ NEW: Clear All Tests from Active Tier
  const handleClearAll = () => {
    if (
      confirm(`Are you sure you want to clear all rules for ${activeTier}?`)
    ) {
      setTierRules({ ...tierRules, [activeTier]: [] });
    }
  };

  const updateRule = (index: number, field: string, val: any) => {
    const updatedRules = [...(tierRules[activeTier] || [])];
    updatedRules[index][field] = val;
    setTierRules({ ...tierRules, [activeTier]: updatedRules });
  };

  const removeRule = (index: number) => {
    const updatedRules = (tierRules[activeTier] || []).filter(
      (_, i) => i !== index,
    );
    setTierRules({ ...tierRules, [activeTier]: updatedRules });
  };

  const handleSave = () => {
    saveMutation.mutate({
      tier: activeTier,
      rules: tierRules[activeTier] || [],
    });
  };

  if (isRulesLoading) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-card p-6 rounded-2xl shadow-sm border border-border gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center shadow-inner">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              B2B Tier Configuration
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Define global master rules for B2B net pricing and commission
              margins.
            </p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md w-full md:w-auto">
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save {activeTier} Tier
        </Button>
      </div>

      <div className="bg-primary/10 border border-blue-100 rounded-xl p-4 flex gap-3 text-blue-800 text-sm">
        <Info className="h-5 w-5 text-primary shrink-0" />
        <p>
          <strong>How Tiers Work:</strong> When you assign an agency to a tier
          (e.g., GOLD), the system will apply these pricing rules automatically.
          If a test is not listed here, the agency's{" "}
          <em>Profile Default Margin</em> applies.
        </p>
      </div>

      {/* TIER TABS & WORKSPACE */}
      <Card className="shadow-sm border-border overflow-hidden">
        <Tabs
          value={activeTier}
          onValueChange={setActiveTier}
          className="w-full">
          <div className="px-6 pt-4 border-b border-slate-100 bg-slate-50/50 overflow-x-auto">
            <TabsList className="bg-transparent h-auto gap-6 p-0 min-w-max">
              {TIERS.map((tier) => (
                <TabsTrigger
                  key={tier.id}
                  value={tier.id}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-1 text-sm font-bold data-[state=active]:text-primary text-muted-foreground">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] mr-2 ${tier.color}`}>
                    {tier.label}
                  </span>
                  Config
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {TIERS.map((tier) => (
            <TabsContent
              key={tier.id}
              value={tier.id}
              className="m-0 focus-visible:outline-none">
              <div className="p-6 space-y-6">
                {/* TOOLBAR: SEARCH & BULK ACTIONS */}
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-muted/30 p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="w-full md:w-80 relative z-10">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search to add single test..."
                        className="pl-9 bg-card border-border shadow-sm"
                        value={testSearch}
                        onChange={(e) => setTestSearch(e.target.value)}
                      />
                      {testSearch && (
                        <div className="absolute top-11 left-0 w-full bg-card border border-border rounded-lg shadow-xl max-h-48 overflow-y-auto z-50">
                          {isTestsLoading ? (
                            <div className="p-4 text-center text-sm">
                              Loading...
                            </div>
                          ) : (
                            allTests
                              ?.filter((t: any) =>
                                t.name
                                  .toLowerCase()
                                  .includes(testSearch.toLowerCase()),
                              )
                              .map((t: any) => (
                                <div
                                  key={t.id}
                                  onClick={() => addTestToTier(t)}
                                  className="p-3 text-sm border-b hover:bg-primary/10 cursor-pointer flex justify-between items-center">
                                  <span className="font-semibold">
                                    {t.name}
                                  </span>
                                  <span className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                                    ₹{t.price}
                                  </span>
                                </div>
                              ))
                          )}
                        </div>
                      )}
                    </div>

                    {/* ✅ BULK ACTION BUTTONS */}
                    <Button
                      variant="outline"
                      onClick={handleAddAllTests}
                      className="bg-card border-border text-foreground/80 hover:text-primary">
                      <Layers className="h-4 w-4 mr-2 text-blue-500" /> Add All
                      Catalog Tests
                    </Button>
                    {(tierRules[tier.id] || []).length > 0 && (
                      <Button
                        variant="ghost"
                        onClick={handleClearAll}
                        className="text-red-600 hover:bg-red-50">
                        Clear All
                      </Button>
                    )}
                  </div>

                  <div className="text-sm text-muted-foreground font-medium flex items-center shrink-0">
                    <CheckCircle2 className="h-4 w-4 mr-1.5 text-emerald-500" />
                    {(tierRules[tier.id] || []).length} Active Rules
                  </div>
                </div>

                {/* RULES TABLE */}
                <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="font-semibold text-muted-foreground h-10">
                          Test Name
                        </TableHead>
                        <TableHead className="font-semibold text-muted-foreground h-10">
                          Base MRP
                        </TableHead>
                        <TableHead className="font-semibold text-muted-foreground h-10 w-48">
                          Rule Type
                        </TableHead>
                        <TableHead className="font-semibold text-muted-foreground h-10 w-36">
                          Value
                        </TableHead>
                        <TableHead className="h-10 w-12 text-right">
                          Action
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(tierRules[tier.id] || []).length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center py-12 text-muted-foreground bg-slate-50/30">
                            <p className="text-base font-semibold text-slate-700">
                              No specific rules configured.
                            </p>
                            <p className="text-sm mt-1">
                              Search for a test or click "Add All" to generate
                              rules.
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        (tierRules[tier.id] || []).map((rule, index) => (
                          <TableRow
                            key={index}
                            className="hover:bg-muted/50/50 group transition-colors">
                            <TableCell className="font-semibold text-sm text-slate-800">
                              {rule.testName}
                            </TableCell>
                            <TableCell className="text-muted-foreground font-mono text-xs">
                              ₹{rule.basePrice}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={rule.ruleType}
                                onValueChange={(v) =>
                                  updateRule(index, "ruleType", v)
                                }>
                                <SelectTrigger className="h-8 text-xs bg-card shadow-sm border-border">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="NET_PRICE">
                                    B2B Net Price (₹)
                                  </SelectItem>
                                  <SelectItem value="PERCENTAGE">
                                    Discount Margin (%)
                                  </SelectItem>
                                  <SelectItem value="FIXED">
                                    Discount Flat (₹)
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/70 text-xs font-bold">
                                  {rule.ruleType === "PERCENTAGE" ? "%" : "₹"}
                                </span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  className={`h-8 text-xs font-bold pl-7 ${
                                    rule.ruleType === "NET_PRICE"
                                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                      : "border-primary/20"
                                  }`}
                                  value={rule.value}
                                  onChange={(e) =>
                                    updateRule(
                                      index,
                                      "value",
                                      Number(e.target.value),
                                    )
                                  }
                                />
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeRule(index)}
                                className="h-8 w-8 text-muted-foreground/70 opacity-0 group-hover:opacity-100 hover:text-red-600 hover:bg-red-50">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </Card>
    </div>
  );
}
