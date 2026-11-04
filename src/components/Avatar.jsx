export default function Avatar({ initial, className = '' }) {
  return (
    <span className={`avatar ${className}`} aria-hidden="true">
      {initial}
    </span>
  );
}
