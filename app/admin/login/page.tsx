"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { loginAction } from "@/app/actions/auth";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    const result = await loginAction({
      email,
      password,
      redirect: searchParams.get("redirect") ?? undefined,
    });
    if (result && "error" in result && result.error) {
      setError(result.error);
      setBusy(false);
      return;
    }
    setBusy(false);
    router.push("/admin");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b1b29] px-4">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Image src="/Asset%20Matrix%20Energy%20logo.png" alt="Asset Matrix Energy" width={2044} height={375} className="h-11 w-auto object-contain" />
          <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#8ba2af]">Admin Dashboard</p>
        </div>
        <form onSubmit={submit} className="rounded-2xl bg-white p-7 shadow-xl">
          <h1 className="text-[18px] font-extrabold text-[#0b1b29]">Sign in</h1>
          <p className="mt-1 text-[12.5px] text-[#65727a]">Use your Asset Matrix Energy admin account.</p>
          <label className="mt-5 block">
            <span className="mb-1.5 block text-[12px] font-bold text-[#41515b]">Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 w-full rounded-lg border border-[#d7dee0] px-3 text-[13.5px] outline-none focus:border-[#0b1b29] focus:ring-2 focus:ring-[#0b1b29]/10"
              placeholder="you@assetmatrixenergy.com"
            />
          </label>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-[12px] font-bold text-[#41515b]">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 w-full rounded-lg border border-[#d7dee0] px-3 text-[13.5px] outline-none focus:border-[#0b1b29] focus:ring-2 focus:ring-[#0b1b29]/10"
              placeholder="••••••••"
            />
          </label>
          {error && <p className="mt-3 rounded-lg bg-[#fdeceb] px-3 py-2 text-[12.5px] font-semibold text-[#b3261e]">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="mt-6 flex h-11 w-full items-center justify-center rounded-lg bg-[#e7a42b] text-[13.5px] font-extrabold text-[#172633] transition-colors hover:bg-[#f3bb4e] disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Sign in to dashboard"}
          </button>
        </form>
        <p className="mt-5 text-center text-[11.5px] text-[#5c7a88]">Only authorised Asset Matrix Energy staff can access this area.</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}