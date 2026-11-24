/**
 * BA-27: profile validation helpers.
 * Run: npx tsx src/lib/user-profile.test.ts
 */
import assert from "node:assert/strict";
import {
  isAdminRole,
  roleLabel,
  validateDisplayName,
  validateNewPassword,
  validateUsername,
} from "@/lib/user-profile";

assert.equal(isAdminRole("admin"), true);
assert.equal(isAdminRole("staff"), false);
assert.equal(isAdminRole(undefined), false);
assert.equal(roleLabel("admin"), "Administración");
assert.equal(roleLabel("staff"), "Tienda");

{
  const ok = validateUsername("  maria.tienda  ");
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.username, "maria.tienda");
}
assert.equal(validateUsername("ab").ok, false);
assert.equal(validateUsername("bad user").ok, false);
assert.equal(validateUsername("ok_user-1").ok, true);

{
  const ok = validateDisplayName("  Ana   López  ");
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.displayName, "Ana López");
}
assert.equal(validateDisplayName("   ").ok, false);

assert.equal(validateNewPassword("secret1", "secret1").ok, true);
assert.equal(validateNewPassword("short", "short").ok, false);
assert.equal(validateNewPassword("secret1", "other").ok, false);

console.log("user-profile.test.ts: ok");
