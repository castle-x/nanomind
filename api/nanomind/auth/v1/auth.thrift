namespace go auth
namespace js auth

struct AuthItem {
  1: i64 id
  2: string email
  3: string name
  4: bool mustChangePassword
}

struct GetCurrentUserRequest {
}

struct GetCurrentUserResponse {
  1: AuthItem user
}

struct SetupStatusResponse {
  1: bool needsPasswordChange
}

struct ChangePasswordRequest {
  1: string password
  2: string passwordConfirm
}

struct ChangePasswordResponse {
  1: bool success
}

struct AppInfoResponse {
  1: string mindPath
}

service AuthService {
  GetCurrentUserResponse GetCurrentUser(1: GetCurrentUserRequest req)
  SetupStatusResponse GetSetupStatus()
  ChangePasswordResponse ChangePassword(1: ChangePasswordRequest req)
  AppInfoResponse GetAppInfo()
}
