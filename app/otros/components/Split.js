import React, { useState } from 'react';
import { PDFSplitter } from '../services/pdfService';
import { saveAs } from 'file-saver';
import './styles/Split.css';

const Split = () => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [splitMethod, setSplitMethod] = useState('single-pages');
    const [customParts, setCustomParts] = useState(2);
    const [pagesPerPart, setPagesPerPart] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [downloadInfo, setDownloadInfo] = useState(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            setSelectedFile(file);
            setDownloadInfo(null);
        } else {
            alert('Por favor, selecciona un archivo PDF válido');
        }
    };

    const handleSplit = async () => {
        if (!selectedFile) {
            alert('Por favor, selecciona un archivo PDF primero');
            return;
        }

        setIsProcessing(true);
        setDownloadInfo(null);

        try {
            let splitBlob;

            if (splitMethod === 'split-half') {
                splitBlob = await PDFSplitter.splitPDF(selectedFile, splitMethod, 2);
            } else if (splitMethod === 'equal-parts') {
                splitBlob = await PDFSplitter.splitPDF(selectedFile, splitMethod, customParts);
            } else if (splitMethod === 'custom-pages') {
                splitBlob = await PDFSplitter.splitPDF(selectedFile, splitMethod, null, pagesPerPart);
            } else {
                splitBlob = await PDFSplitter.splitPDF(selectedFile, splitMethod);
            }

            const url = URL.createObjectURL(splitBlob);
            const fileName = `${selectedFile.name.replace('.pdf', '')}_dividido.zip`;

            setDownloadInfo({
                url,
                fileName,
                method: splitMethod
            });

            // Descargar automáticamente
            saveAs(splitBlob, fileName);

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

    // Función para incrementar/decrementar páginas
    const adjustPages = (amount) => {
        const newValue = Math.max(1, pagesPerPart + amount);
        setPagesPerPart(newValue);
    };

    return (
        <div className="split">
            <div className="split-header">
                <h1>Separar PDF</h1>
                <p>Divide tus archivos PDF según tus necesidades específicas</p>
            </div>

            <div className="split-content">
                <div className="file-upload-section">
                    <div className="upload-area">
                        <input
                            type="file"
                            id="split-upload"
                            accept=".pdf"
                            onChange={handleFileChange}
                            className="file-input"
                        />
                        <label htmlFor="split-upload" className="upload-label">
                            <div className="upload-icon">📄</div>
                            <h3>Selecciona el archivo PDF que deseas dividir</h3>
                            <p>Arrastra y suelta tu PDF aquí o haz clic para seleccionar</p>
                            {selectedFile && (
                                <div className="file-selected">
                                    <strong>Archivo:</strong> {selectedFile.name}
                                </div>
                            )}
                        </label>
                    </div>
                </div>

                {selectedFile && (
                    <div className="split-options">
                        <h2>Selecciona cómo quieres dividir el PDF</h2>

                        <div className="options-grid">
                            <div
                                className={`option-card ${splitMethod === 'single-pages' ? 'selected' : ''}`}
                                onClick={() => setSplitMethod('single-pages')}
                            >
                                <div className="option-icon">1️⃣</div>
                                <h4>Páginas individuales</h4>
                                <p>Crea un PDF separado por cada página</p>
                                <div className="option-badge">Más archivos</div>
                            </div>

                            <div
                                className={`option-card ${splitMethod === 'split-half' ? 'selected' : ''}`}
                                onClick={() => setSplitMethod('split-half')}
                            >
                                <div className="option-icon">➗</div>
                                <h4>Dividir en dos</h4>
                                <p>Separa el PDF en dos partes iguales</p>
                                <div className="option-badge">2 archivos</div>
                            </div>

                            <div
                                className={`option-card ${splitMethod === 'custom-pages' ? 'selected' : ''}`}
                                onClick={() => setSplitMethod('custom-pages')}
                            >
                                <div className="option-icon">🔧</div>
                                <h4>Páginas personalizadas</h4>
                                <p>Especifica cuántas páginas por archivo</p>
                                <div className="option-badge">Personalizable</div>
                            </div>

                            <div
                                className={`option-card ${splitMethod === 'equal-parts' ? 'selected' : ''}`}
                                onClick={() => setSplitMethod('equal-parts')}
                            >
                                <div className="option-icon">⚖️</div>
                                <h4>Partes iguales</h4>
                                <p>Divide en N partes iguales</p>
                                <div className="option-badge">Balanceado</div>
                            </div>
                        </div>

                        {/* Configuración para páginas personalizadas */}
                        {splitMethod === 'custom-pages' && (
                            <div className="configuration-panel">
                                <h3>📏 Configurar páginas por archivo</h3>
                                <div className="input-control">
                                    <label>Páginas por archivo:</label>
                                    <div className="number-input-group">
                                        <button
                                            className="number-btn"
                                            onClick={() => adjustPages(-1)}
                                        >
                                            -
                                        </button>
                                        <input
                                            type="number"
                                            min="1"
                                            value={pagesPerPart}
                                            onChange={(e) => setPagesPerPart(Math.max(1, parseInt(e.target.value) || 1))}
                                            className="number-input"
                                        />
                                        <button
                                            className="number-btn"
                                            onClick={() => adjustPages(1)}
                                        >
                                            +
                                        </button>
                                    </div>
                                    <div className="input-help">
                                        <p>📝 <strong>Ejemplo:</strong> Si tu PDF tiene 10 páginas y configuras 3 páginas por archivo, obtendrás 4 archivos:</p>
                                        <ul>
                                            <li>Archivo 1: Páginas 1-3</li>
                                            <li>Archivo 2: Páginas 4-6</li>
                                            <li>Archivo 3: Páginas 7-9</li>
                                            <li>Archivo 4: Página 10</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Configuración para partes iguales */}
                        {splitMethod === 'equal-parts' && (
                            <div className="configuration-panel">
                                <h3>⚖️ Configurar número de partes</h3>
                                <div className="input-control">
                                    <label>Número de partes:</label>
                                    <div className="parts-selector">
                                        {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                                            <div
                                                key={num}
                                                className={`part-option ${customParts === num ? 'selected' : ''}`}
                                                onClick={() => setCustomParts(num)}
                                            >
                                                {num}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="input-help">
                                        <p>📝 El PDF se dividirá en <strong>{customParts} partes</strong> aproximadamente iguales.</p>
                                        <p>💡 <strong>Consejo:</strong> Para documentos largos, usa más partes. Para documentos cortos, menos partes.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Resumen de la selección */}
                        <div className="selection-summary">
                            <h3>📋 Resumen de tu selección</h3>
                            <div className="summary-content">
                                {splitMethod === 'single-pages' && (
                                    <p>Crearás <strong>un archivo PDF por cada página</strong> del documento original.</p>
                                )}
                                {splitMethod === 'split-half' && (
                                    <p>Dividirás el PDF en <strong>2 partes iguales</strong>.</p>
                                )}
                                {splitMethod === 'custom-pages' && (
                                    <p>Dividirás el PDF en archivos de <strong>{pagesPerPart} página{pagesPerPart > 1 ? 's' : ''} cada uno</strong>.</p>
                                )}
                                {splitMethod === 'equal-parts' && (
                                    <p>Dividirás el PDF en <strong>{customParts} partes iguales</strong>.</p>
                                )}
                                <p className="download-info">💾 Todos los archivos se descargarán en un archivo ZIP comprimido.</p>
                            </div>
                        </div>

                        <div className="action-section">
                            <button
                                className={`split-btn ${isProcessing ? 'processing' : ''}`}
                                onClick={handleSplit}
                                disabled={isProcessing}
                            >
                                {isProcessing ? (
                                    <>
                                        <div className="spinner"></div>
                                        Separando PDF...
                                    </>
                                ) : (
                                    '✂️ Separar PDF'
                                )}
                            </button>
                        </div>

                        {downloadInfo && (
                            <div className={`result-section ${downloadInfo.error ? 'error' : 'success'}`}>
                                {downloadInfo.error ? (
                                    <div className="result-error">
                                        <div className="result-icon">❌</div>
                                        <div className="result-content">
                                            <h3>Error al dividir PDF</h3>
                                            <p>{downloadInfo.message}</p>
                                            <button className="retry-button" onClick={handleSplit}>
                                                🔄 Intentar Nuevamente
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="result-success">
                                        <div className="result-icon">✅</div>
                                        <div className="result-content">
                                            <h3>¡PDF Dividido Exitosamente!</h3>
                                            <p>El archivo se ha dividido según el método seleccionado</p>
                                            <div className="download-actions">
                                                <button className="download-button" onClick={handleDownload}>
                                                    📥 Descargar ZIP
                                                </button>
                                                <button className="new-file-button" onClick={() => window.location.reload()}>
                                                    🆕 Dividir Otro PDF
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Split;