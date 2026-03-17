import React from 'react';
import { ACHIEVEMENTS } from '../data/achievements.js';

const MODE_INFO = {
  flashcards: { name: 'Flashcards', icon: '🗂️' },
  listening: { name: 'Listening', icon: '👂' },
  translation: { name: 'Translation', icon: '🔄' },
  grammar: { name: 'Grammar', icon: '📐' },
  sentences: { name: 'Sentences', icon: '🧱' },
  dialogue: { name: 'Dialogue', icon: '💬' },
  reading: { name: 'Stories', icon: '📚' },
  speech: { name: 'Speech', icon: '🎙️' },
};

function formatDate(iso) {
  if (!iso) return 'Never';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

export default function StatsPage({
  xp, level, totalLettersTyped, totalWordsCompleted, bestStreak,
  perfectWordsCount, achievements, modeProgress, vocabularyMastery,
  langData, onClose
}) {
  const nameField = langData.code === 'ru' ? 'nameRu' : 'nameUk';

  // Vocabulary stats
  const vocabEntries = Object.values(vocabularyMastery || {});
  const wordsStudied = vocabEntries.length;
  const wordsMastered = vocabEntries.filter(v => v.masteryLevel >= 1).length;
  const totalCorrect = vocabEntries.reduce((sum, v) => sum + (v.timesCorrect || 0), 0);
  const totalWrong = vocabEntries.reduce((sum, v) => sum + (v.timesWrong || 0), 0);
  const totalAttempts = totalCorrect + totalWrong;
  const vocabAccuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

  // Mode activity
  const activeModes = Object.entries(modeProgress || {})
    .filter(([, data]) => data && data.lastStudied)
    .sort((a, b) => new Date(b[1].lastStudied) - new Date(a[1].lastStudied));

  // Achievement stats
  const earnedSet = new Set(achievements || []);
  const earnedCount = earnedSet.size;
  const totalAchievements = ACHIEVEMENTS.length;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backButton} onClick={onClose}>
          &larr; Back to Menu
        </button>
        <h1 style={styles.title}>Your Stats</h1>
        <div style={styles.spacer} />
      </div>

      <div style={styles.content}>
        {/* Overview */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Overview</h2>
          <div style={styles.statsGrid}>
            <StatCard icon="⭐" value={`Lvl ${level}`} label="Level" />
            <StatCard icon="✨" value={xp.toLocaleString()} label="Total XP" />
            <StatCard icon="🏆" value={bestStreak} label="Best Streak" />
            <StatCard icon="🎯" value={earnedCount + '/' + totalAchievements} label="Achievements" />
          </div>
        </section>

        {/* Typing Stats */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Typing</h2>
          <div style={styles.statsGrid}>
            <StatCard icon="⌨️" value={totalLettersTyped.toLocaleString()} label="Letters Typed" />
            <StatCard icon="📝" value={totalWordsCompleted.toLocaleString()} label="Words Completed" />
            <StatCard icon="💎" value={perfectWordsCount.toLocaleString()} label="Perfect Words" />
            <StatCard
              icon="🎯"
              value={totalWordsCompleted > 0 ? Math.round((perfectWordsCount / totalWordsCompleted) * 100) + '%' : '0%'}
              label="Perfect Rate"
            />
          </div>
        </section>

        {/* Vocabulary */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Vocabulary</h2>
          <div style={styles.statsGrid}>
            <StatCard icon="📖" value={wordsStudied} label="Words Studied" />
            <StatCard icon="✅" value={wordsMastered} label="Words Mastered" />
            <StatCard icon="🎯" value={vocabAccuracy + '%'} label="Accuracy" />
            <StatCard icon="💪" value={totalAttempts.toLocaleString()} label="Total Attempts" />
          </div>
        </section>

        {/* Mode Activity */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Mode Activity</h2>
          {activeModes.length === 0 ? (
            <p style={styles.emptyText}>No activity yet. Try out some learning modes!</p>
          ) : (
            <div style={styles.modeList}>
              {activeModes.map(([mode, data]) => {
                const info = MODE_INFO[mode] || { name: mode, icon: '📋' };
                return (
                  <div key={mode} style={styles.modeRow}>
                    <span style={styles.modeIcon}>{info.icon}</span>
                    <span style={styles.modeName}>{info.name}</span>
                    <span style={styles.modeDate}>{formatDate(data.lastStudied)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Achievements */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Achievements ({earnedCount}/{totalAchievements})</h2>
          <div style={styles.achievementGrid}>
            {ACHIEVEMENTS.map(ach => {
              const earned = earnedSet.has(ach.id);
              return (
                <div
                  key={ach.id}
                  style={{
                    ...styles.achievementCard,
                    opacity: earned ? 1 : 0.35,
                    background: earned ? 'rgba(250, 204, 21, 0.1)' : 'rgba(255,255,255,0.03)',
                    borderColor: earned ? 'rgba(250, 204, 21, 0.3)' : 'rgba(255,255,255,0.06)',
                  }}
                  title={ach.desc}
                >
                  <div style={styles.achievementIcon}>{ach.icon}</div>
                  <div style={styles.achievementName}>{ach[nameField] || ach.name}</div>
                  <div style={styles.achievementDesc}>{ach.desc}</div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ icon, value, label }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statIcon}>{icon}</div>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100%',
    padding: '0 1rem 2rem',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 0',
    marginBottom: '0.5rem',
  },
  backButton: {
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    color: '#e2e8f0',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.95rem',
  },
  title: {
    color: '#facc15',
    fontSize: '1.5rem',
    margin: 0,
    fontWeight: 700,
  },
  spacer: { width: '100px' },
  content: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  section: {
    marginBottom: '2rem',
  },
  sectionTitle: {
    color: '#94a3b8',
    fontSize: '0.85rem',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: '0.75rem',
    fontWeight: 600,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '0.75rem',
  },
  statCard: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    padding: '1.25rem 1rem',
    textAlign: 'center',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  statIcon: {
    fontSize: '1.5rem',
    marginBottom: '0.4rem',
  },
  statValue: {
    color: '#facc15',
    fontSize: '1.5rem',
    fontWeight: 700,
    marginBottom: '0.2rem',
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  emptyText: {
    color: '#64748b',
    fontStyle: 'italic',
    padding: '1rem',
  },
  modeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  modeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '10px',
    padding: '0.75rem 1rem',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  modeIcon: {
    fontSize: '1.3rem',
  },
  modeName: {
    color: '#e2e8f0',
    fontWeight: 600,
    flex: 1,
  },
  modeDate: {
    color: '#94a3b8',
    fontSize: '0.85rem',
  },
  achievementGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '0.6rem',
  },
  achievementCard: {
    borderRadius: '10px',
    padding: '0.75rem',
    textAlign: 'center',
    border: '1px solid',
    transition: 'opacity 0.2s',
  },
  achievementIcon: {
    fontSize: '1.5rem',
    marginBottom: '0.3rem',
  },
  achievementName: {
    color: '#e2e8f0',
    fontSize: '0.8rem',
    fontWeight: 600,
    marginBottom: '0.2rem',
    lineHeight: 1.2,
  },
  achievementDesc: {
    color: '#94a3b8',
    fontSize: '0.65rem',
    lineHeight: 1.3,
  },
};
