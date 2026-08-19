import cloudbase from "@cloudbase/js-sdk";
import type { Crime, TrialCase, VoteOption } from "@/types";

type CloudbaseApp = ReturnType<typeof cloudbase.init>;

let appPromise: Promise<CloudbaseApp | null> | null = null;
const configCacheKey = "friend-public-trial.cloudbase-config.v1";
type PublicConfig = { envId?: string | null; accessKey?: string | null; region?: string };

function readCachedConfig(): PublicConfig | null {
  try {
    const raw = window.sessionStorage.getItem(configCacheKey);
    if (!raw) return null;
    const config = JSON.parse(raw) as PublicConfig;
    return config.envId && config.accessKey ? config : null;
  } catch { return null; }
}

// The publishable key is deliberately safe for browser code. PostgreSQL RLS
// policies still decide exactly which rows each visitor may access. CloudBase
// Run injects variables at container start, so clients fetch this public
// configuration from a server route instead of depending on build-time values.
async function getApp() {
  if (!appPromise) {
    const cachedConfig = readCachedConfig();
    appPromise = (cachedConfig ? Promise.resolve(cachedConfig) : fetch("/api/cloudbase-config", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        const config = await response.json() as PublicConfig;
        if (config.envId && config.accessKey) window.sessionStorage.setItem(configCacheKey, JSON.stringify(config));
        return config;
      }).catch(() => null))
      .then((config) => config?.envId && config.accessKey ? cloudbase.init({ env: config.envId, region: config.region || "ap-shanghai", accessKey: config.accessKey }) : null);
  }
  return appPromise;
}

export async function isCloudbaseConfigured() { return Boolean(await getApp()); }

type CaseRow = { id: string; slug: string; name: string; title: string; avatar_url: string | null; punishment: string; heat_count: number; created_at: string };
type CrimeRow = { id: string; case_id: string; title: string; description: string; severity: number; sort_order: number };
type VoteRow = { id: string; case_id: string; label: string; vote_count: number; sort_order: number };

const asCase = (row: CaseRow): TrialCase => ({ id: row.id, slug: row.slug, name: row.name, title: row.title, avatar_url: row.avatar_url, punishment: row.punishment, heat_count: Number(row.heat_count) });
const asCrime = (row: CrimeRow): Crime => ({ id: row.id, case_id: row.case_id, title: row.title, description: row.description, severity: Number(row.severity), sort_order: Number(row.sort_order) });
const asVote = (row: VoteRow): VoteOption => ({ id: row.id, case_id: row.case_id, label: row.label, vote_count: Number(row.vote_count), sort_order: Number(row.sort_order) });

async function requireDb() {
  const app = await getApp();
  if (!app) throw new Error("CloudBase 环境尚未配置");
  return app.rdb();
}

function throwIfError(result: { error?: { message?: string } | null }) {
  if (result.error) throw new Error(result.error.message || "CloudBase 请求失败");
}

export async function getCases() {
  const result = await (await requireDb()).from("cases").select("*").order("created_at", { ascending: false });
  throwIfError(result);
  return ((result.data || []) as CaseRow[]).map(asCase);
}

export async function getCaseBundle(slug: string) {
  const client = await requireDb();
  const caseResult = await client.from("cases").select("*").eq("slug", slug).limit(1);
  throwIfError(caseResult);
  const row = (caseResult.data || [])[0] as CaseRow | undefined;
  if (!row) return null;
  const [crimesResult, votesResult] = await Promise.all([
    client.from("crimes").select("*").eq("case_id", row.id).order("sort_order", { ascending: true }),
    client.from("vote_options").select("*").eq("case_id", row.id).order("sort_order", { ascending: true }),
  ]);
  throwIfError(crimesResult); throwIfError(votesResult);
  return { trial: asCase(row), crimes: ((crimesResult.data || []) as CrimeRow[]).map(asCrime), votes: ((votesResult.data || []) as VoteRow[]).map(asVote) };
}

// PostgreSQL CloudBase has no document-db watch API. Short polling keeps every
// browser converged without exposing a server API key.
export function watchCases(onChange: () => void) { const timer = window.setInterval(onChange, 3000); return () => window.clearInterval(timer); }
export function watchCaseBundle(_caseId: string, onChange: () => void) { const timer = window.setInterval(onChange, 2500); return () => window.clearInterval(timer); }

export async function incrementHeat(caseId: string) {
  const result = await (await requireDb()).rpc("increment_heat", { p_case_id: caseId }); throwIfError(result);
  return { heatCount: Number(result.data) };
}

export async function incrementVote(optionId: string) {
  const result = await (await requireDb()).rpc("increment_vote", { p_option_id: optionId }); throwIfError(result);
  return { voteCount: Number(result.data) };
}

export async function createCase(input: { name: string; title: string; punishment: string; avatarUrl?: string | null }) {
  const result = await (await requireDb()).from("cases").insert({ name: input.name, title: input.title, punishment: input.punishment, avatar_url: input.avatarUrl || null }).select("*");
  throwIfError(result); return asCase((result.data || [])[0] as CaseRow);
}

export async function createCrime(input: { caseId: string; title: string; description: string; sortOrder: number }) {
  const result = await (await requireDb()).from("crimes").insert({ case_id: input.caseId, title: input.title, description: input.description, sort_order: input.sortOrder, severity: 4 }).select("*");
  throwIfError(result); return asCrime((result.data || [])[0] as CrimeRow);
}

export async function updateCase(input: { caseId: string; name: string; title: string; avatarUrl: string | null }) {
  const result = await (await requireDb()).from("cases").update({ name: input.name, title: input.title, avatar_url: input.avatarUrl }).eq("id", input.caseId).select("*");
  throwIfError(result); return asCase((result.data || [])[0] as CaseRow);
}

export async function uploadAvatar(file: File) {
  const app = await getApp();
  if (!app) throw new Error("CloudBase 环境尚未配置");
  if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) throw new Error("请上传 2MB 以内的图片");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-64) || "avatar.png";
  const bucket = app.storage.from("avatars");
  const path = `${Date.now()}-${safeName}`;
  const result = await bucket.upload(path, file, { contentType: file.type });
  if (result.error) throw new Error(result.error.message || "头像上传失败");
  // createSignedUrl expects the bucket-relative path, rather than the CloudBase
  // object ID returned by upload(). Passing the ID causes STORAGE_OBJECT_NOT_FOUND.
  const urlResult = await bucket.createSignedUrl(result.data?.path || path, 60 * 60 * 24 * 365);
  if (urlResult.error) throw new Error(urlResult.error.message || "头像链接生成失败");
  if (!urlResult.data?.fullSignedURL) throw new Error("头像链接生成失败");
  return urlResult.data.fullSignedURL;
}
