'use client';

/** Last-resort boundary (root layout failed) — no providers, inline tokens only. */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en-IN">
      <body style={{ margin: 0, minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#0a0a0b', color: '#f4f4f6', fontFamily: 'system-ui, sans-serif', textAlign: 'center', padding: 16 }}>
        <div>
          <p style={{ fontSize: 'clamp(3rem, 12vw, 8rem)', fontWeight: 900, letterSpacing: '-0.05em', margin: 0 }}>Intermission.</p>
          <p style={{ color: '#a1a1ac', marginTop: 16 }}>We hit an unexpected problem loading the site.</p>
          <button onClick={reset} style={{ marginTop: 24, height: 48, padding: '0 28px', borderRadius: 999, border: 0, background: 'linear-gradient(110deg,#7c3aed,#c026d3)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
