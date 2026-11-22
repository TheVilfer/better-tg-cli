import { userInfo } from "node:os";

import { describe, expect, it } from "vitest";

import { keychainBlocked } from "../src/keychain.js";

describe(keychainBlocked, () => {
  const home = userInfo().homedir;

  it("blocks every test process (and its children) by default", () => {
    expect(process.env.VITEST).toBeTruthy();
    expect(keychainBlocked()).toMatch(/tests never use/);
    expect(keychainBlocked({ VITEST: "true", HOME: home })).toMatch(
      /tests never use/
    );
  });

  it("blocks a temporary HOME even outside tests", () => {
    expect(keychainBlocked({ HOME: "/tmp/some-test-home" })).toMatch(
      /not the user's home/
    );
    expect(keychainBlocked({})).toMatch(/HOME is not set/);
  });

  it("allows the real home folder", () => {
    expect(keychainBlocked({ HOME: home })).toBeNull();
    expect(
      keychainBlocked({
        HOME: home,
        VITEST: "true",
        TG_TEST_REAL_KEYCHAIN: "1",
      })
    ).toBeNull();
  });
});
