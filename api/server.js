const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
// Portas configuráveis para evitar conflito com outros projetos
// Dev local: 3002 (API), 8081 (Frontend)
// Prod: 3002 (API), 8081 (Frontend) - reservadas para este projeto
const PORT = process.env.PORT || 3002;
const SECRET_KEY = process.env.SECRET_KEY; // Deve ser definido via variável de ambiente
const FRONTEND_URL = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL || 'http://localhost:8081' : 'http://localhost:8081');

// CORS configurável: permite localhost em dev, produção usa FRONTEND_URL
const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? [FRONTEND_URL].filter(Boolean)
    : [
        'http://localhost:8081', 
        'http://localhost:5173', 
        'http://127.0.0.1:8081',
        FRONTEND_URL
      ].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Permite requisições sem origin (mobile apps, curl, Postman)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Não permitido pelo CORS'));
        }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true
}));

app.use(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
}));

// Middleware de autenticação (desabilitado em dev local para facilitar testes)
if ((process.env.NODE_ENV === 'production' || process.env.REQUIRE_AUTH === 'true') && SECRET_KEY) {
    app.use((req, res, next) => {
        const authKey = req.headers['x-secret-key'] || req.query.key;
        if (authKey !== SECRET_KEY) {
            return res.status(403).json({ error: 'Acesso não autorizado' });
        }
        next();
    });
} else {
    if (process.env.NODE_ENV === 'production' && !SECRET_KEY) {
        console.warn('⚠️  SECRET_KEY não definido em produção - autenticação desabilitada');
    } else {
        console.log('⚠️  Autenticação desabilitada em modo desenvolvimento');
    }
}

// Sistema de captura de logs para desenvolvimento usando Map por sessão
const conversionSessions = new Map(); // sessionId -> { logs: [], eventSource: null }

// Função para capturar logs durante a conversão
function captureLog(sessionId, message, type = 'log') {
    // Sempre loga no console
    if (type === 'error') {
        console.error(message);
    } else {
        console.log(message);
    }
    
    // Em desenvolvimento, envia via SSE se houver conexão
    if (process.env.NODE_ENV === 'development' && sessionId) {
        const session = conversionSessions.get(sessionId);
        if (session) {
            const logData = {
                timestamp: new Date().toISOString(),
                type: type,
                message: message
            };
            session.logs.push(logData);
            
            // Envia via SSE em tempo real se conexão estiver aberta
            if (session.eventSource && !session.eventSource.writableEnded && !session.eventSource.destroyed) {
                try {
                    session.eventSource.write(`data: ${JSON.stringify(logData)}\n\n`);
                } catch (err) {
                    // Se falhar, remove referência (cliente desconectou)
                    console.warn('Erro ao enviar log via SSE (cliente pode ter desconectado):', err.message);
                    session.eventSource = null;
                }
            }
        }
    }
}

// Rota SSE para logs de conversão em tempo real (apenas desenvolvimento)
app.get('/conversion-logs/:sessionId', (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
        return res.status(404).json({ error: 'Not found' });
    }

    const { sessionId } = req.params;
    
    // Configura headers para SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Desabilita buffering do nginx
    
    // Cria ou recupera sessão
    if (!conversionSessions.has(sessionId)) {
        conversionSessions.set(sessionId, { logs: [], eventSource: res });
    } else {
        const session = conversionSessions.get(sessionId);
        session.eventSource = res;
        // Envia logs acumulados até agora
        session.logs.forEach(log => {
            res.write(`data: ${JSON.stringify(log)}\n\n`);
        });
    }

    // Envia keepalive inicial
    res.write(': keepalive\n\n');
    
    // Limpa sessão quando cliente desconecta
    req.on('close', () => {
        const session = conversionSessions.get(sessionId);
        if (session && session.eventSource === res) {
            session.eventSource = null;
            // Mantém logs por 5 minutos caso precise reconectar
            setTimeout(() => {
                const currentSession = conversionSessions.get(sessionId);
                if (currentSession && !currentSession.eventSource) {
                    conversionSessions.delete(sessionId);
                }
            }, 5 * 60 * 1000);
        }
    });
});

// Rota de conversão
app.post('/convert', async (req, res) => {
    if (!req.files?.schemFile) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const tempPath = path.join(__dirname, `temp_${Date.now()}.schem`);
    const sessionId = req.headers['x-session-id'] || req.query.sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Cria sessão para logs se em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
        if (!conversionSessions.has(sessionId)) {
            conversionSessions.set(sessionId, { logs: [], eventSource: null });
        }
    }

    // Cria função de log com sessionId
    const logWithSession = (message, type = 'log') => {
        captureLog(sessionId, message, type);
    };

    try {
        logWithSession(`[API] Recebendo arquivo: ${req.files.schemFile.name}`, 'info');
        await req.files.schemFile.mv(tempPath);
        
        logWithSession(`[API] Arquivo salvo temporariamente, iniciando conversão...`, 'info');
        const buffer = fs.readFileSync(tempPath);
        
        logWithSession(`[API] Conversão em andamento...`, 'info');
        const converted = await require('./schemtoschematic')(buffer, logWithSession);

        logWithSession(`[API] Conversão concluída com sucesso!`, 'success');

        // Headers simples - sem logs (logs vão via SSE)
        const headers = {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${req.files.schemFile.name.replace('.schem', '.schematic')}"`
        };
        
        if (process.env.NODE_ENV === 'development') {
            headers['X-Session-Id'] = sessionId;
        }

        res.set(headers).send(converted);

        // Fecha conexão SSE após 2 segundos (dá tempo para último log chegar)
        if (process.env.NODE_ENV === 'development') {
            setTimeout(() => {
                const session = conversionSessions.get(sessionId);
                if (session && session.eventSource) {
                    try {
                        // session.eventSource é o res do endpoint GET SSE, não do POST
                        if (!session.eventSource.writableEnded && !session.eventSource.destroyed) {
                            session.eventSource.write(`data: ${JSON.stringify({ type: 'close', message: '[API] Sessão encerrada' })}\n\n`);
                            session.eventSource.end();
                        }
                    } catch (err) {
                        // Ignora erro se já desconectado
                    }
                    session.eventSource = null;
                }
                // Limpa sessão após um tempo
                setTimeout(() => {
                    const finalSession = conversionSessions.get(sessionId);
                    if (finalSession && !finalSession.eventSource) {
                        conversionSessions.delete(sessionId);
                    }
                }, 10000);
            }, 2000);
        }

    } catch (err) {
        const errorMsg = `[API] Erro na conversão: ${err.message}`;
        logWithSession(errorMsg, 'error');
        console.error('Erro na conversão:', err);
        
        // Envia erro via SSE se houver conexão
        if (process.env.NODE_ENV === 'development') {
            const session = conversionSessions.get(sessionId);
            if (session && session.eventSource) {
                try {
                    session.eventSource.write(`data: ${JSON.stringify({ type: 'error', message: errorMsg })}\n\n`);
                    session.eventSource.end();
                } catch (e) {
                    // Ignora erro se já desconectado
                }
            }
            setTimeout(() => conversionSessions.delete(sessionId), 10000);
        }
        
        res.status(500).json({ 
            error: err.message
        });
    } finally {
        if (fs.existsSync(tempPath)) {
            try {
                fs.unlinkSync(tempPath);
                logWithSession(`[API] Arquivo temporário removido`, 'info');
            } catch (unlinkErr) {
                console.error('Erro ao remover arquivo temporário:', unlinkErr);
            }
        }
    }
});

// Rota de health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        port: PORT,
        environment: process.env.NODE_ENV || 'development'
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Modo: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Frontend URL: ${FRONTEND_URL}`);
    console.log(`Origins permitidas: ${allowedOrigins.join(', ')}`);
});