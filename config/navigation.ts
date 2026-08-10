import { LayoutDashboard, User, Wrench, FolderGit2, BookOpen, Map, Link2, Compass, GitBranch, ImageIcon, Bot, Users, BarChart3, Settings, FileText, Bookmark, MessageSquare } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon?: LucideIcon;
  description?: string;
}

export const publicNav: NavItem[] = [
  { label: 'Projects', href: '/projects', description: 'Featured work and case studies' },
  { label: 'Tools', href: '/tools', description: 'AI and developer tool catalog' },
  { label: 'Knowledge', href: '/knowledge', description: 'Articles and guides' },
  { label: 'Roadmaps', href: '/roadmaps', description: 'Engineering learning paths' },
  { label: 'Resources', href: '/resources', description: 'Curated resources' },
  { label: 'Journey', href: '/journey', description: 'Engineering timeline' },
];

export const workspaceNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Assistant', href: '/assistant', icon: Bot },
  { label: 'Conversations', href: '/conversations', icon: MessageSquare },
  { label: 'My Profile', href: '/profile', icon: User },
  { label: 'My Files', href: '/files', icon: FileText },
  { label: 'Research', href: '/research', icon: Bookmark },
  { label: 'Notes', href: '/notes', icon: BookOpen },
  { label: 'Debug', href: '/debug', icon: GitBranch },
  { label: 'Decisions', href: '/decisions', icon: Compass },
];

export const adminNav: NavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'My Profile', href: '/admin/profile', icon: User },
  { label: 'Tools', href: '/admin/tools', icon: Wrench },
  { label: 'Projects', href: '/admin/projects', icon: FolderGit2 },
  { label: 'Knowledge', href: '/admin/knowledge', icon: BookOpen },
  { label: 'Roadmaps', href: '/admin/roadmaps', icon: Map },
  { label: 'Resources', href: '/admin/resources', icon: Link2 },
  { label: 'Journey', href: '/admin/journey', icon: Compass },
  { label: 'Decisions', href: '/admin/decisions', icon: GitBranch },
  { label: 'Media', href: '/admin/media', icon: ImageIcon },
  { label: 'AI Settings', href: '/admin/ai-settings', icon: Bot },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
];
