"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

type AuthPanelProps = {
  mode: "login" | "register";
};

export function AuthPanel({ mode }: AuthPanelProps) {
  const { login, register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("candidate");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (mode === "login") {
        await login(email, password);
        window.location.href = "/dashboard";
      } else {
        await register(email, password, name, role);
        window.location.href = "/dashboard";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="card stack">
      <h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>

      {error && (
        <div className="error-banner">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="stack">
        {mode === "register" && (
        <label className="stack">
          <span>Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
          />
        </label>
      )}

      <label className="stack">
        <span>Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </label>

      <label className="stack">
        <span>Password</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min 6 characters"
        />
      </label>

      {mode === "register" && (
        <label className="stack">
          <span>Role</span>
          <select required value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="candidate">Student (Take tests)</option>
            <option value="recruiter">Teacher (Create tests & classrooms)</option>
          </select>
        </label>
      )}

        <button
          className="button primary"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? "Please wait..."
            : mode === "login"
              ? "Sign in"
              : "Create account"}
        </button>
      </form>

      <p style={{ textAlign: "center", color: "var(--muted)", fontSize: "0.9rem" }}>
        {mode === "login" ? (
          <>Don&apos;t have an account? <a href="/register" style={{ color: "var(--accent)" }}>Register</a></>
        ) : (
          <>Already have an account? <a href="/login" style={{ color: "var(--accent)" }}>Sign in</a></>
        )}
      </p>
    </section>
  );
}
