import { getProjects, getProjectBySlug, getFeaturedProjects } from '@/services/projects';

export const projectsService = {
  tableName: 'nexus_projects',
  getProjects,
  getProjectBySlug,
  getFeaturedProjects,
};

export { getProjects, getProjectBySlug, getFeaturedProjects };
