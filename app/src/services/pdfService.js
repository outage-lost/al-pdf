// src/services/pdfService.js
const API_BASE = process.env.REACT_APP_API_BASE || '';

// Mapeo de calidades del frontend al backend - EXPORTADO
export const qualityMapping = {
    'low': 'baja',
    'medium': 'media',
    'high': 'alta',
    'extreme': 'extrema'
};

// Mapeo de tipos de división
const splitTypeMapping = {
    'single-pages': 'individual_pages',
    'split-half': 'custom_parts',
    'custom-pages': 'pages_per_part',
    'equal-parts': 'custom_parts'
};

// Función auxiliar mejorada para manejar errores
async function handleApiResponse(response) {
    if (!response.ok) {
        let errorMessage = `Error ${response.status}: ${response.statusText}`;
        try {
            const errorData = await response.json();
            errorMessage = errorData.detail || errorMessage;
        } catch {
            // Si no se puede parsear como JSON, usar el texto plano
            try {
                const text = await response.text();
                errorMessage = text || errorMessage;
            } catch {
                // Si falla todo, mantener el mensaje original
            }
        }
        throw new Error(errorMessage);
    }
    return response;
}

// Headers comunes para todas las requests
const getCommonHeaders = () => {
    return {
        'Accept': 'application/json',
    };
};

export class PDFCompressor {
    static async getCompressionEstimates(file) {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${API_BASE}/compress/estimates`, {
                method: 'POST',
                body: formData,
                headers: getCommonHeaders(),
            });

            const processedResponse = await handleApiResponse(response);
            return await processedResponse.json();
        } catch (error) {
            console.error('Error obteniendo estimaciones:', error);
            throw new Error(`No se pudieron obtener las estimaciones: ${error.message}`);
        }
    }

    static async compressPDF(file, compressionLevel, tempId = null) {
        try {
            // Convertir calidad del frontend al formato del backend
            const backendQuality = qualityMapping[compressionLevel] || 'media';

            const formData = new FormData();
            formData.append('file', file);
            formData.append('quality', backendQuality);
            if (tempId) {
                formData.append('temp_id', tempId);
            }

            const response = await fetch(`${API_BASE}/compress`, {
                method: 'POST',
                body: formData,
                headers: getCommonHeaders(),
            });

            await handleApiResponse(response);
            return await response.blob();
        } catch (error) {
            console.error('Error comprimiendo PDF:', error);
            throw new Error(`No se pudo comprimir el PDF: ${error.message}`);
        }
    }

    static calculateEstimatedSize(originalSizeMB, compressionLevel) {
        const reductionRatios = {
            low: 0.3,
            medium: 0.5,
            high: 0.7,
            extreme: 0.85
        };

        const ratio = reductionRatios[compressionLevel];
        const estimatedReduction = originalSizeMB * ratio;
        const finalSize = Math.max(originalSizeMB - estimatedReduction, 0.1);
        return finalSize.toFixed(2);
    }
}

export class PDFMerger {
    static async mergePDFs(files) {
        try {
            const formData = new FormData();
            files.forEach(fileData => {
                formData.append('files', fileData.file);
            });

            const response = await fetch(`${API_BASE}/merge`, {
                method: 'POST',
                body: formData,
                headers: getCommonHeaders(),
            });

            await handleApiResponse(response);
            return await response.blob();
        } catch (error) {
            console.error('Error uniendo PDFs:', error);
            throw new Error(`No se pudieron unir los PDFs: ${error.message}`);
        }
    }
}

export class PDFSplitter {
    static async splitPDF(file, splitType, customParts = null, pagesPerPart = null) {
        try {
            const backendSplitType = splitTypeMapping[splitType] || splitType;

            const formData = new FormData();
            formData.append('file', file);
            formData.append('split_type', backendSplitType);

            if (customParts && (splitType === 'split-half' || splitType === 'equal-parts')) {
                formData.append('custom_parts', splitType === 'split-half' ? '2' : customParts.toString());
            }
            if (pagesPerPart && splitType === 'custom-pages') {
                formData.append('pages_per_part', pagesPerPart.toString());
            }

            const response = await fetch(`${API_BASE}/split`, {
                method: 'POST',
                body: formData,
                headers: getCommonHeaders(),
            });

            await handleApiResponse(response);
            return await response.blob();
        } catch (error) {
            console.error('Error dividiendo PDF:', error);
            throw new Error(`No se pudo dividir el PDF: ${error.message}`);
        }
    }
}

export class PDFConverter {
    static async convertToPDF(file) {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${API_BASE}/convert`, {
                method: 'POST',
                body: formData,
                headers: getCommonHeaders(),
            });

            await handleApiResponse(response);
            return await response.blob();
        } catch (error) {
            console.error('Error convirtiendo archivo:', error);
            throw new Error(`No se pudo convertir el archivo: ${error.message}`);
        }
    }
}

// Función de utilidad para verificar la conexión
export const testAPIConnection = async () => {
    try {
        const response = await fetch(`${API_BASE}/health`, {
            method: 'GET',
            headers: getCommonHeaders(),
        });
        return response.ok;
    } catch (error) {
        console.error('Error testing API connection:', error);
        return false;
    }
};