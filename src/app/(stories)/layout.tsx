import { ClerkProvider } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

export default function StoriesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const content = (
    <div className="fixed inset-0 bg-background overflow-hidden lg:static lg:min-h-screen lg:overflow-auto">
      {children}
    </div>
  );

  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!clerkKey || !clerkKey.startsWith("pk_")) {
    return content;
  }

  return <ClerkProvider>{content}</ClerkProvider>;
}
