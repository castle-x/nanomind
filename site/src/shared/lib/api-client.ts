// Hand-written adapter layer over gve-generated RPC clients.
// Provides typed, REST-style function signatures for the view layer.
import { AuthServiceClient } from "@/api/nanomind/auth/v1/client";
import { DocsServiceClient } from "@/api/nanomind/docs/v1/client";
import { FileServiceClient } from "@/api/nanomind/file/v1/client";
import { SearchServiceClient } from "@/api/nanomind/search/v1/client";
import { SpaceServiceClient } from "@/api/nanomind/space/v1/client";
import type {
  DocsConfig,
  DocsPage,
  FileContentResponse,
  FileTreeItem,
  SearchResult,
  Space,
} from "@/shared/types";

const fileClient = new FileServiceClient("/api/files/v1");
const searchClient = new SearchServiceClient("/api/search/v1");
const authClient = new AuthServiceClient("/api/auth/v1");
const docsClient = new DocsServiceClient("/api/docs/v1");
const spaceClient = new SpaceServiceClient("/api/spaces/v1");

export async function getFileTree(spaceId: string): Promise<FileTreeItem[]> {
  return fileClient.GetTree({ spaceId }) as Promise<FileTreeItem[]>;
}

export async function getFileContent(spaceId: string, path: string): Promise<FileContentResponse> {
  return fileClient.GetFile({ spaceId, path }) as Promise<FileContentResponse>;
}

export async function saveFileContent(
  spaceId: string,
  path: string,
  content: string,
): Promise<void> {
  await fileClient.SaveFile({ spaceId, path, content });
}

export async function createItem(req: {
  spaceId: string;
  path: string;
  type: string;
  name: string;
}): Promise<{ success: boolean; path?: string }> {
  return fileClient.CreateFile(req) as Promise<{ success: boolean; path?: string }>;
}

export async function deleteItem(spaceId: string, path: string): Promise<void> {
  await fileClient.DeleteFile({ spaceId, path });
}

export async function renameItem(
  spaceId: string,
  path: string,
  newName: string,
): Promise<{ success: boolean; path?: string }> {
  return fileClient.RenameFile({ spaceId, path, new_name: newName }) as Promise<{
    success: boolean;
    path?: string;
  }>;
}

export async function searchFiles(spaceId: string, query: string): Promise<SearchResult[]> {
  return searchClient.Search({ spaceId, query }) as Promise<SearchResult[]>;
}

export async function getSetupStatus(): Promise<{ needsPasswordChange: boolean }> {
  return authClient.GetSetupStatus(null) as Promise<{ needsPasswordChange: boolean }>;
}

export async function getAppInfo(): Promise<{ mindPath: string }> {
  return authClient.GetAppInfo(null) as Promise<{ mindPath: string }>;
}

export async function changePassword(password: string, passwordConfirm: string): Promise<void> {
  await authClient.ChangePassword({ password, passwordConfirm });
}

export async function getDocsConfig(spaceSlug: string): Promise<DocsConfig> {
  return docsClient.GetConfig({ spaceSlug }) as Promise<DocsConfig>;
}

export async function getDocsPage(spaceSlug: string, id: string): Promise<DocsPage> {
  return docsClient.GetPage({ spaceSlug, id }) as Promise<DocsPage>;
}

export async function listSpaces(): Promise<Space[]> {
  return spaceClient.ListSpaces(null) as Promise<Space[]>;
}

export async function createSpace(name: string, slug: string, description: string): Promise<Space> {
  return spaceClient.CreateSpace({ name, slug, description }) as Promise<Space>;
}

export async function updateSpace(id: string, data: Partial<Space>): Promise<Space> {
  return spaceClient.UpdateSpace({ id, ...data }) as Promise<Space>;
}

export async function deleteSpace(id: string): Promise<void> {
  await spaceClient.DeleteSpace({ id });
}

export async function getSpace(id: string): Promise<Space> {
  return spaceClient.GetSpace({ id }) as Promise<Space>;
}

export async function getDefaultSpace(): Promise<Space | null> {
  try {
    return (await spaceClient.GetDefaultSpace({})) as Space;
  } catch {
    return null;
  }
}
