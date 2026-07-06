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
          background: '#050505',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          fontFamily: 'sans-serif',
          padding: 72,
          color: '#ffffff',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: 8,
            background: '#FF4D00',
          }}
        />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 26,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 18,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                background: '#FF4D00',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 10,
                color: '#ffffff',
                fontSize: 40,
                fontWeight: 900,
              }}
            >
              R
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: 40, fontWeight: 900 }}>REACT Studio</div>
              <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.52)' }}>
                Film Production & Staff Pool
              </div>
            </div>
          </div>

          <div style={{ fontSize: 76, fontWeight: 900, lineHeight: 1.08, maxWidth: 920 }}>
            기획, 촬영, 편집, 모션그래픽까지 이어지는 제작 네트워크.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 14,
            flexWrap: 'wrap',
          }}
        >
          {['공연 영상', '예능 촬영', '짐벌·지미집', 'OAP·CG', 'AI 영상', '실시간 송출'].map((tag) => (
            <div
              key={tag}
              style={{
                padding: '11px 20px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.14)',
                background: tag === 'AI 영상' ? 'rgba(0, 209, 255, 0.16)' : 'rgba(255,255,255,0.06)',
                color: tag === 'AI 영상' ? '#9EEBFF' : 'rgba(255,255,255,0.78)',
                fontSize: 22,
                fontWeight: 700,
              }}
            >
              {tag}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
