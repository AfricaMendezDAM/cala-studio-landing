export const HERO_SLIDES = [
  { img: "assets/hero.png",        label: "Atardecer" },
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
      { day: "Martes", hours: "10:30 — 11:30h"},

    ],
  },
  {
    num: "02",
    tag: "Todos los niveles",
    name: "Pilates",
    nameEm: "Sculpt",
    descr: "Mat acelerado con peso ligero y bandas. Fuerza funcional sin perder fluidez.",
    schedule: [
      { day: "Sábados",  hours: "10:30 — 11:30h"}
    ],
  },
];

export const PRICING = [
  {
    label: "Drop-in",
    name: "Tarifa",
    nameEm: "única",
    amount: 15,
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
    amount: 40,
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
    amount: 75,
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
  { when: "Julio · 2026",      name: "COMMING SOON" },
  { when: "Agosto · 2026",     name: "COMMING SOON" },
  { when: "Septiembre · 2026", name: "COMMING SOON" },
];

export const SLOTS = ["Martes 10:30", "Sábado 10:30", "Sunrise"];

export const LOCATION = {
  mapSrc: "https://www.openstreetmap.org/export/embed.html?bbox=-8.9339%2C42.4525%2C-8.8939%2C42.4725&layer=mapnik&marker=42.462495%2C-8.913941",
  directionsHref: "https://www.google.com/maps/place/42%C2%B027'45.0%22N+8%C2%B054'50.2%22W/@42.4625093,-8.9323949,15z/data=!3m1!4b1!4m7!1m2!2m1!1scarretera+san+vicente+do+mar+!3m3!8m2!3d42.462495!4d-8.913941?entry=ttu&g_ep=EgoyMDI2MDUxMy4wIKXMDSoASAFQAw%3D%3D",
  address: { street: "Carretera San Vicente do Mar 1100", city: "36989 -O Grove, Pontevedra" },
};
