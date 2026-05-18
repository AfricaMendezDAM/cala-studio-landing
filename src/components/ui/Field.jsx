export default function Field({ label, error, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {error && <span className="err">{error}</span>}
    </div>
  );
}
