"use client";

import { useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, LogOut, Settings, Shield } from "lucide-react";

const roleColors: Record<string, string> = {
  admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  ops: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  field: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  client: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

function ClerkUserMenu() {
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();

  // Get role from Clerk public metadata
  const role = (user?.publicMetadata?.role as string) || "client";

  if (!isLoaded) {
    return (
      <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
    );
  }

  if (!isSignedIn) {
    return (
      <Button variant="outline" size="sm" onClick={() => router.push("/login")}>
        Sign in
      </Button>
    );
  }

  const initials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : user?.emailAddresses?.[0]?.emailAddress?.slice(0, 2).toUpperCase() || "?";

  const handleSignOut = () => {
    signOut(() => router.push("/login"));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.imageUrl} alt={user?.fullName || "User"} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user?.fullName || "User"}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.emailAddresses?.[0]?.emailAddress}
            </p>
            <Badge className={`w-fit mt-1 text-xs ${roleColors[role]}`}>
              {role}
            </Badge>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/profile")}>
          <User className="mr-2 h-4 w-4" />
          Profile
        </DropdownMenuItem>
        {role === "admin" && (
          <DropdownMenuItem onClick={() => router.push("/settings")}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
        )}
        {role === "admin" && (
          <DropdownMenuItem onClick={() => router.push("/settings/users")}>
            <Shield className="mr-2 h-4 w-4" />
            User Management
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FallbackUserMenu() {
  return (
    <Avatar className="h-8 w-8">
      <AvatarFallback className="text-xs">JP</AvatarFallback>
    </Avatar>
  );
}

export function UserMenu() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <FallbackUserMenu />;
  }

  return <ClerkUserMenu />;
}
