#!/bin/bash

# Script de deploy otimizado para Free Tier + Portainer
# Detecta mudanças e só rebuilda quando necessário
# Uso: ./deploy.sh [--force-rebuild] [--clean]

set -e

FORCE_REBUILD=false
CLEAN_MODE=false

# Processar argumentos
for arg in "$@"; do
    case $arg in
        --force-rebuild)
            FORCE_REBUILD=true
            ;;
        --clean)
            CLEAN_MODE=true
            ;;
        *)
            echo "⚠️  Argumento desconhecido: $arg"
            echo "   Use: ./deploy.sh [--force-rebuild] [--clean]"
            ;;
    esac
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Iniciando deploy..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Configuração do projeto - ajuste conforme sua estrutura
PROJECT_DIR="${PROJECT_DIR:-$(pwd)}"
COMPOSE_FILE="docker-compose.yml"
PROJECT_NAME="schem-to-schematic"
LAST_DEPLOY_FILE="${PROJECT_DIR}/.last-deploy-commit"

if [ ! -f "$COMPOSE_FILE" ]; then
    echo "❌ Erro: docker-compose.yml não encontrado"
    exit 1
fi

# 1. Pull do código
echo ""
echo "📥 Atualizando código do GitHub..."
git fetch origin || {
    echo "⚠️  Aviso: Falha ao fazer fetch"
}

git reset --hard origin/main || {
    git pull origin main || {
        echo "❌ Erro: Não foi possível atualizar o código"
        exit 1
    }
}

git clean -fd

CURRENT_COMMIT=$(git rev-parse --short HEAD)
echo "✅ Código atualizado para commit: $CURRENT_COMMIT"

# 2. Detectar mudanças (se não for rebuild forçado)
NEED_REBUILD=false
if [ "$FORCE_REBUILD" = true ]; then
    NEED_REBUILD=true
    echo "🔨 Rebuild forçado solicitado"
elif [ ! -f "$LAST_DEPLOY_FILE" ]; then
    NEED_REBUILD=true
    echo "🔍 Primeiro deploy detectado"
else
    LAST_COMMIT=$(cat "$LAST_DEPLOY_FILE" 2>/dev/null || echo "")
    if [ -z "$LAST_COMMIT" ] || [ "$LAST_COMMIT" != "$CURRENT_COMMIT" ]; then
        # Verificar o que mudou
        CHANGED_FILES=$(git diff --name-only "$LAST_COMMIT" "$CURRENT_COMMIT" 2>/dev/null || echo "")
        
        if echo "$CHANGED_FILES" | grep -qE "(src/|api/|Dockerfile|package\.json|vite\.config|docker-compose|nginx\.conf)"; then
            NEED_REBUILD=true
            echo "🔍 Mudanças detectadas no código - rebuild necessário"
        else
            echo "✅ Nenhuma mudança relevante - pulando rebuild"
        fi
    else
        echo "✅ Mesmo commit - pulando rebuild (use --force-rebuild para forçar)"
    fi
fi

# 3. Gerar versão e timestamp
BUILD_TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)
BUILD_VERSION=$(git rev-parse --short HEAD 2>/dev/null || echo "dev-$(date +%s)")

export BUILD_TIMESTAMP
export BUILD_VERSION

echo "📦 Build Version: $BUILD_VERSION"
echo "📅 Build Timestamp: $BUILD_TIMESTAMP"

# 4. Limpeza (se solicitado ou limpeza leve padrão)
if [ "$CLEAN_MODE" = true ]; then
    echo ""
    echo "🧹 Limpeza completa solicitada..."
    echo "   ⚠️  Isso vai parar containers e remover imagens/volumes não utilizados"
    read -p "   Continuar? (s/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        echo "   Parando containers..."
        docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" down 2>/dev/null || true
        
        echo "   Limpando recursos não utilizados..."
        docker system prune -af --volumes 2>/dev/null || true
        
        SPACE_RECLAIMED=$(docker system df --format "{{.Reclaimable}}" 2>/dev/null | head -1 || echo "N/A")
        echo "   ✅ Limpeza completa concluída"
        echo ""
    else
        echo "   ❌ Limpeza cancelada"
        exit 0
    fi
else
    # Limpeza leve padrão (apenas recursos não utilizados, sem parar containers)
    echo ""
    echo "🧹 Limpando recursos não utilizados..."
    docker system prune -f 2>/dev/null || true
fi

# 5. Build inteligente
if [ "$NEED_REBUILD" = true ]; then
    echo ""
    if [ "$FORCE_REBUILD" = true ]; then
        echo "🔨 Rebuildando imagens (FORÇADO - sem cache)..."
        BUILD_CMD="build --no-cache"
    else
        echo "🔨 Construindo imagens (com cache otimizado)..."
        # Usa --pull para atualizar base images, mas mantém cache de layers
        BUILD_CMD="build --pull"
    fi
    
    BUILD_TIMESTAMP="$BUILD_TIMESTAMP" BUILD_VERSION="$BUILD_VERSION" \
      docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" $BUILD_CMD || {
        echo "❌ Erro ao construir imagens"
        exit 1
      }
else
    echo ""
    echo "⏭️  Pulando build - usando imagens existentes"
fi

# 6. Parar containers antigos
echo ""
echo "🛑 Parando containers existentes..."
docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" down 2>/dev/null || true
docker rm -f schem-api schem-frontend 2>/dev/null || true

# 7. Criar diretórios necessários
echo ""
echo "📁 Verificando volumes..."
# Ajuste os paths conforme necessário - usando paths relativos por padrão
DATA_DIR="${PROJECT_DATA_DIR:-${PROJECT_DIR}/data}"
mkdir -p "${DATA_DIR}/api/uploads" "${DATA_DIR}/api/logs" "${DATA_DIR}/api/logs/nginx" || true

# 8. Limpar logs antigos (evita crescimento infinito)
echo ""
echo "📋 Limpando logs antigos (>30 dias)..."
find "${DATA_DIR}/api/logs" -type f -name "*.log" -mtime +30 -delete 2>/dev/null || true

# 9. Recriar containers (sem rebuild, já foi feito antes)
echo ""
echo "🔄 Recriando containers..."
BUILD_TIMESTAMP="$BUILD_TIMESTAMP" BUILD_VERSION="$BUILD_VERSION" \
  docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" up -d --no-build || {
    echo "⚠️  Containers não existem, criando com build..."
    # Se falhar, pode ser que as imagens não existam, então faz build
    BUILD_TIMESTAMP="$BUILD_TIMESTAMP" BUILD_VERSION="$BUILD_VERSION" \
      docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" up -d || {
        echo "❌ Erro ao recriar containers"
        exit 1
      }
  }

# 10. Salvar commit atual para próxima verificação
echo "$CURRENT_COMMIT" > "$LAST_DEPLOY_FILE"

# 11. Health check
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Deploy concluído!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

sleep 5

echo "🔍 Backend (API):"
docker logs schem-api 2>&1 | grep -E "(Version|Deploy timestamp|BUILD|Servidor rodando)" | tail -5 || echo "   (aguardando logs...)"
echo "   Status: $(docker ps --filter name=schem-api --format '{{.Status}}' 2>/dev/null || echo 'N/A')"

echo ""
echo "🔍 Frontend:"
echo "   Status: $(docker ps --filter name=schem-frontend --format '{{.Status}}' 2>/dev/null || echo 'N/A')"
echo "   Abra o console do navegador (F12) para ver o timestamp"

echo ""
echo "📊 Health check..."
sleep 10
API_STATUS=$(curl -s http://localhost:3002/health 2>/dev/null | grep -o '"status":"[^"]*"' | cut -d'"' -f4 || echo 'N/A')
API_ENV=$(curl -s http://localhost:3002/health 2>/dev/null | grep -o '"environment":"[^"]*"' | cut -d'"' -f4 || echo 'N/A')
echo "   API Status: $API_STATUS"
echo "   API Environment: $API_ENV"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Pronto!"
echo ""
if [ "$NEED_REBUILD" = false ]; then
    echo "💡 Nenhum rebuild foi necessário (código não mudou)"
    echo "   Use './deploy.sh --force-rebuild' para forçar rebuild completo"
else
    echo "💡 Rebuild executado com sucesso"
fi
echo ""
echo "📋 Stack no Portainer:"
echo "   Nome: $PROJECT_NAME (schem-to-schematic)"
echo "   Containers: schem-api, schem-frontend"
echo ""
echo "💡 Opções disponíveis:"
echo "   ./deploy.sh              - Deploy normal (detecta mudanças)"
echo "   ./deploy.sh --force-rebuild - Força rebuild completo"
echo "   ./deploy.sh --clean      - Limpeza completa de recursos Docker"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
