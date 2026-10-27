// ============================================================
// CLASE Tarea: representa cada tarea creada por el usuario
// ============================================================
class Tarea {
  constructor(nombre, completa = false, id = Tarea.generarId()) {
    this.id = id;
    this.nombre = nombre;
    this.completa = completa;
    this.eliminada = false;
  }

  static generarId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  // Actualiza el estado (completa / incompleta)
  actualizarEstado(completa = !this.completa) {
    this.completa = completa;
  }

  // Edita el contenido de la tarea
  editar(nuevoNombre) {
    this.nombre = nuevoNombre.trim();
  }

  // Marca la tarea como eliminada (el gestor la saca de la lista)
  eliminar() {
    this.eliminada = true;
  }
}

// ============================================================
// CLASE GestorDeTareas: guarda la lista y sus operaciones
// ============================================================
class GestorDeTareas {
  constructor(claveStorage = "tareas-app") {
    this.claveStorage = claveStorage;
    this.tareas = [];
    this.cargar();
  }

  // --- LocalStorage ---
  cargar() {
    try {
      const datos = JSON.parse(localStorage.getItem(this.claveStorage)) ?? [];
      this.tareas = datos.map(({ nombre, completa, id }) => new Tarea(nombre, completa, id));
    } catch (error) {
      this.tareas = [];
    }
  }

  guardar() {
    try {
      localStorage.setItem(this.claveStorage, JSON.stringify(this.tareas));
    } catch (error) {
      console.warn("No se pudo guardar en LocalStorage:", error);
    }
  }

  // --- Validación: devuelve un mensaje de error o "" si todo está bien ---
  validar(nombre, idIgnorar = null) {
    const limpio = nombre.trim();

    if (limpio === "") return "La tarea no puede estar vacía.";
    if (limpio.length > 100) return "La tarea no puede tener más de 100 caracteres.";

    const repetida = this.tareas.some(
      (t) => t.id !== idIgnorar && t.nombre.toLowerCase() === limpio.toLowerCase()
    );
    if (repetida) return "Esa tarea ya existe.";

    return "";
  }

  // --- Operaciones ---
  buscar(id) {
    return this.tareas.find((t) => t.id === id);
  }

  agregar(nombre) {
    const tarea = new Tarea(nombre.trim());
    this.tareas.push(tarea);
    this.guardar();
    return tarea;
  }

  editar(id, nuevoNombre) {
    const tarea = this.buscar(id);
    if (!tarea) return;
    tarea.editar(nuevoNombre);
    this.guardar();
  }

  alternarEstado(id) {
    const tarea = this.buscar(id);
    if (!tarea) return;
    tarea.actualizarEstado();
    this.guardar();
  }

  eliminar(id) {
    const tarea = this.buscar(id);
    if (!tarea) return;
    tarea.eliminar();
    this.tareas = this.tareas.filter((t) => !t.eliminada);
    this.guardar();
  }
}

// ============================================================
// INTERFAZ: manipulación del DOM
// ============================================================
const gestor = new GestorDeTareas();
let idEnEdicion = null; // id de la tarea que se está editando (o null)

const formulario = document.getElementById("formulario-tarea");
const entrada = document.getElementById("entrada-tarea");
const lista = document.getElementById("lista-tareas");
const mensajeError = document.getElementById("mensaje-error");
const mensajeVacio = document.getElementById("mensaje-vacio");
const contador = document.getElementById("contador");

// Evita que el texto del usuario se interprete como HTML
const escapar = (texto) =>
  texto.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));

const mostrarError = (mensaje) => {
  mensajeError.textContent = mensaje;
};

// Genera el HTML de una tarea con template literals
const plantillaTarea = (tarea) => {
  if (tarea.id === idEnEdicion) {
    return `
      <li class="tarea editando" data-id="${tarea.id}">
        <input type="text" class="input-edicion" value="${escapar(tarea.nombre)}" maxlength="100" aria-label="Editar tarea">
        <div class="acciones">
          <button class="btn-guardar" data-accion="guardar">Guardar</button>
          <button class="btn-cancelar" data-accion="cancelar">Cancelar</button>
        </div>
      </li>`;
  }

  return `
    <li class="tarea ${tarea.completa ? "completa" : ""}" data-id="${tarea.id}">
      <input type="checkbox" class="check" data-accion="estado" ${tarea.completa ? "checked" : ""} aria-label="Marcar como completa">
      <span class="texto">${escapar(tarea.nombre)}</span>
      <div class="acciones">
        <button class="btn-editar" data-accion="editar">Editar</button>
        <button class="btn-eliminar" data-accion="eliminar">Eliminar</button>
      </div>
    </li>`;
};

// Dibuja toda la lista recorriendo las tareas con forEach
const render = () => {
  let html = "";
  gestor.tareas.forEach((tarea) => {
    html += plantillaTarea(tarea);
  });
  lista.innerHTML = html;

  const total = gestor.tareas.length;
  const pendientes = gestor.tareas.filter((t) => !t.completa).length;

  mensajeVacio.classList.toggle("oculto", total > 0);
  contador.textContent = total > 0 ? `${pendientes} pendiente(s) de ${total}` : "";

  // Si hay una tarea en edición, enfoca su campo
  const campoEdicion = lista.querySelector(".input-edicion");
  if (campoEdicion) {
    campoEdicion.focus();
    campoEdicion.setSelectionRange(campoEdicion.value.length, campoEdicion.value.length);
  }
};

// --- Agregar tarea ---
formulario.addEventListener("submit", (evento) => {
  evento.preventDefault();

  const error = gestor.validar(entrada.value);
  if (error) {
    mostrarError(error);
    entrada.focus();
    return;
  }

  gestor.agregar(entrada.value);
  entrada.value = "";
  mostrarError("");
  render();
});

// Quita el mensaje de error al escribir
entrada.addEventListener("input", () => mostrarError(""));

// --- Guardar edición ---
const guardarEdicion = () => {
  const campo = lista.querySelector(".input-edicion");
  if (!campo) return;

  const error = gestor.validar(campo.value, idEnEdicion);
  if (error) {
    mostrarError(error);
    campo.focus();
    return;
  }

  gestor.editar(idEnEdicion, campo.value);
  idEnEdicion = null;
  mostrarError("");
  render();
};

const cancelarEdicion = () => {
  idEnEdicion = null;
  mostrarError("");
  render();
};

// --- Clics dentro de la lista (editar, eliminar, guardar, cancelar, estado) ---
lista.addEventListener("click", (evento) => {
  const elemento = evento.target.closest("[data-accion]");
  if (!elemento) return;

  const id = elemento.closest(".tarea").dataset.id;
  const accion = elemento.dataset.accion;

  if (accion === "editar") {
    idEnEdicion = id;
    mostrarError("");
    render();
  } else if (accion === "eliminar") {
    if (id === idEnEdicion) idEnEdicion = null;
    gestor.eliminar(id);
    render();
  } else if (accion === "guardar") {
    guardarEdicion();
  } else if (accion === "cancelar") {
    cancelarEdicion();
  } else if (accion === "estado") {
    gestor.alternarEstado(id);
    render();
  }
});

// Enter guarda y Escape cancela mientras se edita
lista.addEventListener("keydown", (evento) => {
  if (!evento.target.classList.contains("input-edicion")) return;

  if (evento.key === "Enter") {
    evento.preventDefault();
    guardarEdicion();
  } else if (evento.key === "Escape") {
    cancelarEdicion();
  }
});

// Dibuja las tareas guardadas al cargar la página
render();