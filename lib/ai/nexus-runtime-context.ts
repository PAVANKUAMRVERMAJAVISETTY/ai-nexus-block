import { getPageContext, type PageContext } from "@/lib/ai/page-context";
import { getUserContext, type UserContext } from "@/lib/ai/user-context";
import { getWebsiteContext, type WebsiteContext } from "@/lib/ai/website-context";

export interface NexusRuntimeContext {
  page: PageContext;
  user: UserContext;
  website: WebsiteContext;
}

export async function buildNexusRuntimeContext(
  pathname?: string,
  query?: string,
): Promise<NexusRuntimeContext> {
  const [page, user, website] = await Promise.all([
    getPageContext(pathname),
    getUserContext(),
    getWebsiteContext(query),
  ]);

  return {
    page,
    user,
    website,
  };
}

export function serializeNexusRuntimeContext(
  context: NexusRuntimeContext,
): string {
  return JSON.stringify(
    {
      current_page: context.page,
      current_user: {
        authenticated: context.user.authenticated,
        role: context.user.role,
      },
      website: context.website,
    },
    null,
    2,
  );
}
