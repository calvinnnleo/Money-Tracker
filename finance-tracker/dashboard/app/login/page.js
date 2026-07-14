"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase-browser";
import { Lock, Mail, MessageSquare, ArrowRight, Wallet, CheckCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
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

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) {
        throw loginError;
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err.message || "Gagal masuk. Silakan periksa kredensial Anda.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="flex justify-center items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent tracking-tight">
            KasPola
          </span>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white tracking-tight">
          Masuk ke Dashboard
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Kelola anggaran dan pantau transaksi Anda secara aman
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 py-8 px-4 shadow-2xl rounded-3xl sm:px-10">
          
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-start gap-3">
              <span className="text-lg">⚠️</span>
              <div>{error}</div>
            </div>
          )}

          {message && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>{message}</div>
            </div>
          )}

          {/* Form Login */}
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                Alamat Email
              </label>
              <div className="mt-1.5 relative rounded-2xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-sm"
                  placeholder="nama@email.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                Password
              </label>
              <div className="mt-1.5 relative rounded-2xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-2xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
              >
                {loading ? "Memverifikasi..." : "Masuk"}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="mt-8 relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="px-3 bg-slate-900/60 text-slate-500 rounded-md backdrop-blur-xl">
                Atau masuk instan
              </span>
            </div>
          </div>

          {/* Telegram Login Helper */}
          <div className="mt-6">
            <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 text-center">
              <div className="flex justify-center mb-2">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-blue-400" />
                </div>
              </div>
              <h4 className="text-sm font-semibold text-white">Login Lewat Telegram Bot</h4>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                Ketik <code className="px-1.5 py-0.5 rounded bg-slate-950 text-blue-400 font-mono">/login</code> di bot Telegram pribadi Anda, lalu klik tombol tautan masuk yang dikirimkan.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
