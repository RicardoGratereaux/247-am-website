# 2:47 AM — Turno de Madrugada

Página web del videojuego de terror psicológico ambientado en un viejo hotel. Incluye un recorrido 3D por scroll, exploración libre del mapa, seis escenas de concepto y sonido ambiental opcional, con estética inspirada en PS2.

## Desarrollo local

Requiere Node.js. El proyecto no tiene dependencias externas.

```sh
npm run dev
```

Abre http://localhost:4173.

## Pruebas

```sh
npm test
```

## Despliegue en Vercel

Importa este repositorio en Vercel y utiliza la raíz del repositorio como Root Directory. `vercel.json` configura el sitio estático:

- Framework Preset: Other.
- Output Directory: `dist`.
- Sin comandos de instalación ni compilación.

Los archivos de la página, imágenes y tipografías están incluidos en `dist`. No se necesitan variables de entorno.

## Contenido

- `dist/`: página, scripts y recursos visuales.
- `scripts/preview.mjs`: servidor local.
- `tests/`: pruebas de geometría y cámara.
- `dist/assets/fonts-LICENSE.txt`: licencia de las tipografías.

Las imágenes son visuales de concepto del juego en desarrollo.
