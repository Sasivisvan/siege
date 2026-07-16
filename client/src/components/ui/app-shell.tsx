"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";

type AppShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
  primaryCta?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  secondaryCta?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
};

export function AppShell({
  eyebrow,
  title,
  description,
  children,
  primaryCta,
  secondaryCta,
}: AppShellProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const [currentPath, setCurrentPath] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentPath(window.location.pathname);
    }
  }, []);

  const renderNavLinks = () => {
    return (
      <nav className="sidebar-nav">
        <a 
          href="/dashboard" 
          className={`sidebar-link ${currentPath === "/dashboard" ? "active" : ""}`}
        >
          <span>⊞</span> Dashboard
        </a>
        <a 
          href="/profile" 
          className={`sidebar-link ${currentPath === "/profile" ? "active" : ""}`}
        >
          <span>👤</span> Performance Profile
        </a>
        {user?.role !== "candidate" && (
          <a 
            href="/question-bank" 
            className={`sidebar-link ${currentPath === "/question-bank" ? "active" : ""}`}
          >
            <span>📁</span> Question Bank
          </a>
        )}
      </nav>
    );
  };

  if (isAuthenticated) {
    return (
      <div className="layout-container">
        <aside className="sidebar">
          <div>
            <div className="sidebar-brand">
              <span>⚡</span> SIEGE.SH
            </div>
            {renderNavLinks()}
          </div>
          <div>
            <button 
              onClick={logout} 
              className="sidebar-link" 
              style={{ width: "100%", background: "none", border: "none", textAlign: "left", cursor: "pointer" }}
            >
              <span>🚪</span> Sign Out
            </button>
          </div>
        </aside>

        <main className="main-content shell" style={{ padding: "40px" }}>
          <section className="hero" style={{ marginBottom: "24px" }}>
            <span className="eyebrow">{eyebrow}</span>
            <div>
              <h1 style={{ fontSize: "2.5rem" }}>{title}</h1>
              <p>{description}</p>
            </div>
            {(primaryCta || secondaryCta) && (
              <div className="actions">
                {primaryCta &&
                  (primaryCta.href ? (
                    <a className="button primary" href={primaryCta.href}>
                      {primaryCta.label}
                    </a>
                  ) : (
                    <button className="button primary" type="button" onClick={primaryCta.onClick}>
                      {primaryCta.label}
                    </button>
                  ))}
                {secondaryCta &&
                  (secondaryCta.href ? (
                    <a className="button" href={secondaryCta.href}>
                      {secondaryCta.label}
                    </a>
                  ) : (
                    <button className="button" type="button" onClick={secondaryCta.onClick}>
                      {secondaryCta.label}
                    </button>
                  ))}
              </div>
            )}
          </section>
          {children ? <div style={{ marginTop: 24 }}>{children}</div> : null}
        </main>
      </div>
    );
  }

  return (
    <main className="shell">
      <section className="hero">
        <span className="eyebrow">{eyebrow}</span>
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {(primaryCta || secondaryCta) && (
          <div className="actions">
            {primaryCta &&
              (primaryCta.href ? (
                <a className="button primary" href={primaryCta.href}>
                  {primaryCta.label}
                </a>
              ) : (
                <button className="button primary" type="button" onClick={primaryCta.onClick}>
                  {primaryCta.label}
                </button>
              ))}
            {secondaryCta &&
              (secondaryCta.href ? (
                <a className="button" href={secondaryCta.href}>
                  {secondaryCta.label}
                </a>
              ) : (
                <button className="button" type="button" onClick={secondaryCta.onClick}>
                  {secondaryCta.label}
                </button>
              ))}
          </div>
        )}
      </section>
      {children ? <div style={{ marginTop: 24 }}>{children}</div> : null}
    </main>
  );
}
