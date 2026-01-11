// Merge.js - Con cuadrícula y drag & drop fluido
import React, { useState } from 'react';
import { PDFMerger } from '../services/pdfService';
import { saveAs } from 'file-saver';
import './styles/Merge.css';

const Merge = () => {
    const [files, setFiles] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [downloadInfo, setDownloadInfo] = useState(null);
    const [draggedItem, setDraggedItem] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dropTarget, setDropTarget] = useState(null);

    const handleFileUpload = (e) => {
        const newFiles = Array.from(e.target.files).filter(file =>
            file.type === 'application/pdf'
        );

        const filesWithPreview = newFiles.map(file => ({
            id: Date.now() + Math.random(),
            file,
            name: file.name.length > 20 ? file.name.substring(0, 20) + '...' : file.name,
            fullName: file.name,
            size: (file.size / (1024 * 1024)).toFixed(1),
        }));

        setFiles(prev => [...prev, ...filesWithPreview]);
        setDownloadInfo(null);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFiles = Array.from(e.dataTransfer.files).filter(file =>
            file.type === 'application/pdf'
        );

        const filesWithPreview = droppedFiles.map(file => ({
            id: Date.now() + Math.random(),
            file,
            name: file.name.length > 20 ? file.name.substring(0, 20) + '...' : file.name,
            fullName: file.name,
            size: (file.size / (1024 * 1024)).toFixed(1),
        }));

        setFiles(prev => [...prev, ...filesWithPreview]);
        setDownloadInfo(null);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    // Drag & Drop para reordenar
    const handleDragStart = (e, index) => {
        setDraggedItem(index);
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => {
            e.target.classList.add('dragging');
        }, 0);
    };

    const handleDragEnd = (e) => {
        e.target.classList.remove('dragging');
        setDraggedItem(null);
        setDropTarget(null);
    };

    const handleDragOverItem = (e, index) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    // Mejorar handleDropItem
    const handleDropItem = (e, targetIndex) => {
        e.preventDefault();
        if (draggedItem === null || draggedItem === targetIndex) return;

        const newFiles = [...files];
        const [movedItem] = newFiles.splice(draggedItem, 1);
        newFiles.splice(targetIndex, 0, movedItem);

        setFiles(newFiles);
        setDraggedItem(null);
        setDropTarget(null);
    };

    // Agregar para mejor feedback visual
    const handleDragEnter = (e, index) => {
        e.preventDefault();
        setDropTarget(index);
    };

    const handleDragLeaveItem = (e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
            setDropTarget(null);
        }
    };

    const removeFile = (id) => {
        setFiles(files.filter(file => file.id !== id));
        setDownloadInfo(null);
    };

    const handleMerge = async () => {
        if (files.length < 2) {
            alert('Necesitas al menos 2 archivos PDF para unir');
            return;
        }

        setIsProcessing(true);
        setDownloadInfo(null);

        try {
            const mergedBlob = await PDFMerger.mergePDFs(files);
            const url = URL.createObjectURL(mergedBlob);
            const fileName = `pdf_unido_${Date.now()}.pdf`;

            setDownloadInfo({
                url,
                fileName,
                fileCount: files.length
            });

            saveAs(mergedBlob, fileName);

        } catch (error) {
            setDownloadInfo({
                error: true,
                message: error.message
            });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="merge">
            <div className="merge-header">
                <h1>Unir PDFs</h1>
                <p>Combina múltiples archivos PDF - Arrastra para ordenar</p>
            </div>

            <div className="merge-content">
                <div
                    className="upload-section"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                >
                    <input
                        type="file"
                        id="merge-upload"
                        accept=".pdf"
                        multiple
                        onChange={handleFileUpload}
                        className="file-input"
                    />
                    <label
                        htmlFor="merge-upload"
                        className={`upload-area ${isDragging ? 'drag-over' : ''}`}
                    >
                        <div className="upload-icon">📚</div>
                        <h3>Selecciona o arrastra archivos PDF aquí</h3>
                        <p>Los archivos se mostrarán como tarjetas que puedes ordenar</p>
                        <span className="file-count">
                            {files.length} archivo(s) seleccionado(s)
                        </span>
                    </label>
                </div>

                {files.length > 0 && (
                    <div className="files-section">
                        <div className="section-header">
                            <h3>Orden de unión (arrastra las tarjetas para reordenar)</h3>
                            <button
                                className="clear-all-btn"
                                onClick={() => setFiles([])}
                            >
                                🗑️ Limpiar Todo
                            </button>
                        </div>

                        <div className="files-grid">
                            {files.map((file, index) => (
                                <div
                                    key={file.id}
                                    className={`file-card ${draggedItem === index ? 'dragging' : ''} ${dropTarget === index ? 'drop-target' : ''}`}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, index)}
                                    onDragOver={(e) => handleDragOverItem(e, index)}
                                    onDragEnter={(e) => handleDragEnter(e, index)}
                                    onDragLeave={handleDragLeaveItem}
                                    onDrop={(e) => handleDropItem(e, index)}
                                    onDragEnd={handleDragEnd}
                                >
                                    <div className="drop-indicator"></div>
                                    <div className="position-indicator">{index + 1}</div>
                                    <div className="file-preview">
                                        <div className="preview-icon">📄</div>
                                        <div className="file-info">
                                            <span className="file-name" title={file.fullName}>
                                                {file.name}
                                            </span>
                                            <span className="file-size">{file.size} MB</span>
                                        </div>
                                    </div>
                                    <button
                                        className="remove-btn"
                                        onClick={() => removeFile(file.id)}
                                        title="Eliminar archivo"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="action-section">
                            <button
                                className={`merge-btn ${isProcessing ? 'processing' : ''}`}
                                onClick={handleMerge}
                                disabled={isProcessing || files.length < 2}
                            >
                                {isProcessing ? (
                                    <>
                                        <div className="spinner"></div>
                                        Uniendo PDFs...
                                    </>
                                ) : (
                                    `🔗 Unir ${files.length} PDF${files.length > 1 ? 's' : ''}`
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {downloadInfo && (
                    <div className={`result-section ${downloadInfo.error ? 'error' : 'success'}`}>
                        {downloadInfo.error ? (
                            <div className="result-content">
                                <h3>Error al unir PDFs</h3>
                                <p>{downloadInfo.message}</p>
                                <button className="btn" onClick={handleMerge}>
                                    Intentar nuevamente
                                </button>
                            </div>
                        ) : (
                            <div className="result-content">
                                <h3>¡PDFs unidos exitosamente!</h3>
                                <button
                                    className="btn btn-success"
                                    onClick={() => saveAs(downloadInfo.url, downloadInfo.fileName)}
                                >
                                    Descargar PDF unido
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Merge;