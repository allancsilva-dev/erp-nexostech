interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex items-start justify-between">
      <div className="flex flex-col gap-0.5">
        <h1
          className="text-xl font-semibold leading-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          {title}
        </h1>
        {subtitle ? (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}