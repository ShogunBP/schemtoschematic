# Schem to Schematic Converter

Conversor de arquivos `.schem` (Minecraft 1.12+) para `.schematic` (Minecraft 1.12-). Sistema full-stack com interface web moderna e API REST para conversão de schematics do formato moderno para o formato legado.

## 🎯 Sobre o Projeto

Este projeto permite converter arquivos de schematic criados em versões modernas do Minecraft (1.12+) para o formato legado (1.12-), tornando possível usar essas estruturas em versões antigas do jogo ou em ferramentas que ainda suportam apenas o formato legado.

**Características principais:**
- ✅ Interface web moderna e intuitiva
- ✅ Logs em tempo real durante conversão (SSE)
- ✅ Suporte a múltiplos arquivos
- ✅ Download automático de arquivos convertidos
- ✅ API REST para integração
- ✅ Deploy via Docker/Portainer
- ✅ Conversão automática de blocos incompatíveis para air

## 🚀 Quick Start

### Desenvolvimento Local

```bash
# 1. Instalar dependências
npm run install:all

# 2. Rodar tudo (API + Frontend)
npm run dev:full
```

Isso iniciará:
- **API Server**: `http://localhost:3002`
- **Frontend**: `http://localhost:8081`

### Produção (Docker)

```bash
# Configurar variáveis de ambiente
export NODE_ENV=production
export PORT=3002
export FRONTEND_URL=http://seu-dominio.com:8081  # Ajuste conforme necessário
export VITE_API_URL=/convert
export SECRET_KEY=sua-chave-secreta-forte  # Opcional, mas recomendado

# Deploy
chmod +x deploy.sh
./deploy.sh
```

Ou via Portainer: importar `docker-compose.portainer.yml` e configurar as variáveis.

## 📋 Configuração

### Portas

| Ambiente | API | Frontend |
|----------|-----|----------|
| **Local Dev** | 3002 | 8081 |
| **Docker Prod** | 3002 | 8081 |

### Variáveis de Ambiente

Consulte o arquivo `.env.example` na raiz do projeto para um exemplo completo de todas as variáveis.

**Variáveis principais:**
- `NODE_ENV`: Ambiente (`development` ou `production`)
- `PORT`: Porta da API (padrão: `3002`)
- `FRONTEND_URL`: URL do frontend para CORS (obrigatório em produção)
- `SECRET_KEY`: Chave de autenticação (obrigatório em produção)
- `VITE_API_URL`: URL da API para o frontend
- `PROJECT_DATA_DIR`: Diretório para volumes Docker (opcional)

Para configuração completa, veja a seção de variáveis de ambiente no `blueprint.md`.

## 🐳 Deploy em Produção

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
   - `SECRET_KEY=sua-chave-secreta` (recomendado)
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

**Garantir que diretórios existem:**
```bash
mkdir -p ${PROJECT_DATA_DIR}/api/uploads ${PROJECT_DATA_DIR}/api/logs ${PROJECT_DATA_DIR}/api/logs/nginx
```

## 📝 Scripts NPM

```bash
npm run dev:full      # Roda API + Frontend simultaneamente
npm run dev:api       # Apenas API (porta 3002)
npm run dev:ui        # Apenas Frontend (porta 8081)
npm run install:all   # Instala dependências (UI + API)
npm run build         # Build do frontend para produção
```

## 🐛 Troubleshooting

### Desenvolvimento Local

**Erro de CORS:**
- Verifique se `FRONTEND_URL=http://localhost:8081` está configurado no `.env`
- Em desenvolvimento, autenticação está desabilitada por padrão

**Porta já em uso:**
- Verifique se outra aplicação está usando as portas 3002 ou 8081
- Altere as portas no arquivo `.env` se necessário

**Dependências não instaladas:**
```bash
npm run install:all
```

### Produção

**Container não inicia:**
- Verifique os logs: `docker logs schem-api`
- Confirme que a porta não está em uso
- Verifique variáveis de ambiente

**Erro 403 (Acesso não autorizado):**
- Verifique se `SECRET_KEY` está correto
- Confirme que o header `x-secret-key` está sendo enviado
- Verifique se `REQUIRE_AUTH=true` ou `NODE_ENV=production`

**Erro na conversão:**
- Verifique os logs do container
- Confirme que o arquivo `.schem` é válido
- Verifique espaço em disco
- Limite atual de upload: 50MB (ajuste em `api/server.js` se necessário)

**SSE não funciona:**
- SSE (logs em tempo real) está habilitado apenas em `NODE_ENV=development`
- Em produção, logs aparecem apenas no console do container
- Verifique se `sessionId` está sendo enviado corretamente

**Deploy falha com erro de cache:**
- Use `./deploy.sh --force-rebuild` para forçar rebuild completo
- O script `deploy.sh` já resolve problemas de cache do Portainer automaticamente

## 🔒 Segurança

- ✅ Autenticação via `SECRET_KEY` (header `x-secret-key` ou query `key`)
- ✅ CORS configurado por ambiente
- ✅ Limite de upload: 50MB
- ✅ Autenticação desabilitada em desenvolvimento

## 📚 Requisitos

- **Node.js**: 18+ (API e Frontend)
- **Docker**: Latest (para deploy)
- **Portainer**: Opcional (para gerenciamento de containers)

## ⚠️ Aviso Importante

### Lógica de Conversão

**NUNCA altere `api/schemtoschematic.js` sem compreensão profunda!**

- Blocos modernos (1.13+) são **intencionalmente substituídos por air (ar)**
- Isso é **NECESSÁRIO** para compatibilidade com formato legado
- Mensagens "Unknown namespace key" são **NORMAIS e ESPERADAS**
- Não é um bug - é uma limitação do formato legado

Veja `api/AVISO_IMPORTANTE.md` para detalhes completos.

## 📖 Documentação

- **[`blueprint.md`](./blueprint.md)** - 📘 **Documentação técnica completa** (arquitetura, fluxos, tecnologias)
- `.env.example` - Exemplo de variáveis de ambiente (copie para `.env` e configure)
- `api/AVISO_IMPORTANTE.md` - ⚠️ Avisos sobre lógica de conversão
- `deploy.sh` - Script de deploy automatizado (comentado)

## 🏗️ Stack Tecnológica

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS + Shadcn/ui
- Server-Sent Events (SSE) para logs

**Backend:**
- Node.js 18 + Express.js
- Parser NBT customizado
- Compressão GZIP
- Express File Upload

**Infraestrutura:**
- Docker + Docker Compose
- Nginx (proxy reverso)
- Portainer (opcional)

---

## 👤 Autor

**Guilherme Menezes Rodrigues**

### Contato do Desenvolvedor

- **Email**: guilhermemenezes1337@gmail.com
- **GitHub**: [ShogunBP](https://github.com/ShogunBP/)
- **LinkedIn**: [mr-guilherme](https://www.linkedin.com/in/mr-guilherme/)
- **Twitter/X**: [@dev_ShogunBP](https://x.com/dev_ShogunBP)

## 📄 Licença

Todos os direitos reservados. Este projeto é propriedade de Guilherme Menezes Rodrigues.
