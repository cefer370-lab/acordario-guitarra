import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '25mb' }));

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const PHOTO_PROMPT = `You are an expert jazz and contemporary guitarist and music copyist.
The image provided is a chord chart, lead sheet, Real Book page, fakebook score, or handwritten chord grid.
Analyze and transcribe the chord progression with musical precision.

Rules:
1. Transcribe the measure-by-measure (bar-by-bar) chord progression in reading order.
2. Each measure can have 1, 2, or up to 4 chords (separated by a space).
3. If a measure has a repeat sign (%, ./., or slash symbol indicating previous bar repeats), write "%".
4. Standard jazz & guitar chord nomenclature: Cmaj7, Dm7, G7, F#m7b5, Bb7, Ebmaj7, C°7, A7alt, G/B, etc.
5. If the chart has sections (like Intro, [A], [B], Chorus, Verse, Bridge, Solo), group them into sections with their names.
6. Detect the song title, artist/composer (if visible), tempo/BPM (if noted or estimate standard tempo for the tune), and stylistic feel ('swing', 'bossa', 'manouche', 'pop', 'balada').
7. Also provide a clean formatted text representation where measures are separated by " | " and lines represent 4 measures per line, with an empty line between sections.`;

// Endpoint to extract chord progression from an image using Gemini 3.8 Flash
app.post('/api/gemini/extract-grid', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'No se envió ninguna imagen.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).json({
        error: 'No se encontró GEMINI_API_KEY en las variables de entorno. Configúrala en Settings > Secrets.',
      });
    }

    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
    const cleanMime = mimeType || 'image/jpeg';

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            mimeType: cleanMime,
            data: cleanBase64,
          },
        },
        {
          text: PHOTO_PROMPT,
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Song title or Lead Sheet name if found' },
            composer: { type: Type.STRING, description: 'Composer or artist name if visible' },
            bpm: { type: Type.INTEGER, description: 'Estimated or written tempo BPM (e.g. 120)' },
            style: {
              type: Type.STRING,
              description: 'Musical style feel: swing, bossa, manouche, pop, balada',
            },
            timeSignature: { type: Type.STRING, description: 'Time signature, e.g. 4/4 or 3/4' },
            formattedProgression: {
              type: Type.STRING,
              description: 'Formatted multiline progression with | bar separators and empty lines between sections',
            },
            sections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  sectionName: { type: Type.STRING },
                  measures: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING, description: 'Chord or chords in this measure' },
                  },
                },
                required: ['sectionName', 'measures'],
              },
            },
          },
          required: ['formattedProgression', 'sections'],
        },
      },
    });

    const text = response.text || '{}';
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error('No se pudo decodificar el JSON de la respuesta de Gemini.');
      }
    }

    return res.json({
      success: true,
      data: parsed,
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/extract-grid:', error);
    return res.status(500).json({
      error: error?.message || 'Error procesando la imagen con Gemini.',
    });
  }
});

// Endpoint to download the entire project as a ZIP archive
app.get('/api/download-zip', (_req, res) => {
  try {
    const zipPath = path.resolve(__dirname, 'public', 'acordario-proyecto-guitarra.zip');
    
    // Regenerate zip if not exists or to ensure latest changes are included
    try {
      const { execSync } = require('child_process');
      execSync(`python3 -c "
import zipfile, os
exclude_dirs = {'node_modules', '.git', 'dist', '.tempmediaStorage'}
exclude_files = {'acordario-proyecto-guitarra.zip'}
os.makedirs('public', exist_ok=True)
with zipfile.ZipFile('public/acordario-proyecto-guitarra.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in exclude_dirs and not d.startswith('.')]
        for file in files:
            if file in exclude_files or file.endswith('.zip'):
                continue
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, '.')
            z.write(full_path, rel_path)
"`);
    } catch (e) {
      console.warn('Zip re-generation warning:', e);
    }

    res.download(zipPath, 'acordario-proyecto-guitarra.zip', (err) => {
      if (err) {
        console.error('Error downloading zip:', err);
        if (!res.headersSent) {
          res.status(500).send('Error al descargar el archivo ZIP.');
        }
      }
    });
  } catch (error: any) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'No se pudo generar el archivo ZIP.' });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
