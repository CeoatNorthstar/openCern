import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#080b14' }}>
      <SignIn appearance={{
        elements: {
          rootBox: "mx-auto",
          card: "bg-[#131317] border border-[#232328] rounded-xl shadow-2xl",
          headerTitle: "text-white font-semibold text-xl",
          headerSubtitle: "text-gray-400",
          formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors",
          formFieldLabel: "text-gray-300",
          formFieldInput: "bg-[#0e0e11] border-[#232328] text-white rounded-lg focus:border-blue-500",
          footerActionText: "text-gray-400",
          footerActionLink: "text-blue-500 hover:text-blue-400",
          identityPreviewText: "text-gray-300",
          identityPreviewEditButton: "text-blue-500",
          dividerLine: "bg-[#232328]",
          dividerText: "text-gray-500",
          socialButtonsBlockButton: "border-[#232328] text-gray-300 hover:bg-[#1f1f26]",
        }
      }} />
    </div>
  );
}
