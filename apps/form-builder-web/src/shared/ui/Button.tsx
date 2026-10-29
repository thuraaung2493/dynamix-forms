import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from './utils.js';

const buttonVariants = cva('button', {
  defaultVariants: { size: 'default', variant: 'default' },
  variants: {
    size: {
      default: '',
      icon: 'button-icon',
      sm: 'button-sm',
    },
    variant: {
      danger: 'button-danger',
      default: 'button-primary',
      ghost: 'button-ghost',
      outline: 'button-outline',
    },
  },
});

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export function Button({ className, size, type = 'button', variant, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ size, variant }), className)} type={type} {...props} />;
}
