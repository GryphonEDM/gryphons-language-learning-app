import React from 'react';

export default function CompletionScreen({ stats, onRetry, onExit, exitLabel = 'Back to Menu' }) {
  const { score = 0, total = 0, xpEarned = 0, accuracy = 0, title = 'Session Complete!' } = stats;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.icon}>🎉</div>
        <h2 style={styles.title}>{title}</h2>

        <div style={styles.statsGrid}>
          <div style={styles.statBox}>
            <div style={styles.statValue}>{score}/{total}</div>
            <div style={styles.statLabel}>Score</div>
          </div>
          <div style={styles.statBox}>
            <div style={{...styles.statValue, color: '#4ade80'}}>+{xpEarned}</div>
            <div style={styles.statLabel}>XP Earned</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statValue}>{accuracy}%</div>
            <div style={styles.statLabel}>Accuracy</div>
          </div>
        </div>

        <div style={styles.actions}>
          <button style={styles.retryButton} onClick={onRetry}>
            Try Again
          </button>
          <button style={styles.exitButton} onClick={onExit}>
            {exitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '60vh'
  },
  card: {
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '20px',
    padding: '3rem',
    textAlign: 'center',
    border: '2px solid rgba(255,215,0,0.3)',
    maxWidth: '500px',
    width: '100%'
  },
  icon: {
    fontSize: '4rem',
    marginBottom: '1rem'
  },
  title: {
    color: '#ffd700',
    fontSize: '1.8rem',
    marginBottom: '2rem'
  },
  statsGrid: {
    display: 'flex',
    justifyContent: 'center',
    gap: '2rem',
    marginBottom: '2rem',
    flexWrap: 'wrap'
  },
  statBox: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    padding: '1rem 1.5rem',
    minWidth: '100px'
  },
  statValue: {
    fontSize: '2rem',
    fontWeight: '800',
    color: '#ffd700',
    marginBottom: '0.25rem'
  },
  statLabel: {
    fontSize: '0.85rem',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase'
  },
  actions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  retryButton: {
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    border: 'none',
    color: '#fff',
    padding: '1rem 2rem',
    borderRadius: '12px',
    fontSize: '1.1rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.2s'
  },
  exitButton: {
    background: 'rgba(255,255,255,0.1)',
    border: '2px solid rgba(255,255,255,0.3)',
    color: '#fff',
    padding: '1rem 2rem',
    borderRadius: '12px',
    fontSize: '1.1rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.2s'
  }
};
