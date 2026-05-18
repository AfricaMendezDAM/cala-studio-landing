export const HERO_SLIDES = [
  { img: "assets/hero.png",        label: "Atardecer · Estudio" },
  { img: "assets/carousel-01.png", label: "Mat outdoor · Frente al mar" },
  { img: "assets/carousel-02.png", label: "Sunrise sessions" },
  { img: "assets/carousel-03.png", label: "Brunch club · Eventos" },
];

export const GROUPS = [
  {
    num: "01",
    tag: "Todos los niveles",
    name: "Pilates",
    nameEm: "Mat",
    descr: "Suelo. Control postural, respiración y movilidad. Grupos reducidos de máximo 8 personas.",
    schedule: [
      { day: "Martes", hours: "10:30 — 11:30h", level: "Iniciación" },
      { day: "Jueves", hours: "19:00 — 20:00h", level: "Intermedio" },
    ],
  },
  {
    num: "02",
    tag: "Cuerpos activos",
    name: "Pilates",
    nameEm: "Sculpt",
    descr: "Mat acelerado con peso ligero y bandas. Fuerza funcional sin perder fluidez.",
    schedule: [
      { day: "Sábados",  hours: "10:30 — 11:30h", level: "Intermedio +" },
      { day: "Domingos", hours: "11:00 — 12:00h", level: "Avanzado" },
    ],
  },
];

export const PRICING = [
  {
    label: "Drop-in",
    name: "Tarifa",
    nameEm: "única",
    amount: 18,
    per: "/ clase",
    items: [
      "Clase suelta sin compromiso",
      "Mat y material incluido",
      "Ideal para probar el método",
    ],
    cta: "Reservar clase",
  },
  {
    label: "Más popular",
    name: "Mensual",
    nameEm: "1 / semana",
    amount: 58,
    per: "/ mes",
    items: [
      "4 clases al mes",
      "Plaza fija en horario elegido",
      "Recuperación en otro horario",
    ],
    cta: "Empezar el mes",
    featured: true,
  },
  {
    label: "Compromiso",
    name: "Mensual",
    nameEm: "2 / semana",
    amount: 92,
    per: "/ mes",
    items: [
      "8 clases al mes",
      "Mat + Sculpt combinables",
      "Prioridad en eventos del estudio",
    ],
    cta: "Empezar el mes",
  },
];

export const EVENT_TEASERS = [
  { when: "Julio · 2026",      name: "Sunrise sessions" },
  { when: "Agosto · 2026",     name: "Pilates & Brunch" },
  { when: "Septiembre · 2026", name: "Retiro fin de semana" },
];

export const SLOTS = ["Martes 10:30", "Jueves 19:00", "Sábado 10:30", "Domingo 11:00", "Sunrise"];

export const LOCATION = {
  mapSrc: "https://www.openstreetmap.org/export/embed.html?bbox=-9.0210%2C43.2150%2C-8.9810%2C43.2350&layer=mapnik&marker=43.2253%2C-9.0010",
  directionsHref: "https://www.google.com/maps/dir/?api=1&destination=43.2253,-9.0010",
  address: { street: "Rúa do Mar, 12 — bajo", city: "15117 · Laxe, A Coruña" },
};
