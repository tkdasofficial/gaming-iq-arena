import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { BLUEPRINT_ID_REGEX, BLUEPRINT_LIMITS, clampString, sanitizeId } from './src/firebase/validation';

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const rulesText = fs.readFileSync(rulesPath, 'utf8');

test('firestore.rules includes default-deny safety net and rules_version 2', () => {
  assert.match(rulesText, /rules_version\s*=\s*'2'/);
  assert.match(rulesText, /match \/\{document=\*\*\} \{\s*allow read, write: if false;\s*\}/);
});

test('firestore.rules enforces PII isolation on /users and blocks user listing', () => {
  assert.match(rulesText, /match \/users\/\{userId\} \{[\s\S]*?allow list: if false;/);
  assert.match(rulesText, /isVerified\(\)[\s\S]*?request\.auth\.token\.email_verified == true/);
  assert.match(rulesText, /incoming\(\)\.role == existing\(\)\.role/);
});

test('firestore.rules enforces Eight Pillars across all collections including smartphone DB', () => {
  const requiredMatches = [
    '/users/{userId}',
    '/savedSetups/{setupId}',
    '/customDevices/{deviceId}',
    '/aimLabRuns/{runId}',
    '/presets/{presetId}',
    '/brands/{brandId}',
    '/chipsets/{chipsetId}',
    '/devices/{deviceId}',
    '/game_compatibility/{compatId}',
    '/admins/{adminId}',
  ];
  for (const segment of requiredMatches) {
    assert.ok(rulesText.includes(segment), `Missing match block for ${segment}`);
  }
  assert.match(rulesText, /incoming\(\)\.createdAt == request\.time/);
  assert.match(rulesText, /incoming\(\)\.updatedAt == request\.time/);
  assert.match(rulesText, /existing\(\)\.ownerId == request\.auth\.uid/);
  assert.match(rulesText, /existing\(\)\.visibility == 'public'/);
  assert.match(rulesText, /data\.deviceType == 'smartphone'/);
  assert.match(rulesText, /data\.releaseYear >= 2023/);
  assert.match(rulesText, /'HarmonyOS'/);
  assert.match(rulesText, /allow update: if false;/); // aimLabRuns immutability
});

test('Dirty Dozen payload constraints reject invalid IDs, roles, and oversized strings', () => {
  assert.equal(BLUEPRINT_ID_REGEX.test('bad/id/with/slashes'), false);
  assert.equal(BLUEPRINT_ID_REGEX.test('valid_id-123'), true);
  assert.equal(BLUEPRINT_ID_REGEX.test(sanitizeId('Samsung Galaxy S26 Ultra!')), true);

  const hugeString = 'x'.repeat(2000);
  assert.equal(
    clampString(hugeString, BLUEPRINT_LIMITS.presetDescriptionMaxLength).length,
    240
  );
  assert.equal(
    clampString(hugeString, BLUEPRINT_LIMITS.setupNameMaxLength).length,
    100
  );
});
