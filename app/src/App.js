// App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Compress from './components/Compress';
import Merge from './components/Merge';
import Split from './components/Split';
import Convert from './components/Convert';
import Header from './components/Header';
import { checkServerHealth } from './services/healthCheck';
import './App.css';

function App() {
    const [darkMode, setDarkMode] = useState(true);
    const [serverOnline, setServerOnline] = useState(true);
    const [showSplash, setShowSplash] = useState(true);

    useEffect(() => {
        document.body.className = darkMode ? 'dark-theme' : 'light-theme';

        const timer = setTimeout(() => {
            setShowSplash(false);
        }, 2000);

        checkServerHealth().then(online => {
            setServerOnline(online);
        });

        const interval = setInterval(() => {
            checkServerHealth().then(online => {
                setServerOnline(online);
            });
        }, 30000);

        return () => {
            clearTimeout(timer);
            clearInterval(interval);
        };
    }, [darkMode]);

    const toggleTheme = () => setDarkMode(!darkMode);

    if (showSplash) {
        return (
            <div className="splash-screen">
                <div className="splash-content">
                    <div className="splash-logo">📄</div>
                    <h1 className="splash-title">PDF Tools</h1>
                </div>
            </div>
        );
    }

    return (
        <BrowserRouter basename="/al-pdf">
            <div className="App">
                <Header darkMode={darkMode} toggleTheme={toggleTheme} />
                {!serverOnline && (
                    <div className="server-warning">
                        ⚠️ El servidor de PDF no está disponible
                    </div>
                )}
                <main className="main-content">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/compress" element={<Compress />} />
                        <Route path="/merge" element={<Merge />} />
                        <Route path="/split" element={<Split />} />
                        <Route path="/convert" element={<Convert />} />
                    </Routes>
                </main>
            </div>
        </BrowserRouter>
    );
}

export default App;
