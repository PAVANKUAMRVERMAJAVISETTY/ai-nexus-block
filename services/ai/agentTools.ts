import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient, isServiceRoleConfigured } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function handleAIToolMutation(actionName: string, args: any, userRole: string) {
  if (userRole !== 'super_admin') {
    return {
      success: false,
      error: 'Unauthorized: Only the super_admin can instruct the AI to update the website.',
    };
  }

  const serverClient = await createSupabaseServerClient();
  const supabase = isServiceRoleConfigured() ? createSupabaseAdminClient() : serverClient;

  if (actionName === 'create_tool') {
    const slug =
      args.slug ||
      (args.name ? args.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : `tool-${Date.now()}`);

    const { data, error } = await supabase
      .from('nexus_tools')
      .insert([
        {
          name: args.name,
          slug: slug,
          category: args.category || 'AI Tool',
          pricing: args.pricing_tier || args.pricing || 'Freemium',
          website_url: args.website_url || null,
          documentation_url: args.documentation_url || null,
          description: args.description || '',
          bullet_points: args.features || [],
          advantages: args.pros || [],
          disadvantages: args.cons || [],
          how_to_use: args.how_to_use || '',
          status: 'published',
        },
      ])
      .select();

    if (error) return { success: false, error: error.message };

    // Revalidate Next.js cache so the live page updates immediately
    revalidatePath('/tools');
    revalidatePath(`/tools/${slug}`);
    revalidatePath('/');

    return {
      success: true,
      message: `Tool '${args.name}' was successfully created and published to /tools/${slug}!`,
      data,
    };
  }

  if (actionName === 'create_project') {
    const titleOrName = args.title || args.name;
    const slug =
      args.slug ||
      (titleOrName ? titleOrName.toLowerCase().replace(/[^a-z0-9]+/g, '-') : `project-${Date.now()}`);

    const { data, error } = await supabase
      .from('nexus_projects')
      .insert([
        {
          title: titleOrName,
          name: titleOrName,
          slug: slug,
          category: args.category || 'Full Stack AI',
          description: args.description || '',
          long_description: args.long_description || args.description || '',
          live_url: args.live_url || null,
          github_url: args.github_url || null,
          status: 'published',
        },
      ])
      .select();

    if (error) return { success: false, error: error.message };

    revalidatePath('/projects');
    revalidatePath(`/projects/${slug}`);
    revalidatePath('/');

    return {
      success: true,
      message: `Project '${titleOrName}' was successfully created and published to /projects/${slug}!`,
      data,
    };
  }

  if (actionName === 'create_knowledge') {
    const slug =
      args.slug ||
      (args.title ? args.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : `article-${Date.now()}`);

    const { data, error } = await supabase
      .from('nexus_knowledge')
      .insert([
        {
          title: args.title,
          slug: slug,
          category: args.category || 'General',
          excerpt: args.excerpt || args.description || '',
          content: args.content || '',
          status: 'published',
        },
      ])
      .select();

    if (error) return { success: false, error: error.message };

    revalidatePath('/knowledge');
    revalidatePath(`/knowledge/${slug}`);
    revalidatePath('/');

    return {
      success: true,
      message: `Knowledge article '${args.title}' was successfully created and published to /knowledge/${slug}!`,
      data,
    };
  }

  if (actionName === 'create_resource') {
    const slug =
      args.slug ||
      (args.title ? args.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : `resource-${Date.now()}`);

    const { data, error } = await supabase
      .from('nexus_resources')
      .insert([
        {
          title: args.title,
          slug: slug,
          category: args.category || 'General',
          description: args.description || '',
          resource_type: args.resource_type || 'article',
          website_url: args.website_url || null,
          status: 'published',
        },
      ])
      .select();

    if (error) return { success: false, error: error.message };

    revalidatePath('/resources');
    revalidatePath('/');

    return {
      success: true,
      message: `Resource '${args.title}' was successfully created and published to /resources!`,
      data,
    };
  }

  return { success: false, error: `Unknown mutation action '${actionName}'.` };
}
