import { ClerkProvider } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

export default function StoriesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const content = (
    <div className="fixed inset-0 bg-background overflow-hidden">
      {children}
    </div>
  );

  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return content;
  }

  return <ClerkProvider>{content}</ClerkProvider>;
}
