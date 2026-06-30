export function Logo({
  className = '',
  src = '/logo-evote.svg',
  alt = 'eVote',
}: {
  className?: string;
  src?: string;
  alt?: string;
}) {
  return (
    <span className={`inline-flex items-center ${className}`}>
      <img src={src} alt={alt} className="h-12 w-auto" />
    </span>
  );
}
