import { ReactNode } from "react";
import { APP_NAME } from "../../constants";
import { cx } from "../../utils/format";
import s from "./auth.module.css";

export const BrandMark = ({ className }: { className?: string }) => (
  <div className={cx(s.brand, className)}>
    <div className={s.logoMark} aria-hidden="true">
      <span />
    </div>
    {APP_NAME}
  </div>
);

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className={s.page}>
      <section className={s.brandPanel} aria-hidden="true">
        <BrandMark />
        <div className={s.pitch}>
          <h1>Conversations that feel close.</h1>
          <p>Direct messages, group chats, reactions and files, all in real time, with the people you choose.</p>
        </div>
        <div className={s.previewStack}>
          <div className={s.previewBubble}>Are we still on for Friday? 🎉</div>
          <div className={cx(s.previewBubble, s.previewBubbleOut)}>Absolutely, I'll bring the slides</div>
          <div className={s.previewBubble}>Perfect, see you there</div>
        </div>
      </section>

      <section className={s.formPanel}>
        <div className={s.card}>
          <BrandMark className={s.mobileBrand} />
          <header className={s.cardHeader}>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </header>
          {children}
        </div>
      </section>
    </main>
  );
}
