import { Twitter, Instagram, Facebook } from 'lucide-react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-secondary/50">
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col items-center text-center">
          <h3 className="text-2xl font-headline text-primary">GlamEase</h3>
          <p className="max-w-md mx-auto mt-2 text-muted-foreground">
            Your sanctuary for beauty and wellness.
          </p>
          <div className="flex justify-center mt-6 space-x-6">
            <Link href="#" aria-label="Facebook page">
              <Facebook className="h-6 w-6 text-muted-foreground hover:text-primary transition-colors" />
            </Link>
            <Link href="#" aria-label="Instagram page">
              <Instagram className="h-6 w-6 text-muted-foreground hover:text-primary transition-colors" />
            </Link>
            <Link href="#" aria-label="Twitter page">
              <Twitter className="h-6 w-6 text-muted-foreground hover:text-primary transition-colors" />
            </Link>
          </div>
        </div>

        <hr className="my-6 border-border" />

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} GlamEase. All Rights Reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
