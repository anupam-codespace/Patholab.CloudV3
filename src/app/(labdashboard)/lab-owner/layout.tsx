// app/lab-owner/layout.tsx

// 👇 This line fixes your "Data not showing" issue
export const dynamic = "force-dynamic";

export default function LabOwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // We use a Fragment (<>...</>) so we don't break your existing CSS/Parent Layout
  return <>{children}</>;
}
