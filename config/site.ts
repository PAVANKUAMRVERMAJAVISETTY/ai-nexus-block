export const siteConfig = {
  name: 'AI Nexus Block',
  shortName: 'Nexus Block',
  tagline: 'Agentic Knowledge OS & Developer Sandbox',
  description:
    'An agentic knowledge platform and multi-tenant developer sandbox for discovering AI tools, documenting projects, learning technologies, and maintaining a living developer portfolio.',
  url: 'https://ainexusblock.com',
  ogImage: 'https://ainexusblock.com/og.png',
  links: {
    github: 'https://github.com/ai-nexus-block',
    linkedin: 'https://linkedin.com/in/ai-nexus-block',
    resume: '/resume.pdf',
  },
  author: {
    name: 'Your Name',
    role: 'AI Product Engineer',
    bio: 'Building agentic systems and developer tools at the intersection of AI and software engineering.',
    currentProject: 'AI Nexus Block',
  },
} as const;

export type SiteConfig = typeof siteConfig;
