// src/services/healthCheck.js
const API_BASE = process.env.REACT_APP_API_BASE || '';

export async function checkServerHealth() {
    try {
        // Timeout de 5 segundos
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(`${API_BASE}/health`, {
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        return res.ok;
    } catch (error) {
        console.error('Health check failed:', error);
        return false;
    }
}

export const showServerError = () => {
    alert(`⚠️ El servidor PDF no está disponible.
Por favor, verifica que el servicio esté ejecutándose.`);
};