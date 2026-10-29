import { FileQuestion } from 'lucide-react';
import { Link } from 'react-router';

export function NotFoundPage() {
  return <section className="empty-state full-state"><FileQuestion size={34} /><h1>Page not found</h1><p>The page may have moved or never existed.</p><Link className="text-link" to="/">Return to Dynamix Forms</Link></section>;
}
