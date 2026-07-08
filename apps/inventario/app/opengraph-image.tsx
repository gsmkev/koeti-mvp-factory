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
        backgroundColor: '#221711',
        color: '#faf7f5',
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
          backgroundColor: '#cc4b14',
          color: '#faf7f5',
          fontSize: 56,
          fontWeight: 700,
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width={54}
          height={54}
          fill="none"
          stroke="#faf7f5"
          strokeWidth={2.25}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3.5 9 12 4.5 20.5 9 12 13.5 3.5 9Z" />
          <path d="M3.5 9v7l8.5 4.5M20.5 9v7L12 20.5v-7" />
          <path d="M9 12.5 11 14.5 15.5 9.5" />
        </svg>
      </div>
      <div style={{ marginTop: 48, fontSize: 84, fontWeight: 700 }}>{APP_NAME}</div>
      <div style={{ marginTop: 24, fontSize: 36, color: '#b0a196', maxWidth: 900 }}>
        {APP_TAGLINE}
      </div>
    </div>,
    size,
  );
}
