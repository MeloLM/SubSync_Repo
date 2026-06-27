"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Lock, LogIn, Mail, UserPlus } from "lucide-react";

import { signIn, signUp } from "@/actions/auth.actions";

type Mode = "login" | "signup";

const inputCls =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2 pl-9 pr-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-subsync-purple";
const labelCls =
  "mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = mode === "login" ? await signIn(fd) : await signUp(fd);

      if (res.error) {
        toast.error(
          mode === "login" ? "Accesso non riuscito" : "Registrazione non riuscita",
          { description: res.error },
        );
        return;
      }

      if (res.message) {
        toast.success("Registrazione completata", { description: res.message });
        setMode("login");
        return;
      }

      // Login riuscito: la sessione (cookie) è stata impostata dalla Server Action.
      toast.success("Accesso eseguito");
      router.push("/");
      router.refresh();
    });
  }

  const isLogin = mode === "login";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className={labelCls}>
          Email
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="tu@esempio.com"
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className={labelCls}>
          Password
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete={isLogin ? "current-password" : "new-password"}
            placeholder="••••••••"
            className={inputCls}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-subsync-purple px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-600 disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isLogin ? (
          <LogIn className="h-4 w-4" />
        ) : (
          <UserPlus className="h-4 w-4" />
        )}
        {isPending
          ? "Attendere..."
          : isLogin
            ? "Accedi"
            : "Crea account"}
      </button>

      <p className="pt-2 text-center text-sm text-zinc-400">
        {isLogin ? "Non hai un account?" : "Hai già un account?"}{" "}
        <button
          type="button"
          onClick={() => setMode(isLogin ? "signup" : "login")}
          className="font-medium text-subsync-cyan transition-colors hover:text-cyan-400"
        >
          {isLogin ? "Registrati" : "Accedi"}
        </button>
      </p>
    </form>
  );
}
