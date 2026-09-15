import { IDLE_LOGOUT_MS, LOGIN_LOCKOUT_ATTEMPTS, LOGIN_LOCKOUT_MINUTES } from "./sessionPolicy";

describe("sessionPolicy", () => {
  test("idle logout is 15 minutes", () => {
    expect(IDLE_LOGOUT_MS).toBe(15 * 60 * 1000);
  });

  test("lockout is 3 attempts / 15 minutes", () => {
    expect(LOGIN_LOCKOUT_ATTEMPTS).toBe(3);
    expect(LOGIN_LOCKOUT_MINUTES).toBe(15);
  });
});
