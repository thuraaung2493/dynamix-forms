import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router';
import { z } from 'zod';

import { Button } from '../../shared/ui/Button.js';
import { FieldError, Input, Label } from '../../shared/ui/FormControls.js';
import { useAuth } from './AuthProvider.js';
import { AuthShell } from './AuthShell.js';

const registerSchema = z.object({
  confirmPassword: z.string(),
  displayName: z.string().trim().min(1, 'Enter your name.').max(120),
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(12, 'Use at least 12 characters.').max(128)
    .regex(/[A-Z]/, 'Add at least one uppercase letter.')
    .regex(/[\p{P}\p{S}]/u, 'Add at least one symbol.'),
}).refine((value) => value.password === value.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});
type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string>();
  const form = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  if (auth.isAuthenticated) {
    return <Navigate replace to="/forms" />;
  }

  const submit = form.handleSubmit(async ({ confirmPassword, ...values }) => {
    void confirmPassword;
    setServerError(undefined);
    try {
      await auth.register(values);
      navigate('/forms', { replace: true });
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Unable to create the account.');
    }
  });

  return (
    <AuthShell
      description="Every form stays private to your account, from first draft through every published version."
      eyebrow="Your own workspace"
      footer={<span>Already registered? <Link to="/login">Log in</Link></span>}
      title="Turn form logic into something visible."
    >
      <form className="stack" onSubmit={(event) => void submit(event)}>
        <div><Label htmlFor="displayName">Name</Label><Input id="displayName" {...form.register('displayName')} /><FieldError>{form.formState.errors.displayName?.message}</FieldError></div>
        <div><Label htmlFor="email">Email</Label><Input id="email" type="email" {...form.register('email')} /><FieldError>{form.formState.errors.email?.message}</FieldError></div>
        <div><Label htmlFor="password">Password</Label><Input id="password" type="password" {...form.register('password')} /><p className="field-hint">12–128 characters, with an uppercase letter and a symbol.</p><FieldError>{form.formState.errors.password?.message}</FieldError></div>
        <div><Label htmlFor="confirmPassword">Confirm password</Label><Input id="confirmPassword" type="password" {...form.register('confirmPassword')} /><FieldError>{form.formState.errors.confirmPassword?.message}</FieldError></div>
        {serverError === undefined ? null : <p className="form-alert" role="alert">{serverError}</p>}
        <Button disabled={form.formState.isSubmitting} type="submit">{form.formState.isSubmitting ? 'Creating account…' : 'Create account'}</Button>
      </form>
    </AuthShell>
  );
}
