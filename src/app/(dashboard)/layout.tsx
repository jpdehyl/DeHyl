import { ClerkProvider } from "@clerk/nextjs";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { MainContent } from "@/components/layout/main-content";

function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      {/* Sidebar - desktop */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile navigation */}
      <MobileNav />

      {/* Main content */}
      <MainContent>{children}</MainContent>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!clerkKey || !clerkKey.startsWith("pk_")) {
    return <DashboardShell>{children}</DashboardShell>;
  }

  return (
    <ClerkProvider>
      <DashboardShell>{children}</DashboardShell>
    </ClerkProvider>
  );
}
