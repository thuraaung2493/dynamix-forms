import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from './utils.js';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('card', className)} {...props} />;
}

export function CardHeader({ title, description, action }: {
  action?: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <div className="card-header">
      <div>
        <h2>{title}</h2>
        {description === undefined ? null : <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
