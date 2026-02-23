"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

export default function SSOCallback() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      // Force Electron to reload the root view once the token is established
      window.location.href = "http://localhost:3000/";
    } else if (isLoaded && !isSignedIn) {
       router.push("/");
    }
  }, [isLoaded, isSignedIn, router]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#080b14', color: '#6b7280', fontFamily: 'monospace' }}>
      Authenticating openCERN Terminal...
    </div>
  );
}
