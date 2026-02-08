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
  const shell = <div className="min-h-screen bg-background">{children}</div>;

  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return shell;
  }

  return <ClerkProvider>{shell}</ClerkProvider>;
}
