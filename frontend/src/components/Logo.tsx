export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center ${className}`}>
      <img
        src="/logo-evote.svg"
        alt="eVote — Ordre des Pharmaciens"
        className="h-12 w-auto"
      />
    </span>
  );
}
