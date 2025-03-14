# Sci-AI

Aplicación para procesamiento científico de documentos con IA.

## Requisitos

- Node.js 18 o superior
- NPM 8 o superior

## Instalación

```bash
# Instalar dependencias
npm install
```

## Configuración

Copia el archivo `.env.example` a `.env y configura las variables de entorno necesarias:

```bash
cp .env.example .env
```

Edita el archivo `.env` con tus valores específicos.

## Desarrollo

```bash
npm run dev
```

## Construcción para producción

```bash
npm run build
```

## Iniciar en modo producción

```bash
npm run start
```

## Despliegue en plataformas

### Cloudflare Pages

Para desplegar en Cloudflare Pages:

1. **Configuración inicial:**
   ```bash
   # Instala wrangler CLI globalmente (opcional, ya está en devDependencies)
   npm install -g wrangler
   
   # Login con tu cuenta de Cloudflare
   npx wrangler login
   ```

2. **Despliegue manual desde CLI:**
   ```bash
   # Construye y despliega en un solo comando
   npm run cloudflare:deploy
   ```

3. **Despliegue automático con GitHub:**
   - Conecta tu repositorio de GitHub a Cloudflare Pages
   - Configura el framework como "Next.js"
   - Comando de construcción: `npm run build`
   - Directorio de salida: `.next`
   - Configura las variables de entorno en la interfaz de Cloudflare

### Vercel

La forma más sencilla de desplegar esta aplicación es usando Vercel:

1. Conecta tu repositorio de GitHub a Vercel
2. Configura las variables de entorno en la interfaz de Vercel
3. Despliega automáticamente

### Despliegue manual

Para un despliegue manual en cualquier servidor:

1. Ejecuta `npm run build` localmente
2. Transfiere los archivos generados en `.next/`, `public/`, y los archivos de configuración principal al servidor
3. Instala las dependencias de producción con `npm install --production`
4. Inicia el servidor con `npm run start`

## Problemas comunes

- Si encuentras errores de memoria durante la construcción, incrementa el límite de memoria para Node:
  ```bash
  NODE_OPTIONS=--max-old-space-size=4096 npm run build
  ```

- **Problemas específicos de Cloudflare:**
  - Si encuentras errores con API routes, asegúrate de que estás usando el modo `standalone` en next.config.js
  - Para problemas de CORS, configura los encabezados adecuados en la sección `headers` del next.config.js
  - El directorio `.next/static` debe estar disponible públicamente en Cloudflare Pages
