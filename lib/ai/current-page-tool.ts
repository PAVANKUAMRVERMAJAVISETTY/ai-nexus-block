import { getPageContext } from "@/lib/ai/page-context";

export async function executeReadCurrentPageTool(
  pathname?: string,
): Promise<{
  ok: boolean;
  content: string;
}> {
  const page = await getPageContext(pathname);

  return {
    ok: true,
    content: JSON.stringify(page, null, 2),
  };
}
