import { Font } from '@react-pdf/renderer';
import path from 'path';

const fontsDir = path.join(process.cwd(), 'public', 'fonts');

Font.register({
  family: 'NanumGothic',
  fonts: [
    {
      src: path.join(fontsDir, 'NanumGothic-Regular.ttf'),
      fontWeight: 400,
    },
    {
      src: path.join(fontsDir, 'NanumGothic-Bold.ttf'),
      fontWeight: 700,
    },
  ],
});

export const PDF_FONT_FAMILY = 'NanumGothic';
