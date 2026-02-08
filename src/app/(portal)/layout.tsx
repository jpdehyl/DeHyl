import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DeHyl — Project Portal",
  description: "Client project portal for DeHyl Constructors Corp",
};

export default function PortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <div className="min-h-screen bg-background">
        {children}
      </div>
    </ClerkProvider>
  );
}
