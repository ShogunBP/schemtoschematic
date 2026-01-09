#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const nbt = require('./nbt');
const schemtoschematic = require('./schemtoschematic');

// Configurações para arquivos grandes
process.env.UV_THREADPOOL_SIZE = 128; // Aumenta threads para I/O
const MAX_MEMORY_MB = 4096; // 4GB 

// Verifica argumentos
if (process.argv.length < 3) {
    console.log('Uso: node cli.js <arquivo.schem> [saida.schematic]');
    process.exit(1);
}

const inputFile = path.resolve(process.argv[2]);
const outputFile = path.resolve(process.argv[3] || inputFile.replace(/\.schem$/i, '.schematic'));

// Função otimizada para arquivos grandes
function convertFile(input, output) {
    return new Promise((resolve, reject) => {
        console.log(`Lendo ${input}...`);
        
        fs.readFile(input, (err, data) => {
            if (err) return reject(`Erro ao ler: ${err.message}`);

            console.log('Convertendo... (isso pode demorar para arquivos grandes)');
            schemtoschematic(data, (converted, error) => {
                if (error) return reject(`Erro na conversão: ${error.message}`);

                fs.writeFile(output, converted, (err) => {
                    if (err) return reject(`Erro ao salvar: ${err.message}`);
                    resolve();
                });
            });
        });
    });
}

// Execução principal
(async () => {
    try {
        if (!fs.existsSync(inputFile)) {
            throw new Error(`Arquivo não encontrado: ${inputFile}`);
        }

        console.log(`Iniciando conversão (Limite: ${MAX_MEMORY_MB}MB)...`);
        await convertFile(inputFile, outputFile);
        console.log(`Conversão concluída! Arquivo salvo em: ${outputFile}`);

    } catch (err) {
        console.error('\x1b[31m', 'ERRO:', err, '\x1b[0m');
        process.exit(1);
    }
})();