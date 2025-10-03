import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2", className)}>
      <Sparkles className="h-6 w-6 text-accent" />
      <span className="text-xl font-bold font-headline text-primary-foreground">
        GlamEase
      </span>
    </Link>
  );
}
