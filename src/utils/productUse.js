// Texto corto de "para qué sirve" según el tipo de producto.
// Se deduce del nombre; el orden importa (lo más específico va primero).
const RULES = [
  [/papel absorbente/, 'Absorbe el exceso de grasa del rostro sin arruinar el maquillaje.'],
  [/brillo y delineador/, 'Brillo y delineador de labios en uno: define el contorno y da brillo.'],
  [/rubor.*iluminador|iluminador.*rubor/, 'Da color a las mejillas y luz a las zonas altas del rostro en un solo producto.'],
  [/brocha doble de ceja|kit perfilador/, 'Perfila y difumina las cejas con brocha doble para un acabado definido.'],
  [/encrespador/, 'Set de accesorios para complementar tu rutina de maquillaje.'],
  [/velo de vitamina c/, 'Cuidado con vitamina C que deja la piel del rostro con aspecto luminoso.'],
  [/colageno de labios|mascarilla de labios/, 'Mascarilla para los labios: los hidrata y los deja suaves y con más volumen visual.'],
  [/delineador de labios|lapiz de labios|lapiz.*labios/, 'Perfila y da color a los labios con un acabado definido y duradero.'],
  [/lip oil|aceite labial/, 'Aceite para labios: da brillo, hidratación y un acabado jugoso.'],
  [/gloss|brillo labial|brillo y delineador/, 'Da brillo y un toque de color a los labios, con acabado húmedo.'],
  [/balsamo|lippie balm|hidratante de fresa|hidratante de/, 'Hidrata y suaviza los labios; ideal para usar solo o bajo el labial.'],
  [/tinta.*labios|tinta paleta|fat oil|tinta fat|juicy lips|serum.*labios/, 'Tinta para labios: color intenso y de larga duración.'],
  [/labial|lip combo|duo nude/, 'Da color a los labios con un acabado cómodo para el día a día.'],
  [/tinta para cejas|gel.*cej|betun|lapiz de cejas|estilizador de cejas/, 'Define, rellena y fija las cejas para un acabado natural y marcado.'],
  [/pestanina|pestañina|mascara de pestanas/, 'Máscara de pestañas: da largo, volumen y definición a la mirada.'],
  [/serum pestan/, 'Sérum para pestañas: ayuda a cuidarlas y a que se vean más fuertes y largas.'],
  [/libro de pestan|pestan.*(8d|volumen)|pestanas|pestañas/, 'Pestañas postizas para dar volumen y dramatismo a la mirada.'],
  [/paleta de sombras|kit de sombras|sombra/, 'Sombras para crear looks de ojos desde naturales hasta intensos.'],
  [/delineador|plumon/, 'Delinea los ojos con trazo preciso y de larga duración.'],
  [/corrector/, 'Cubre ojeras, manchas e imperfecciones y unifica el tono de la piel.'],
  [/contorno/, 'Esculpe y define el rostro dando profundidad a pómulos, nariz y mandíbula.'],
  [/base|bb cream/, 'Unifica el tono de la piel y da una cobertura pareja como base del maquillaje.'],
  [/iluminador|polvo de hadas|skin shimmer/, 'Da luz y brillo a las zonas altas del rostro para un efecto radiante.'],
  [/rubor|vibrant blush|blush/, 'Da color y un aspecto saludable a las mejillas.'],
  [/pintucaritas/, 'Pintura para rostro y cuerpo, para maquillaje artístico y de fantasía.'],
  [/polvo|matificante/, 'Sella el maquillaje, controla el brillo y deja la piel con acabado mate.'],
  [/mini blender|esponja|blender/, 'Esponjas para difuminar base, corrector y otros productos sin dejar marcas.'],
  [/set de brochas|brochas kabuki|brocha/, 'Herramienta para aplicar y difuminar el maquillaje con precisión.'],
  [/mascarilla/, 'Mascarilla facial que hidrata y refresca la piel.'],
  [/desmaquillante/, 'Retira el maquillaje y las impurezas del rostro de forma suave.'],
  [/crema de vitamina c/, 'Crema facial con vitamina C que hidrata y ayuda a dar luminosidad a la piel.'],
  [/agua de rosas/, 'Spray refrescante que hidrata e ilumina la piel y ayuda a fijar el maquillaje.'],
  [/jabon/, 'Jabón de limpieza para el rostro y el cuerpo.'],
  [/fijador/, 'Spray que fija el maquillaje y ayuda a que dure todo el día.'],
];

const FALLBACK = {
  labiales: 'Producto para el cuidado y el color de los labios.',
  bases: 'Producto para preparar y unificar la piel antes del resto del maquillaje.',
  polvo: 'Producto para dar color, luz o acabado mate al rostro.',
  ojos: 'Producto para maquillar y definir ojos y cejas.',
  brochas: 'Accesorio o cuidado de la piel para aplicar y complementar tu maquillaje.',
};

function normalize(text) {
  return String(text || '').toLocaleLowerCase('es').normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function productUse(name, category = '') {
  const text = normalize(name);
  for (const [pattern, use] of RULES) {
    if (pattern.test(text)) return use;
  }
  return FALLBACK[category] || '';
}
