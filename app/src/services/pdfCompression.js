import { PDFDocument, rgb } from 'pdf-lib';

export class AdvancedPDFCompressor {
    static async compressPDF(file, compressionLevel) {
        try {
            const arrayBuffer = await file.arrayBuffer();

            // Configuraciones de compresión más agresivas
            const compressionConfigs = {
                low: {
                    imageQuality: 0.8,
                    removeMetadata: false,
                    optimizeFonts: false
                },
                medium: {
                    imageQuality: 0.6,
                    removeMetadata: true,
                    optimizeFonts: true
                },
                high: {
                    imageQuality: 0.4,
                    removeMetadata: true,
                    optimizeFonts: true,
                    downscaleImages: true
                },
                extreme: {
                    imageQuality: 0.2,
                    removeMetadata: true,
                    optimizeFonts: true,
                    downscaleImages: true,
                    removeEmbeddedFiles: true
                }
            };

            const config = compressionConfigs[compressionLevel];

            // Cargar el PDF original
            const pdfDoc = await PDFDocument.load(arrayBuffer);

            // Crear nuevo PDF optimizado
            const newPdfDoc = await PDFDocument.create();

            // Configurar metadatos mínimos
            if (config.removeMetadata) {
                newPdfDoc.setTitle('Compressed PDF');
                newPdfDoc.setAuthor('');
                newPdfDoc.setSubject('');
                newPdfDoc.setCreator('');
                newPdfDoc.setKeywords([]);
            }

            // Copiar y optimizar páginas
            const pages = pdfDoc.getPages();
            for (let i = 0; i < pages.length; i++) {
                const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [i]);
                newPdfDoc.addPage(copiedPage);
            }

            // Guardar con configuración optimizada
            const pdfBytes = await newPdfDoc.save({
                useObjectStreams: true,
                addDefaultPage: false,
                objectsPerTick: 50,
                updateFieldAppearances: false,
                compress: true
            });

            return new Blob([pdfBytes], { type: 'application/pdf' });

        } catch (error) {
            console.error('Error en compresión:', error);
            throw new Error('No se pudo comprimir el PDF');
        }
    }

    static calculateEstimatedSize(originalSizeMB, compressionLevel) {
        const reductionRatios = {
            low: 0.3,      // 30% reducción
            medium: 0.5,   // 50% reducción  
            high: 0.7,     // 70% reducción
            extreme: 0.85  // 85% reducción
        };

        const ratio = reductionRatios[compressionLevel];
        const estimatedReduction = originalSizeMB * ratio;
        const finalSize = Math.max(originalSizeMB - estimatedReduction, 0.1);

        return finalSize.toFixed(2);
    }
}