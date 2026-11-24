/* =====================================================================
   app.js — Lógica del prototipo digital
   App de pre-pedido y apartado de comida (Escenario 1)

   Índice de secciones (busca el marcador para ir directo):
     [1] CONFIG ............ valores que se pueden ajustar fácilmente
     [2] DATOS ............. lonchería, menú y métodos de pago de ejemplo
     [3] ESTADO ............ lo que cambia mientras se usa la app
     [4] UTILIDADES ........ navegación, formato de dinero/hora, alertas, toasts
     [5] P1 LOGIN
     [6] P2 LOCALES
     [7] P3 MENÚ
     [8] P4 CARRITO
     [9] P5 PAGO (incluye editor de teléfono)
    [10] P5.4 MÉTODOS DE PAGO
    [11] P6 PROCESANDO
    [12] P7 CÓDIGO DE PEDIDO
    [13] PANEL DEL MODERADOR
    [14] INICIO

   Nota: no hay servidor. Todo se simula en el navegador y se reinicia
   al recargar la página.
   ===================================================================== */


/* =====================================================================
   [1] CONFIG — cambia aquí los valores del prototipo
   ===================================================================== */
const CONFIG = {
  usuarioDemo: 'juanito',            // Usuario válido para el login
  passDemo: '1234',                  // Contraseña válida para el login
  fechaHoy: new Date(2026, 10, 19),  // "Hoy" = 19 de noviembre (como en el prototipo en papel). Mes 10 = noviembre
  horaSimulada: '08:15',             // Hora del celular al iniciar (Juan abre la app antes del receso de 8:30)
  anticipacionMin: 15,               // Minutos mínimos de anticipación para recoger (error 4.1)
  horaRecogidaInicial: '08:35',      // Hora preseleccionada en el carrito
  horarioApertura: '07:00',          // Primera hora disponible en el selector
  horarioCierre: '16:00',            // Última hora disponible en el selector
  intervaloMin: 5,                   // Separación entre horas del selector (minutos)
  tarifaServicio: 5,                 // Tarifa de servicio en pesos
  telefonoInicial: '3121234567',     // Teléfono de contacto precargado
  segundosProcesando: 15,            // Cuenta regresiva de la pantalla 6
  segundosPorEtapa: 4                // Tiempo entre Pendiente → En preparación → Listo (pantalla 7)
};


/* =====================================================================
   [2] DATOS — lonchería, menú y métodos de pago
   Para agregar un producto, copia un objeto dentro de "productos".
   "icono" usa nombres de Bootstrap Icons (https://icons.getbootstrap.com).
   ===================================================================== */
const DATOS = {
  loncheria: {
    nombre: 'Comida Con Conciencia',
    puntoEntrega: 'Mostrador principal',
    categorias: [
      {
        nombre: 'Bowls',
        productos: [
          { id: 'bowl-granola', nombre: 'Granola, coco y miel', descripcion: 'Y yogurt natural con frutas de temporada', precio: 45, icono: 'bi-egg-fried', nombreCorto: 'Bowl (Granola, coco...)' },
          { id: 'bowl-avena', nombre: 'Avena cocida, coco, semillas y miel', descripcion: 'Y yogurt natural con fruta de temporada', precio: 55, icono: 'bi-egg-fried', nombreCorto: 'Bowl (Avena cocida...)' }
        ]
      },
      {
        nombre: 'Quesadilla saludable',
        productos: [
          { id: 'ques-queso', nombre: 'Mozzarella o panela', descripcion: 'Tortilla de maíz hecha a mano', precio: 17, icono: 'bi-pie-chart', nombreCorto: 'Quesadilla (Mozzarella o panela)' },
          { id: 'ques-champ', nombre: 'Mozzarella o panela + champiñón', descripcion: 'Tortilla de maíz hecha a mano', precio: 22, icono: 'bi-pie-chart', nombreCorto: 'Quesadilla (+ champiñón)' }
        ]
      },
      {
        nombre: 'Licuados',
        productos: [
          { id: 'lic-creativo', nombre: 'Creativo', descripcion: 'Leche, manzana, plátano, amaranto y coco', precio: 45, icono: 'bi-cup-straw', nombreCorto: 'Licuado Creativo' },
          { id: 'lic-positivo', nombre: 'Positivo', descripcion: 'Leche, fresa, plátano, avena y cacahuate', precio: 45, icono: 'bi-cup-straw', nombreCorto: 'Licuado Positivo' }
        ]
      }
    ]
  },

  // Métodos guardados del usuario (como en la pantalla 5.4 del papel)
  metodosIniciales: [
    { id: 'visa-1234', tipo: 'Visa', ultimos: '1234', titular: 'Juanito' },
    { id: 'mc-4321', tipo: 'Mastercard', ultimos: '4321', titular: 'Juanito' },
    { id: 'efectivo', tipo: 'Efectivo' }
  ]
};


/* =====================================================================
   [3] ESTADO — datos que cambian durante el uso
   reiniciarEstado() lo devuelve a como estaba al abrir la app.
   ===================================================================== */
let estado = {};

function reiniciarEstado() {
  estado = {
    carrito: {},                                   // { idProducto: cantidad }
    dia: 'hoy',                                    // 'hoy' | 'manana'
    hora: CONFIG.horaRecogidaInicial,              // 'HH:MM'
    telefono: CONFIG.telefonoInicial,
    metodos: DATOS.metodosIniciales.map(m => ({ ...m })),
    metodoSeleccionado: 'visa-1234',               // null = sin método (error 5.3)
    noDisponibles: new Set(),                      // ids de productos agotados (3.1)
    fallaAlAgregar: false,                         // fuerza el error 3.3
    horaSimulada: CONFIG.horaSimulada,
    temporizadores: []                             // para limpiar cuentas regresivas
  };
}


/* =====================================================================
   [4] UTILIDADES
   ===================================================================== */

/** Muestra solo la pantalla indicada (por id) y sube el scroll. */
function irA(idPantalla) {
  document.querySelectorAll('.pantalla').forEach(p => p.classList.add('d-none'));
  document.getElementById(idPantalla).classList.remove('d-none');
  document.getElementById('contenido').scrollTop = 0;

  // El botón flotante del carrito solo se ve en el menú
  document.getElementById('btn-carrito-flotante').classList.toggle('d-none', idPantalla !== 'p-menu');

  // Al entrar a ciertas pantallas se vuelven a dibujar con el estado actual
  if (idPantalla === 'p-menu') pintarMenu();
  if (idPantalla === 'p-carrito') pintarCarrito();
  if (idPantalla === 'p-pago') pintarPago();
  if (idPantalla === 'p-metodos') pintarMetodos();
}

/** Formatea un número como dinero: 45 → "$45". */
const dinero = n => '$' + n.toLocaleString('es-MX');

/** Convierte 'HH:MM' a minutos desde medianoche. */
const aMinutos = hhmm => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

/** Convierte minutos a 'HH:MM'. */
const aHHMM = min => String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');

/** 'HH:MM' → '8:35 a. m.' (formato para mostrar). */
function horaBonita(hhmm) {
  let [h, m] = hhmm.split(':').map(Number);
  const sufijo = h < 12 ? 'a. m.' : 'p. m.';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${sufijo}`;
}

/** Fecha del día elegido como texto: 'Hoy, 19 nov'. */
function fechaBonita(dia) {
  const f = new Date(CONFIG.fechaHoy);
  if (dia === 'manana') f.setDate(f.getDate() + 1);
  const texto = f.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).replace('.', '');
  return (dia === 'hoy' ? 'Hoy, ' : 'Mañana, ') + texto;
}

/** Busca un producto por id en todas las categorías. */
function buscarProducto(id) {
  for (const cat of DATOS.loncheria.categorias) {
    const p = cat.productos.find(prod => prod.id === id);
    if (p) return p;
  }
  return null;
}

/** Totales del carrito: número de artículos y subtotal en pesos. */
function totalesCarrito() {
  let articulos = 0, subtotal = 0;
  for (const [id, cant] of Object.entries(estado.carrito)) {
    articulos += cant;
    subtotal += buscarProducto(id).precio * cant;
  }
  return { articulos, subtotal, total: subtotal + (articulos ? CONFIG.tarifaServicio : 0) };
}

/* ---------- Modales dentro del celular ----------
   Los modales son capas (.capa-modal) dentro del marco del celular,
   así se centran en el teléfono y no en toda la ventana. */
const abrirModal = id => document.getElementById(id).classList.remove('d-none');
const cerrarModal = id => document.getElementById(id).classList.add('d-none');

// Botones con data-cerrar="id-del-modal" (ej. "Cancelar" del editor de teléfono)
document.querySelectorAll('[data-cerrar]').forEach(b =>
  b.addEventListener('click', () => cerrarModal(b.dataset.cerrar))
);

/* ---------- Modal genérico de alerta ---------- */
let accionAlerta = null;   // función que se ejecuta al presionar el botón del modal

/**
 * Muestra una alerta de error en modal.
 * @param {object} op  { icono, colorIcono, titulo, mensaje, boton, accion }
 *   - icono: clase de Bootstrap Icons (ej. 'bi-cart-x')
 *   - accion: función opcional al presionar el botón (ej. abrir otra ventana)
 */
function mostrarAlerta({ icono = 'bi-exclamation-triangle-fill', colorIcono = 'text-warning', titulo, mensaje, boton = 'Entendido', accion = null }) {
  const i = document.getElementById('alerta-icono');
  i.className = `bi ${icono} ${colorIcono}`;
  document.getElementById('alerta-titulo').textContent = titulo;
  document.getElementById('alerta-mensaje').textContent = mensaje;
  document.getElementById('alerta-boton').textContent = boton;
  accionAlerta = accion;
  abrirModal('modal-alerta');
}

document.getElementById('alerta-boton').addEventListener('click', () => {
  const accion = accionAlerta;
  accionAlerta = null;
  cerrarModal('modal-alerta');
  // Si la alerta tiene acción (ej. "Corregir número"), se ejecuta al cerrarla
  if (accion) accion();
});

/* ---------- Aviso breve (toast) dentro del celular ---------- */
let temporizadorAviso = null;
function mostrarToast(texto) {
  const aviso = document.getElementById('toast');
  aviso.textContent = texto;
  aviso.classList.remove('d-none');
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => aviso.classList.add('d-none'), 2200);
}

/* ---------- Botones genéricos de regreso (atributo data-ir) ---------- */
document.querySelectorAll('[data-ir]').forEach(btn =>
  btn.addEventListener('click', () => irA(btn.dataset.ir))
);


/* =====================================================================
   [5] P1 LOGIN
   Valida usuario y contraseña por separado:
     - usuario distinto al demo  → "Usuario no encontrado"
     - contraseña incorrecta     → "Contraseña incorrecta"
   El error se quita en cuanto el usuario vuelve a escribir.
   ===================================================================== */
const inUsuario = document.getElementById('login-usuario');
const inPass = document.getElementById('login-pass');

document.getElementById('form-login').addEventListener('submit', e => {
  e.preventDefault();
  const usuarioOk = inUsuario.value === CONFIG.usuarioDemo;
  const passOk = inPass.value === CONFIG.passDemo;

  inUsuario.classList.toggle('is-invalid', !usuarioOk);
  // La contraseña solo se marca si el usuario existe (errores independientes)
  inPass.classList.toggle('is-invalid', usuarioOk && !passOk);

  if (usuarioOk && passOk) irA('p-locales');
});

[inUsuario, inPass].forEach(inp => inp.addEventListener('input', () => inp.classList.remove('is-invalid')));


/* =====================================================================
   [6] P2 LOCALES
   Tocar la tarjeta de la lonchería abre su menú.
   ===================================================================== */
document.getElementById('btn-loncheria').addEventListener('click', () => irA('p-menu'));


/* =====================================================================
   [7] P3 MENÚ
   pintarMenu() genera las tarjetas desde DATOS.loncheria.
   Estados de cada tarjeta:
     - normal: botón "+"
     - agregado (3.2): botón con palomita (volver a tocarlo no agrega otro;
       la cantidad se cambia en el carrito)
     - no disponible (3.1): sombreada, texto "No disponible", botón deshabilitado
   ===================================================================== */
function pintarMenu() {
  const cont = document.getElementById('lista-menu');
  cont.innerHTML = '';

  DATOS.loncheria.categorias.forEach(cat => {
    const titulo = document.createElement('h3');
    titulo.className = 'h6 mt-3 mb-2 border-bottom pb-1';
    titulo.textContent = cat.nombre;
    cont.appendChild(titulo);

    cat.productos.forEach(p => {
      const noDisp = estado.noDisponibles.has(p.id);
      const enCarrito = !!estado.carrito[p.id];

      const tarjeta = document.createElement('div');
      tarjeta.className = 'producto' + (noDisp ? ' no-disponible' : '');
      tarjeta.innerHTML = `
        <div class="img-prod" aria-hidden="true"><i class="bi ${p.icono}"></i></div>
        <div class="pe-5">
          <p class="fw-semibold mb-0 small">${p.nombre}</p>
          <p class="text-secondary mb-0" style="font-size:.75rem">${p.descripcion}</p>
        </div>
        <span class="precio small">${dinero(p.precio)}</span>
        ${noDisp ? '<span class="etiqueta-nd">No disponible</span>' : ''}
        <button class="btn-agregar ${enCarrito ? 'agregado' : ''}" data-id="${p.id}"
                ${noDisp ? 'disabled' : ''}
                aria-label="${enCarrito ? 'Agregado al carrito' : 'Agregar ' + p.nombre + ' al carrito'}">
          <i class="bi ${enCarrito ? 'bi-check-lg' : 'bi-plus-lg'}"></i>
        </button>`;
      cont.appendChild(tarjeta);
    });
  });

  // Evento de cada botón "+"
  cont.querySelectorAll('.btn-agregar').forEach(btn =>
    btn.addEventListener('click', () => agregarAlCarrito(btn.dataset.id))
  );
}

/** Agrega un producto al carrito o muestra el error 3.3 si está forzado. */
function mostrarErrorAgregarAlCarrito() {
  mostrarAlerta({
    icono: 'bi-x-circle-fill', colorIcono: 'text-danger',
    titulo: 'Error al agregar al carrito',
    mensaje: 'Vuelve a intentarlo más tarde.'
  });
}

function agregarAlCarrito(id) {
  if (estado.fallaAlAgregar) {
    mostrarErrorAgregarAlCarrito();
    return;
  }
  // Si ya tiene palomita no hace nada: la cantidad se ajusta en el carrito
  if (estado.carrito[id]) return;
  estado.carrito[id] = 1;
  pintarMenu();
}

document.getElementById('btn-carrito-flotante').addEventListener('click', () => irA('p-carrito'));


/* =====================================================================
   [8] P4 CARRITO
   - Botones −, + y eliminar por artículo
   - Horario de recogida (Hoy/Mañana + hora)
   - "Siguiente" valida:
       4.2 carrito vacío
       4.1 horario con menos de CONFIG.anticipacionMin minutos (solo "Hoy")
   ===================================================================== */
function pintarCarrito() {
  const cont = document.getElementById('lista-carrito');
  cont.innerHTML = '';
  const ids = Object.keys(estado.carrito);

  if (ids.length === 0) {
    cont.innerHTML = '<p class="text-secondary text-center small py-3 border rounded-4 mb-3">Tu carrito está vacío</p>';
  }

  ids.forEach(id => {
    const p = buscarProducto(id);
    const cant = estado.carrito[id];
    const fila = document.createElement('div');
    fila.className = 'border rounded-4 p-2 mb-2';
    fila.innerHTML = `
      <div class="d-flex justify-content-between">
        <span class="fw-semibold small">${p.nombreCorto}</span>
        <span class="small">${dinero(p.precio)}</span>
      </div>
      <div class="d-flex align-items-center gap-2 mt-1">
        <button class="btn btn-sm btn-outline-success rounded-circle" data-accion="menos" data-id="${id}" aria-label="Quitar uno"><i class="bi bi-dash"></i></button>
        <span class="fw-bold" aria-label="Cantidad">${cant}</span>
        <button class="btn btn-sm btn-outline-success rounded-circle" data-accion="mas" data-id="${id}" aria-label="Agregar uno"><i class="bi bi-plus"></i></button>
      </div>`;
    cont.appendChild(fila);
  });

  cont.querySelectorAll('[data-accion]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.id;
    if (b.dataset.accion === 'mas') estado.carrito[id]++;
    if (b.dataset.accion === 'menos') estado.carrito[id]--;
    if (b.dataset.accion === 'eliminar' || estado.carrito[id] <= 0) delete estado.carrito[id];
    pintarCarrito();
  }));

  document.getElementById('carrito-subtotal').textContent = dinero(totalesCarrito().subtotal);
}

/** Llena el selector de horas según CONFIG (apertura, cierre, intervalo). */
function llenarHoras() {
  const sel = document.getElementById('hora-recogida');
  sel.innerHTML = '';
  for (let m = aMinutos(CONFIG.horarioApertura); m <= aMinutos(CONFIG.horarioCierre); m += CONFIG.intervaloMin) {
    const opt = document.createElement('option');
    opt.value = aHHMM(m);
    opt.textContent = aHHMM(m);
    sel.appendChild(opt);
  }
  sel.value = estado.hora;
}

document.getElementById('hora-recogida').addEventListener('change', e => { estado.hora = e.target.value; });
document.querySelectorAll('input[name="dia"]').forEach(r => r.addEventListener('change', e => { estado.dia = e.target.value; }));

document.getElementById('btn-siguiente').addEventListener('click', () => {
  // 4.2 Carrito vacío
  if (totalesCarrito().articulos === 0) {
    mostrarAlerta({
      icono: 'bi-cart-x', colorIcono: 'text-danger',
      titulo: 'Carrito vacío',
      mensaje: 'Agrega al menos 1 producto para continuar con tu pedido.'
    });
    return;
  }
  // 4.1 Horario no válido (solo aplica si es para hoy)
  const minimo = aMinutos(estado.horaSimulada) + CONFIG.anticipacionMin;
  if (estado.dia === 'hoy' && aMinutos(estado.hora) < minimo) {
    mostrarAlerta({
      titulo: 'Horario no válido',
      mensaje: `El horario de recoger debe ser con al menos ${CONFIG.anticipacionMin} minutos de anticipación. Elige ${horaBonita(aHHMM(minimo))} o más tarde.`
    });
    return;
  }
  irA('p-pago');
});


/* =====================================================================
   [9] P5 PAGO
   pintarPago() muestra detalles, desglose y método seleccionado.
   "Finalizar compra" valida:
     5.2 teléfono no válido (debe tener 10 dígitos) → "Corregir número" abre el editor
     5.3 sin método de pago → "Método de pago requerido"
   ===================================================================== */
const soloDigitos = t => t.replace(/\D/g, '');
const telefonoBonito = t => soloDigitos(t).replace(/^(\d{3})(\d{3})(\d+)$/, '$1 $2 $3');

/** Texto del método seleccionado para mostrar en la pantalla de pago. */
function textoMetodo(id) {
  const m = estado.metodos.find(x => x.id === id);
  if (!m) return '<span class="text-danger"><i class="bi bi-exclamation-circle"></i> Selecciona un método de pago</span>';
  if (m.tipo === 'Efectivo') return '<i class="bi bi-cash-coin"></i> Efectivo (pagas al recoger)';
  return `<span class="badge text-bg-light border">${m.tipo.toUpperCase()}</span> •••• ${m.ultimos}`;
}

function pintarPago() {
  const { articulos, subtotal, total } = totalesCarrito();
  document.getElementById('pago-punto').textContent = DATOS.loncheria.puntoEntrega;
  document.getElementById('pago-fecha').textContent = fechaBonita(estado.dia);
  document.getElementById('pago-hora').textContent = horaBonita(estado.hora);
  document.getElementById('pago-telefono').textContent = telefonoBonito(estado.telefono);
  document.getElementById('pago-num-articulos').textContent = articulos;
  document.getElementById('pago-subtotal').textContent = dinero(subtotal);
  document.getElementById('pago-tarifa').textContent = dinero(CONFIG.tarifaServicio);
  document.getElementById('pago-total').textContent = dinero(total);
  document.getElementById('pago-metodo').innerHTML = textoMetodo(estado.metodoSeleccionado);

  // Lista del resumen desplegable
  document.getElementById('pago-lista').innerHTML = Object.entries(estado.carrito)
    .map(([id, c]) => `<li>${c}× ${buscarProducto(id).nombreCorto} — ${dinero(buscarProducto(id).precio * c)}</li>`)
    .join('');
}

/* ---------- 5.1 Editor de teléfono ---------- */
function abrirEditorTelefono() {
  document.getElementById('input-telefono').value = telefonoBonito(estado.telefono);
  abrirModal('modal-telefono');
}

document.getElementById('btn-editar-tel').addEventListener('click', abrirEditorTelefono);

document.getElementById('btn-guardar-tel').addEventListener('click', () => {
  // Se guarda tal cual; la validación ocurre al "Finalizar compra" (igual que en papel)
  estado.telefono = soloDigitos(document.getElementById('input-telefono').value);
  cerrarModal('modal-telefono');
  pintarPago();
});

/* ---------- Abrir métodos de pago ---------- */
document.getElementById('btn-metodo-pago').addEventListener('click', () => irA('p-metodos'));

/* ---------- Finalizar compra ---------- */
document.getElementById('btn-finalizar').addEventListener('click', () => {
  // 5.2 Número de contacto no válido
  if (soloDigitos(estado.telefono).length !== 10) {
    mostrarAlerta({
      icono: 'bi-telephone-x-fill', colorIcono: 'text-danger',
      titulo: 'Número de contacto no válido',
      mensaje: 'Ingresa un número de teléfono de 10 dígitos para continuar.',
      boton: 'Corregir número',
      accion: abrirEditorTelefono
    });
    return;
  }
  // 5.3 Método de pago requerido
  if (!estado.metodos.some(m => m.id === estado.metodoSeleccionado)) {
    mostrarAlerta({
      titulo: 'Método de pago requerido',
      mensaje: 'Por favor selecciona o agrega un método de pago válido para completar tu compra.'
    });
    return;
  }
  iniciarProcesando();
});


/* =====================================================================
   [10] P5.4 MÉTODOS DE PAGO
   - Elegir un radio cambia el método predeterminado (se ve en Pago)
   - "Agregar un método de pago" muestra el formulario de tarjeta
   - Validación de tarjeta (5.4.3), errores debajo de cada campo:
       número: 16 dígitos · fecha: MM/AA o MM/AAAA no vencida · CVV: 3 o 4 dígitos
   ===================================================================== */
function pintarMetodos() {
  const cont = document.getElementById('lista-metodos');
  cont.innerHTML = '';
  estado.metodos.forEach(m => {
    const texto = m.tipo === 'Efectivo' ? 'Efectivo' : `${m.tipo} •••• ${m.ultimos} (${m.titular})`;
    const fila = document.createElement('label');
    fila.className = 'd-flex justify-content-between align-items-center border rounded-3 p-2 mb-2';
    fila.innerHTML = `<span>${texto}</span>
      <input class="form-check-input" type="radio" name="metodo" value="${m.id}" ${m.id === estado.metodoSeleccionado ? 'checked' : ''} />`;
    cont.appendChild(fila);
  });

  // Evento: cambiar el método predeterminado
  cont.querySelectorAll('input[name="metodo"]').forEach(r => r.addEventListener('change', () => {
    estado.metodoSeleccionado = r.value;
    document.getElementById('form-tarjeta').classList.add('d-none');
    mostrarToast('Método de pago actualizado');
  }));

  document.getElementById('metodo-agregar').checked = false;
  document.getElementById('form-tarjeta').classList.add('d-none');
}

// Mostrar el formulario al elegir "Agregar un método de pago"
document.getElementById('metodo-agregar').addEventListener('change', () => {
  document.getElementById('form-tarjeta').classList.remove('d-none');
});

// Tarjeta / Transferencia (transferencia fuera del alcance del prototipo)
document.querySelectorAll('input[name="tipo-nuevo"]').forEach(r => r.addEventListener('change', () => {
  const esTransferencia = r.value === 'transferencia' && r.checked;
  document.getElementById('aviso-transferencia').classList.toggle('d-none', !esTransferencia);
  document.getElementById('campos-tarjeta').classList.toggle('d-none', esTransferencia);
}));

// Formato automático del número: "4015068010001424" → "4015 0680 1000 1424"
document.getElementById('tj-numero').addEventListener('input', e => {
  e.target.value = soloDigitos(e.target.value).slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
});

// Al escribir en un campo se quita su error
['tj-nombre', 'tj-numero', 'tj-fecha', 'tj-cvv'].forEach(id =>
  document.getElementById(id).addEventListener('input', e => e.target.classList.remove('is-invalid'))
);

/** true si la fecha 'MM/AA' o 'MM/AAAA' es válida y no está vencida (respecto a "hoy" del prototipo). */
function fechaTarjetaValida(texto) {
  const m = texto.trim().match(/^(\d{2})\/(\d{2}|\d{4})$/);
  if (!m) return false;
  const mes = Number(m[1]);
  let anio = Number(m[2]);
  if (anio < 100) anio += 2000;
  if (mes < 1 || mes > 12) return false;
  const hoy = CONFIG.fechaHoy;
  // Vence al final del mes indicado
  return anio > hoy.getFullYear() || (anio === hoy.getFullYear() && mes - 1 >= hoy.getMonth());
}

document.getElementById('form-tarjeta').addEventListener('submit', e => {
  e.preventDefault();
  const nombre = document.getElementById('tj-nombre');
  const numero = document.getElementById('tj-numero');
  const fecha = document.getElementById('tj-fecha');
  const cvv = document.getElementById('tj-cvv');

  const ok = {
    nombre: nombre.value.trim().length >= 3,
    numero: soloDigitos(numero.value).length === 16,
    fecha: fechaTarjetaValida(fecha.value),
    cvv: /^\d{3,4}$/.test(cvv.value)
  };
  nombre.classList.toggle('is-invalid', !ok.nombre);
  numero.classList.toggle('is-invalid', !ok.numero);
  fecha.classList.toggle('is-invalid', !ok.fecha);
  cvv.classList.toggle('is-invalid', !ok.cvv);
  if (!Object.values(ok).every(Boolean)) return;

  // Tarjeta válida: se guarda y queda como método predeterminado
  const digitos = soloDigitos(numero.value);
  const tipo = digitos.startsWith('4') ? 'Visa' : digitos.startsWith('5') ? 'Mastercard' : 'Tarjeta';
  const nuevo = { id: 'tj-' + Date.now(), tipo, ultimos: digitos.slice(-4), titular: nombre.value.trim() };
  estado.metodos.splice(estado.metodos.length - 1, 0, nuevo);   // antes de "Efectivo"
  estado.metodoSeleccionado = nuevo.id;
  e.target.reset();
  pintarMetodos();
  mostrarToast(`${tipo} •••• ${nuevo.ultimos} agregada`);
});


/* =====================================================================
   [11] P6 PROCESANDO
   Cuenta regresiva de CONFIG.segundosProcesando. Se puede cancelar.
   Al terminar pasa a la pantalla 7.
   ===================================================================== */
function limpiarTemporizadores() {
  estado.temporizadores.forEach(t => clearInterval(t));
  estado.temporizadores = [];
}

function iniciarProcesando() {
  // Resumen compacto
  document.getElementById('proc-lista').innerHTML = Object.entries(estado.carrito)
    .map(([id, c]) => `<div>${c}× ${buscarProducto(id).nombreCorto}</div>`).join('');
  document.getElementById('proc-total').textContent = dinero(totalesCarrito().total);
  irA('p-procesando');

  let restantes = CONFIG.segundosProcesando;
  const contador = document.getElementById('proc-contador');
  contador.textContent = '00:' + String(restantes).padStart(2, '0');

  const t = setInterval(() => {
    restantes--;
    contador.textContent = '00:' + String(Math.max(restantes, 0)).padStart(2, '0');
    if (restantes <= 0) {
      limpiarTemporizadores();
      mostrarCodigo();
    }
  }, 1000);
  estado.temporizadores.push(t);
}

document.getElementById('btn-cancelar-pedido').addEventListener('click', () => {
  limpiarTemporizadores();
  irA('p-pago');
  mostrarToast('Pedido cancelado. No se realizó ningún cargo.');
});


/* =====================================================================
   [12] P7 CÓDIGO DE PEDIDO
   Genera código (letra + 4 dígitos) y QR. Simula el avance del estado
   resaltado: Pendiente → En preparación → Listo (cada CONFIG.segundosPorEtapa).
   ===================================================================== */
const TEXTOS_ETAPA = ['Pendiente', 'En preparación', 'Listo'];

function mostrarCodigo() {
  const letra = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const numero = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  const codigo = `${letra}-${numero}`;
  document.getElementById('codigo-pedido').textContent = codigo;

  // QR (si la librería no cargó, se muestra un ícono en su lugar)
  const qr = document.getElementById('qr');
  qr.innerHTML = '';
  if (window.QRCode) new QRCode(qr, { text: codigo, width: 140, height: 140 });
  else qr.innerHTML = '<i class="bi bi-qr-code" style="font-size:8rem"></i>';

  irA('p-codigo');

  let etapa = 0;
  pintarEtapa(etapa);
  const t = setInterval(() => {
    etapa++;
    pintarEtapa(etapa);
    if (etapa >= 2) limpiarTemporizadores();
  }, CONFIG.segundosPorEtapa * 1000);
  estado.temporizadores.push(t);
}

function pintarEtapa(n) {
  document.getElementById('texto-estado').textContent = TEXTOS_ETAPA[n];
}

/** Volver al inicio: vacía el carrito y regresa a la lista de locales. */
function volverAlInicio() {
  limpiarTemporizadores();
  estado.carrito = {};
  irA('p-locales');
}
document.getElementById('btn-volver-inicio').addEventListener('click', volverAlInicio);
document.getElementById('btn-home').addEventListener('click', volverAlInicio);


/* =====================================================================
   [13] PANEL DEL MODERADOR (no es parte de la app)
   ===================================================================== */
document.getElementById('mod-usuario').textContent = CONFIG.usuarioDemo;
document.getElementById('mod-pass').textContent = CONFIG.passDemo;

const modHora = document.getElementById('mod-hora');
modHora.addEventListener('change', () => { estado.horaSimulada = modHora.value || CONFIG.horaSimulada; });

document.getElementById('mod-no-disponible').addEventListener('change', e => {
  const noDisponible = e.target.checked;
  const retirarDelCarrito = noDisponible && !!estado.carrito['lic-creativo'];

  if (noDisponible) {
    estado.noDisponibles.add('lic-creativo');
    if (retirarDelCarrito) delete estado.carrito['lic-creativo'];
  } else {
    estado.noDisponibles.delete('lic-creativo');
  }

  if (!document.getElementById('p-menu').classList.contains('d-none')) pintarMenu();
  if (!document.getElementById('p-carrito').classList.contains('d-none')) pintarCarrito();
  if (!document.getElementById('p-pago').classList.contains('d-none')) pintarPago();
  if (retirarDelCarrito) mostrarErrorAgregarAlCarrito();
});

document.getElementById('mod-falla-carrito').addEventListener('change', e => {
  estado.fallaAlAgregar = e.target.checked;
  if (estado.fallaAlAgregar) mostrarErrorAgregarAlCarrito();
});

document.getElementById('mod-sin-metodo').addEventListener('change', e => {
  estado.metodoSeleccionado = e.target.checked ? null : 'visa-1234';
  if (!document.getElementById('p-pago').classList.contains('d-none')) pintarPago();
});

document.getElementById('mod-reiniciar').addEventListener('click', iniciar);


/* =====================================================================
   [14] INICIO — prepara todo y muestra el login
   ===================================================================== */
function iniciar() {
  limpiarTemporizadores && estado.temporizadores && limpiarTemporizadores();
  reiniciarEstado();
  ['modal-alerta', 'modal-telefono'].forEach(cerrarModal);

  // Panel del moderador a sus valores iniciales
  modHora.value = CONFIG.horaSimulada;
  ['mod-no-disponible', 'mod-falla-carrito', 'mod-sin-metodo'].forEach(id => { document.getElementById(id).checked = false; });

  // Formularios y selecciones a su estado inicial
  document.getElementById('form-login').reset();
  [inUsuario, inPass].forEach(i => i.classList.remove('is-invalid'));
  document.getElementById('dia-hoy').checked = true;
  document.querySelectorAll('.txt-anticipacion').forEach(s => { s.textContent = CONFIG.anticipacionMin; });
  llenarHoras();

  irA('p-login');
}

iniciar();
