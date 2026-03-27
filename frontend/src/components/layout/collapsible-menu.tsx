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
        className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--sidebar-section-label)]"
      >
        <span className="truncate">{title}</span>
        {!isCollapsed ? <span className="ml-2 text-sm">{open ? '▾' : '▸'}</span> : null}
      </button>
      {open ? <div className="space-y-1 pl-1">{children}</div> : null}
    </div>
  );
}
