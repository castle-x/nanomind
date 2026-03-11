/** File tree item from the API */
export interface FileTreeItem {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileTreeItem[];
}

/** File content response from the API */
export interface FileContentResponse {
  content: string;
  path: string;
}

/** Search result from the API */
export interface SearchResult {
  path: string;
  name: string;
  matches: string[];
}

/** TOC heading item */
export interface TocItem {
  id: string;
  text: string;
  level: number;
  index?: number;
}

export type ThemeKey = "A" | "B" | "C";

export interface CreateRequest {
  path: string;
  type: "file" | "directory";
  name: string;
}

export interface RenameRequest {
  newName: string;
}

export type DocsLayout = "docs" | "landing";
export type DocsContentMode = "centered" | "wide";

export interface DocsSiteConfig {
  title: string;
  root: string;
  homepage: string;
  defaultLayout?: DocsLayout;
  defaultContentMode?: DocsContentMode;
}

export interface DocsTopbarLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface DocsTopbarConfig {
  showSearch: boolean;
  links?: DocsTopbarLink[];
}

export interface DocsPageRef {
  id: string;
  title?: string;
  hidden?: boolean;
  layout?: DocsLayout;
  contentMode?: DocsContentMode;
}

export interface DocsGroup {
  key: string;
  label: string;
  pages: DocsPageRef[];
}

export interface DocsTab {
  key: string;
  label: string;
  groups: DocsGroup[];
}

export interface DocsConfig {
  site: DocsSiteConfig;
  topbar: DocsTopbarConfig;
  tabs: DocsTab[];
}

export interface DocsPage {
  id: string;
  title: string;
  description?: string;
  content: string;
  layout?: DocsLayout;
  contentMode?: DocsContentMode;
  toc: boolean;
  tabKey?: string;
  groupKey?: string;
}

export interface DocsPageContext {
  tab: DocsTab | null;
  group: DocsGroup | null;
  page: DocsPageRef | null;
}

export interface Space {
  id: string;
  name: string;
  slug: string;
  description: string;
  public: boolean;
  isDefault: boolean;
  customDomain: string;
  path: string;
}
