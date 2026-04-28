"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  UserPlus,
  Phone,
  History,
  User,
  ArrowRight,
  Loader2,
  Fingerprint,
  ScanBarcode,
  Activity,
  Receipt,
  Calendar,
  FlaskConical,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import toast from "react-hot-toast";
import { format } from "date-fns";

// --- SAFE DATE FORMATTER ---
const safeFormatDate = (dateValue: string | Date | null | undefined) => {
  if (!dateValue) return "Unknown Date";

  const d = new Date(dateValue);
  // Check if the resulting date object is actually valid
  if (isNaN(d.getTime())) return "Invalid Date";

  return format(d, "dd MMM yyyy");
};

export default function RegistrationSearchPage() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState("PHONE");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // --- SEARCH HANDLER ---
  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch(
        `/api/workspace/patients/search?query=${query}&type=${searchType}`,
      );
      const data = await res.json();
      const safeArray = Array.isArray(data) ? data : data?.data || [];
      setResults(safeArray);
    } catch (error) {
      toast.error("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // --- ACTIONS ---
  const proceedToAccession = (patientId: string) => {
    router.push(
      `/workspace/accession?patientId=${patientId}&doc=Self&agency=Direct`,
    );
  };

  const createNewPatient = () => {
    router.push(`/workspace/patients/new?phone=${query}`);
  };

  return (
    <div className="min-h-[calc(100vh-theme(spacing.16))] bg-slate-50 flex flex-col items-center py-12 px-4 sm:px-6 relative selection:bg-indigo-100 font-sans">
      {/* Decorative Background Mesh */}
      <div className="absolute top-0 inset-x-0 h-[500px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/50 via-slate-50 to-transparent pointer-events-none z-0" />

      {/* 1. HERO SEARCH SECTION */}
      <div className="w-full max-w-3xl text-center space-y-8 mb-12 z-10 relative">
        <div className="space-y-3">
          <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-sm border border-slate-200/60 mb-2">
            <UserPlus className="h-6 w-6 text-indigo-600" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Patient Registration
          </h1>
          <p className="text-slate-500 font-medium max-w-lg mx-auto">
            Search the database for existing records before initiating a new
            visit to prevent duplicates.
          </p>
        </div>

        {/* The "Omnibar" Search */}
        <div className="bg-white p-2 rounded-2xl shadow-lg shadow-indigo-500/5 border border-slate-200/80 flex flex-col sm:flex-row items-center gap-2 transition-all duration-300 focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-300 mx-auto w-full">
          <form
            onSubmit={handleSearch}
            className="w-full flex flex-col sm:flex-row items-center gap-2">
            <div className="w-full sm:w-[160px] shrink-0 relative">
              <Select value={searchType} onValueChange={setSearchType}>
                <SelectTrigger className="w-full h-12 border-0 bg-slate-50/50 hover:bg-slate-100 focus:ring-0 font-bold text-slate-700 rounded-xl text-sm transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-xl border-slate-100">
                  <SelectItem value="PHONE" className="font-medium">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-indigo-500" /> Phone
                    </div>
                  </SelectItem>
                  <SelectItem value="NAME" className="font-medium">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-indigo-500" /> Name
                    </div>
                  </SelectItem>
                  <SelectItem value="ABHA" className="font-medium">
                    <div className="flex items-center gap-2">
                      <Fingerprint className="h-4 w-4 text-indigo-500" /> ABHA
                      ID
                    </div>
                  </SelectItem>
                  <SelectItem value="AADHAAR" className="font-medium">
                    <div className="flex items-center gap-2">
                      <ScanBarcode className="h-4 w-4 text-indigo-500" />{" "}
                      Aadhaar
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="hidden sm:block w-px h-8 bg-slate-200 mx-1"></div>

            <div className="flex-1 w-full relative">
              <Input
                placeholder={
                  searchType === "PHONE"
                    ? "Enter 10-digit mobile number..."
                    : "Enter search query..."
                }
                className="w-full h-12 border-0 focus-visible:ring-0 text-base sm:text-lg px-4 shadow-none bg-transparent placeholder:text-slate-400 font-medium"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full sm:w-auto h-12 bg-indigo-600 hover:bg-indigo-700 text-white px-8 rounded-xl shadow-md font-bold transition-all"
              disabled={loading}>
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Search className="h-5 w-5 sm:mr-2" />{" "}
                  <span className="hidden sm:inline">Search</span>
                </>
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* 2. RESULTS SECTION */}
      <div className="w-full max-w-5xl space-y-6 z-10 relative">
        {/* CASE A: NO RESULTS FOUND (SHOW CREATE OPTION) */}
        {hasSearched && results.length === 0 && !loading && (
          <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-xl shadow-indigo-500/5 border border-slate-100 max-w-md mx-auto relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <UserPlus className="h-32 w-32" />
              </div>
              <div className="relative z-10">
                <div className="h-16 w-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-indigo-100">
                  <Search className="h-8 w-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  No Patient Found
                </h3>
                <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                  We couldn't find a record matching{" "}
                  <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                    {query}
                  </span>{" "}
                  in the database.
                </p>
                <Button
                  onClick={createNewPatient}
                  size="lg"
                  className="w-full h-12 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-md shadow-indigo-500/25 rounded-xl font-bold text-base transition-all duration-300 hover:-translate-y-0.5">
                  <UserPlus className="mr-2 h-5 w-5" /> Register New Patient
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* CASE B: RESULTS FOUND */}
        {results.map((patient) => {
          const initials = patient.name
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .substring(0, 2)
            .toUpperCase();

          return (
            <Card
              key={patient.id}
              className="overflow-hidden border-0 shadow-lg shadow-slate-200/50 rounded-2xl animate-in fade-in slide-in-from-bottom-4 duration-500 hover:shadow-xl transition-all group">
              <div className="grid grid-cols-1 lg:grid-cols-12">
                {/* PATIENT INFO (Left) */}
                <div className="col-span-12 lg:col-span-4 bg-gradient-to-br from-slate-50 to-slate-100/50 p-6 lg:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200/60 relative overflow-hidden">
                  {/* Subtle Side Accent */}
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-600" />

                  <div>
                    <div className="flex items-center gap-4 mb-6">
                      <Avatar className="h-16 w-16 border-4 border-white shadow-sm">
                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold text-xl">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 leading-tight">
                          {patient.name}
                        </h3>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">
                          {patient.age} {patient.ageUnit?.slice(0, 1)} •{" "}
                          {patient.gender}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500 font-medium flex items-center gap-2">
                          <Fingerprint className="h-4 w-4 text-slate-400" />{" "}
                          Patient ID
                        </span>
                        <span className="font-mono font-bold text-indigo-600">
                          {patient.patientId}
                        </span>
                      </div>
                      <Separator className="bg-slate-100" />
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500 font-medium flex items-center gap-2">
                          <Phone className="h-4 w-4 text-slate-400" /> Phone
                        </span>
                        <span className="font-mono font-bold text-slate-700">
                          {patient.phone}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8">
                    <Button
                      onClick={() => proceedToAccession(patient.id)}
                      className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-md font-bold group-hover:shadow-lg transition-all">
                      Start New Visit{" "}
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </div>
                </div>

                {/* HISTORY TABS (Right) */}
                <div className="col-span-12 lg:col-span-8 p-6 lg:p-8 bg-white">
                  <Tabs defaultValue="tests" className="w-full">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <History className="h-5 w-5 text-indigo-500" /> Recent
                        History
                      </h4>

                      {/* Premium Pill Tabs */}
                      <div className="bg-slate-100/80 p-1 rounded-xl inline-flex w-full sm:w-auto border border-slate-200/50">
                        <TabsList className="grid w-full sm:w-[240px] grid-cols-2 bg-transparent p-0 gap-1 h-auto">
                          <TabsTrigger
                            value="tests"
                            className="data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm rounded-lg py-2 text-xs font-bold transition-all text-slate-500">
                            <FlaskConical className="h-3.5 w-3.5 mr-1.5" />{" "}
                            Tests
                          </TabsTrigger>
                          <TabsTrigger
                            value="billing"
                            className="data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm rounded-lg py-2 text-xs font-bold transition-all text-slate-500">
                            <Receipt className="h-3.5 w-3.5 mr-1.5" /> Billing
                          </TabsTrigger>
                        </TabsList>
                      </div>
                    </div>

                    <TabsContent
                      value="tests"
                      className="mt-0 focus-visible:outline-none">
                      {patient.tests?.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                          <AlertCircle className="h-8 w-8 text-slate-300 mb-2" />
                          <p className="text-sm font-medium text-slate-500">
                            No test history found.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {patient.tests?.slice(0, 5).map((t: any) => (
                            <div
                              key={t.id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:border-indigo-100 hover:shadow-sm transition-all gap-3">
                              <div className="flex items-center gap-4">
                                <div
                                  className={`p-2 rounded-lg ${t.status === "APPROVED" || t.status === "COMPLETED" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                                  <Activity className="h-4 w-4" />
                                </div>
                                <div>
                                  <span className="font-bold text-sm text-slate-900 block">
                                    {t.testName}{" "}
                                    <span className="font-normal font-mono text-xs text-slate-400 ml-1">
                                      [{t.testCode}]
                                    </span>
                                  </span>
                                  <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1 mt-0.5">
                                    <Calendar className="h-3 w-3" />{" "}
                                    {safeFormatDate(t.createdAt)}
                                  </span>
                                </div>
                              </div>
                              <Badge
                                variant="outline"
                                className={`border-none px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                                  t.status === "APPROVED" ||
                                  t.status === "COMPLETED"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}>
                                {t.status}
                              </Badge>
                            </div>
                          ))}
                          {patient.tests?.length > 5 && (
                            <div className="text-center pt-2">
                              <span className="text-xs font-bold text-indigo-600 cursor-pointer hover:underline">
                                View {patient.tests.length - 5} more tests...
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent
                      value="billing"
                      className="mt-0 focus-visible:outline-none">
                      {patient.invoices?.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                          <Receipt className="h-8 w-8 text-slate-300 mb-2" />
                          <p className="text-sm font-medium text-slate-500">
                            No billing history found.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {patient.invoices?.slice(0, 5).map((inv: any) => (
                            <div
                              key={inv.id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:border-indigo-100 hover:shadow-sm transition-all gap-3">
                              <div className="flex items-center gap-4">
                                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                                  <Receipt className="h-4 w-4 text-slate-500" />
                                </div>
                                <div>
                                  <p className="font-bold text-sm text-slate-900 font-mono">
                                    #{inv.invoiceNumber}
                                  </p>
                                  <p className="text-[10px] font-medium text-slate-500 mt-0.5">
                                    {safeFormatDate(inv.createdAt)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full border-t sm:border-0 border-slate-100 pt-3 sm:pt-0 mt-1 sm:mt-0">
                                <div className="text-left sm:text-right">
                                  <p className="font-black text-sm text-slate-900">
                                    ₹{Number(inv.grandTotal || 0).toFixed(2)}
                                  </p>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={`border-none px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                                    inv.status === "PAID"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-rose-100 text-rose-700"
                                  }`}>
                                  {inv.status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
