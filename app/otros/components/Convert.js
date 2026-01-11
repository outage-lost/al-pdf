// src/components/Convert.js

import React, { useState } from "react";
import { PDFConverter } from "../services/pdfService";
import { saveAs } from "file-saver";
import "./styles/Convert.css";

const Convert = () => {
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [downloadInfo, setDownloadInfo] = useState(null);

    const supportedFormats = [
        { type: ".txt", label: "Texto", icon: "📝" },
        { type: ".jpg", label: "JPEG", icon: "🖼️" },
        { type: ".jpeg", label: "JPEG", icon: "🖼️" },
        { type: ".png", label: "PNG", icon: "🖼️" },
        { type: ".bmp", label: "BMP", icon: "🖼️" },
        { type: ".tiff", label: "TIFF", icon: "🖼️" },
        { type: ".tif", label: "TIFF", icon: "🖼️" },
        { type: ".doc", label: "Word", icon: "📄" },
        { type: ".docx", label: "Word", icon: "📄" },
        { type: ".xls", label: "Excel", icon: "📊" },
        { type: ".xlsx", label: "Excel", icon: "📊" },
        { type: ".ppt", label: "PowerPoint", icon: "📽️" },
        { type: ".pptx", label: "PowerPoint", icon: "📽️" },
    ];

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            setSelectedFiles(files);
            setDownloadInfo(null);
        } else {
            setSelectedFiles([]);
        }
    };

    const handleConvert = async () => {
        if (!selectedFiles || selectedFiles.length === 0) {
            alert("Selecciona al menos un archivo primero");
            return;
        }

        setIsProcessing(true);
        setDownloadInfo(null);

        try {
            const resultBlob = await PDFConverter.convertToPDF(selectedFiles);

            const isSingle = selectedFiles.length === 1;
            let fileName;

            if (isSingle) {
                const baseName = selectedFiles[0].name.replace(/\.[^/.]+$/, "");
                fileName = `convertido_${baseName}.pdf`;
            } else {
                fileName = `convertidos_${new Date()
                    .toISOString()
                    .replace(/[:.]/g, "-")}.zip`;
            }

            saveAs(resultBlob, fileName);

            setDownloadInfo({
                fileName,
                count: selectedFiles.length,
                isZip: !isSingle,
                originalTypes: selectedFiles.map((f) =>
                    f.name.split(".").pop().toUpperCase(),
                ),
            });
        } catch (error) {
            setDownloadInfo({
                error: true,
                message: error.message,
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const getAcceptedTypes = () =>
        supportedFormats.map((f) => f.type).join(", ");

    return (
        <div className="convert-container">
            <div className="convert-card">
                <h2>Transforma archivos a formato PDF</h2>
                <p className="convert-description">
                    Sube uno o varios archivos y obtén sus versiones en PDF.
                    Imágenes, texto y documentos de Office son compatibles.
                </p>

                <div className="convert-upload-section">
                    <label htmlFor="file-input" className="convert-upload-label">
                        <span>Seleccionar archivo(s)</span>
                        <small>Puedes elegir múltiples archivos a la vez</small>
                    </label>
                    <input
                        id="file-input"
                        type="file"
                        multiple
                        accept={getAcceptedTypes()}
                        onChange={handleFileChange}
                    />

                    {selectedFiles.length > 0 && (
                        <div className="convert-file-list">
                            <p>
                                Archivos seleccionados: <strong>{selectedFiles.length}</strong>
                            </p>
                            <ul>
                                {selectedFiles.map((file) => (
                                    <li key={file.name}>
                                        {file.name}{" "}
                                        <span className="file-size">
                                            ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <button
                    className="convert-button"
                    onClick={handleConvert}
                    disabled={isProcessing || selectedFiles.length === 0}
                >
                    {isProcessing ? "Convirtiendo..." : "Convertir a PDF"}
                </button>

                {downloadInfo && (
                    <div
                        className={`convert-result ${downloadInfo.error ? "error" : "success"
                            }`}
                    >
                        {downloadInfo.error ? (
                            <p>{downloadInfo.message}</p>
                        ) : (
                            <>
                                <p>
                                    {downloadInfo.isZip
                                        ? `Se convirtieron ${downloadInfo.count} archivos.`
                                        : "Archivo convertido a PDF."}
                                </p>
                                <p className="convert-filename">
                                    Archivo descargado: <strong>{downloadInfo.fileName}</strong>
                                </p>
                            </>
                        )}
                    </div>
                )}

                <div className="convert-supported">
                    <h3>Formatos soportados</h3>
                    <ul>
                        {supportedFormats.map((fmt) => (
                            <li key={fmt.type}>
                                <span className="icon">{fmt.icon}</span>
                                <span className="label">
                                    {fmt.label} ({fmt.type})
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default Convert;
