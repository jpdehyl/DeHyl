import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";

export const metadata: Metadata = {
  title: "DeHyl Financials",
  description: "Financial dashboard for DeHyl Constructors Corp",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
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
        </ThemeProvider>
      </body>
    </html>
  );
}
