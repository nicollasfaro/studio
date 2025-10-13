
'use client';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useBusinessInfo } from '@/components/BusinessInfoProvider';

export function Logo({ className }: { className?: string }) {
  const { info, isLoading } = useBusinessInfo();

  return (
    <Link href="/" className={cn("flex items-center gap-2", className)}>
      <Sparkles className="h-6 w-6 text-accent" />
      <span className="text-xl font-bold font-headline text-primary-foreground">
        {isLoading ? '' : info?.name || 'Thainnes Cuba Ciuldin'}
      </span>
    </Link>
  );
}

    