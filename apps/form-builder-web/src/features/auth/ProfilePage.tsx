import { Mail, ShieldCheck, UserRound } from 'lucide-react';

import { useAuth } from './AuthProvider.js';

export function ProfilePage() {
  const { user } = useAuth();
  if (user === null) return null;
  return (
    <section className="page narrow-page">
      <p className="eyebrow">Account</p>
      <h1>Your profile</h1>
      <div className="profile-card">
        <div className="profile-avatar"><UserRound size={28} /></div>
        <div><strong>{user.displayName}</strong><span><Mail size={15} /> {user.email}</span></div>
      </div>
      <div className="security-note"><ShieldCheck size={20} /><p><strong>Private by design.</strong><br />Ownership is derived from your server session on every form operation.</p></div>
    </section>
  );
}
