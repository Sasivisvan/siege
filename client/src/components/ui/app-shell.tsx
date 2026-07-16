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
          <>
            <a 
              href="/question-bank" 
              className={`sidebar-link ${currentPath === "/question-bank" ? "active" : ""}`}
            >
              <span>📁</span> Question Bank
            </a>
            <a 
              href="/dashboard/plagiarism" 
              className={`sidebar-link ${currentPath === "/dashboard/plagiarism" ? "active" : ""}`}
            >
              <span>🛡️</span> Integrity Reports
            </a>
            <a 
              href="/dashboard/review" 
              className={`sidebar-link ${currentPath === "/dashboard/review" ? "active" : ""}`}
            >
              <span>📝</span> Review Queue
            </a>
          </>
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
            <div style={{ padding: '16px 0', borderTop: '1px solid var(--panel-border)', marginTop: '16px' }}>
              {user && (
                <div style={{ padding: '8px 16px', marginBottom: '12px', fontSize: '0.85rem', color: 'var(--muted)' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '2px' }}>{user.name}</div>
                  <div>{user.email}</div>
                </div>
              )}
              <button 
                id="sidebar-sign-out-btn"
                onClick={logout} 
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--danger-glow)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: 'var(--danger)',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--danger-glow)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                }}
              >
                <span>🚪</span> Sign Out
              </button>
            </div>
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
