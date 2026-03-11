namespace go search
namespace js search

struct SearchRequest {
  1: required string spaceId
  2: required string query
}

struct SearchResult {
  1: string path
  2: string name
  3: list<string> matches
}

service SearchService {
  list<SearchResult> Search(1: SearchRequest req)
}
