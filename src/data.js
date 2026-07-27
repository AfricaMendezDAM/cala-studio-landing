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
    descr: "Trabajo en suelo con tu propio peso · control postural, respiración y movilidad",
    schedule: [
      { day: "Martes", hours: "9:00 — 9:50h"},
      { day: "Jueves", hours: "9:00 — 9:50h"},
    ],
  },
  {
    num: "02",
    tag: "Todos los niveles",
    name: "Pilates",
    nameEm: "Flow",
    descr: "Secuencias encadenadas al ritmo de la respiración · movilidad, coordinación y continuidad",
    schedule: [
      { day: "Lunes",     hours: "9:00 — 9:50h"},
      { day: "Miércoles", hours: "9:00 — 9:50h"},
    ],
  },
  {
    num: "03",
    tag: "Todos los niveles",
    name: "Pilates",
    nameEm: "Sculpt",
    descr: "Mat intenso con instrumentos de resistencia · fuerza funcional sin perder fluidez",
    schedule: [
      { day: "Lunes",     hours: "10:00 — 10:50h"},
      { day: "Martes",    hours: "10:00 — 10:50h"},
      { day: "Miércoles", hours: "10:00 — 10:50h"},
      { day: "Jueves",    hours: "10:00 — 10:50h"},
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
      "Mat, Flow y Sculpt combinables",
      "Prioridad en eventos del estudio",
    ],
    cta: "Quiero mi plaza fija",
    href: "#contacto",
    interes: "mensual-2",
  },
];

// Tarjetas de la sección Eventos de la home. Cada una con su cartel y un
// botón explícito de "Ver detalle" que lleva a #/evento/<slug>.
//   estado: "proximo"   → aún se puede reservar
//           "celebrado" → ya pasó, la página queda como archivo de la edición
//           "soon"      → hueco reservado, todavía sin cartel ni página
export const EVENT_CARDS = [
  {
    slug: "pilates-and-wine",
    estado: "proximo",
    when: "Sábado 8 de agosto",
    name: "Pilates & Wine",
    place: "Bodega Casal Fuentes",
    desc: "Masterclass entre viñas, paseo por la bodega y una copa para brindar",
    poster: "assets/eventos/pilates-and-wine.png",
  },
  {
    slug: "community-sessions-vol-01",
    estado: "celebrado",
    when: "Viernes 24 de julio",
    name: "Community Sessions",
    place: "Praia de Canelas · Vol. 01",
    desc: "Pilates flow al atardecer sobre la arena, gratis y abierto a todo el mundo",
    poster: "assets/eventos/cartel-community-ed01-2.png",
  },
  {
    estado: "soon",
    when: "Septiembre · 2026",
    name: "Coming soon",
    desc: "Estamos cerrando la próxima fecha, te la contamos por aquí",
  },
];

// Detalle de cada evento → página dedicada #/evento/<slug>.
// El cartel manda: la página lo muestra entero (sin recortar) y ofrece un
// CTA de reserva claro por WhatsApp (mismo modelo que las clases).
export const EVENTOS = {
  "pilates-and-wine": {
    slug: "pilates-and-wine",
    nombre: "Pilates & Wine",
    nombreEm: "& Wine",           // parte en cursiva/acento del titular
    eyebrow: "Evento de verano · cala × Viña Dogrobe",
    poster: "assets/eventos/pilates-and-wine.png",
    // Acento propio del evento — tiñe eyebrow, título, precio y CTA para
    // armonizar con el cartel. El fondo va siempre en blanco roto.
    tema: {
      accent:     "#C1402E",   // terracota del cartel
      accentDeep: "#9C3020",
    },
    // Datos alineados con el cartel — nada que se contradiga
    cuando: "Sábado 8 de agosto",
    hora: "10:30h",
    lugar: "Bodega Casal Fuentes",
    precio: "35€",
    nivel: "Todos los niveles",
    aforo: "Plazas limitadas",
    lede: "Una mañana entre viñas, la esterilla al aire libre y una copa para brindar",
    // Descripción — da un poco más que el cartel: el porqué, no solo el plan
    descripcion: "Pilates & Wine es nuestra excusa para salir del estudio y encontrarnos en un lugar bonito. Una mañana para movernos al aire libre entre viñas, reconectar con el cuerpo y con la naturaleza, y quedarnos después a charlar entre amigas con una copa en la mano",
    // Programa breve (lo que ya anuncia el cartel, en una línea)
    programa: "Masterclass de pilates · aperitivo con vino · paseo por las viñas",
    // CTA de reserva — abre WhatsApp con el mensaje ya escrito
    reservaMsg: "Hola! Quiero reservar plaza para Pilates & Wine (sábado 8 de agosto)",
  },

  "community-sessions-vol-01": {
    slug: "community-sessions-vol-01",
    nombre: "Community Sessions",
    nombreEm: "Sessions",
    eyebrow: "Community Sessions · Vol. 01",
    poster: "assets/eventos/cartel-community-ed01-2.png",
    // Granate y crema del cartel — el fondo sigue siendo blanco roto
    tema: {
      accent:     "#6D3738",
      accentDeep: "#53292A",
    },
    // Edición ya celebrada: la página queda como archivo y el CTA mira a la siguiente
    estado: "celebrado",
    estadoLabel: "Edición celebrada",
    cuando: "Viernes 24 de julio",
    hora: "20:30h",
    lugar: "Praia de Canelas, O Grove",
    precio: "Gratis",
    precioNota: "actividad abierta",
    nivel: "Todos los niveles",
    aforo: "Trae tu esterilla",
    lede: "Una tarde de viernes en la arena, la esterilla mirando al mar y la luz cayendo",
    descripcion: "Las Community Sessions nacen para sacar el pilates del estudio y llevarlo a donde ya está la gente en verano: la playa, el atardecer, el rato de después. La Vol. 01 juntó esterillas en Canelas para movernos al aire libre, sin niveles ni compromiso, y quedarnos viendo cómo se iba la luz",
    programa: "Pilates flow al aire libre · movimiento, respiración y conexión",
    ctaLabel: "Avisadme de la Vol. 02",
    reservaMsg: "Hola! Quiero que me aviséis de la próxima Community Session",
    fine: "La Vol. 02 ya está en camino",
  },
};

export function getEvento(slug) {
  return EVENTOS[slug] || null;
}

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
      "Combinables Mat, Flow y Sculpt",
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
      "Combinables Mat, Flow y Sculpt",
      "Prioridad en eventos del estudio",
    ],
    cta: "Quiero este bono",
    href: "#contacto",
    interes: "bono-10",
    featured: true,
  },
];

// Catálogo de productos para el registro de pagos del panel de gestión.
// Deriva de las tarifas de arriba: los importes salen siempre de PRICING/BONOS,
// así que al cambiar un precio no hay que tocar nada aquí.
export const PRODUCTOS = [...PRICING, ...BONOS].map((p) => ({
  concepto: `${p.name} ${p.nameEm}`,
  importe: p.amount,
}));

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
