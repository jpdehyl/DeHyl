import type { Metadata } from "next";

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
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
