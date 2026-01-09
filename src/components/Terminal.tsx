
import React, { useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, Activity } from 'lucide-react';

interface TerminalMessage {
  id: string;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  timestamp: Date;
}

interface TerminalProps {
  messages: TerminalMessage[];
  isActive: boolean;
}

const Terminal: React.FC<TerminalProps> = ({ messages, isActive }) => {
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [messages]);

  const getMessageColor = (type: TerminalMessage['type']) => {
    switch (type) {
      case 'success': return 'terminal-green';
      case 'error': return 'terminal-red';
      case 'warning': return 'terminal-yellow';
      default: return 'text-slate-300';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="w-full">
      <div className="flex items-center space-x-3 mb-6">
        <div className="relative">
          <TerminalIcon className="h-6 w-6 text-green-400" />
          {isActive && (
            <div className="absolute -inset-2 bg-green-400/20 rounded-full blur-md animate-pulse-glow"></div>
          )}
        </div>
        <h3 className="text-slate-200 font-bold text-lg">Console Output</h3>
        {isActive && (
          <div className="flex items-center space-x-2">
            <Activity className="h-4 w-4 text-green-400 animate-pulse" />
            <span className="text-green-400 text-sm font-medium">Active</span>
          </div>
        )}
      </div>
      
      <div className="glass-panel rounded-2xl border-slate-700/50 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 px-4 py-3 border-b border-slate-700/50">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-400 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            <span className="text-slate-400 text-sm ml-4">schematic-converter/terminal</span>
          </div>
        </div>
        
        <div 
          ref={terminalRef}
          className="bg-black/40 p-6 h-72 overflow-y-auto font-mono text-sm backdrop-blur-sm"
        >
          {messages.length === 0 ? (
            <div className="text-slate-500 italic flex items-center">
              <span className="terminal-cursor text-green-400">Waiting for file upload</span>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((msg) => (
                <div key={`${msg.id}-${msg.timestamp.getTime()}`} className="flex animate-fade-in">
                  <span className="text-slate-500 mr-3 select-none">
                    [{formatTimestamp(msg.timestamp)}]
                  </span>
                  <span className={getMessageColor(msg.type)}>
                    {msg.message}
                  </span>
                </div>
              ))}
              {isActive && (
                <div className="flex animate-fade-in">
                  <span className="text-slate-500 mr-3">
                    [{formatTimestamp(new Date())}]
                  </span>
                  <span className="text-green-400 terminal-cursor">
                    Processing
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Terminal;
export type { TerminalMessage };
