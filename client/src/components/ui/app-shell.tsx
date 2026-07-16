import type { ReactNode } from "react";

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
