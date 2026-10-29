import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { z } from 'zod';

import { Button } from '../../shared/ui/Button.js';
import { FieldError, Input, Label } from '../../shared/ui/FormControls.js';
import { useAuth } from './AuthProvider.js';
import { AuthShell } from './AuthShell.js';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});
type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string>();
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  if (auth.isAuthenticated) {
    return <Navigate replace to="/forms" />;
  }

  const submit = form.handleSubmit(async (values) => {
    setServerError(undefined);
    try {
      await auth.login(values);
      const from = (location.state as { from?: string } | null)?.from ?? '/forms';
      navigate(from, { replace: true });
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Unable to log in.');
    }
  });

  return (
    <AuthShell
      description="Return to your private form workspace and continue from the latest draft."
      eyebrow="Welcome back"
      footer={<span>New here? <Link to="/register">Create an account</Link></span>}
      title="Design forms with a history you can trust."
    >
      <form className="stack" onSubmit={(event) => void submit(event)}>
        <div><Label htmlFor="email">Email</Label><Input id="email" type="email" {...form.register('email')} /><FieldError>{form.formState.errors.email?.message}</FieldError></div>
        <div><Label htmlFor="password">Password</Label><Input id="password" type="password" {...form.register('password')} /><FieldError>{form.formState.errors.password?.message}</FieldError></div>
        {serverError === undefined ? null : <p className="form-alert" role="alert">{serverError}</p>}
        <Button disabled={form.formState.isSubmitting} type="submit">{form.formState.isSubmitting ? 'Logging in…' : 'Log in'}</Button>
      </form>
    </AuthShell>
  );
}
