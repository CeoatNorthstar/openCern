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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#080b14', padding: '16px', color: '#d1d5db', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{ width: '100%', maxWidth: '448px', backgroundColor: '#131317', border: '1px solid #232328', borderRadius: '16px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', position: 'relative', overflow: 'hidden' }}
      >
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', height: '100px', backgroundColor: 'rgba(16, 185, 129, 0.2)', filter: 'blur(60px)', pointerEvents: 'none', borderRadius: '9999px' }} />

        <div style={{ position: 'relative', zIndex: 10 }}>
          {!pendingVerification ? (
            <motion.div key="register" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                <div style={{ padding: '12px', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <UserPlus style={{ width: '32px', height: '32px', color: '#34d399' }} />
                </div>
              </div>

              <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#ffffff', textAlign: 'center', margin: '0 0 8px 0' }}>Create Account</h2>
              <p style={{ color: '#9ca3af', textAlign: 'center', marginBottom: '32px', fontSize: '14px', margin: '0 0 32px 0' }}>Register to execute particle simulations.</p>

              <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginLeft: '4px' }}>Email</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="email"
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                      style={{ width: '100%', backgroundColor: '#0e0e11', border: '1px solid #232328', color: '#ffffff', borderRadius: '12px', padding: '12px 16px 12px 44px', boxSizing: 'border-box', outline: 'none', transition: 'all 0.2s' }}
                      onFocus={(e) => { e.target.style.borderColor = '#10b981'; e.target.style.boxShadow = '0 0 0 1px rgba(16, 185, 129, 0.5)'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#232328'; e.target.style.boxShadow = 'none'; }}
                      placeholder="physicist@cern.ch"
                      required
                    />
                    <Mail style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#6b7280' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginLeft: '4px' }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{ width: '100%', backgroundColor: '#0e0e11', border: '1px solid #232328', color: '#ffffff', borderRadius: '12px', padding: '12px 16px 12px 44px', boxSizing: 'border-box', outline: 'none', transition: 'all 0.2s' }}
                      onFocus={(e) => { e.target.style.borderColor = '#10b981'; e.target.style.boxShadow = '0 0 0 1px rgba(16, 185, 129, 0.5)'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#232328'; e.target.style.boxShadow = 'none'; }}
                      placeholder="••••••••"
                      required
                    />
                    <Lock style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#6b7280' }} />
                  </div>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                      <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', padding: '12px', marginTop: '16px', display: 'flex', alignItems: 'flex-start', gap: '8px', color: '#f87171', fontSize: '14px' }}>
                        <AlertCircle style={{ width: '16px', height: '16px', flexShrink: 0, marginTop: '2px' }} />
                        <p style={{ margin: 0 }}>{error}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={loading}
                  type="submit"
                  style={{ width: '100%', backgroundColor: '#059669', color: '#ffffff', fontWeight: 500, borderRadius: '12px', padding: '12px 16px', transition: 'background-color 0.2s', marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)', border: '1px solid rgba(52, 211, 153, 0.2)', cursor: loading ? 'not-allowed' : 'pointer' }}
                  onMouseEnter={(e) => { if(!loading) e.currentTarget.style.backgroundColor = '#10b981'; }}
                  onMouseLeave={(e) => { if(!loading) e.currentTarget.style.backgroundColor = '#059669'; }}
                >
                  {loading ? <Loader2 style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} /> : "Continue"}
                </motion.button>
              </form>

              <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '14px', color: '#6b7280' }}>
                Already have an account?{" "}
                <Link href="/sign-in" style={{ color: '#34d399', fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = '#6ee7b7'} onMouseLeave={(e) => e.target.style.color = '#34d399'}>
                  Sign In
                </Link>
              </div>
            </motion.div>
          ) : (
            <motion.div key="verify" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                <div style={{ padding: '12px', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                  <ShieldCheck style={{ width: '32px', height: '32px', color: '#60a5fa' }} />
                </div>
              </div>

              <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#ffffff', textAlign: 'center', margin: '0 0 8px 0' }}>Verify Email</h2>
              <p style={{ color: '#9ca3af', textAlign: 'center', marginBottom: '32px', fontSize: '14px', margin: '0 0 32px 0' }}>
                We've sent a secure access code to <span style={{ color: '#ffffff' }}>{emailAddress}</span>.
              </p>

              <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginLeft: '4px' }}>Access Code</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    style={{ width: '100%', backgroundColor: '#0e0e11', border: '1px solid #232328', color: '#ffffff', borderRadius: '12px', padding: '16px', textAlign: 'center', fontSize: '24px', letterSpacing: '0.5em', fontFamily: 'monospace', boxSizing: 'border-box', outline: 'none', transition: 'all 0.2s' }}
                    onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 1px rgba(59, 130, 246, 0.5)'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#232328'; e.target.style.boxShadow = 'none'; }}
                    placeholder="Enter code"
                    required
                  />
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                      <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', padding: '12px', marginTop: '16px', display: 'flex', alignItems: 'flex-start', gap: '8px', color: '#f87171', fontSize: '14px' }}>
                        <AlertCircle style={{ width: '16px', height: '16px', flexShrink: 0, marginTop: '2px' }} />
                        <p style={{ margin: 0 }}>{error}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={loading}
                  type="submit"
                  style={{ width: '100%', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: 500, borderRadius: '12px', padding: '12px 16px', transition: 'background-color 0.2s', marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 0 20px rgba(37, 99, 235, 0.3)', border: '1px solid rgba(96, 165, 250, 0.2)', cursor: loading ? 'not-allowed' : 'pointer' }}
                  onMouseEnter={(e) => { if(!loading) e.currentTarget.style.backgroundColor = '#3b82f6'; }}
                  onMouseLeave={(e) => { if(!loading) e.currentTarget.style.backgroundColor = '#2563eb'; }}
                >
                  {loading ? <Loader2 style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} /> : "Verify & Enter"}
                </motion.button>
              </form>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
