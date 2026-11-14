FROM node:20-alpine

# Crear directorio de trabajo
WORKDIR /usr/src/app

# Copiar manifiesto de dependencias
COPY package*.json ./

# Instalar dependencias de producción
RUN npm install --only=production

# Copiar código fuente
COPY . .

# Exponer el puerto por defecto (se mapea con APP_PORT en tiempo de ejecución)
EXPOSE 3000

# Comando de inicio
CMD ["node", "server.js"]

