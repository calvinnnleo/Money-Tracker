"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase-browser";
import { Lock, Mail, User, ArrowRight, Wallet, CheckCircle, MessageSquare, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState("signin"); // "signin" | "signup"
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  // Redirect to home if user is already logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.push("/");
      }
    };
    checkUser();
  }, [router, supabase]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (activeTab === "signin") {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (loginError) throw loginError;

        router.push("/");
        router.refresh();
      } else {
        // Sign Up Flow
        if (password !== confirmPassword) {
          throw new Error("Password dan konfirmasi password tidak cocok.");
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName,
            },
          },
        });

        if (signUpError) throw signUpError;

        if (data?.session) {
          router.push("/");
          router.refresh();
        } else {
          setMessage("Pendaftaran berhasil! Silakan masuk dengan akun baru kamu.");
          setActiveTab("signin");
          setPassword("");
          setConfirmPassword("");
        }
      }
    } catch (err) {
      setError(err.message || "Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative Gradients for smooth iOS layout look */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet/5 rounded-full blur-[120px] pointer-events-none" />
 
      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="flex justify-center items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-tr from-violet to-violet/80 rounded-2xl flex items-center justify-center shadow-lg shadow-violet/20">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-[#1C1C1E] tracking-tight">
            KasLeo
          </span>
        </div>
        <h2 className="mt-6 text-center text-2xl font-extrabold text-[#1C1C1E] tracking-tight">
          {activeTab === "signin" ? "Masuk ke Akun" : "Buat Akun Baru"}
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          Kelola anggaran dan pantau transaksi Anda secara aman
        </p>
      </div>
 
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <div className="bg-white border border-slate-200/80 py-8 px-4 shadow-xl rounded-3xl sm:px-10">
          
          {/* Tab Switcher */}
          <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200 mb-6">
            <button
              onClick={() => {
                setActiveTab("signin");
                setError(null);
                setMessage(null);
                setDisplayName("");
                setPassword("");
                setConfirmPassword("");
              }}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition ${
                activeTab === "signin"
                  ? "bg-white shadow-sm border border-slate-200/50 text-violet"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setActiveTab("signup");
                setError(null);
                setMessage(null);
                setDisplayName("");
                setPassword("");
                setConfirmPassword("");
              }}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition ${
                activeTab === "signup"
                  ? "bg-white shadow-sm border border-slate-200/50 text-violet"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Sign Up
            </button>
          </div>
 
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-500/5 border border-red-500/10 text-sm text-red-500 flex items-start gap-3">
              <span className="text-lg">⚠️</span>
              <div>{error}</div>
            </div>
          )}
 
          {message && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-sm text-emerald-600 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>{message}</div>
            </div>
          )}
 
          {/* Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            {activeTab === "signup" && (
              <div>
                <label htmlFor="name" className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Nama Lengkap
                </label>
                <div className="mt-1.5 relative rounded-2xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet/20 focus:border-violet transition-all text-sm"
                    placeholder="Nama Lengkap Kamu"
                  />
                </div>
              </div>
            )}
 
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                Alamat Email
              </label>
              <div className="mt-1.5 relative rounded-2xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet/20 focus:border-violet transition-all text-sm"
                  placeholder="nama@email.com"
                />
              </div>
            </div>
 
            <div>
              <label htmlFor="password" className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                Password
              </label>
              <div className="mt-1.5 relative rounded-2xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet/20 focus:border-violet transition-all text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
 
            {activeTab === "signup" && (
              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Konfirmasi Password
                </label>
                <div className="mt-1.5 relative rounded-2xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-11 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet/20 focus:border-violet transition-all text-sm"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            )}
 
            {activeTab === "signin" && (
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 bg-slate-100 border-slate-300 text-violet focus:ring-violet rounded cursor-pointer"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-500 cursor-pointer select-none">
                    Ingat Saya
                  </label>
                </div>
              </div>
            )}
 
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-2xl text-sm font-semibold text-white bg-violet hover:bg-violet/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-violet/10"
              >
                {loading ? "Memproses..." : activeTab === "signin" ? "Sign In" : "Sign Up"}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </form>
 
          {/* Telegram Linking Note */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="p-4 rounded-2xl bg-violet/5 border border-violet/10 text-center">
              <div className="flex justify-center mb-2">
                <div className="w-10 h-10 rounded-full bg-violet/10 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-violet" />
                </div>
              </div>
              <h4 className="text-sm font-semibold text-slate-800">Hubungkan ke Telegram Bot</h4>
              <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                Setelah masuk, buka menu **Pengaturan Profil** di dashboard, lalu masukkan kode link unik yang Anda dapatkan dari perintah <code className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-violet font-mono text-[11px]">/link</code> di Telegram Bot pribadi Anda.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
