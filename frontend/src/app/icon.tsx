import { ImageResponse } from 'next/og';
import { APP_THEME_COLOR } from '../constants/ecotrack';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, ${APP_THEME_COLOR}, #0f172a)`,
          color: '#ffffff',
          fontSize: 248,
          fontWeight: 900,
          letterSpacing: '-0.05em',
        }}
      >
        E
      </div>
    ),
    size
  );
}
