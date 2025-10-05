
'use client';
import { Twitter, Instagram, Facebook } from 'lucide-react';
import Link from 'next/link';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

interface SocialLinks {
    facebook?: string;
    instagram?: string;
    twitter?: string;
}

export function Footer() {
  const firestore = useFirestore();
  const socialDocRef = useMemoFirebase(() => (firestore ? doc(firestore, 'socialMedia', 'links') : null), [firestore]);
  const { data: socialLinks } = useDoc<SocialLinks>(socialDocRef);

  return (
    <footer className="bg-secondary/50">
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col items-center text-center">
          <h3 className="text-2xl font-headline text-primary">Thainnes Cuba Ciuldin</h3>
          <p className="max-w-md mx-auto mt-2 text-muted-foreground">
Seu santuário de beleza e bem-estar.
          </p>
          <div className="flex justify-center mt-6 space-x-6">
            {socialLinks?.facebook && (
              <Link href={socialLinks.facebook} aria-label="Facebook page" target="_blank" rel="noopener noreferrer">
                <Facebook className="h-6 w-6 text-muted-foreground hover:text-primary transition-colors" />
              </Link>
            )}
            {socialLinks?.instagram && (
              <Link href={socialLinks.instagram} aria-label="Instagram page" target="_blank" rel="noopener noreferrer">
                <Instagram className="h-6 w-6 text-muted-foreground hover:text-primary transition-colors" />
              </Link>
            )}
            {socialLinks?.twitter && (
              <Link href={socialLinks.twitter} aria-label="Twitter page" target="_blank" rel="noopener noreferrer">
                <Twitter className="h-6 w-6 text-muted-foreground hover:text-primary transition-colors" />
              </Link>
            )}
          </div>
        </div>

        <hr className="my-6 border-border" />

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Thainnes Cuba Ciuldin. All Rights Reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
