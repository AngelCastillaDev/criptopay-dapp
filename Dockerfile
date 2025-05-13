# Etapa 1: Compilar Angular sin CLI global
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar solo dependencias necesarias
COPY package*.json ./
RUN npm ci

# Copiar el resto del proyecto
COPY . .

# Usar Angular CLI desde npx (no instalación global)
RUN npx ng build demo --configuration=production

# Etapa 2: Servir con Caddy (más liviano que nginx)
FROM caddy:alpine

# Copiar archivos compilados
COPY --from=builder /app/dist/demo/browser /usr/share/caddy

# Exponer puerto 80
EXPOSE 80

# Usar Caddy como servidor de archivos estáticos
CMD ["caddy", "file-server", "--root", "/usr/share/caddy", "--listen", ":80"]
