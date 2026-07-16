"use client";

import { useState } from "react";

type AuthPanelProps = {
  mode: "login" | "register";
};

export function AuthPanel({ mode }: AuthPanelProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <section className="card stack">
      <h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>
      <label className="stack">
        <span>Email</span>
        <input value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>
      <label className="stack">
        <span>Password</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      <button className="button primary" type="button">
        {mode === "login" ? "Sign in" : "Create account"}
      </button>
    </section>
  );
}
