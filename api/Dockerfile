FROM node:18-alpine

# Instalar curl para healthcheck
RUN apk add --no-cache curl

# Criar diretório da aplicação
WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependências (sem dependências de desenvolvimento)
RUN npm ci --omit=dev

# Copiar código da aplicação
COPY . .

# Criar diretórios necessários
RUN mkdir -p uploads

# Build arguments para versão
ARG BUILD_TIMESTAMP
ARG BUILD_VERSION
ENV BUILD_TIMESTAMP=${BUILD_TIMESTAMP}
ENV BUILD_VERSION=${BUILD_VERSION}

# Criar arquivo de versão no build time
RUN echo "{\"timestamp\":\"${BUILD_TIMESTAMP}\",\"version\":\"${BUILD_VERSION}\"}" > /app/VERSION.json || echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\",\"version\":\"unknown\"}" > /app/VERSION.json

# Expor porta
EXPOSE 3002

# Comando para iniciar
CMD ["node", "server.js"]