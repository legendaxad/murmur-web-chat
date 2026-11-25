import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, TextField } from "../../components/ui";
import { getErrorMessage, getFieldErrors } from "../../utils/errors";
import { useRegisterMutation } from "./authApi";
import { AuthLayout } from "./AuthLayout";
import s from "./auth.module.css";

/** Same rules as the backend, checked here too so feedback is instant. */
const validate = (v: { username: string; email: string; password: string; displayName: string }) => {
  const e: Record<string, string> = {};
  if (!/^[a-z0-9_.]{3,30}$/i.test(v.username)) e.username = "3–30 characters: letters, numbers, _ and .";
  if (!/^\S+@\S+\.\S+$/.test(v.email)) e.email = "Enter a valid email";
  if (v.password.length < 8 || !/[A-Za-z]/.test(v.password) || !/[0-9]/.test(v.password))
    e.password = "At least 8 characters, with a letter and a number";
  if (!v.displayName.trim()) e.displayName = "Tell people what to call you";
  return e;
};

export default function RegisterPage() {
  const [register, { isLoading, error }] = useRegisterMutation();
  const [values, setValues] = useState({ displayName: "", username: "", email: "", password: "" });
  const [touched, setTouched] = useState(false);
  const navigate = useNavigate();

  const clientErrors = touched ? validate(values) : {};
  const serverErrors = getFieldErrors(error);
  const fieldError = (k: keyof typeof values) => clientErrors[k] ?? serverErrors[k];
  const generalError = error && Object.keys(serverErrors).length === 0 ? getErrorMessage(error) : null;

  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (Object.keys(validate(values)).length) return;
    const res = await register({ ...values, username: values.username.trim().toLowerCase(), email: values.email.trim() });
    if ("data" in res) navigate("/chat", { replace: true });
  };

  return (
    <AuthLayout title="Create your account" subtitle="It takes less than a minute.">
      <form className={s.form} onSubmit={onSubmit} noValidate>
        {generalError && <div className={s.formError} role="alert">{generalError}</div>}
        <TextField label="Display name" autoComplete="name" value={values.displayName} onChange={set("displayName")} error={fieldError("displayName")} />
        <TextField
          label="Username"
          autoComplete="username"
          value={values.username}
          onChange={set("username")}
          error={fieldError("username")}
          hint="People can find you by @username"
        />
        <TextField label="Email" type="email" autoComplete="email" value={values.email} onChange={set("email")} error={fieldError("email")} />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          value={values.password}
          onChange={set("password")}
          error={fieldError("password")}
          hint="At least 8 characters, with a letter and a number"
        />
        <Button type="submit" block loading={isLoading}>
          Create account
        </Button>
      </form>
      <p className={s.switch}>
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
