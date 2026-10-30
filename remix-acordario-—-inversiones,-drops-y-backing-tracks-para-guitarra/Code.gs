/**
 * ACORDARIO — Inversiones y drops para guitarra
 * Google Apps Script — Versión corregida y optimizada
 *
 * Pasos para instalar en Google Sheets:
 * 1. Crea una Hoja de cálculo de Google nueva (o abre la existente).
 * 2. En el menú: Extensiones > Apps Script.
 * 3. En el archivo Code.gs, borra todo y pega este código completo.
 * 4. En el panel izquierdo de Apps Script, haz clic en "+" (Agregar un archivo) > "HTML".
 *    Nómbralo exactamente: Index  (quedará como Index.html).
 *    Pega el contenido del archivo Index.html.
 * 5. En el editor de Apps Script, selecciona la función "crearBaseDeDatos" en la barra superior
 *    y haz clic en "Ejecutar". Concede los permisos que Google te solicite.
 *    (Esto crea y formatea correctamente las hojas "Tipos" y "Temas").
 * 6. Haz clic en "Implementar" > "Nueva implementación" >
 *    Selecciona tipo: "Aplicación web" >
 *    Ejecutar como: "Yo" >
 *    Quién tiene acceso: "Cualquier usuario" (o "Cualquiera con una cuenta de Google") >
 *    Haz clic en "Implementar" y abre la URL resultante.
 *
 * CONFIGURE GEMINI (Opcional, para escanear grillas desde fotos):
 * 1. Obtén tu API Key gratis en https://aistudio.google.com/apikey
 * 2. En el editor de Apps Script: Configuración del proyecto (ícono ⚙ a la izquierda) >
 *    "Propiedades de la secuencia de comandos" > "Agregar propiedad":
 *    Nombre: GEMINI_API_KEY  |  Valor: tu_clave_aqui
 *    (Opcional: GEMINI_MODEL = gemini-3.8-flash)
 */

const HOJA_TIPOS = 'Tipos';
const HOJA_TEMAS = 'Temas';

function doGet(e) {
  const template = HtmlService.createTemplateFromFile('Index');
  const paramV = (e && e.parameter && e.parameter.v) || '';
  template.paramV = paramV;
  return template.evaluate()
    .setTitle('Acordario — Inversiones y Backing Tracks para Guitarra')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** URL de la app publicada para botones directos */
function obtenerUrl() {
  try {
    return ScriptApp.getService().getUrl();
  } catch (err) {
    return '';
  }
}

/**
 * Devuelve los tipos de acorde de la hoja "Tipos".
 * Cada elemento devuelto: { id, nombre, etiqueta, alias, grados, activo, escala }
 */
function obtenerTipos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(HOJA_TIPOS);
  if (!hoja) {
    crearBaseDeDatos();
    hoja = ss.getSheetByName(HOJA_TIPOS);
  }
  if (!hoja) return [];

  const datos = hoja.getDataRange().getDisplayValues();
  if (datos.length <= 1) return [];
  datos.shift(); // Quitar encabezados

  return datos
    .filter(f => String(f[0] || '').trim() !== '' || String(f[4] || '').trim() !== '')
    .filter(f => String(f[5] || 'SI').toUpperCase() !== 'NO')
    .map(f => {
      const id = String(f[0] || '').trim();
      const nombre = String(f[1] || '').trim();
      const etiqueta = String(f[2] || '').trim();
      let rawAlias = String(f[3] || '').split(',').map(s => s.trim());
      
      // Asegurarse de que el acorde mayor incluya el alias vacío "" para reconocer "C", "G", "D", etc.
      if (id === 'maj' || id === '' || nombre === '' || etiqueta.toLowerCase() === 'mayor') {
        if (!rawAlias.includes('')) {
          rawAlias.unshift('');
        }
      }

      return {
        id: id || (nombre === '' ? 'maj' : nombre),
        nombre: nombre,
        etiqueta: etiqueta || nombre || 'Mayor',
        alias: rawAlias,
        grados: String(f[4] || '').trim(),
        activo: String(f[5] || 'SI').trim().toUpperCase(),
        escala: String(f[6] || 'mayor').trim()
      };
    });
}

/**
 * Inicializa o repara la hoja "Tipos" y la hoja "Temas" con los acordes estándar.
 */
function crearBaseDeDatos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(HOJA_TIPOS);
  if (!hoja) {
    hoja = ss.insertSheet(HOJA_TIPOS);
  } else {
    hoja.clear();
  }

  const filas = [
    ['id', 'nombre', 'etiqueta', 'alias', 'grados', 'activo', 'escala'],
    ['maj',    '',        'Mayor',   ',maj,M,mayor',                   '1,3,5',      'SI', 'mayor'],
    ['m',      'm',       'm',       'm,min,-,menor',                  '1,b3,5',     'SI', 'eolica'],
    ['dim',    '°',       '°',       'dim,°,o',                        '1,b3,b5',    'SI', 'locria'],
    ['aug',    '+',       '+',       'aug,+',                          '1,3,#5',     'SI', 'tonos'],
    ['sus4',   'sus4',    'sus4',    'sus4,sus',                       '1,4,5',      'SI', 'mixolidia'],
    ['sus2',   'sus2',    'sus2',    'sus2',                           '1,2,5',      'SI', 'mayor'],
    ['maj7',   'maj7',    'maj7',    'maj7,M7,Δ,Δ7,7M,ma7,7+',         '1,3,5,7',    'SI', 'mayor'],
    ['7',      '7',       '7',       '7,dom7',                         '1,3,5,b7',   'SI', 'mixolidia'],
    ['m7',     'm7',      'm7',      'm7,-7,min7',                     '1,b3,5,b7',  'SI', 'dorica'],
    ['m7b5',   'm7♭5',    'm7♭5',    'm7b5,ø,ø7,-7b5,min7b5',          '1,b3,b5,b7', 'SI', 'locria'],
    ['dim7',   '°7',      '°7',      'dim7,°7,o7',                     '1,b3,b5,bb7','SI', 'dism'],
    ['mmaj7',  'm(maj7)', 'm(maj7)', 'mmaj7,m(maj7),mM7,-Δ,mΔ,m7M',    '1,b3,5,7',   'SI', 'melodica'],
    ['6',      '6',       '6',       '6',                              '1,3,5,6',    'SI', 'mayor'],
    ['m6',     'm6',      'm6',      'm6,-6',                          '1,b3,5,6',   'SI', 'dorica'],
    ['7sus4',  '7sus4',   '7sus4',   '7sus4,7sus',                     '1,4,5,b7',   'SI', 'mixolidia'],
    ['7b5',    '7♭5',     '7♭5',     '7b5',                            '1,3,b5,b7',  'SI', 'tonos'],
    ['7#5',    '7♯5',     '7♯5',     '7#5,7+5,aug7',                   '1,3,#5,b7',  'SI', 'tonos'],
    ['maj7#5', 'maj7♯5',  'maj7♯5',  'maj7#5,M7#5,Δ#5',                '1,3,#5,7',   'SI', 'lidaum']
  ];

  hoja.getRange(1, 1, filas.length, filas[0].length).setNumberFormat('@').setValues(filas);
  hoja.getRange(1, 1, 1, filas[0].length).setFontWeight('bold').setBackground('#1D5C87').setFontColor('#FFFFFF');
  hoja.setFrozenRows(1);
  hoja.autoResizeColumns(1, filas[0].length);

  // Validación de escalas
  const regla = SpreadsheetApp.newDataValidation()
    .requireValueInList(ESCALAS_VALIDAS, true).setAllowInvalid(false).build();
  hoja.getRange(2, 7, filas.length - 1, 1).setDataValidation(regla);

  hojaTemas_();
  SpreadsheetApp.flush();
}

const ESCALAS_VALIDAS = [
  'mayor','dorica','frigia','lidia','mixolidia','eolica','locria',
  'armonica','melodica','lidiadom','lidaum','alterada','tonos','dism','penta','pentam','blues'
];

/** Devuelve la hoja Temas, creándola si hace falta */
function hojaTemas_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let h = ss.getSheetByName(HOJA_TEMAS);
  if (!h) {
    h = ss.insertSheet(HOJA_TEMAS);
    h.getRange(1, 1, 1, 5).setValues([['nombre', 'bpm', 'estilo', 'progresion', 'actualizado']])
      .setFontWeight('bold').setBackground('#1D5C87').setFontColor('#FFFFFF');
    h.setFrozenRows(1);
    h.setColumnWidth(1, 240);
    h.setColumnWidth(2, 80);
    h.setColumnWidth(3, 110);
    h.setColumnWidth(4, 500);
    h.getRange('A:E').setNumberFormat('@');
    h.getRange('D:D').setWrap(true);
  }
  return h;
}

/** Lista de temas guardados en la hoja "Temas" */
function obtenerTemas() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const h = ss.getSheetByName(HOJA_TEMAS);
  if (!h) return [];
  const datos = h.getDataRange().getDisplayValues();
  if (datos.length <= 1) return [];
  datos.shift(); // Quitar cabecera

  return datos
    .filter(f => String(f[0] || '').trim() !== '')
    .map(f => ({
      nombre: String(f[0]).trim(),
      bpm: Number(f[1]) || 120,
      estilo: String(f[2] || 'swing').trim().toLowerCase(),
      progresion: String(f[3] || '').trim()
    }));
}

/** Guarda o actualiza un tema por su nombre */
function guardarTema(t) {
  const nombre = String(t && t.nombre || '').trim();
  if (!nombre) throw new Error('Falta el nombre del tema');
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const h = hojaTemas_();
    const fila = [nombre, String(t.bpm || 120), String(t.estilo || 'swing'), String(t.progresion || ''), new Date().toISOString()];
    const datos = h.getDataRange().getDisplayValues();

    // Actualizar fila existente si ya existe
    for (let i = 1; i < datos.length; i++) {
      if (datos[i][0] === nombre) {
        h.getRange(i + 1, 1, 1, 5).setValues([fila]);
        return true;
      }
    }

    // Buscar primera fila libre o anexar
    let filaLibre = -1;
    for (let i = 1; i < datos.length; i++) {
      if (!datos[i][0] || String(datos[i][0]).trim() === '') {
        filaLibre = i + 1;
        break;
      }
    }

    if (filaLibre > 0) {
      h.getRange(filaLibre, 1, 1, 5).setValues([fila]);
    } else {
      h.appendRow(fila);
    }
    return true;
  } finally {
    lock.releaseLock();
  }
}

/** Borra un tema por nombre */
function borrarTema(nombre) {
  nombre = String(nombre || '').trim();
  if (!nombre) return false;
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const h = ss.getSheetByName(HOJA_TEMAS);
    if (!h) return false;
    const datos = h.getDataRange().getDisplayValues();
    for (let i = datos.length - 1; i >= 1; i--) {
      if (datos[i][0] === nombre) {
        h.deleteRow(i + 1);
        return true;
      }
    }
    return false;
  } finally {
    lock.releaseLock();
  }
}

/* ================= ESCÁNER DE GRILLA CON GEMINI ================= */

function leerGrillaFoto(base64, mime, prompt) {
  if (!base64) throw new Error('No llegó ninguna imagen.');
  return llamarGemini_([
    { text: String(prompt || 'Transcribe the chord chart into JSON format.') },
    { inline_data: { mime_type: mime || 'image/jpeg', data: base64 } }
  ]);
}

function probarGemini() {
  const r = llamarGemini_([{ text: 'Respond with exactly this JSON: {"ok": true}' }]);
  Logger.log('Gemini respondió: ' + r);
  return r;
}

function llamarGemini_(parts) {
  const props = PropertiesService.getScriptProperties();
  const key = props.getProperty('GEMINI_API_KEY');
  if (!key) {
    throw new Error('Falta configurar GEMINI_API_KEY en: Configuración del proyecto > Propiedades del script.');
  }

  const modelos = [props.getProperty('GEMINI_MODEL') || 'gemini-3.8-flash', 'gemini-flash-latest'];
  let ultimoError = '';

  for (const modelo of modelos) {
    try {
      const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + modelo + ':generateContent?key=' + key;
      const res = UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({
          contents: [{ role: 'user', parts: parts }],
          generationConfig: {
            temperature: 0,
            responseMimeType: 'application/json'
          }
        }),
        muteHttpExceptions: true
      });

      const code = res.getResponseCode();
      const body = res.getContentText();

      if (code === 200) {
        const j = JSON.parse(body);
        const c = j.candidates && j.candidates[0];
        const texto = (c && c.content && c.content.parts || [])
          .filter(p => !p.thought)
          .map(p => p.text || '')
          .join('');
        if (!texto) throw new Error('Gemini no devolvió texto en la respuesta.');
        return texto;
      }

      if (code === 400 && /API key/i.test(body)) {
        throw new Error('La clave GEMINI_API_KEY no es válida o está vencida.');
      }
      if (code === 429) {
        throw new Error('Límite de peticiones de Gemini excedido. Espera un minuto.');
      }
      ultimoError = 'Gemini respondió ' + code + ': ' + body.slice(0, 300);
    } catch (e) {
      ultimoError = e.message || String(e);
    }
  }

  throw new Error(ultimoError);
}
