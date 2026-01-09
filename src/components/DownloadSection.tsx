
import React from 'react';
import { Download, FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConvertedFile {
  id: string;
  originalName: string;
  convertedName: string;
  status: 'processing' | 'completed' | 'error';
  downloadUrl?: string;
  convertedAt?: Date;
  errorMessage?: string;
}

interface DownloadSectionProps {
  convertedFiles: ConvertedFile[];
  onDownload: (file: ConvertedFile) => void;
}

const DownloadSection: React.FC<DownloadSectionProps> = ({
  convertedFiles,
  onDownload
}) => {
  const formatTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (convertedFiles.length === 0) {
    return (
      <div className="w-full">
        <h3 className="text-slate-200 font-bold text-xl mb-6 flex items-center">
          <Download className="h-6 w-6 mr-3 text-green-400" />
          Downloads
        </h3>
        <div className="glass-panel rounded-2xl p-12 text-center border-slate-700/50">
          <div className="relative mb-6">
            <FileText className="mx-auto h-16 w-16 text-slate-500 animate-float" />
            <div className="absolute -inset-4 bg-slate-500/10 rounded-full blur-xl"></div>
          </div>
          <p className="text-slate-400 text-lg">
            Converted files will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h3 className="text-slate-200 font-bold text-xl mb-6 flex items-center">
        <Download className="h-6 w-6 mr-3 text-green-400" />
        Downloads ({convertedFiles.length})
      </h3>
      <div className="space-y-4">
        {convertedFiles.map((file, index) => (
          <div
            key={file.id}
            className="glass-panel rounded-xl p-6 border-slate-700/50 hover:border-slate-600/70 transition-all duration-300 hover:bg-slate-800/20 animate-fade-in"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-4 mb-3">
                  {file.status === 'completed' && (
                    <div className="relative">
                      <CheckCircle className="h-6 w-6 text-green-400" />
                      <div className="absolute -inset-2 bg-green-400/20 rounded-full blur-md"></div>
                    </div>
                  )}
                  {file.status === 'processing' && (
                    <Clock className="h-6 w-6 text-yellow-400 animate-spin" />
                  )}
                  {file.status === 'error' && (
                    <AlertCircle className="h-6 w-6 text-red-400" />
                  )}
                  
                  <div>
                    <p className="text-slate-200 font-semibold text-lg">
                      {file.originalName}
                    </p>
                    <p className="text-slate-400">
                      → {file.convertedName}
                    </p>
                  </div>
                </div>

                {file.status === 'completed' && file.convertedAt && (
                  <p className="text-slate-500 text-sm">
                    Converted on {formatTime(file.convertedAt)}
                  </p>
                )}

                {file.status === 'error' && file.errorMessage && (
                  <p className="text-red-400 text-sm mt-2 bg-red-400/10 px-3 py-1 rounded-md">
                    Error: {file.errorMessage}
                  </p>
                )}
              </div>

              {file.status === 'completed' && (
                <Button
                  onClick={() => onDownload(file)}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0 shadow-lg glow-border transition-all duration-300 transform hover:scale-105"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}

              {file.status === 'processing' && (
                <div className="text-yellow-400 text-sm font-medium bg-yellow-400/10 px-4 py-2 rounded-md">
                  Converting...
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DownloadSection;
export type { ConvertedFile };
