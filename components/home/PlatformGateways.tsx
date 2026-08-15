'use client';

import Link from 'next/link';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import {
  Layers,
  Wrench,
  FolderGit2,
  BookOpen,
  Map,
  Compass,
  ArrowRight,
} from 'lucide-react';

interface GatewayCardProps {
  title: string;
  description: string;
  href: string;
  icon: any;
  count: string;
  badgeColor: string;
  gradient: string;
}

function Gateway3DTiltCard({ card }: { card: GatewayCardProps }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-100, 100], [8, -8]);
  const rotateY = useTransform(x, [-100, 100], [-8, 8]);

  const Icon = card.icon;

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - rect.width / 2;
    const mouseY = e.clientY - rect.top - rect.height / 2;
    x.set(mouseX);
    y.set(mouseY);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      style={{ perspective: 1000, rotateX, rotateY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      transition={{ type: 'spring', stiffness: 250, damping: 20 }}
      className="group h-full cursor-pointer"
    >
      <Link href={card.href} className="block h-full">
        <div className={`relative h-full rounded-2xl border border-border/60 bg-gradient-to-b ${card.gradient} bg-card p-6 flex flex-col justify-between space-y-4 hover:border-primary/50 shadow-lg hover:shadow-2xl transition-all duration-300`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
                <Icon className="h-6 w-6" />
              </div>
              <Badge variant="outline" className={`text-xs font-semibold ${card.badgeColor}`}>
                {card.count}
              </Badge>
            </div>
            <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">{card.title}</h3>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              {card.description}
            </p>
          </div>

          <div className="flex items-center text-xs font-semibold text-primary pt-2 group-hover:translate-x-1 transition-transform">
            <span>Explore section</span>
            <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function PlatformGateways() {
  const gatewayCards: GatewayCardProps[] = [
    {
      title: 'Architecture Lab',
      description: 'Interactive flow diagram mapping client request to Supabase RLS and 11-LLM AI engine.',
      href: '/architecture',
      icon: Layers,
      count: 'Interactive Diagram',
      badgeColor: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
      gradient: 'from-cyan-500/10 via-transparent to-transparent',
    },
    {
      title: 'AI Tools Catalog',
      description: '50+ curated developer AI tools with pricing models, comparisons, and reviews.',
      href: '/tools',
      icon: Wrench,
      count: '50+ Tools',
      badgeColor: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      gradient: 'from-amber-500/10 via-transparent to-transparent',
    },
    {
      title: 'Projects Showcase',
      description: 'Production-ready full-stack applications, architectural designs, and case studies.',
      href: '/projects',
      icon: FolderGit2,
      count: '15+ Projects',
      badgeColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      gradient: 'from-emerald-500/10 via-transparent to-transparent',
    },
    {
      title: 'Knowledge Base',
      description: 'Technical articles, architecture patterns, RLS policies, and cheatsheets.',
      href: '/knowledge',
      icon: BookOpen,
      count: '25+ Guides',
      badgeColor: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      gradient: 'from-blue-500/10 via-transparent to-transparent',
    },
    {
      title: 'Engineering Roadmaps',
      description: 'Structured learning paths for AI engineering, systems design, and full-stack mastery.',
      href: '/roadmaps',
      icon: Map,
      count: '10+ Roadmaps',
      badgeColor: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      gradient: 'from-purple-500/10 via-transparent to-transparent',
    },
    {
      title: 'Developer Journey',
      description: 'Milestone timeline detailing engineering achievements, releases, and platform launches.',
      href: '/journey',
      icon: Compass,
      count: 'Milestone Log',
      badgeColor: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
      gradient: 'from-rose-500/10 via-transparent to-transparent',
    },
  ];

  return (
    <section className="border-t border-border/40 bg-muted/20 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Infographic Platform Gateways
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Visual gateways into system architecture, developer AI toolsets, project showcases, and engineering roadmaps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {gatewayCards.map((card) => (
            <Gateway3DTiltCard key={card.href} card={card} />
          ))}
        </div>
      </div>
    </section>
  );
}
