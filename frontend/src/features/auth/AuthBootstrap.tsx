import { ReactNode, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { Spinner } from "../../components/ui";
import { authApi } from "./authApi";
import { selectAuthStatus } from "./authSlice";
import s from "./auth.module.css";

let restoreStarted = false; // module-level: React StrictMode mounts twice in development

/**
 * Nothing renders until we know whether the user is signed in, so protected
 * routes never briefly show the login screen after a page reload.
 */
export function AuthBootstrap({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectAuthStatus);

  useEffect(() => {
    if (restoreStarted) return;
    restoreStarted = true;
    void dispatch(authApi.endpoints.restoreSession.initiate());
  }, [dispatch]);

  if (status === "checking") {
    return (
      <div className={s.splash}>
        <div className={s.logoMark} aria-hidden="true">
          <span />
        </div>
        <Spinner size={22} label="Loading your session" />
      </div>
    );
  }
  return <>{children}</>;
}
