import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser }from "@/features/auth/server/auth.queries";

export default async function Home() {
  const user = await getCurrentUser();
  console.log("user data",user?.name, user?.email);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">

    





      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      Log out {user.name} {user.email} {user?.role}
      {user?.id}
      {user?.session?.id}
     
   
    </div>
  );
}
