// src/components/Compress.js
import React, { useState } from 'react';
import { PDFCompressor } from '../services/pdfService';
import { saveAs } from 'file-saver';
import './styles/Compress.css';

// Mapeo local para el componente
const qualityMapping = {
    'low': 'baja',
    'medium': 'media',
    'high': 'alta',
    'extreme': 'extrema'
};

const Compress = () => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [compressionLevel, setCompressionLevel] = useState('medium');
    const [estimates, setEstimates] = useState(null);
    const [tempId, setTempId] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isEstimating, setIsEstimating] = useState(false);
    const [downloadInfo, setDownloadInfo] = useState(null);
    const [originalSize, setOriginalSize] = useState(0);
    const [filePreview, setFilePreview] = useState(null);

    const compressionOptions = [
        {
            level: 'low',
            label: 'Baja',
            description: 'Compresión mínima, máxima calidad',
            reduction: '30%',
            color: '#4CAF50'
        },
        {
            level: 'medium',
            label: 'Media',
            description: 'Balance entre tamaño y calidad',
            reduction: '50%',
            color: '#2196F3'
        },
        {
            level: 'high',
            label: 'Alta',
            description: 'Compresión significativa',
            reduction: '70%',
            color: '#FF9800'
        },
        {
            level: 'extreme',
            label: 'Extrema',
            description: 'Máxima compresión posible',
            reduction: '85%',
            color: '#F44336'
        }
    ];

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            setSelectedFile(file);
            const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
            setOriginalSize(sizeMB);
            setEstimates(null);
            setTempId(null);
            setDownloadInfo(null);

            // Crear preview
            setFilePreview({
                name: file.name,
                size: sizeMB,
                type: file.type
            });
        } else {
            alert('Por favor, selecciona un archivo PDF válido');
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'application/pdf') {
            setSelectedFile(file);
            const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
            setOriginalSize(sizeMB);
            setEstimates(null);
            setTempId(null);
            setDownloadInfo(null);

            // Crear preview también para drag & drop
            setFilePreview({
                name: file.name,
                size: sizeMB,
                type: file.type
            });
        }
    };

    const getCompressionEstimates = async () => {
        if (!selectedFile) return;

        setIsEstimating(true);
        try {
            const data = await PDFCompressor.getCompressionEstimates(selectedFile);
            setEstimates(data.estimates);
            setTempId(data.temp_id);
        } catch (error) {
            alert(error.message);
        } finally {
            setIsEstimating(false);
        }
    };

    const handleCompressionChange = (level) => {
        setCompressionLevel(level);
    };

    const handleCompress = async () => {
        if (!selectedFile) {
            alert('Por favor, selecciona un archivo PDF primero');
            return;
        }

        setIsProcessing(true);
        setDownloadInfo(null);

        try {
            const compressedBlob = await PDFCompressor.compressPDF(selectedFile, compressionLevel, tempId);

            const compressedSizeMB = (compressedBlob.size / (1024 * 1024)).toFixed(2);
            const reduction = ((1 - compressedBlob.size / selectedFile.size) * 100).toFixed(1);

            const url = URL.createObjectURL(compressedBlob);
            const fileName = `comprimido_${selectedFile.name}`;

            setDownloadInfo({
                url,
                fileName,
                originalSize: originalSize,
                compressedSize: compressedSizeMB,
                reduction: reduction
            });

        } catch (error) {
            setDownloadInfo({
                error: true,
                message: error.message
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = () => {
        if (downloadInfo && downloadInfo.url) {
            saveAs(downloadInfo.url, downloadInfo.fileName);
        }
    };

    return (
        <div className="compress">
            <div className="compress-header">
                <h1>Comprimir PDF</h1>
                <p>Reduce el tamaño de tus archivos PDF manteniendo la calidad</p>
            </div>

            <div className="compress-content">
                {/* Sección de subida de archivos */}
                <div className="upload-section">
                    <div
                        className="upload-area"
                        onDrop={handleDrop}
                        onDragOver={(e) => e.preventDefault()}
                    >
                        <input
                            type="file"
                            id="pdf-upload"
                            accept=".pdf"
                            onChange={handleFileChange}
                            className="file-input"
                        />
                        <label htmlFor="pdf-upload" className="upload-label">
                            <div className="upload-icon">📄</div>
                            <h3>Selecciona tu archivo PDF</h3>
                            <p>Arrastra y suelta tu PDF aquí o haz clic para seleccionar</p>
                            {selectedFile && (
                                <div className="file-selected">
                                    <strong>Archivo:</strong> {selectedFile.name}
                                    <br />
                                    <strong>Tamaño:</strong> {originalSize} MB
                                </div>
                            )}
                        </label>
                    </div>
                </div>

                {selectedFile && (
                    <>
                        {/* Vista previa del archivo */}
                        <div className="preview-section">
                            <h3>Vista previa del archivo</h3>
                            <div className="preview-container">
                                <div className="pdf-preview">
                                    📄
                                </div>
                                <div className="file-info-preview">
                                    <div className="file-name">{filePreview.name}</div>
                                    <div className="file-size">{filePreview.size} MB</div>
                                </div>
                            </div>
                        </div>

                        {/* Botón para obtener estimaciones */}
                        {!estimates && (
                            <div className="action-section">
                                <button
                                    className={`get-estimates-btn ${isEstimating ? 'processing' : ''}`}
                                    onClick={getCompressionEstimates}
                                    disabled={isEstimating}
                                >
                                    {isEstimating ? (
                                        <>
                                            <div className="spinner"></div>
                                            Obteniendo estimaciones...
                                        </>
                                    ) : (
                                        '📊 Obtener Estimaciones de Compresión'
                                    )}
                                </button>
                            </div>
                        )}

                        {/* Mostrar estimaciones */}
                        {estimates && (
                            <div className="compression-section">
                                <h2>Selecciona el nivel de compresión</h2>
                                <div className="compression-options">
                                    {compressionOptions.map(option => {
                                        const backendQuality = qualityMapping[option.level];
                                        const estimate = estimates[backendQuality];

                                        return (
                                            <div
                                                key={option.level}
                                                className={`compression-option ${compressionLevel === option.level ? 'selected' : ''}`}
                                                onClick={() => handleCompressionChange(option.level)}
                                                style={{ borderLeftColor: option.color }}
                                            >
                                                <div className="option-header">
                                                    <h3>{option.label}</h3>
                                                    <span className="reduction-badge" style={{ backgroundColor: option.color }}>
                                                        {estimate?.reduction_percent || option.reduction}% reducción
                                                    </span>
                                                </div>
                                                <p>{option.description}</p>
                                                <div className="size-comparison">
                                                    <div className="size-original">
                                                        <span>Original:</span>
                                                        <strong>{originalSize} MB</strong>
                                                    </div>
                                                    <div className="arrow">→</div>
                                                    <div className="size-estimated">
                                                        <span>Estimado:</span>
                                                        <strong>{estimate?.size_human || 'Calculando...'}</strong>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Botón de comprimir */}
                                <div className="action-section">
                                    <button
                                        className={`compress-button ${isProcessing ? 'processing' : ''}`}
                                        onClick={handleCompress}
                                        disabled={isProcessing}
                                    >
                                        {isProcessing ? (
                                            <>
                                                <div className="spinner"></div>
                                                Comprimiendo PDF...
                                            </>
                                        ) : (
                                            '🚀 Comprimir PDF'
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Sección de resultados */}
                        {downloadInfo && (
                            <div className={`result-section ${downloadInfo.error ? 'error' : 'success'}`}>
                                {downloadInfo.error ? (
                                    <div className="result-error">
                                        <div className="result-icon">❌</div>
                                        <div className="result-content">
                                            <h3>Error en la compresión</h3>
                                            <p>{downloadInfo.message}</p>
                                            <button className="retry-button" onClick={handleCompress}>
                                                🔄 Intentar Nuevamente
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="result-success">
                                        <div className="result-icon">✅</div>
                                        <div className="result-content">
                                            <h3>¡PDF Comprimido Exitosamente!</h3>
                                            <div className="compression-stats">
                                                <div className="stat">
                                                    <span className="stat-label">Tamaño original:</span>
                                                    <span className="stat-value">{downloadInfo.originalSize} MB</span>
                                                </div>
                                                <div className="stat">
                                                    <span className="stat-label">Tamaño comprimido:</span>
                                                    <span className="stat-value highlight">{downloadInfo.compressedSize} MB</span>
                                                </div>
                                                <div className="stat">
                                                    <span className="stat-label">Reducción:</span>
                                                    <span className="stat-value success">{downloadInfo.reduction}%</span>
                                                </div>
                                            </div>
                                            <div className="download-actions">
                                                <button className="download-button" onClick={handleDownload}>
                                                    📥 Descargar PDF Comprimido
                                                </button>
                                                <button className="new-file-button" onClick={() => window.location.reload()}>
                                                    🆕 Comprimir Otro Archivo
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default Compress;