"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

type Mode = "signin" | "signup";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  const isSignIn = mode === "signin";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    if (isSignIn) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      router.push("/upload");
      router.refresh();
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      if (data.session) {
        router.push("/upload");
        router.refresh();
      } else {
        setCheckEmail(true);
      }
    }
  }

  if (checkEmail) {
    return (
      <div className="flex w-[360px] flex-col gap-4">
        <h1 className="text-2xl font-extrabold">Check your email</h1>
        <p className="text-sm text-foreground/65">
          We sent a confirmation link to {email}. Confirm your account, then
          sign in.
        </p>
        <Button
          variant="secondary"
          block
          onClick={() => {
            setCheckEmail(false);
            setMode("signin");
          }}
        >
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-[360px] flex-col gap-4">
      <div>
        <h1 className="text-2xl font-extrabold">
          {isSignIn ? "Sign In" : "Sign Up"}
        </h1>
        <p className="mt-1 text-sm text-foreground/65">
          {isSignIn ? "Sign in to your invoice library." : "Create your account."}
        </p>
      </div>

      <Field label="Email" htmlFor="auth-email">
        <Input
          id="auth-email"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </Field>

      <Field label="Password" htmlFor="auth-password">
        <Input
          id="auth-password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
      </Field>

      {error && <p className="text-sm text-accent-700">{error}</p>}

      <Button type="submit" block disabled={loading}>
        {loading ? "Please wait…" : isSignIn ? "Sign In" : "Create Account"}
      </Button>

      <a
        href="#"
        className="text-left text-sm text-accent hover:text-accent-700"
        onClick={(e) => {
          e.preventDefault();
          setError(null);
          setMode(isSignIn ? "signup" : "signin");
        }}
      >
        {isSignIn ? "Need an account? Sign up" : "Already have an account? Sign in"}
      </a>
    </form>
  );
}
