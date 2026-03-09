// Hand-written adapter layer over gve-generated RPC clients.
// Provides typed, REST-style function signatures for the view layer.
import { AuthServiceClient } from "@/api/nanomind/auth/v1/client";
import { DocsServiceClient } from "@/api/nanomind/docs/v1/client";
import { FileServiceClient } from "@/api/nanomind/file/v1/client";
import { SearchServiceClient } from "@/api/nanomind/search/v1/client";
import type {
  DocsConfig,
  DocsPage,
  FileContentResponse,
  FileTreeItem,
  SearchResult,
} from "@/shared/types";

const fileClient = new FileServiceClient("/api/files/v1");
const searchClient = new SearchServiceClient("/api/search/v1");
const authClient = new AuthServiceClient("/api/auth/v1");
const docsClient = new DocsServiceClient("/api/docs/v1");

export async function getFileTree(): Promise<FileTreeItem[]> {
  return fileClient.GetTree(null) as Promise<FileTreeItem[]>;
}

export async function getFileContent(path: string): Promise<FileContentResponse> {
  return fileClient.GetFile({ path }) as Promise<FileContentResponse>;
}

export async function saveFileContent(path: string, content: string): Promise<void> {
  await fileClient.SaveFile({ path, content });
}

export async function createItem(req: {
  path: string;
  type: string;
  name: string;
}): Promise<{ success: boolean; path?: string }> {
  return fileClient.CreateFile(req) as Promise<{ success: boolean; path?: string }>;
}

export async function deleteItem(path: string): Promise<void> {
  await fileClient.DeleteFile({ path });
}

export async function renameItem(
  path: string,
  newName: string,
): Promise<{ success: boolean; path?: string }> {
  return fileClient.RenameFile({ path, new_name: newName }) as Promise<{
    success: boolean;
    path?: string;
  }>;
}

export async function searchFiles(query: string): Promise<SearchResult[]> {
  return searchClient.Search({ query }) as Promise<SearchResult[]>;
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

export async function getDocsConfig(): Promise<DocsConfig> {
  return docsClient.GetConfig(null) as Promise<DocsConfig>;
}

export async function getDocsPage(id: string): Promise<DocsPage> {
  return docsClient.GetPage({ id }) as Promise<DocsPage>;
}
