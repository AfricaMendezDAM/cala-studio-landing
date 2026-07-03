// Isotipo de cala.studio (punto sobre línea de horizonte) como SVG en línea.
// Usa currentColor → siempre del mismo color que el texto de al lado.
export default function BrandMark({ size = 22, className }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 100 100" fill="none"
      className={className} aria-hidden="true" style={{ display: "block", flex: "none" }}
    >
      <circle cx="40" cy="42" r="6" fill="currentColor" />
      <line x1="14" y1="58" x2="86" y2="58" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
