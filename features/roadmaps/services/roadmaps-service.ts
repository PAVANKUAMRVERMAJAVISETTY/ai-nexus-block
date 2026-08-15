import { getRoadmaps, getRoadmapBySlug, getFeaturedRoadmaps } from '@/services/roadmaps';

export const roadmapsService = {
  tableName: 'nexus_roadmaps',
  getRoadmaps,
  getRoadmapBySlug,
  getFeaturedRoadmaps,
};

export { getRoadmaps, getRoadmapBySlug, getFeaturedRoadmaps };
