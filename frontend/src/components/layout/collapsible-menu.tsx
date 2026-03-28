'use client';

import { KeyboardEvent, useEffect, useState } from 'react';

type CollapsibleMenuProps = {
  id: string;
  title: string;
  children: React.ReactNode;
  isCollapsed: boolean;
};

export default function CollapsibleMenu({ id, title, children, isCollapsed }: CollapsibleMenuProps) {
  const storageKey = `sidebar_open_group`;
  const [open, setOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(storageKey) === id;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      const current = localStorage.getItem(storageKey);
      if (current === id) setOpen(true);
    } catch {
      // ignore
    }
  }, [id, storageKey]);

  function toggle() {
    try {
      if (open) {
        localStorage.removeItem(storageKey);
        setOpen(false);
      } else {
        localStorage.setItem(storageKey, id);
        setOpen(true);
      }
    } catch {
      setOpen((v) => !v);
    }
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  }

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={toggle}
        onKeyDown={onKey}
        className="group/collapsible flex w-full items-center justify-between rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[hsl(var(--sidebar-section-label))] transition-[background-color,color] duration-300 hover:bg-[hsl(var(--background)/0.88)] hover:text-[hsl(var(--sidebar-text))]"
      >
        <span className="truncate">{title}</span>
        {!isCollapsed ? (
          <span className="ml-2 text-sm transition-transform duration-300 group-hover/collapsible:translate-x-0.5">
            {open ? '▾' : '▸'}
          </span>
        ) : null}
      </button>
      {open ? <div className="space-y-1 pl-1 pt-1">{children}</div> : null}
    </div>
  );
}
