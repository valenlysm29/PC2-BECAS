/* =========================================================
   Lógica de la aplicación
   - Carga catálogos (sexos, grados, carreras, modalidades)
     directamente desde Supabase.
   - Llena el formulario y el filtro de forma dinámica.
   - Registra postulantes.
   - Lista postulantes y aplica el filtro por sexo.
   ========================================================= */

// Estado en memoria de los catálogos ya cargados desde Supabase
const catalogState = {
  sexos: [],
  gradosAcademicos: [],
  carrerasInteres: [],
  modalidadesEstudio: [],
};

document.addEventListener("DOMContentLoaded", () => {
  initApp();
});

async function initApp() {
  await Promise.all([
    cargarCatalogo("sexos", "sexo_id", "filtro-sexo", true),
    cargarCatalogo("grados_academicos", "grado_academico_id"),
    cargarCatalogo("carreras_interes", "carrera_interes_id"),
    cargarCatalogo("modalidades_estudio", "modalidad_estudio_id"),
  ]);

  configurarFormulario();
  configurarFiltro();
  await cargarPostulantes();
}

/* ---------------------------------------------------------
   Catálogos: se leen de Supabase y se inyectan en los <select>
   correspondientes del formulario, y opcionalmente en el
   <select> del filtro del listado.
   --------------------------------------------------------- */
async function cargarCatalogo(tabla, selectId, filtroSelectId = null, esFiltroObligatorio = false) {
  const selectFormulario = document.getElementById(selectId);
  const selectFiltro = filtroSelectId ? document.getElementById(filtroSelectId) : null;

  try {
    const { data, error } = await supabaseClient
      .from(tabla)
      .select("id, nombre")
      .order("id", { ascending: true });

    if (error) throw error;

    // Guardar en estado para uso posterior (ej. mostrar nombre de sexo en pill)
    const claveEstado = {
      sexos: "sexos",
      grados_academicos: "gradosAcademicos",
      carreras_interes: "carrerasInteres",
      modalidades_estudio: "modalidadesEstudio",
    }[tabla];
    if (claveEstado) catalogState[claveEstado] = data;

    // Llenar <select> del formulario
    if (selectFormulario) {
      data.forEach((item) => {
        const opt = document.createElement("option");
        opt.value = item.id;
        opt.textContent = item.nombre;
        selectFormulario.appendChild(opt);
      });
    }

    // Llenar <select> del filtro (si corresponde), siempre partiendo de "Todos"
    if (selectFiltro) {
      data.forEach((item) => {
        const opt = document.createElement("option");
        opt.value = item.id;
        opt.textContent = item.nombre;
        selectFiltro.appendChild(opt);
      });
    }
  } catch (err) {
    console.error(`Error cargando catálogo "${tabla}":`, err);
    if (selectFormulario) {
      selectFormulario.innerHTML = '<option value="">No se pudo cargar</option>';
    }
    if (selectFiltro && esFiltroObligatorio) {
      selectFiltro.innerHTML = '<option value="">No se pudo cargar el filtro</option>';
    }
  }
}

/* ---------------------------------------------------------
   Formulario de registro
   --------------------------------------------------------- */
function configurarFormulario() {
  const form = document.getElementById("form-postulante");
  const status = document.getElementById("form-status");
  const btnSubmit = document.getElementById("btn-submit");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    limpiarErrores(form);
    ocultarStatus(status);

    const formData = new FormData(form);
    const payload = {
      nombres: formData.get("nombres").trim(),
      apellidos: formData.get("apellidos").trim(),
      dni: formData.get("dni").trim(),
      correo: formData.get("correo").trim(),
      celular: formData.get("celular").trim(),
      edad: Number(formData.get("edad")),
      sexo_id: Number(formData.get("sexo_id")),
      institucion_educativa: formData.get("institucion_educativa").trim(),
      promedio_academico: Number(formData.get("promedio_academico")),
      grado_academico_id: Number(formData.get("grado_academico_id")),
      carrera_interes_id: Number(formData.get("carrera_interes_id")),
      modalidad_estudio_id: Number(formData.get("modalidad_estudio_id")),
      observaciones: formData.get("observaciones").trim() || null,
    };

    const erroresValidacion = validarPayload(payload);
    if (erroresValidacion.length > 0) {
      erroresValidacion.forEach(({ campo, mensaje }) => mostrarError(campo, mensaje));
      mostrarStatus(status, "error", "Revisa los campos marcados antes de continuar.");
      return;
    }

    btnSubmit.disabled = true;
    btnSubmit.textContent = "Registrando…";

    try {
      const { error } = await supabaseClient.from("postulantes").insert([payload]);
      if (error) throw error;

      mostrarStatus(status, "success", "Postulación registrada correctamente.");
      form.reset();
      await cargarPostulantes();
      document.getElementById("listado").scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      console.error("Error al registrar postulante:", err);
      const esDuplicado = (err.message || "").toLowerCase().includes("duplicate") || err.code === "23505";
      mostrarStatus(
        status,
        "error",
        esDuplicado
          ? "Ya existe un postulante registrado con ese DNI."
          : "No se pudo registrar la postulación. Intenta nuevamente."
      );
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = "Registrar postulación";
    }
  });
}

function validarPayload(p) {
  const errores = [];
  if (!p.nombres) errores.push({ campo: "nombres", mensaje: "Ingresa los nombres." });
  if (!p.apellidos) errores.push({ campo: "apellidos", mensaje: "Ingresa los apellidos." });
  if (!/^\d{8}$/.test(p.dni)) errores.push({ campo: "dni", mensaje: "El DNI debe tener 8 dígitos." });
  if (!/^\S+@\S+\.\S+$/.test(p.correo)) errores.push({ campo: "correo", mensaje: "Ingresa un correo válido." });
  if (!/^9\d{8}$/.test(p.celular)) errores.push({ campo: "celular", mensaje: "Ingresa un celular válido (9 dígitos)." });
  if (!p.edad || p.edad < 14 || p.edad > 99) errores.push({ campo: "edad", mensaje: "Ingresa una edad entre 14 y 99." });
  if (!p.sexo_id) errores.push({ campo: "sexo_id", mensaje: "Selecciona el sexo." });
  if (!p.institucion_educativa) errores.push({ campo: "institucion_educativa", mensaje: "Ingresa la institución educativa." });
  if (!p.promedio_academico || p.promedio_academico < 0 || p.promedio_academico > 20)
    errores.push({ campo: "promedio_academico", mensaje: "Ingresa un promedio entre 0 y 20." });
  if (!p.grado_academico_id) errores.push({ campo: "grado_academico_id", mensaje: "Selecciona el grado académico." });
  if (!p.carrera_interes_id) errores.push({ campo: "carrera_interes_id", mensaje: "Selecciona la carrera de interés." });
  if (!p.modalidad_estudio_id) errores.push({ campo: "modalidad_estudio_id", mensaje: "Selecciona la modalidad de estudio." });
  return errores;
}

function mostrarError(campo, mensaje) {
  const el = document.getElementById(`error-${campo}`);
  if (el) el.textContent = mensaje;
  const input = document.querySelector(`[name="${campo}"]`);
  if (input) input.style.borderColor = "var(--color-error)";
}

function limpiarErrores(form) {
  form.querySelectorAll(".field-error").forEach((el) => (el.textContent = ""));
  form.querySelectorAll("input, select, textarea").forEach((el) => (el.style.borderColor = ""));
}

function mostrarStatus(statusEl, tipo, mensaje) {
  statusEl.className = `form-status is-${tipo}`;
  statusEl.textContent = mensaje;
}

function ocultarStatus(statusEl) {
  statusEl.className = "form-status";
  statusEl.textContent = "";
}

/* ---------------------------------------------------------
   Filtro por sexo (valores ya cargados desde Supabase
   dentro de #filtro-sexo en cargarCatalogo)
   --------------------------------------------------------- */
function configurarFiltro() {
  const filtro = document.getElementById("filtro-sexo");
  filtro.addEventListener("change", () => cargarPostulantes());
}

/* ---------------------------------------------------------
   Listado de postulantes
   --------------------------------------------------------- */
async function cargarPostulantes() {
  const tbody = document.getElementById("tabla-body");
  const loadingState = document.getElementById("loading-state");
  const emptyState = document.getElementById("empty-state");
  const tableCard = document.getElementById("table-card");
  const resultCount = document.getElementById("result-count");
  const filtroSexoId = document.getElementById("filtro-sexo").value;

  tableCard.style.display = "none";
  emptyState.style.display = "none";
  loadingState.style.display = "block";

  try {
    let query = supabaseClient
      .from("vista_postulantes")
      .select(
        "id, nombres, apellidos, dni, correo, celular, edad, sexo, sexo_id, grado_academico, carrera_interes, modalidad_estudio, created_at"
      )
      .order("created_at", { ascending: false });

    if (filtroSexoId) {
      query = query.eq("sexo_id", Number(filtroSexoId));
    }

    const { data, error } = await query;
    if (error) throw error;

    renderTabla(data);
    resultCount.textContent = `${data.length} ${data.length === 1 ? "postulante" : "postulantes"}`;
    actualizarContadorHero();
  } catch (err) {
    console.error("Error al cargar postulantes:", err);
    tbody.innerHTML = "";
    loadingState.style.display = "none";
    emptyState.style.display = "block";
    emptyState.querySelector("h3").textContent = "No se pudo cargar el listado";
    emptyState.querySelector("p").textContent = "Verifica tu conexión con Supabase e intenta de nuevo.";
  }
}

function renderTabla(data) {
  const tbody = document.getElementById("tabla-body");
  const loadingState = document.getElementById("loading-state");
  const emptyState = document.getElementById("empty-state");
  const tableCard = document.getElementById("table-card");

  loadingState.style.display = "none";

  if (!data || data.length === 0) {
    tbody.innerHTML = "";
    tableCard.style.display = "none";
    emptyState.style.display = "block";
    emptyState.querySelector("h3").textContent = "Aún no hay postulantes";
    emptyState.querySelector("p").textContent = "Los registros aparecerán aquí en cuanto se complete el formulario.";
    return;
  }

  emptyState.style.display = "none";
  tableCard.style.display = "block";

  tbody.innerHTML = data
    .map((p) => {
      const esFemenino = (p.sexo || "").toLowerCase().startsWith("f");
      const pillClass = esFemenino ? "pill--f" : "pill--m";
      return `
        <tr>
          <td class="cell-name">${escapeHtml(p.nombres)}</td>
          <td class="cell-name">${escapeHtml(p.apellidos)}</td>
          <td>${escapeHtml(p.dni)}</td>
          <td>${escapeHtml(p.correo)}</td>
          <td>${escapeHtml(p.celular)}</td>
          <td>${p.edad}</td>
          <td><span class="pill ${pillClass}">${escapeHtml(p.sexo)}</span></td>
          <td>${escapeHtml(p.grado_academico)}</td>
          <td>${escapeHtml(p.carrera_interes)}</td>
          <td>${escapeHtml(p.modalidad_estudio)}</td>
        </tr>
      `;
    })
    .join("");
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ---------------------------------------------------------
   Contador del hero (total real, independiente del filtro)
   --------------------------------------------------------- */
async function actualizarContadorHero() {
  const statTotal = document.getElementById("stat-total");
  try {
    const { count, error } = await supabaseClient
      .from("postulantes")
      .select("id", { count: "exact", head: true });
    if (error) throw error;
    statTotal.textContent = count ?? 0;
  } catch (err) {
    console.error("Error al obtener el total de postulantes:", err);
    statTotal.textContent = "—";
  }
}
