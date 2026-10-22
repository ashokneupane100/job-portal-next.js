import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/features/auth/server/use-cases/sessions";
import { logoutUserAction } from "@/features/auth/server/auth.actions";

export default async function Home() {
  // Reads the session cookie, hashes it and looks the row up in `sessions`.
  // Returns `null` when nobody is logged in.
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Job Portal</CardTitle>
            <CardDescription>You are not logged in</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Button asChild className="flex-1">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/register">Create Account</Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Registering creates a session automatically — you will land
              back here already signed in.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome, {user.name}!</CardTitle>
          <CardDescription>
            You are logged in with the session stored in the database.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">User ID</dt>
            <dd>{user.id}</dd>

            <dt className="text-muted-foreground">Username</dt>
            <dd>{user.userName}</dd>

            <dt className="text-muted-foreground">Email</dt>
            <dd>{user.email}</dd>

            <dt className="text-muted-foreground">Role</dt>
            <dd>{user.role}</dd>

            <dt className="text-muted-foreground">Session expires</dt>
            <dd>{user.session.expiresAt.toLocaleString()}</dd>
          </dl>

          <form action={logoutUserAction}>
            <Button type="submit" variant="outline" className="w-full">
              Log Out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
