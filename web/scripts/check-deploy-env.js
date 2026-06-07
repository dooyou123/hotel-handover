#!/usr/bin/env node
/**
 * Vercel / 로컬 배포 전 환경 변수 검사
 *
 *   node scripts/check-deploy-env.js
 *   node scripts/check-deploy-env.js --strict   # service role 등 추가 검사
 */

const fs = require('fs');
const path = require('path');

const PLACEHOLDERS = ['YOUR_PROJECT', 'your-anon-key', 'your-service-role-key', 'YOUR-PROJECT'];

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const env = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function getEnv(name, fileEnv) {
  return process.env[name]?.trim() || fileEnv[name]?.trim() || '';
}

const strict = process.argv.includes('--strict');
const fileEnv = loadEnvFile(path.join(__dirname, '..', '.env.local'));

const checks = [
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    value: getEnv('NEXT_PUBLIC_SUPABASE_URL', fileEnv),
    test: (v) => /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(v),
    hint: 'Supabase Dashboard → Settings → API → Project URL',
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    value: getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', fileEnv),
    test: (v) => v.startsWith('eyJ') && v.length > 100,
    hint: 'Dashboard → API → anon public key',
  },
  {
    name: 'NEXT_PUBLIC_DEFAULT_HOTEL_ID',
    value: getEnv('NEXT_PUBLIC_DEFAULT_HOTEL_ID', fileEnv),
    test: (v) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
    hint: '001_initial_schema.sql seed hotel UUID',
  },
];

if (strict) {
  checks.push({
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    value: getEnv('SUPABASE_SERVICE_ROLE_KEY', fileEnv),
    test: (v) => v.startsWith('eyJ') && v.length > 100,
    hint: '마이그레이션용 — Vercel에는 넣지 않아도 됨',
  });
}

let failed = 0;

console.log('배포 환경 변수 검사\n');

for (const check of checks) {
  const placeholder = PLACEHOLDERS.some((p) => check.value.includes(p));
  const ok = check.value && !placeholder && check.test(check.value);
  if (ok) {
    console.log(`  ✓ ${check.name}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${check.name}`);
    if (!check.value) console.log(`    → 값 없음 (${check.hint})`);
    else if (placeholder) console.log('    → 예시 값 그대로입니다. 실제 키로 교체하세요.');
    else console.log(`    → 형식 오류 (${check.hint})`);
  }
}

console.log('');
if (failed) {
  console.log('Vercel Dashboard → Project → Settings → Environment Variables 에 위 값을 등록하세요.');
  console.log('로컬: web/.env.local 복사 후 npm run dev 재시작');
  process.exit(1);
}

console.log('환경 변수 OK — npm run build 또는 vercel deploy 가능');
console.log('');
console.log('Supabase Auth → URL Configuration:');
console.log('  Site URL        = https://YOUR-PROJECT.vercel.app (프로덕션 배포 후)');
console.log('  Redirect URLs   = http://localhost:3000/**');
console.log('                    https://*.vercel.app/**');
console.log('                    https://YOUR-PROJECT.vercel.app/**');
