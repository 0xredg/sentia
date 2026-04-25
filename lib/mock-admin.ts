export const MOCK_ADMIN_USERNAME = "t0rezten.6601";

type MockAdminUser = {
  world_username: string | null;
};

export function isMockAdminEnabled() {
  return process.env.NEXT_PUBLIC_SENTIA_MOCK_ADMIN === "true";
}

export function isMockAdminUser(user: MockAdminUser | null | undefined) {
  return user?.world_username === MOCK_ADMIN_USERNAME;
}
