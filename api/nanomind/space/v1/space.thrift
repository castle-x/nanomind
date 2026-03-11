namespace go space
namespace js space

struct Space {
  1: string id
  2: string name
  3: string slug
  4: string description
  5: bool public
  6: bool isDefault
  7: string customDomain
  8: string path
}

struct CreateSpaceRequest {
  1: required string name
  2: required string slug
  3: optional string description
}

struct UpdateSpaceRequest {
  1: required string id
  2: required string name
  3: required string slug
  4: optional string description
  5: bool public
  6: bool isDefault
}

struct DeleteSpaceRequest {
  1: required string id
}

struct GetSpaceRequest {
  1: required string id
}

service SpaceService {
  list<Space> ListSpaces()
  Space CreateSpace(1: CreateSpaceRequest req)
  Space UpdateSpace(1: UpdateSpaceRequest req)
  void DeleteSpace(1: DeleteSpaceRequest req)
  Space GetSpace(1: GetSpaceRequest req)
  Space GetDefaultSpace()
}
