# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
COPY vite.config.ts ./
COPY tsconfig*.json ./
COPY tsconfig.app.json ./
COPY tsconfig.node.json ./

# Instalar dependências
RUN npm ci

# Build arguments para versão (declarar ANTES de copiar código para invalidar cache)
ARG BUILD_TIMESTAMP
ARG BUILD_VERSION
ARG VITE_API_URL

# Definir como ENV para que o Vite possa usar
ENV BUILD_TIMESTAMP=${BUILD_TIMESTAMP}
ENV BUILD_VERSION=${BUILD_VERSION}
ENV VITE_API_URL=${VITE_API_URL}

# Copiar código fonte (api/ será ignorado pelo .dockerignore)
# Esta camada será invalidada quando o código mudar
COPY src ./src
COPY public ./public
COPY index.html ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY components.json ./

# Build da aplicação (usa BUILD_TIMESTAMP e BUILD_VERSION do ENV)
RUN npm run build

# Criar arquivo de versão no build time
RUN echo "{\"timestamp\":\"${BUILD_TIMESTAMP}\",\"version\":\"${BUILD_VERSION}\"}" > /app/dist/VERSION.json || echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\",\"version\":\"unknown\"}" > /app/dist/VERSION.json

# Verificar se o build foi bem-sucedido
RUN ls -la /app/dist || (echo "Build failed!" && exit 1)

# Production stage - Nginx
FROM nginx:alpine

# Instalar wget para healthcheck
RUN apk add --no-cache wget

# Copiar arquivos buildados
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuração do nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expor porta 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
