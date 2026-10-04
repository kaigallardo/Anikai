// src/components/layout/footer/Footer.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import logo from '@/assets/images/Anikai_Logo.png';
import './Footer.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    { 
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
        </svg>
      ), 
      href: 'https://instagram.com/kaiglyph', 
      label: 'Instagram' 
    },
    { 
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0-5 5"></path>
        </svg>
      ), 
      href: 'https://tiktok.com/@kaiglyph', 
      label: 'TikTok' 
    },
    { 
      icon: 'X', 
      href: 'https://twitter.com/kaiglyph', 
      label: 'Twitter',
      isText: true 
    },
  ];

  const exploreLinks = [
    { text: 'Home', href: '/' },
    { text: 'Catálogo', href: '/catalogo' },
    { text: 'Recomendaciones', href: '/recomendaciones' },
    { text: 'Mis Listas', href: '/listas' },
    { text: 'Favoritos', href: '/favoritos' },
    { text: 'Calendario', href: '/calendario' },
  ];

  const legalLinks = [
    { text: 'Términos y Condiciones', href: '/terminos' },
    { text: 'Política de Privacidad', href: '/privacidad' },
    { text: 'Aviso Legal', href: '/aviso-legal' },
  ];

  return (
    <footer className="footer">
      {/* Contenido principal en 3 columnas */}
      <div className="footer__container">
        
        {/* IZQUIERDA: Marca + Descripción + Redes */}
        <div className="footer__brand">
          {/* Logo + Nombre */}
          <div className="footer__logo">
            <img src={logo} alt="Anikai Logo" className="footer__logo-img" />
            <span className="footer__logo-text">ANIKAI</span>
          </div>

          {/* Tagline */}
          <p className="footer__description">
            Tu portal de recomendaciones anime. Descubre, organiza y comparte tus series favoritas.
          </p>

          {/* Redes Sociales */}
          <div className="footer__social">
            {socialLinks.map(({ icon, href, label, isText }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="footer__social-link"
                aria-label={label}
              >
                {isText ? (
                  <span className="footer__social-text">{icon}</span>
                ) : (
                  icon
                )}
              </a>
            ))}
          </div>
        </div>

        {/* CENTRO: Explorar */}
        <div className="footer__section">
          <h4 className="footer__section-title">Explorar</h4>
          <div className="footer__links-grid">
            {exploreLinks.map(({ text, href }) => (
              <Link
                key={text}
                to={href}
                className="footer__link"
              >
                ‣ {text}
              </Link>
            ))}
          </div>
        </div>

        {/* DERECHA: Legal + Contacto */}
        <div className="footer__legal-contact">
          {/* Legal */}
          <div className="footer__legal">
            <h4 className="footer__section-title">Legal</h4>
            <div className="footer__legal-links">
              {legalLinks.map(({ text, href }) => (
                <Link
                  key={text}
                  to={href}
                  className="footer__link"
                >
                  {text}
                </Link>
              ))}
            </div>
          </div>

          {/* Contacto */}
          <div className="footer__contact">
            <h4 className="footer__section-title">Contacto</h4>
            <p className="footer__contact-text">
              ¿Tienes dudas o sugerencias?
              <br />
              <a href="mailto:kaigallardosanchez@gmail.com" className="footer__email">
                kaigallardosanchez@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* ABAJO: Copyright + Creador */}
      <div className="footer__bottom">
        <p className="footer__copyright">
          © {currentYear} Anikai. Todos los derechos reservados.
        </p>
        <p className="footer__creator">
          Diseñado y trabajado por{' '}
          <a
            href="https://github.com/kaigallardo"
            target="_blank"
            rel="noopener noreferrer"
            className="footer__creator-link kaiziel"
          >
            KaiGlyph
          </a>
        </p>
      </div>
    </footer>
  );
}