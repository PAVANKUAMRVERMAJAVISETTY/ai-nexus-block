import { getKnowledgeArticles, getKnowledgeArticleBySlug, getFeaturedKnowledge } from '@/services/knowledge';

export const knowledgeService = {
  tableName: 'nexus_knowledge',
  getKnowledgeArticles,
  getKnowledgeArticleBySlug,
  getFeaturedKnowledge,
};

export { getKnowledgeArticles, getKnowledgeArticleBySlug, getFeaturedKnowledge };
