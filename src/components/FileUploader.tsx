
import React, { useState, useRef } from 'react';
import { Upload, File, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  selectedFiles: File[];
  isProcessing: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  onFilesSelected,
  selectedFiles,
  isProcessing
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files).filter(
      file => file.name.endsWith('.schem')
    );
    
    if (files.length > 0) {
      onFilesSelected([...selectedFiles, ...files]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(
      file => file.name.endsWith('.schem')
    );
    
    if (files.length > 0) {
      onFilesSelected([...selectedFiles, ...files]);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    onFilesSelected(newFiles);
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <div
        className={`
          relative glass-panel rounded-2xl p-8 text-center transition-all duration-300 overflow-hidden
          ${isDragOver 
            ? 'glow-border scale-105 bg-green-500/5' 
            : 'border-slate-700/50 hover:border-slate-600/70'
          }
          ${isProcessing ? 'opacity-50 pointer-events-none' : 'hover:bg-slate-800/20'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Background gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-purple-500/5 pointer-events-none"></div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".schem"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isProcessing}
        />
        
        <div className="relative z-10">
          <div className="relative mb-6">
            <Upload className="mx-auto h-16 w-16 text-green-400 animate-float" />
            <div className="absolute -inset-4 bg-green-400/20 rounded-full blur-xl opacity-50"></div>
          </div>
          
          <h3 className="text-2xl font-bold text-slate-200 mb-3">
            Upload .schem files
          </h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Drag & drop your .schem files here, or click to browse your computer
          </p>
          
          <Button
            onClick={triggerFileSelect}
            disabled={isProcessing}
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white border-0 shadow-lg glow-border-purple transition-all duration-300 transform hover:scale-105"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Browse Files
          </Button>
        </div>
      </div>

      {selectedFiles.length > 0 && (
        <div className="mt-8">
          <h4 className="text-slate-200 font-semibold mb-4 flex items-center">
            <File className="h-5 w-5 mr-2 text-green-400" />
            Selected Files:
          </h4>
          <div className="space-y-3">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="glass-panel rounded-xl p-4 border-slate-700/50 hover:border-slate-600/70 transition-all duration-300 hover:bg-slate-800/20"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <File className="h-5 w-5 text-slate-400" />
                    <span className="text-slate-200 font-medium">{file.name}</span>
                    <span className="text-slate-500 text-sm">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  
                  {!isProcessing && (
                    <Button
                      onClick={() => removeFile(index)}
                      variant="ghost"
                      size="sm"
                      className="text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all duration-300"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
