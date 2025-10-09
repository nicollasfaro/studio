

import type {NextConfig} from 'next';
import { firebaseConfig } from './src/firebase/config';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
  env: {
    FIREBASE_STORAGE_BUCKET: firebaseConfig.storageBucket,
    NEXT_PUBLIC_FIREBASE_VAPID_KEY: 'BOPcXlQ-P5TkYHI90ObGct81ZaedtO1BvfNdprMawjAqHryYIsD_6-NgxbHreR2xp4L9qrZAeMppvVOfcMcfQkA',
    NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY: 'YOUR_GOOGLE_MAPS_API_KEY', // Substitua pela sua chave de API
  }
};

export default nextConfig;
