import Section from "./Section.jsx";
import { GROUPS } from "../data.js";

function GroupCard({ group }) {
  return (
    <article className="group-card">
      <div className="head">
        <span className="num">{group.num}</span>
        <span className="tag">{group.tag}</span>
      </div>
      <h3>{group.name} <b>{group.nameEm}</b></h3>
      <p className="descr">{group.descr}</p>
      <div className="schedule">
        {group.schedule.map((s, j) => (
          <div key={j} className="row">
            <span className="day">{s.day}</span>
            <span className="hours">{s.hours}</span>
            <span className="level">{s.level}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

export default function Grupos() {
  return (
    <Section
      id="grupos"
      num="I · Grupos"
      title={<>Dos métodos. <em>Una sala</em>.</>}
      right={<>
        Grupos cerrados con progresiones de seis semanas. Si vienes sin
        experiencia, empieza por Mat. Si ya practicas, Sculpt es tu sitio.
      </>}
    >
      <div className="grid-12">
        {GROUPS.map((g, i) => <GroupCard key={i} group={g} />)}
      </div>
    </Section>
  );
}
