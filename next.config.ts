
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
    NEXT_PUBLIC_FIREBASE_VAPID_KEY: 'BBRa-dKPSiO1eQ5L2H3C8dKl2jP6vO7cQ5xG3Y8aF1hB3n8eQ5wK2sV9oB1mN5rY9zE8jL6kP4oJ2d',
  }
};

export default nextConfig;
