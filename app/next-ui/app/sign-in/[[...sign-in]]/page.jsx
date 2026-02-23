"use client";

import { useSignIn } from "@clerk/nextjs";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Mail, Lock, LogIn, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function CustomSignIn() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!isLoaded) return;
    setLoading(true);
    setError("");

    try {
      const result = await signIn.create({
        identifier: emailAddress,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/");
      } else {
        // Handle step up MFA or other requirements here
        console.log(result);
        setError("Further verification required. Check console.");
      }
    } catch (err) {
      setError(err.errors?.[0]?.message || "An error occurred during sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#080b14] p-4 text-[#d1d5db] font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md bg-[#131317] border border-[#232328] rounded-2xl p-8 shadow-2xl relative overflow-hidden"
      >
        {/* Decorative ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[100px] bg-blue-600/20 blur-[60px] pointer-events-none rounded-full" />

        <div className="relative z-10">
          <motion.div 
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="flex justify-center mb-6"
          >
            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <LogIn className="w-8 h-8 text-blue-400" />
            </div>
          </motion.div>

          <h2 className="text-2xl font-semibold text-white text-center mb-2">Welcome Back</h2>
          <p className="text-[#9ca3af] text-center mb-8 text-sm">Enter your credentials to access the CERN pipeline.</p>

          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider ml-1">Email</label>
              <div className="relative">
                <input
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  className="w-full bg-[#0e0e11] border border-[#232328] text-white rounded-xl px-4 py-3 pl-11 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
                  placeholder="physicist@cern.ch"
                  required
                />
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider ml-1">Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0e0e11] border border-[#232328] text-white rounded-xl px-4 py-3 pl-11 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
                  placeholder="••••••••"
                  required
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mt-4 flex items-start gap-2 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl px-4 py-3 transition-colors mt-6 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.3)] border border-blue-400/20"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
            </motion.button>
          </form>

          <div className="mt-8 text-center text-sm text-[#6b7280]">
            Don't have an account?{" "}
            <Link href="/sign-up" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
              Request access
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
