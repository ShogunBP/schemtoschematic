import React, { useState, useEffect } from 'react';
import { Pickaxe, Github, Shield, Zap } from 'lucide-react';
import FileUploader from '@/components/FileUploader';
import Terminal, { TerminalMessage } from '@/components/Terminal';
import DownloadSection, { ConvertedFile } from '@/components/DownloadSection';
import { Button } from '@/components/ui/button';

const Index = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [terminalMessages, setTerminalMessages] = useState<TerminalMessage[]>([]);
  const [convertedFiles, setConvertedFiles] = useState<ConvertedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  const addTerminalMessage = (type: TerminalMessage['type'], message: string) => {
    const newMessage: TerminalMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      timestamp: new Date()
    };
    setTerminalMessages(prev => [...prev, newMessage]);
  };

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files);
    if (files.length > 0) {
      addTerminalMessage('info', `Selected ${files.length} file(s) for conversion`);
    }
  };

  const handleConvertFiles = async () => {
    if (selectedFiles.length === 0) return;

    setIsProcessing(true);
    addTerminalMessage('info', 'Starting conversion process...');

    // API URL: usa variável de ambiente ou fallback
    // Em produção (Docker), VITE_API_URL será '/convert' (proxy nginx)
    // Em dev local, usa localhost:3002
    const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3002' : '/convert');

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const convertedFileName = file.name.replace('.schem', '.schematic');
        
        addTerminalMessage('info', `Processing file ${i + 1}/${selectedFiles.length}: ${file.name}`);
        
        const newConvertedFile: ConvertedFile = {
          id: `${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
          originalName: file.name,
          convertedName: convertedFileName,
          status: 'processing'
        };
        
        setConvertedFiles(prev => [...prev, newConvertedFile]);
        
        // Gera session ID único para esta conversão
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Cria conexão SSE para logs em tempo real (apenas em dev)
        let currentEventSource: EventSource | null = null;
        if (import.meta.env.DEV) {
          const sseUrl = `${API_URL}/conversion-logs/${sessionId}`;
          currentEventSource = new EventSource(sseUrl);
          setEventSource(currentEventSource);
          
          currentEventSource.onmessage = (event) => {
            try {
              const logData = JSON.parse(event.data);
              if (logData.type === 'close') {
                currentEventSource?.close();
                setEventSource(null);
                return;
              }
              const logType = logData.type === 'success' ? 'success' : logData.type === 'error' ? 'error' : 'info';
              addTerminalMessage(logType, logData.message);
            } catch (e) {
              console.warn('Erro ao processar log SSE:', e);
            }
          };
          
          currentEventSource.onerror = (err) => {
            console.warn('Erro na conexão SSE:', err);
            // Não fecha automaticamente - pode reconectar
          };
        }
        
        const formData = new FormData();
        formData.append('schemFile', file);

        // Adiciona timeout para a requisição
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

        // Headers: envia session ID para SSE em desenvolvimento
        const headers: Record<string, string> = {};
        if (import.meta.env.DEV) {
          headers['x-session-id'] = sessionId;
        }

        const response = await fetch(`${API_URL}/convert?sessionId=${sessionId}`, {
          method: 'POST',
          headers: headers,
          body: formData,
          signal: controller.signal
        }).finally(() => clearTimeout(timeoutId));

        if (!response.ok) {
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
            // Se tiver logs de erro, exibe eles também
            if (errorData.logs && Array.isArray(errorData.logs)) {
              errorData.logs.forEach((log: { type: string; message: string }) => {
                const logType = log.type === 'success' ? 'success' : log.type === 'error' ? 'error' : 'info';
                addTerminalMessage(logType, log.message);
              });
            }
          } catch {
            // Não é JSON, continua normalmente
          }
          throw new Error(errorData?.error || errorText || `Server returned ${response.status}`);
        }

        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);
        
        setConvertedFiles(prev => 
          prev.map(f => 
            f.id === newConvertedFile.id 
              ? { 
                  ...f, 
                  status: 'completed', 
                  downloadUrl,
                  convertedAt: new Date() 
                }
              : f
          )
        );
        
        addTerminalMessage('success', `✓ Successfully converted ${file.name}`);
        
        // Download automático
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = convertedFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Libera a URL depois de 1 minuto
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 60000);
      }

      addTerminalMessage('success', `✅ All files converted successfully!`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Conversion error:', errorMessage);
      
      addTerminalMessage('error', `❌ Conversion failed: ${errorMessage}`);
      
      setConvertedFiles(prev => 
        prev.map(f => 
          f.status === 'processing'
            ? { 
                ...f, 
                status: 'error', 
                errorMessage: errorMessage 
              }
            : f
        )
      );
    } finally {
      setSelectedFiles([]);
      setIsProcessing(false);
      // Fecha conexão SSE se ainda estiver aberta
      if (eventSource) {
        eventSource.close();
        setEventSource(null);
      }
    }
  };

  const handleDownload = (file: ConvertedFile) => {
    if (!file.downloadUrl) return;
    
    addTerminalMessage('info', `Downloading ${file.convertedName}...`);
    
    const a = document.createElement('a');
    a.href = file.downloadUrl;
    a.download = file.convertedName;
    a.click();
    
    addTerminalMessage('success', `✓ Downloaded ${file.convertedName}`);
  };

  const clearAll = () => {
    setSelectedFiles([]);
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }
  };
  
  // Limpa SSE quando componente desmonta
  useEffect(() => {
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [eventSource]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 cyber-grid">
      {/* Header */}
      <header className="glass-panel border-b border-slate-700/50 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-lg shadow-lg animate-float"></div>
                <div className="absolute inset-1 bg-gradient-to-br from-green-500 to-blue-600 rounded-md"></div>
              </div>
              <h1 className="text-2xl font-bold gradient-text">
                Schematic Converter
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-300 hover:text-green-400 hover:bg-slate-800/50 transition-all duration-300"
                onClick={() => window.open('https://github.com/ShogunBP/schemtoschematic/', '_blank')}
              >
                <Github className="h-4 w-4 mr-2" />
                View on GitHub
              </Button>
              <div className="text-sm text-slate-400">
                <div className="text-sm text-slate-400">
                  Made by{' '}
                  <a 
                    href="https://x.com/dev_ShogunBP" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-green-400 font-semibold hover:underline cursor-pointer inline-flex items-center"
                  >
                    shogunbp
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="16" 
                      height="16" 
                      viewBox="0 0 24 24" 
                      fill="currentColor" 
                      className="ml-1"
                    >
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="flex items-center justify-center mb-8">
            <div className="relative">
              <Pickaxe className="h-20 w-20 text-green-400 animate-float" />
              <div className="absolute -inset-4 bg-green-400/20 rounded-full blur-xl"></div>
            </div>
          </div>
          
          <h2 className="text-5xl font-bold gradient-text mb-6">
            Convert .schem files to .schematic files
          </h2>
          
          <p className="text-xl text-slate-300 mb-3 max-w-4xl mx-auto">
            Convert the new WorldEdit 1.13+ .schem files to the legacy 1.12- .schematic files
          </p>
          
          <p className="text-slate-400 max-w-2xl mx-auto mb-8">
            Blocks that didn't exist in 1.12 will be replaced with air
          </p>

          <div className="flex items-center justify-center space-x-2 text-slate-400 text-sm">
            <Shield className="h-4 w-4" />
            <p>Privacy notice: All schematics are processed by a server</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-12">
          {/* Upload Section */}
          <div className="space-y-6 animate-slide-in">
            <FileUploader
              onFilesSelected={handleFilesSelected}
              selectedFiles={selectedFiles}
              isProcessing={isProcessing}
            />
            
            {selectedFiles.length > 0 && (
              <div className="flex space-x-3">
                <Button
                  onClick={handleConvertFiles}
                  disabled={isProcessing}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0 shadow-lg glow-border transition-all duration-300 transform hover:scale-105"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  {isProcessing ? 'Converting...' : `Convert ${selectedFiles.length} File(s)`}
                </Button>
                
                <Button
                  onClick={clearAll}
                  variant="outline"
                  disabled={isProcessing}
                  className="border-slate-600 text-slate-300 hover:bg-slate-800/50 hover:border-slate-500 transition-all duration-300"
                >
                  Clear All
                </Button>
              </div>
            )}
          </div>

          {/* Terminal Section */}
          <div className="animate-slide-in" style={{ animationDelay: '0.2s' }}>
            <Terminal 
              messages={terminalMessages}
              isActive={isProcessing}
            />
          </div>
        </div>

        {/* Download Section */}
        <div className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <DownloadSection
            convertedFiles={convertedFiles}
            onDownload={handleDownload}
          />
        </div>
      </main>
    </div>
  );
};

export default Index;
