import { ImageResponse } from 'next/og';
import { APP_THEME_COLOR } from '../constants/ecotrack';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: APP_THEME_COLOR,
          color: '#ffffff',
          fontSize: 96,
          fontWeight: 900,
        }}
      >
        E
      </div>
    ),
    size
  );
}
