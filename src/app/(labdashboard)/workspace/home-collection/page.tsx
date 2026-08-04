import HomeCollectionForm from "@/components/appointments/HomeCollectionForm";

export default function HomeCollectionPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-black text-slate-900 mb-6">
        Home Collection
      </h1>
      <HomeCollectionForm />
    </div>
  );
}