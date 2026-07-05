// Dynamically generated Open Graph image.
import { ImageResponse } from 'next/og';
import { APP_NAME, APP_TAGLINE } from '@/lib/site';

export const alt = APP_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Social-share card, rendered at request time — no design assets to maintain.
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '96px',
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 88,
          height: 88,
          borderRadius: 20,
          backgroundColor: '#f8fafc',
          color: '#0f172a',
          fontSize: 56,
          fontWeight: 700,
        }}
      >
        {APP_NAME[0]}
      </div>
      <div style={{ marginTop: 48, fontSize: 84, fontWeight: 700 }}>{APP_NAME}</div>
      <div style={{ marginTop: 24, fontSize: 36, color: '#94a3b8', maxWidth: 900 }}>
        {APP_TAGLINE}
      </div>
    </div>,
    size,
  );
}
