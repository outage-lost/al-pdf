// Dashboard.js - Sin Estadísticas
import React from 'react';
import { Link } from 'react-router-dom';
import './styles/Dashboard.css';

const Dashboard = () => {
    const features = [
        {
            id: 1,
            title: 'Comprimir PDF',
            description: 'Reduce el tamaño de tus archivos PDF manteniendo la calidad',
            icon: '📦',
            path: '/compress'
        },
        {
            id: 2,
            title: 'Unir PDFs',
            description: 'Combina múltiples archivos PDF en uno solo',
            icon: '🔗',
            path: '/merge'
        },
        {
            id: 3,
            title: 'Separar PDF',
            description: 'Divide un PDF en varios archivos según tus necesidades',
            icon: '✂️',
            path: '/split'
        },
        {
            id: 4,
            title: 'Convertir a PDF',
            description: 'Transforma archivos de texto, Excel, PowerPoint a PDF',
            icon: '🔄',
            path: '/convert'
        }
    ];

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1>PDF Tools</h1>
                <p>Herramientas simples para manipular archivos PDF</p>
            </div>

            <div className="features-grid">
                {features.map(feature => (
                    <Link to={feature.path} key={feature.id} className="feature-card">
                        <div className="feature-icon">
                            {feature.icon}
                        </div>
                        <h3>{feature.title}</h3>
                        <p>{feature.description}</p>
                        <div className="feature-action">
                            <span>Usar herramienta</span>
                            <span>→</span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default Dashboard;