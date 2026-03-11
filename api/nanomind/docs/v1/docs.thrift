namespace go docs
namespace js docs

struct TopbarLink {
  1: string label
  2: string href
  3: optional bool external
}

struct DocsSite {
  1: string title
  2: string root
  3: string homepage
  4: optional string defaultLayout
  5: optional string defaultContentMode
}

struct DocsTopbar {
  1: bool showSearch
  2: optional list<TopbarLink> links
}

struct DocsPageRef {
  1: string id
  2: optional string title
  3: optional bool hidden
  4: optional string layout
  5: optional string contentMode
}

struct DocsGroup {
  1: string key
  2: string label
  3: list<DocsPageRef> pages
}

struct DocsTab {
  1: string key
  2: string label
  3: list<DocsGroup> groups
}

struct DocsConfigResponse {
  1: DocsSite site
  2: DocsTopbar topbar
  3: list<DocsTab> tabs
}

struct GetConfigRequest {
  1: required string spaceSlug
}

struct GetPageRequest {
  1: required string spaceSlug
  2: required string id
}

struct DocsPageResponse {
  1: string id
  2: string title
  3: optional string description
  4: bool toc
  5: string layout
  6: string contentMode
  7: string content
}

service DocsService {
  DocsConfigResponse GetConfig(1: GetConfigRequest req)
  DocsPageResponse GetPage(1: GetPageRequest req)
}
