import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './styles/Header.css';

const Header = ({ darkMode, toggleTheme }) => {
    const location = useLocation();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isHidden, setIsHidden] = useState(false);
    const [lastScrollY, setLastScrollY] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            if (currentScrollY > 100) {
                setIsScrolled(true);
                // Ocultar header al hacer scroll hacia abajo, mostrar al subir
                if (currentScrollY > lastScrollY && currentScrollY > 100) {
                    setIsHidden(true);
                } else {
                    setIsHidden(false);
                }
            } else {
                setIsScrolled(false);
                setIsHidden(false);
            }

            setLastScrollY(currentScrollY);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [lastScrollY]);

    return (
        <header className={`header ${isScrolled ? 'scrolled' : ''} ${isHidden ? 'hidden' : ''}`}>
            <div className="header-content">
                <Link to="/" className="logo">
                    <span className="logo-icon">📄</span>
                    AL-PDF
                </Link>

                <nav className="nav">
                    <Link to="/compress" className={location.pathname === '/compress' ? 'nav-link active' : 'nav-link'}>
                        Comprimir
                    </Link>
                    <Link to="/merge" className={location.pathname === '/merge' ? 'nav-link active' : 'nav-link'}>
                        Unir
                    </Link>
                    <Link to="/split" className={location.pathname === '/split' ? 'nav-link active' : 'nav-link'}>
                        Separar
                    </Link>
                    <Link to="/convert" className={location.pathname === '/convert' ? 'nav-link active' : 'nav-link'}>
                        Convertir
                    </Link>
                </nav>

                <button className="theme-toggle" onClick={toggleTheme} aria-label="Cambiar tema">
                    {darkMode ? '☀️' : '🌙'}
                </button>
            </div>
        </header>
    );
};

export default Header;