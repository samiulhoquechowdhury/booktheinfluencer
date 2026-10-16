import { ImageResponse } from 'next/og';
import { BRAND } from '@/lib/brand';

export const alt = `${BRAND.name} — Book the talent. We handle the rest.`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, background: '#0a0a0b', color: '#f4f4f6', backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(124,58,237,0.55), transparent 50%), radial-gradient(circle at 85% 70%, rgba(217,70,239,0.4), transparent 45%)' }}>
        <div style={{ display: 'flex', fontSize: 32, fontWeight: 900, letterSpacing: -1 }}>{BRAND.wordmark}</div>
        <div style={{ display: 'flex', flexDirection: 'column', fontSize: 112, fontWeight: 900, lineHeight: 0.9, letterSpacing: -5 }}>
          <span>BOOK THE TALENT.</span>
          <span style={{ color: '#d946ef' }}>WE HANDLE THE REST.</span>
        </div>
        <div style={{ display: 'flex', fontSize: 28, color: '#a1a1ac' }}>Actors, singers, DJs, comedians & creators from Assam and across India</div>
      </div>
    ),
    size,
  );
}
