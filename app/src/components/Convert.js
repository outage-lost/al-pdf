// Convert.js - Versión Minimalista
import React, { useState } from 'react';
import { PDFConverter } from '../services/pdfService';
import { saveAs } from 'file-saver';
import './styles/Convert.css';

const Convert = () => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [downloadInfo, setDownloadInfo] = useState(null);

    const supportedFormats = [
        { type: '.txt', label: 'Texto', icon: '📝' },
        { type: '.jpg', label: 'JPEG', icon: '🖼️' },
        { type: '.jpeg', label: 'JPEG', icon: '🖼️' },
        { type: '.png', label: 'PNG', icon: '🖼️' },
        { type: '.bmp', label: 'BMP', icon: '🖼️' }
    ];

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setDownloadInfo(null);
        }
    };

    const handleConvert = async () => {
        if (!selectedFile) {
            alert('Selecciona un archivo primero');
            return;
        }

        setIsProcessing(true);
        setDownloadInfo(null);

        try {
            const convertedBlob = await PDFConverter.convertToPDF(selectedFile);
            const url = URL.createObjectURL(convertedBlob);
            const fileName = `convertido_${selectedFile.name.replace(/\.[^/.]+$/, "")}.pdf`;

            setDownloadInfo({
                url,
                fileName,
                originalType: selectedFile.name.split('.').pop().toUpperCase()
            });

            saveAs(convertedBlob, fileName);

        } catch (error) {
            setDownloadInfo({
                error: true,
                message: error.message
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const getAcceptedTypes = () => {
        return supportedFormats.map(f => f.type).join(', ');
    };

    return (
        <div className="convert">
            <div className="convert-header">
                <h1>Convertir a PDF</h1>
                <p>Transforma archivos a formato PDF</p>
            </div>

            <div className="convert-content">
                <div className="upload-section">
                    <div className="upload-area">
                        <input
                            type="file"
                            id="convert-upload"
                            accept={getAcceptedTypes()}
                            onChange={handleFileChange}
                            className="file-input"
                        />
                        <label htmlFor="convert-upload" className="upload-label">
                            <div className="upload-icon">📄</div>
                            <h3>Selecciona un archivo</h3>
                            <p>Arrastra o haz clic para seleccionar</p>
                            {selectedFile && (
                                <div className="file-selected">
                                    <strong>{selectedFile.name}</strong>
                                </div>
                            )}
                        </label>
                    </div>
                </div>

                {selectedFile && (
                    <div className="action-section">
                        <button
                            className={`btn convert-btn ${isProcessing ? 'processing' : ''}`}
                            onClick={handleConvert}
                            disabled={isProcessing}
                        >
                            {isProcessing ? 'Convirtiendo...' : 'Convertir a PDF'}
                        </button>
                    </div>
                )}

                {downloadInfo && (
                    <div className={`result-section ${downloadInfo.error ? 'error' : 'success'}`}>
                        {downloadInfo.error ? (
                            <div className="result-content">
                                <h3>Error</h3>
                                <p>{downloadInfo.message}</p>
                                <button className="btn" onClick={handleConvert}>
                                    Intentar nuevamente
                                </button>
                            </div>
                        ) : (
                            <div className="result-content">
                                <h3>Conversión exitosa</h3>
                                <p>Archivo convertido a PDF</p>
                                <button className="btn btn-success" onClick={() => saveAs(downloadInfo.url, downloadInfo.fileName)}>
                                    Descargar PDF
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Convert;