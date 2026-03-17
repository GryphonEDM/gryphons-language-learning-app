import React from 'react';

export default function ModeHeader({ title, subtitle, icon, onExit }) {
  return (
    <div style={styles.header}>
      <button style={styles.backButton} onClick={onExit}>
        ← Back
      </button>
      <div style={styles.headerInfo}>
        <h2 style={styles.title}>
          {icon} {title}
        </h2>
        {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
      </div>
    </div>
  );
}

const styles = {
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '0.75rem'
  },
  backButton: {
    background: 'rgba(255,255,255,0.1)',
    border: '2px solid rgba(255,255,255,0.3)',
    color: '#fff',
    padding: '0.75rem 1.5rem',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontFamily: 'inherit',
    transition: 'all 0.2s'
  },
  headerInfo: {
    flex: 1
  },
  title: {
    margin: 0,
    fontSize: '1.8rem',
    color: '#ffd700'
  },
  subtitle: {
    margin: '0.25rem 0 0 0',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.9rem'
  }
};
