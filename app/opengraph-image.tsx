import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'React Studio — 영상 프로덕션';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Orange accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: '#FF4D00',
          }}
        />

        {/* Logo text */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 900,
            color: '#ffffff',
            letterSpacing: '-2px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <span style={{ color: '#FF4D00' }}>R</span>
          <span>eact Studio</span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: 'rgba(255,255,255,0.7)',
            marginBottom: 40,
          }}
        >
          영상 프로덕션
        </div>

        {/* Service tags */}
        <div
          style={{
            display: 'flex',
            gap: 16,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {['뮤직비디오', '댄스비디오', '퍼포먼스', '라이브 클립', '웹예능'].map(
            (tag) => (
              <div
                key={tag}
                style={{
                  padding: '10px 24px',
                  borderRadius: 999,
                  border: '1px solid rgba(255,77,0,0.4)',
                  background: 'rgba(255,77,0,0.1)',
                  color: '#FF4D00',
                  fontSize: 20,
                  fontWeight: 600,
                }}
              >
                {tag}
              </div>
            )
          )}
        </div>

        {/* Bottom tagline */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            fontSize: 18,
            color: 'rgba(255,255,255,0.4)',
          }}
        >
          예산에 맞춘 유연한 제작 · 기획부터 납품까지 원스톱
        </div>
      </div>
    ),
    { ...size }
  );
}
