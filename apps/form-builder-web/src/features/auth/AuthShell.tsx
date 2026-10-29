import type { ReactNode } from 'react';

export function AuthShell({ eyebrow, title, description, children, footer }: {
  children: ReactNode;
  description: string;
  eyebrow: string;
  footer: ReactNode;
  title: string;
}) {
  return (
    <section className="auth-grid">
      <div className="auth-story">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
        <div className="schema-motif" aria-hidden="true">
          <span>schemaVersion: 1</span>
          <span>draft → publish</span>
          <span>history stays immutable</span>
        </div>
      </div>
      <div className="auth-panel">
        {children}
        <div className="auth-footer">{footer}</div>
      </div>
    </section>
  );
}
