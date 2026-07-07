export const CONTACT = {
  phoneLabel: "+34 644 39 31 85",
  phoneHref: "tel:+34644393185",
  instagramLabel: "@calastudio.es",
  instagramHref: "https://www.instagram.com/calastudio.es/",
};

export const HERO_SLIDES = [
  { img: "assets/carousel-01.png",        label: "Atardecer" },
  { img: "assets/hero.jpg", label: "Mat outdoor · Frente al mar" },
  { img: "assets/carousel-03.png",        label: "Sunrise sessions" },
  { img: "assets/carousel-04.png", label: "Brunch club · Eventos", darkOverlay: true },
];

export const GROUPS = [
  {
    num: "01",
    tag: "Todos los niveles",
    name: "Pilates",
    nameEm: "Mat",
    descr: "Suelo. Control postural, respiración y movilidad.",
    schedule: [
      { day: "Martes", hours: "9:00 — 9:50h"},
      { day: "Jueves", hours: "9:00 — 9:50h"},

    ],
  },
  {
    num: "02",
    tag: "Todos los niveles",
    name: "Pilates",
    nameEm: "Sculpt",
    descr: "Mat intenso con instrumentos de resistencia. Fuerza funcional sin perder fluidez.",
    schedule: [
      { day: "Martes",  hours: "10:00 — 10:50h"},
      { day: "Jueves",  hours: "10:00 — 10:50h"}
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
    href: "#/reservar",
  },
  {
    label: "Más popular",
    name: "Mensual",
    nameEm: "1 / semana",
    amount: 50,
    per: "/ mes",
    items: [
      "4 clases al mes",
      "Plaza fija en horario elegido",
      "Prioridad en eventos del estudio",
    ],
    cta: "Quiero mi plaza fija",
    href: "#contacto",
    interes: "mensual-1",
    featured: true,
  },
  {
    label: "Compromiso",
    name: "Mensual",
    nameEm: "2 / semana",
    amount: 80,
    per: "/ mes",
    items: [
      "8 clases al mes",
      "Mat + Sculpt combinables",
      "Prioridad en eventos del estudio",
    ],
    cta: "Quiero mi plaza fija",
    href: "#contacto",
    interes: "mensual-2",
  },
];

export const EVENT_TEASERS = [
  {
    when: "Agosto · 2026",
    name: "Pilates & Wine",
    place: "Viña do Grobe",
    desc: "Masterclass de pilates, paseo por la viña y picoteo con vino de la zona. Fecha por confirmar.",
    confirmed: false,
  },
  { when: "Septiembre · 2026", name: "COMING SOON" },
];

export const BONOS = [
  {
    label: "Flexible",
    name: "Bono",
    nameEm: "5 clases",
    amount: 75,
    per: "/ bono",
    items: [
      "5 clases a usar antes del 31 ago",
      "Mat y material incluidos",
      "Combinables Mat + Sculpt",
    ],
    cta: "Quiero este bono",
    href: "#contacto",
    interes: "bono-5",
  },
  {
    label: "Más ahorro",
    name: "Bono",
    nameEm: "10 clases",
    amount: 140,
    per: "/ bono",
    items: [
      "10 clases a usar antes del 31 ago",
      "Mat y material incluidos",
      "Combinables Mat + Sculpt",
      "Prioridad en eventos del estudio",
    ],
    cta: "Quiero este bono",
    href: "#contacto",
    interes: "bono-10",
    featured: true,
  },
];

export const CONTACT_INTERES = [
  { value: "duda",      label: "Una duda general" },
  { value: "mensual-1", label: "Mensualidad · 1 clase/semana" },
  { value: "mensual-2", label: "Mensualidad · 2 clases/semana" },
  { value: "bono-5",    label: "Bono · 5 clases" },
  { value: "bono-10",   label: "Bono · 10 clases" },
  { value: "evento",    label: "Eventos / grupo privado" },
];

export const LOCATION = {
  mapSrc: "https://www.openstreetmap.org/export/embed.html?bbox=-8.9339%2C42.4525%2C-8.8939%2C42.4725&layer=mapnik&marker=42.462495%2C-8.913941",
  directionsHref: "https://www.google.com/maps/place/42%C2%B027'45.0%22N+8%C2%B054'50.2%22W/@42.4625093,-8.9323949,15z/data=!3m1!4b1!4m7!1m2!2m1!1scarretera+san+vicente+do+mar+!3m3!8m2!3d42.462495!4d-8.913941?entry=ttu&g_ep=EgoyMDI2MDUxMy4wIKXMDSoASAFQAw%3D%3D",
  address: { street: "Terraza Restaurante Meloxeira Praia", city: "Carretera San Vicente do Mar 1100, 36989 O Grove" },
  partner: {
    name: "Restaurante Meloxeira",
    logo: "assets/logo-nuevo-taberna-meloxeira.png",
  },
};
