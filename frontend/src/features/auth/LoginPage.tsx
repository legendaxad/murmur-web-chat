import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button, TextField } from "../../components/ui";
import { getErrorMessage } from "../../utils/errors";
import { useLoginMutation } from "./authApi";
import { AuthLayout } from "./AuthLayout";
import s from "./auth.module.css";

export default function LoginPage() {
  const [login, { isLoading, error }] = useLoginMutation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? "/chat";

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const res = await login({ identifier: identifier.trim(), password });
    if ("data" in res) navigate(from, { replace: true });
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to pick up where you left off.">
      <form className={s.form} onSubmit={onSubmit} noValidate>
        {error && <div className={s.formError} role="alert">{getErrorMessage(error)}</div>}
        <TextField
          label="Username or email"
          name="identifier"
          autoComplete="username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button type="submit" block loading={isLoading} disabled={!identifier || !password}>
          Sign in
        </Button>
      </form>
      <p className={s.switch}>
        New here? <Link to="/register">Create an account</Link>
      </p>
    </AuthLayout>
  );
}
