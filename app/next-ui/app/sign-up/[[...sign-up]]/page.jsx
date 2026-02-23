"use client";

import { useSignUp } from "@clerk/nextjs";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Mail, Lock, UserPlus, ShieldCheck, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function CustomSignUp() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Create User & Fire Verification Email
  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!isLoaded) return;
    setLoading(true);
    setError("");

    try {
      await signUp.create({
        emailAddress,
        password,
      });

      // Send the email. This hits our Cloudflare Worker webhook indirectly via Clerk's email.created event!
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err) {
      setError(err.errors?.[0]?.message || "An error occurred during registration.");
    } finally {
      setLoading(false);
    }
  };

  // Verify the OTP code
  const handleVerify = async (e) => {
    e.preventDefault();
    if (!isLoaded) return;
    setLoading(true);
    setError("");

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (completeSignUp.status === "complete") {
        await setActive({ session: completeSignUp.createdSessionId });
        router.push("/");
      } else {
        setError("Verification incomplete. Please check the code and try again.");
      }
    } catch (err) {
      setError(err.errors?.[0]?.message || "Invalid verification code.");
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
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[100px] bg-emerald-600/20 blur-[60px] pointer-events-none rounded-full" />

        <div className="relative z-10">
          {!pendingVerification ? (
            <motion.div key="register" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <div className="flex justify-center mb-6">
                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <UserPlus className="w-8 h-8 text-emerald-400" />
                </div>
              </div>

              <h2 className="text-2xl font-semibold text-white text-center mb-2">Create Account</h2>
              <p className="text-[#9ca3af] text-center mb-8 text-sm">Register to execute particle simulations.</p>

              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider ml-1">Email</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                      className="w-full bg-[#0e0e11] border border-[#232328] text-white rounded-xl px-4 py-3 pl-11 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"
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
                      className="w-full bg-[#0e0e11] border border-[#232328] text-white rounded-xl px-4 py-3 pl-11 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                      placeholder="••••••••"
                      required
                    />
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
                  </div>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
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
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl px-4 py-3 transition-colors mt-6 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] border border-emerald-400/20"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Continue"}
                </motion.button>
              </form>

              <div className="mt-8 text-center text-sm text-[#6b7280]">
                Already have an account?{" "}
                <Link href="/sign-in" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
                  Sign In
                </Link>
              </div>
            </motion.div>
          ) : (
            <motion.div key="verify" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex justify-center mb-6">
                <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                  <ShieldCheck className="w-8 h-8 text-blue-400" />
                </div>
              </div>

              <h2 className="text-2xl font-semibold text-white text-center mb-2">Verify Email</h2>
              <p className="text-[#9ca3af] text-center mb-8 text-sm">
                We've sent a secure access code to <span className="text-white">{emailAddress}</span>.
              </p>

              <form onSubmit={handleVerify} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider ml-1">Access Code</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full bg-[#0e0e11] border border-[#232328] text-white rounded-xl px-4 py-4 text-center text-2xl tracking-[0.5em] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:tracking-normal placeholder:text-base font-mono"
                    placeholder="Enter code"
                    required
                  />
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
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
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Enter"}
                </motion.button>
              </form>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
