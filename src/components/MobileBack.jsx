export default function MobileBack({ onBack }) {
  return (
    <div className="m3-back">
      <button onClick={onBack} className="m3-back-btn" aria-label="Volver">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
      </button>
      <span className="m3-back-brand">cala<span>·</span>studio</span>
    </div>
  );
}
