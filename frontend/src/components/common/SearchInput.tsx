import { InputHTMLAttributes, forwardRef } from "react";
import { Icon } from "../ui";
import s from "./common.module.css";

export const SearchInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label: string }>(
  function SearchInput({ label, ...rest }, ref) {
    return (
      <label className={s.searchBox}>
        <span className="visually-hidden">{label}</span>
        <Icon name="search" size={18} />
        <input ref={ref} type="search" className={s.searchInput} autoComplete="off" spellCheck={false} {...rest} />
      </label>
    );
  },
);
