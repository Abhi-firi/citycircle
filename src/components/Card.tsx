/** Standard white card used across the member app. */
export function Card({
  children,
  className = "",
  as: Tag = "section",
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  as?: "section" | "div" | "aside";
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag
      className={`rounded-2xl border border-line bg-surface shadow-sm ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
