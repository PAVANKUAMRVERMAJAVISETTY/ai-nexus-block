import { getTools, getToolBySlug, getFeaturedTools } from '@/services/tools';

export const toolsService = {
  tableName: 'nexus_tools',
  getTools,
  getToolBySlug,
  getFeaturedTools,
};

export { getTools, getToolBySlug, getFeaturedTools };
