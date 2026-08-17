"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCases, isCloudbaseConfigured, watchCases } from "@/lib/cloudbase";
import type { TrialCase } from "@/types";

const demo: TrialCase[] = [{ id: "demo", slug: "demo", name: "小王", title: "一级拖延重犯", avatar_url: null, punishment: "请大家喝奶茶", heat_count: 10 }];

export default function CaseForum() {
  const [cases, setCases] = useState<TrialCase[]>(demo); const [ready, setReady] = useState(false); const [sort, setSort] = useState<"hot" | "new">("hot"); const [message, setMessage] = useState("");
  useEffect(() => {
    if (!isCloudbaseConfigured) return;
    let active = true; let refreshTimer: number | undefined;
    const load = async () => { try { const data = await getCases(); if (active) { setCases(data); setReady(true); } } catch { if (active) setMessage("案件列表读取失败，请稍后重试"); } };
    void load();
    const stop = watchCases(() => { window.clearTimeout(refreshTimer); refreshTimer = window.setTimeout(() => void load(), 80); });
    return () => { active = false; window.clearTimeout(refreshTimer); stop(); };
  }, []);
  const ordered = [...cases].sort((a, b) => sort === "hot" ? b.heat_count - a.heat_count : a.slug.localeCompare(b.slug));
  return <main><div className="noise" /><section className="shell forum"><header className="topline"><span>PUBLIC TRIAL</span><Link className="create-link" href="/create">＋ 创建新案件</Link></header><div className="forum-hero"><h1>案件广场</h1><p>每个案件都有独立罪状、热度与群众判决。</p><Link className="hero-create" href="/create">＋ 创建新案件</Link></div>{message && <p className="notice error">{message}</p>}<div className="section-heading"><span>正在审理</span><button className="sort-button" onClick={() => setSort((value) => value === "hot" ? "new" : "hot")}>{sort === "hot" ? "最热" : "最新"} ↓</button></div><div className="case-grid">{ordered.map((item) => <Link className="case-card" href={`/case/${item.slug}`} key={item.id}><div className="case-avatar">{item.avatar_url ? <img src={item.avatar_url} alt="" /> : "😈"}</div><div><small>CASE #{item.id === "demo" ? "000001" : item.id.slice(0, 6).toUpperCase()} <i>进行中</i></small><h2>{item.name}</h2><p>{item.title}</p><b>🔥 {item.heat_count.toLocaleString()}</b><em>进入审理 →</em></div></Link>)}</div>{ready && <p className="sync-state">● 已显示 {cases.length} 个案件</p>}</section></main>;
}
