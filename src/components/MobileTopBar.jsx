import BrandMark from "./BrandMark.jsx";

export default function MobileTopBar() {
  return (
    <div className="m3-topbar">
      <a href="#top" className="m3-topbar-brand" style={{ display: "inline-flex", alignItems: "center", gap: 9, color: "var(--ink)" }}>
        <BrandMark size={20} className="brand-mark" />
        cala.studio
      </a>
    </div>
  );
}
