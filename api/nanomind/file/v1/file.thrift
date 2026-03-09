namespace go file
namespace js file

struct FileTreeItem {
  1: string name
  2: string path
  3: string type       // "file" | "directory"
  4: optional list<FileTreeItem> children
}

struct FileContentResponse {
  1: string content
  2: string path
}

struct GetFileRequest {
  1: required string path
}

struct SaveFileRequest {
  1: required string path
  2: required string content
}

struct CreateFileRequest {
  1: required string path
  2: required string type
  3: required string name
}

struct DeleteFileRequest {
  1: required string path
}

struct RenameFileRequest {
  1: required string path
  2: required string new_name
}

struct MutationResponse {
  1: bool success
  2: optional string path
}

service FileService {
  list<FileTreeItem> GetTree()
  FileContentResponse GetFile(1: GetFileRequest req)
  MutationResponse SaveFile(1: SaveFileRequest req)
  MutationResponse CreateFile(1: CreateFileRequest req)
  MutationResponse DeleteFile(1: DeleteFileRequest req)
  MutationResponse RenameFile(1: RenameFileRequest req)
}
