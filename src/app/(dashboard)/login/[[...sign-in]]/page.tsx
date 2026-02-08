import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-4">
      <SignIn 
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-white dark:bg-gray-900 shadow-xl",
            headerTitle: "text-xl font-bold",
            headerSubtitle: "text-gray-500",
            socialButtonsBlockButton: "border border-gray-200 dark:border-gray-700",
            formButtonPrimary: "bg-orange-600 hover:bg-orange-700",
            footerActionLink: "text-orange-600 hover:text-orange-700",
          },
        }}
        routing="path"
        path="/login"
        signUpUrl="/sign-up"
        afterSignInUrl="/"
      />
    </div>
  );
}
