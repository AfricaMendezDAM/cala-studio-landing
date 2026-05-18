export default function Section({ id, num, title, right, className = "", children }) {
  return (
    <section id={id} className={"section compact " + className}>
      <div className="section-head">
        <div className="left">
          <div className="num"><span className="bar"></span>{num}</div>
          <h2>{title}</h2>
        </div>
        <div className="right">{right}</div>
      </div>
      {children}
    </section>
  );
}
