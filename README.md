# Cosechando

Aplicacion Expo para registrar cosecha por obrero y calcular pagos por arroba.

## Requisitos

- Node.js 18+
- npm 9+

## Inicio rapido

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Iniciar en desarrollo:

   ```bash
   npx expo start
   ```

## Scripts utiles

- `npm run start`: inicia Expo
- `npm run android`: abre Android
- `npm run ios`: abre iOS (macOS)
- `npm run web`: abre web
- `npm run lint`: ejecuta ESLint

## Notas tecnicas

- En Android/iOS se usa SQLite real en `lib/database.ts`.
- En web se usa fallback con localStorage en `lib/database.web.ts` para evitar errores de build de wasm.
