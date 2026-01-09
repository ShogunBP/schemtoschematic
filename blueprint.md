# 🏗️ Blueprint Técnico - Schem to Schematic Converter

## 📋 Visão Geral

Sistema full-stack para conversão de arquivos `.schem` (formato moderno do Minecraft 1.12+) para `.schematic` (formato legado do Minecraft 1.12-). O projeto foi desenvolvido para permitir que estruturas criadas em versões modernas do Minecraft sejam utilizadas em versões antigas ou em ferramentas que ainda suportam apenas o formato legado.

## 🎯 Objetivo do Projeto

Converter arquivos de schematic do formato NBT moderno (`.schem`) para o formato NBT legado (`.schematic`), lidando com incompatibilidades entre versões do Minecraft através da substituição de blocos inexistentes por ar (air).

## 🏛️ Arquitetura do Sistema

### Arquitetura Geral

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (React)                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Port: 8081 (dev) / 80 (prod via nginx)              │   │
│  │  - Interface de upload de arquivos                   │   │
│  │  - Terminal visual para logs em tempo real           │   │
│  │  - Gerenciamento de downloads                        │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP/SSE
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                      Nginx (Produção)                        │
│  - Proxy reverso para API                                   │
│  - Servir arquivos estáticos do frontend                    │
│  - Suporte a SSE (Server-Sent Events)                       │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                    Backend API (Express)                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Port: 3002 (dev/prod)                                │   │
│  │  - POST /convert - Conversão de arquivos              │   │
│  │  - GET /conversion-logs/:sessionId - SSE para logs    │   │
│  │  - GET /health - Health check                         │   │
│  └──────────────────────────────────────────────────────┘   │
│                              │                               │
│  ┌───────────────────────────▼──────────────────────────┐   │
│  │            Core de Conversão (NBT)                    │   │
│  │  - Parse de arquivo .schem                            │   │
│  │  - Transformação de estrutura NBT                     │   │
│  │  - Mapeamento de blocos                               │   │
│  │  - Compressão GZIP                                    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Fluxo de Dados

1. **Upload**: Usuário seleciona arquivo `.schem` no frontend
2. **Envio**: Frontend envia arquivo via `FormData` para `/convert`
3. **Processamento**: API recebe arquivo, salva temporariamente
4. **Conversão**: 
   - Parse do NBT usando `nbt.js`
   - Transformação de estrutura de dados
   - Mapeamento de blocos usando `blocks-namespace.js`
   - Substituição de blocos inexistentes por air
   - Compressão GZIP
5. **Logs em Tempo Real**: Durante a conversão, logs são enviados via SSE
6. **Download**: Arquivo `.schematic` convertido é retornado como blob
7. **Limpeza**: Arquivo temporário é removido

## 🛠️ Stack Tecnológica

### Frontend

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| **React** | 18.3+ | Framework UI |
| **TypeScript** | 5.5+ | Tipagem estática |
| **Vite** | 5.4+ | Build tool e dev server |
| **Tailwind CSS** | 3.4+ | Estilização utilitária |
| **Shadcn/ui** | Latest | Componentes UI |
| **Lucide React** | Latest | Ícones |
| **React Router** | 6.26+ | Roteamento |
| **Server-Sent Events** | Native | Logs em tempo real |

**Dependências Principais:**
- `react`, `react-dom`: Core do React
- `@vitejs/plugin-react-swc`: Plugin Vite com SWC
- `tailwindcss`, `autoprefixer`, `postcss`: Estilização
- `lucide-react`: Biblioteca de ícones
- `react-router-dom`: Roteamento

### Backend

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| **Node.js** | 18+ | Runtime JavaScript |
| **Express.js** | 4.x | Framework web |
| **express-fileupload** | Latest | Upload de arquivos |
| **cors** | Latest | CORS middleware |
| **zlib** | Built-in | Compressão GZIP |
| **Custom NBT Parser** | Custom | Parse de arquivos NBT |

**Dependências Principais:**
- `express`: Framework web
- `express-fileupload`: Middleware de upload
- `cors`: CORS handling
- `zlib`: Compressão (built-in Node.js)
- `nbt.js`: Parser customizado para arquivos NBT
- `blocks-namespace.js`: Mapeamento de blocos do Minecraft

### Infraestrutura

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| **Docker** | Latest | Containerização |
| **Docker Compose** | Latest | Orquestração |
| **Nginx** | Alpine | Proxy reverso (produção) |
| **Portainer** | Latest | Gerenciamento de containers |

## 📁 Estrutura de Diretórios

```
.
├── api/                          # Backend API
│   ├── server.js                 # Servidor Express principal
│   ├── schemtoschematic.js       # ⚠️ Core de conversão (NÃO MEXER)
│   ├── blocks-namespace.js       # Mapeamento de blocos Minecraft
│   ├── nbt.js                    # Parser de arquivos NBT
│   ├── zlib.js                   # Wrapper de compressão (se necessário)
│   ├── cli.js                    # CLI tool (conversão via terminal)
│   ├── Dockerfile                # Build da API
│   ├── package.json              # Dependências da API
│   ├── uploads/                  # Uploads temporários
│   └── logs/                     # Logs do servidor
│
├── src/                          # Frontend React
│   ├── pages/
│   │   └── Index.tsx             # Página principal
│   ├── components/
│   │   ├── FileUploader.tsx      # Componente de upload
│   │   ├── Terminal.tsx          # Terminal visual de logs
│   │   ├── DownloadSection.tsx   # Seção de downloads
│   │   └── ui/                   # Componentes Shadcn/ui
│   ├── hooks/                    # React hooks customizados
│   ├── lib/                      # Utilitários
│   └── main.tsx                  # Entry point
│
├── public/                       # Assets estáticos
├── dist/                         # Build de produção (gerado)
│
├── docker-compose.yml            # Docker Compose para produção
├── docker-compose.portainer.yml  # Docker Compose para Portainer
├── Dockerfile                    # Build do frontend (multi-stage)
├── nginx.conf                    # Configuração do Nginx
├── deploy.sh                     # Script de deploy automatizado
│
├── package.json                  # Dependências e scripts do frontend
├── vite.config.ts                # Configuração do Vite
├── tailwind.config.ts            # Configuração do Tailwind
├── tsconfig.json                 # Configuração do TypeScript
│
├── README.md                     # Documentação principal
├── blueprint.md                  # Este arquivo - blueprint técnico
└── .gitignore                    # Arquivos ignorados pelo Git
```

## 🔄 Fluxo de Conversão Detalhado

### 1. Upload e Recebimento

**Frontend (`src/pages/Index.tsx`)**:
```typescript
const formData = new FormData();
formData.append('schemFile', file);
const response = await fetch(`${API_URL}/convert?sessionId=${sessionId}`, {
    method: 'POST',
    body: formData
});
```

**Backend (`api/server.js`)**:
- Recebe arquivo via `express-fileupload`
- Salva temporariamente em `temp_${timestamp}.schem`
- Lê arquivo como `Buffer`

### 2. Parse do NBT

**Arquivo**: `api/nbt.js`
- Parser customizado para formato NBT (Named Binary Tag)
- Lê estrutura hierárquica do arquivo `.schem`
- Extrai metadados (dimensões, offset, etc.)

### 3. Transformação de Estrutura

**Arquivo**: `api/schemtoschematic.js`

Funções principais:
- `moveSize()`: Move dimensões para formato legado
- `moveOffset()`: Move offset para formato legado
- `moveOrigin()`: Move origem (se presente)
- `setMaterials()`: Define material como "Alpha"
- `moveTileEntities()`: Move entidades de blocos
- `convertBlockData()`: **Função crítica** - converte dados de blocos

### 4. Mapeamento de Blocos

**Arquivo**: `api/blocks-namespace.js`

- Contém mapeamento de ~1500+ blocos do Minecraft 1.12
- Formato: `'minecraft:block_name[states]': blockId`
- IDs numéricos correspondem ao formato legado

**Função de conversão** (`convertToLegacyBlockId`):
1. Busca bloco exato no mapeamento
2. Tenta remover estados e buscar novamente
3. Tenta diferentes variações de estados
4. Se não encontrar: retorna `0` (air) e loga aviso

**⚠️ IMPORTANTE**: Blocos não encontrados são **intencionalmente** substituídos por air. Isso é esperado e necessário para compatibilidade.

### 5. Compressão e Retorno

- Usa `zlib.gzip()` para comprimir NBT final
- Retorna `Buffer` comprimido
- Frontend recebe como blob e inicia download automático

### 6. Limpeza

- Arquivo temporário é removido após conversão
- Sessões SSE são limpas após timeout

## 🌐 Comunicação Frontend-Backend

### API REST

**Endpoints:**

1. **POST `/convert`**
   - Recebe: `multipart/form-data` com arquivo `.schem`
   - Headers: `x-session-id` (opcional, para SSE)
   - Retorna: `application/octet-stream` (arquivo `.schematic`)
   - Timeout: 30 segundos

2. **GET `/conversion-logs/:sessionId`**
   - Tipo: Server-Sent Events (SSE)
   - Apenas em desenvolvimento (`NODE_ENV=development`)
   - Envia logs em tempo real durante conversão
   - Formato: `data: {"type": "info|error|success", "message": "..."}\n\n`

3. **GET `/health`**
   - Retorna: `{"status": "ok", "port": 3002, "environment": "..."}`
   - Usado para health checks do Docker

### Server-Sent Events (SSE)

**Implementação:**
- Frontend abre conexão SSE antes de fazer POST
- Backend mantém `Map` de sessões ativas
- Durante conversão, logs são enviados via `session.eventSource.write()`
- Frontend recebe e exibe em tempo real no terminal visual
- Conexão fecha automaticamente após conversão

**Vantagens:**
- Logs em tempo real sem polling
- Sem limite de tamanho (diferente de headers HTTP)
- Conexão única por sessão (não abre/fecha múltiplas vezes)

## 🔧 Variáveis de Ambiente

Consulte o arquivo `.env.example` na raiz do projeto para um exemplo completo de todas as variáveis disponíveis.

### Frontend (Vite)

| Variável | Descrição | Valor Padrão |
|----------|-----------|--------------|
| `VITE_API_URL` | URL da API | `/convert` (prod) ou `http://localhost:3002` (dev) |
| `VITE_PORT` | Porta do Vite em dev | `8081` |
| `BUILD_TIMESTAMP` | Timestamp do build | Gerado no build (automático) |
| `BUILD_VERSION` | Versão do build | Git commit hash (automático) |

### Backend

| Variável | Descrição | Valor Padrão | Obrigatório |
|----------|-----------|--------------|-------------|
| `NODE_ENV` | Ambiente | `development` | Não |
| `PORT` | Porta da API | `3002` | Não |
| `SECRET_KEY` | Chave de autenticação | - | Sim (produção) |
| `FRONTEND_URL` | URL do frontend (CORS) | `http://localhost:8081` (dev) | Sim (produção) |
| `REQUIRE_AUTH` | Forçar autenticação | `false` | Não |

### Docker / Deploy

| Variável | Descrição | Valor Padrão | Obrigatório |
|----------|-----------|--------------|-------------|
| `PROJECT_DATA_DIR` | Diretório para volumes persistentes | `./data` | Não |
| `PROJECT_DIR` | Diretório do projeto (deploy.sh) | Diretório atual | Não |
| `BUILD_TIMESTAMP` | Timestamp do build | Gerado automaticamente | Não |
| `BUILD_VERSION` | Versão do build | Git commit hash | Não |

### Configuração Rápida

1. **Copiar exemplo:**
   ```bash
   cp .env.example .env
   ```

2. **Editar `.env` com seus valores:**
   - Para desenvolvimento local: valores padrão já funcionam
   - Para produção: configure `SECRET_KEY` e `FRONTEND_URL` obrigatoriamente

3. **Variáveis críticas em produção:**
   - `SECRET_KEY`: Gere uma chave forte e segura
   - `FRONTEND_URL`: URL completa do seu frontend (ex: `http://seu-dominio.com:8081`)
   - `NODE_ENV=production`

## 🐳 Docker e Deploy

### Estrutura de Containers

**Produção:**
```
┌─────────────────────────────────────┐
│  schem-frontend (nginx:alpine)      │
│  - Port: 8081:80                    │
│  - Serve arquivos estáticos         │
│  - Proxy reverso para API           │
└──────────────┬──────────────────────┘
               │
               │ (via Docker network)
               │
┌──────────────▼──────────────────────┐
│  schem-api (node:18-alpine)         │
│  - Port: 3002:3002                  │
│  - API Express                      │
│  - Volumes: uploads, logs           │
└─────────────────────────────────────┘
```

### Docker Compose

**docker-compose.yml** (produção):
- Define dois serviços: `schem-api` e `schem-frontend`
- Network compartilhada: `schem-network`
- Volumes persistentes para uploads e logs
- Health checks configurados

**docker-compose.portainer.yml** (Portainer):
- Mesma estrutura, mas com paths absolutos para volumes
- Labels para organização no Portainer

### Script de Deploy

**deploy.sh**:
- Detecta mudanças no código (via Git)
- Rebuilda apenas se necessário (otimização)
- Resolve bug de cache do Portainer com `git reset --hard`
- Limpeza automática de recursos não utilizados
- Health checks após deploy

**Comandos:**
```bash
./deploy.sh                # Deploy normal (detecta mudanças)
./deploy.sh --force-rebuild # Força rebuild completo
./deploy.sh --clean        # Limpeza completa de recursos Docker
```

## 🔐 Segurança

### Autenticação

- **Produção**: Requer `SECRET_KEY` via header `x-secret-key` ou query `key`
- **Desenvolvimento**: Autenticação desabilitada por padrão
- **Middleware**: Verifica autenticação apenas em produção ou se `REQUIRE_AUTH=true`

### CORS

- **Produção**: Apenas `FRONTEND_URL` permitida
- **Desenvolvimento**: `localhost:8081`, `localhost:5173`, `127.0.0.1:8081`
- **Configuração**: Middleware Express com lista de origens permitidas

### Limites

- **Upload máximo**: 50MB por arquivo
- **Timeout**: 30 segundos por requisição
- **Rate limiting**: Não implementado (pode ser adicionado se necessário)

## 📊 Performance e Otimizações

### Frontend

- **Code splitting**: Vite faz split automático
- **Tree shaking**: Remoção de código não usado
- **Asset optimization**: Imagens e fontes otimizadas
- **Gzip compression**: Nginx comprime assets estáticos

### Backend

- **Stream processing**: Arquivos são processados em chunks
- **Temporary files**: Arquivos temporários são limpos imediatamente
- **Memory management**: Buffers são liberados após uso
- **SSE batching**: Logs são enviados em batches para reduzir overhead

### Docker

- **Multi-stage build**: Build otimizado separado de runtime
- **Layer caching**: Dependências são cacheadas em layers separadas
- **Alpine images**: Imagens menores (menos overhead)

## 🧪 Desenvolvimento Local

### Setup Inicial

1. **Clone o repositório**:
   ```bash
   git clone <repo-url>
   cd schem-to-schematic
   ```

2. **Instalar dependências**:
   ```bash
   npm run install:all
   ```
   Isso instala as dependências tanto do frontend quanto da API.

3. **Configurar variáveis de ambiente**:
   ```bash
   cp .env.example .env
   # Edite o arquivo .env conforme necessário
   ```
   
   Para desenvolvimento local, as configurações padrão já funcionam:
   - `NODE_ENV=development`
   - `PORT=3002`
   - `FRONTEND_URL=http://localhost:8081`
   - `VITE_API_URL=http://localhost:3002`

4. **Iniciar aplicação**:
   ```bash
   npm run dev:full
   ```
   Isso inicia tanto a API quanto o frontend simultaneamente.

### Portas Locais

- **API**: `http://localhost:3002`
- **Frontend**: `http://localhost:8081`

### Hot Reload

- **Frontend**: Vite HMR habilitado automaticamente
- **Backend**: Nodemon pode ser adicionado se necessário

### Scripts Disponíveis

```bash
npm run dev:full      # Roda API + Frontend simultaneamente
npm run dev:api       # Apenas API (porta 3002)
npm run dev:ui        # Apenas Frontend (porta 8081)
npm run install:all   # Instala dependências (UI + API)
npm run build         # Build do frontend para produção
```

### Troubleshooting Local

**Erro de CORS:**
- Verifique se `FRONTEND_URL=http://localhost:8081` está configurado
- Em desenvolvimento, autenticação está desabilitada por padrão

**Porta já em uso:**
- Verifique se outra aplicação está usando as portas 3002 ou 8081
- Altere as portas no arquivo `.env` se necessário

**Dependências não instaladas:**
```bash
npm run install:all
```

## 🚀 Deploy em Produção

### Pré-requisitos

- Docker e Docker Compose instalados
- Acesso ao servidor/VPS
- Portainer configurado (opcional)
- Git configurado no servidor

### Método 1: Deploy via Script (Recomendado)

1. **Clone do repositório**:
   ```bash
   git clone <repo-url>
   cd schem-to-schematic
   ```

2. **Configurar variáveis de ambiente**:
   ```bash
   cp .env.example .env
   # Edite o .env com suas configurações de produção
   ```
   
   Variáveis importantes para produção:
   ```env
   NODE_ENV=production
   PORT=3002
   FRONTEND_URL=http://seu-dominio.com:8081
   VITE_API_URL=/convert
   SECRET_KEY=sua-chave-secreta-muito-forte
   PROJECT_DATA_DIR=/caminho/para/dados  # Opcional
   ```

3. **Executar deploy**:
   ```bash
   chmod +x deploy.sh
   ./deploy.sh                # Deploy normal (detecta mudanças)
   ./deploy.sh --force-rebuild # Força rebuild completo
   ./deploy.sh --clean        # Limpeza completa de recursos Docker
   ```

   O script automaticamente:
   - Faz pull do código mais recente do Git
   - Detecta mudanças e só rebuilda se necessário
   - Resolve problemas de cache do Portainer
   - Executa health checks

### Método 2: Deploy via Portainer

1. **No Portainer**:
   - Vá em **Stacks** → **Add stack**
   - Nome: `schem-to-schematic`
   - Cole o conteúdo do `docker-compose.portainer.yml`

2. **Configure variáveis de ambiente**:
   - `NODE_ENV=production`
   - `PORT=3002`
   - `FRONTEND_URL=http://seu-dominio.com:8081`
   - `VITE_API_URL=/convert`
   - `SECRET_KEY=sua-chave-secreta`
   - `PROJECT_DATA_DIR=/caminho/para/dados` (opcional)
   - `BUILD_TIMESTAMP` (gerado automaticamente)
   - `BUILD_VERSION` (gerado automaticamente)

3. **Deploy**

### Verificação pós-deploy

**Health Check:**
```bash
curl http://localhost:3002/health
```
Resposta esperada:
```json
{
  "status": "ok",
  "port": 3002,
  "environment": "production"
}
```

**Testar Conversão:**
```bash
curl -X POST \
  -H "x-secret-key: sua-chave" \
  -F "schemFile=@arquivo.schem" \
  http://localhost:3002/convert \
  -o arquivo.schematic
```

**Acessar Frontend:**
- URL: Acesse a URL configurada em `FRONTEND_URL`

**Ver Logs:**
```bash
docker logs schem-api -f
docker logs schem-frontend -f
```

Ou via Portainer:
- **Containers** → `schem-api` → **Logs**
- **Containers** → `schem-frontend` → **Logs**

### Atualizar Deploy

**Via Git Pull (com deploy.sh):**
```bash
./deploy.sh  # Detecta mudanças automaticamente
```

**Via Portainer:**
1. **Stacks** → `schem-to-schematic`
2. **Editor** → Atualize o compose ou variáveis
3. **Update the stack**

**Manual:**
```bash
cd /caminho/do/projeto
git pull origin main
./deploy.sh
```

### Estrutura de Volumes

**Produção (via PROJECT_DATA_DIR):**
- `${PROJECT_DATA_DIR}/api/uploads`: Uploads temporários
- `${PROJECT_DATA_DIR}/api/logs`: Logs persistentes
- `${PROJECT_DATA_DIR}/api/logs/nginx`: Logs do Nginx

**Desenvolvimento:**
- `./api/uploads`: Uploads temporários (relativo ao projeto)

## 🐛 Troubleshooting

### Problemas Comuns

**1. CORS Error**
- Verificar `FRONTEND_URL` no backend
- Confirmar que origem está na lista permitida

**2. "Unknown namespace key" logs**
- **Isso é NORMAL e ESPERADO** - blocos modernos são substituídos por air
- Não é um erro que precisa ser corrigido

**3. Container não inicia**
- Verificar logs: `docker logs schem-api`
- Confirmar que portas não estão em uso
- Verificar variáveis de ambiente

**4. Arquivo muito grande**
- Limite atual: 50MB
- Aumentar em `api/server.js` se necessário

**5. SSE não funciona**
- Apenas habilitado em `NODE_ENV=development`
- Verificar se `sessionId` está sendo enviado corretamente

## ⚠️ Avisos Importantes

### Lógica de Conversão

**NUNCA altere `api/schemtoschematic.js` sem compreensão profunda!**

- Blocos modernos são **intencionalmente** substituídos por air
- Isso é necessário para compatibilidade com formato legado
- Mensagens "Unknown namespace key" são **NORMAIS e ESPERADAS**

### Portas

- **Local Dev**: 3002 (API), 8081 (Frontend)
- **Docker Prod**: 3002 (API), 8081 (Frontend)
- Não use portas que conflitem com outros projetos na VM

### Volumes Docker

- Configure `PROJECT_DATA_DIR` para definir o caminho dos volumes persistentes
- Por padrão, usa paths relativos (`./data/api/uploads`, `./data/api/logs`)
- Em produção, ajuste conforme sua estrutura de diretórios
- Garantir que diretórios existem antes do deploy

## 📚 Referências e Recursos

### Formatos de Arquivo

- **NBT Format**: [Minecraft Wiki - NBT Format](https://minecraft.wiki/w/NBT_format)
- **Schematic Format**: [Minecraft Wiki - Schematic](https://minecraft.wiki/w/Structure_block_file_format)

### Tecnologias

- **Express.js**: https://expressjs.com/
- **React**: https://react.dev/
- **Vite**: https://vitejs.dev/
- **Docker**: https://www.docker.com/
- **Nginx**: https://nginx.org/

### Documentação Interna

- `README.md`: Guia rápido de uso
- `.env.example`: Exemplo de variáveis de ambiente
- `api/AVISO_IMPORTANTE.md`: Avisos sobre lógica de conversão
- `deploy.sh`: Script de deploy comentado

## 🔮 Possíveis Melhorias Futuras

1. **Rate Limiting**: Limitar requisições por IP
2. **Cache**: Cachear conversões de arquivos idênticos
3. **Fila de Processamento**: Para múltiplos arquivos simultâneos
4. **API de Status**: Endpoint para verificar progresso de conversão
5. **Suporte a Batch**: Conversão de múltiplos arquivos em uma requisição
8. **CI/CD**: Pipeline automatizado para deploy

---

**Última atualização**: 2026
**Versão**: 1.0.0
**Mantenedor**: shogunbp
