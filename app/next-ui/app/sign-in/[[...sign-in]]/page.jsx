"use client";

import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#080b14' }}>
      <SignIn 
        appearance={{
          elements: {
            card: "bg-[#131317] border border-[#232328] shadow-2xl rounded-2xl",
            headerTitle: "text-white",
            headerSubtitle: "text-[#9ca3af]",
            socialButtonsBlockButtonText: "text-[#d1d5db]",
            socialButtonsBlockButton: "border-[#232328] hover:bg-[#1a1a20] transition-colors",
            dividerLine: "bg-[#232328]",
            dividerText: "text-[#6b7280]",
            formFieldLabel: "text-[#d1d5db]",
            formFieldInput: "bg-[#0e0e11] border-[#232328] text-white focus:ring-blue-500",
            formButtonPrimary: "bg-blue-600 hover:bg-blue-500 text-white transition-colors",
            footerActionText: "text-[#9ca3af]",
            footerActionLink: "text-blue-400 hover:text-blue-300 transition-colors",
            identityPreviewText: "text-[#d1d5db]",
            identityPreviewEditButtonIcon: "text-blue-400"
          },
        }}
      />
    </div>
  );
}
