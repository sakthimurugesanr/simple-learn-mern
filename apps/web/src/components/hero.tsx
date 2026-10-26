'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
export function Hero({ banners }: { banners: any[] }) {
  const [index, setIndex] = useState(0);
  const banner = banners[index];
  if (!banner) return null;
  return (
    <section
      className="relative grid min-h-[590px] bg-[#e9e9df] text-[#26372c] md:grid-cols-[.92fr_1.08fr]"
      aria-roledescription="carousel"
      aria-label="Featured collections"
    >
      <div className="relative z-10 flex min-w-0 flex-col items-start justify-center px-6 py-16 sm:px-8 md:py-20 md:pl-[max(56px,calc((100vw-1400px)/2))] lg:pr-12">
        <span className="eyebrow mb-8 flex items-center gap-3">
          <span className="h-px w-6 bg-current" />
          THE EVERYDAY, REIMAGINED
        </span>
        <h1 className="font-editorial mb-7 whitespace-pre-line text-[56px] leading-[1.02] sm:text-[64px] lg:text-[72px] xl:text-[88px]">
          {banner.title}
        </h1>
        <p className="mb-9 max-w-[290px] text-sm leading-7 text-[#59665b]">{banner.subtitle}</p>
        <Button asChild className="rounded-none bg-[#304c3c] px-7 text-white">
          <Link href={banner.href}>
            Discover the collection <ArrowUpRight className="ml-6" />
          </Link>
        </Button>
        <div className="mt-14 flex items-center gap-3 text-[9px] tracking-[.1em]">
          <span className="size-1.5 rounded-full bg-[#304c3c]" /> NATURAL FABRICS. UNCOMPLICATED
          STYLE.
        </div>
      </div>
      <div className="relative min-h-[460px] overflow-hidden md:min-h-[620px]">
        <Image
          src={banner.image}
          alt="The new Aurel collection, effortless natural dresses"
          fill
          priority
          sizes="(max-width:767px) 100vw, 55vw"
          className="object-cover object-[center_40%]"
        />
        <span className="absolute bottom-8 left-8 font-editorial text-xl italic text-white">
          For the moments in between.
        </span>
        <div className="absolute bottom-7 right-7 flex items-center gap-3 text-white">
          <span className="mr-3 text-[10px]">
            {String(index + 1).padStart(2, '0')} / {String(banners.length).padStart(2, '0')}
          </span>
          <Button
            size="icon"
            variant="outline"
            className="rounded-full border-white/50 bg-transparent text-white hover:bg-white/20"
            disabled={banners.length < 2}
            aria-label="Previous banner"
            onClick={() => setIndex((index + banners.length - 1) % banners.length)}
          >
            <ChevronLeft />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="rounded-full border-white/50 bg-transparent text-white hover:bg-white/20"
            disabled={banners.length < 2}
            aria-label="Next banner"
            onClick={() => setIndex((index + 1) % banners.length)}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
      <div className="absolute bottom-7 left-8 hidden text-[10px] md:block" aria-live="polite" />
    </section>
  );
}
