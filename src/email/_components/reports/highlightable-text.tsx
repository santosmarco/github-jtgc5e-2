export type HighlightableTextProps = {
  children: string;
  highlightClassName?: string;
  keyword?: string;
  force?: boolean;
};

export function HighlightableText({
  children,
  highlightClassName = "font-semibold text-indigo-600",
  keyword = "highlight",
  force = false,
}: HighlightableTextProps) {
  if (force) {
    return <span className={highlightClassName}>{children}</span>;
  }

  const parts = children.split(new RegExp(`<${keyword}>|<\\/${keyword}>`));

  return parts.map((part, index) => {
    if (index % 2 === 0) {
      return part;
    }

    return (
      <span key={part} className={highlightClassName}>
        {part}
      </span>
    );
  });
}
