# Acordario — Inversiones, Drops, Arpegios y Backing Tracks para Guitarra

Aplicación profesional e interactiva para guitarristas y compositores:
- **Explorador de Inversiones y Drops:** Drop 2, Drop 3, Drop 2 y 4, Tríadas abiertas y cerradas, sets de cuerdas agudas/medias/graves, y diapasón interactivo en tiempo real.
- **Backing Tracks con Audio WebAPI Karplus-Strong:** Estilos Swing, Bossa Nova, Manouche, Pop y Balada, tempo BPM con tap, metrónomo, transpositor y loops configurables.
- **Auto-Improvisador de la Máquina:** Generador en tiempo real de arpegios y escalas sobre los acordes que van sonando, con métrica (4/4, 3/4, 2/4), rítmica (negras, corcheas, tresillos 3x2, semicorcheas), múltiples timbres (Guitarra Jazz limpia, Lead overdrive, Rhodes, Sintetizador) y feedback visual en el diapasón.
- **Escáner de Partituras con IA Gemini:** Transcripción automática de hojas de acordes, real books o grillas manuscritas mediante fotos o capturas.

---

## 🚀 Cómo ejecutar en tu PC (Windows, Mac o Linux)

### 1. Requisitos
- Tener instalado [Node.js](https://nodejs.org/) (versión 18 o superior recomendada).

### 2. Instalación de dependencias
Abre una terminal en la carpeta descomprimida del proyecto y ejecuta:

```bash
npm install
```

### 3. Iniciar el servidor de desarrollo
Ejecuta:

```bash
npm run dev
```

Luego abre tu navegador en:
👉 `http://localhost:3000`

---

## 🔑 Variables de Entorno (Opcional para escáner IA)
Si deseas usar el escáner de fotos/partituras con IA Gemini:
1. Copia el archivo `.env.example` como `.env`:
   ```bash
   cp .env.example .env
   ```
2. Añade tu API Key de Gemini:
   ```env
   GEMINI_API_KEY="tu_api_key_aqui"
   ```
*(Todas las funciones de audio, guitarra, backing tracks, arpegios y visualización funcionan 100% de manera local y offline sin necesidad de API key).*

---

## 🛠️ Tecnologías utilizadas
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons.
- **Audio:** Web Audio API con síntesis Karplus-Strong (cuerdas pulsadas físicas), osciladores modelados y compresor dinámico.
- **Backend:** Node.js Express con middleware Vite y SDK `@google/genai`.
