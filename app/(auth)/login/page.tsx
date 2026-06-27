import { Flame } from "lucide-react";

import { LoginForm } from "@/components/forms/login-form";

export default function LoginPage() {
  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-subsync-purple to-subsync-cyan text-white">
            <Flame className="h-6 w-6" />
          </span>
          <h1 className="bg-gradient-to-r from-subsync-purple to-subsync-cyan bg-clip-text text-2xl font-bold tracking-tight text-transparent">
            SubSync
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Accedi per tracciare il tuo Monthly Burn Rate.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-subsync-card p-6 shadow-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
