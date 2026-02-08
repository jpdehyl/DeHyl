import { ClerkProvider } from "@clerk/nextjs";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <div className="relative min-h-screen">
        {/* Sidebar - desktop */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* Mobile navigation */}
        <MobileNav />

        {/* Main content */}
        <main className="min-h-screen transition-all duration-300 md:pl-64 data-[sidebar-collapsed=true]:md:pl-16">
          {children}
        </main>
      </div>
    </ClerkProvider>
  );
}
