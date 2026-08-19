"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createCrime, getCaseBundle, incrementHeat, incrementVote, isCloudbaseConfigured, updateCase, watchCaseBundle } from "@/lib/cloudbase";
import type { Crime, TrialCase, VoteOption } from "@/types";
import Avatar from "@/components/ui/Avatar";
const milestones = [10, 50, 100, 500, 1000];
const milestoneText: Record<number, string> = { 10: "⚠️ 案件开始引起关注", 50: "🔥 群情激愤", 100: "🔥🔥 民愤突破 100", 500: "⚔️ 全民讨伐", 1000: "💀 罪行震惊互联网" };

export default function TrialPage({ slug }: { slug: string }) {
  const reduceMotion = useReducedMotion();
  const [trial, setTrial] = useState<TrialCase | null>(null);
  const [crimes, setCrimes] = useState<Crime[]>([]);
  const [votes, setVotes] = useState<VoteOption[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "offline" | "error">("loading");
  const [flash, setFlash] = useState<string | null>(null); const [combo, setCombo] = useState(0); const [appeal, setAppeal] = useState(false); const [appeals, setAppeals] = useState(0); const [milestone, setMilestone] = useState<string | null>(null); const [cooling, setCooling] = useState(false); const [crimeTitle, setCrimeTitle] = useState(""); const [crimeDescription, setCrimeDescription] = useState(""); const [submittingCrime, setSubmittingCrime] = useState(false);
  const total = useMemo(() => votes.reduce((sum, item) => sum + item.vote_count, 0), [votes]);
  const celebrate = useCallback((value: number) => { setFlash("⚔️ +1"); window.setTimeout(() => setFlash(null), 700); setCombo((n) => n + 1); window.setTimeout(() => setCombo(0), 1100); const hit = milestones.find((m) => value === m); if (hit) { setMilestone(milestoneText[hit]); window.setTimeout(() => setMilestone(null), 2100); } }, []);

  useEffect(() => {
    let active = true; let stopListening: (() => void) | undefined; let refreshTimer: number | undefined;
    const load = async () => {
      try {
        const bundle = await getCaseBundle(slug);
        if (!active || !bundle) { if (active) setStatus("error"); return; }
        setTrial(bundle.trial); setCrimes(bundle.crimes); setVotes(bundle.votes); setStatus("ready");
        if (!stopListening) stopListening = watchCaseBundle(bundle.trial.id, () => { window.clearTimeout(refreshTimer); refreshTimer = window.setTimeout(() => void load(), 80); });
      } catch { if (active) setStatus("error"); }
    };
    void (async () => { if (!await isCloudbaseConfigured()) { if (active) setStatus("offline"); return; } await load(); })();
    return () => { active = false; window.clearTimeout(refreshTimer); stopListening?.(); };
  }, [slug]);

  if (status === "loading") return <main><div className="noise" /><section className="shell"><header className="topline case-nav"><Link href="/">← 返回广场</Link><span>PUBLIC TRIAL</span></header><div className="trial-skeleton" aria-label="正在加载案件"><span className="skeleton-avatar" /><i /><i /><div /><div /><div /></div><p className="sync-state">● 正在同步案件资料</p></section></main>;
  if (status === "offline") return <main><div className="noise" /><section className="shell"><p className="notice error">CloudBase 环境尚未配置</p></section></main>;
  if (status === "error" || !trial) return <main><div className="noise" /><section className="shell"><p className="notice error">案件读取失败或已不存在，请返回广场重试。</p><Link href="/">← 返回案件广场</Link></section></main>;

  const increment = async (kind: "heat" | "vote", id?: string) => {
    if (cooling) return; setCooling(true); window.setTimeout(() => setCooling(false), 380);
    if (status !== "ready" || !trial) return;
    try {
      if (kind === "heat") { const result = await incrementHeat(trial.id); setTrial((current) => current ? { ...current, heat_count: Number(result.heatCount) } : current); celebrate(Number(result.heatCount)); }
      else if (id) { const result = await incrementVote(id); setVotes((all) => all.map((item) => item.id === id ? { ...item, vote_count: Number(result.voteCount) } : item)); celebrate(total + 1); }
    } catch { setFlash("连接失败，请重试"); window.setTimeout(() => setFlash(null), 1500); }
  };

  const submitCrime = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); const title = crimeTitle.trim(); const description = crimeDescription.trim(); if (!title || !description) return; if (status !== "ready") { setFlash("请先配置 CloudBase 再投稿"); window.setTimeout(() => setFlash(null), 1600); return; } setSubmittingCrime(true); try { const crime = await createCrime({ caseId: trial.id, title: `「${title.replace(/[「」]/g, "")}」`, description, sortOrder: crimes.length + 1 }); setCrimes((old) => old.some((item) => item.id === crime.id) ? old : [...old, crime]); setCrimeTitle(""); setCrimeDescription(""); setFlash("📁 罪状已入档"); window.setTimeout(() => setFlash(null), 1200); } catch { setFlash("罪状投稿失败，请重试"); window.setTimeout(() => setFlash(null), 1600); } finally { setSubmittingCrime(false); } };
  const editCase = async () => { if (status !== "ready") return; const name = window.prompt("修改昵称", trial.name); if (name === null || !name.trim()) return; const title = window.prompt("修改搞笑称号", trial.title); if (title === null || !title.trim()) return; const avatar = window.prompt("修改头像图片 URL（留空则使用默认头像）", trial.avatar_url ?? ""); if (avatar === null) return; try { const updated = await updateCase({ caseId: trial.id, name: name.trim().slice(0, 24), title: title.trim().slice(0, 36), avatarUrl: avatar.trim() || null }); setTrial(updated); setFlash("📁 案件资料已更新"); window.setTimeout(() => setFlash(null), 1200); } catch { setFlash("资料修改失败，请重试"); window.setTimeout(() => setFlash(null), 1600); } };

  return <main><div className="noise" /><section className="shell">
    <header className="topline case-nav"><Link href="/">← 返回广场</Link><span>PUBLIC TRIAL</span><span>CASE #{trial.id.slice(0, 6).toUpperCase()}</span></header>
    <motion.section initial={reduceMotion ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="hero"><Avatar className="avatar" src={trial.avatar_url} alt={`${trial.name} 的头像`} /><p className="eyebrow">今日公开审判</p><h1>{trial.name}</h1><p className="title">{trial.title}</p><button className="case-edit" onClick={editCase}>✎ 修改案件资料</button></motion.section>
    <p className="sync-state">● 数据已同步</p>
    <section className="heat panel"><div><p className="eyebrow">🔥 当前讨伐热度</p><motion.strong key={trial.heat_count} initial={reduceMotion ? false : { scale: 1.18 }} animate={{ scale: 1 }}>{trial.heat_count.toLocaleString()}</motion.strong><p className="supporters">已有 {Math.max(1, Math.floor(trial.heat_count / 3)).toLocaleString()} 位正义之士加入讨伐</p></div><button className="heat-button" onClick={() => void increment("heat")} disabled={cooling}>⚔️ 加入讨伐</button></section>
    <section><div className="section-heading"><span>罪状档案</span><small>PUBLIC EVIDENCE</small></div><form className="crime-form" onSubmit={submitCrime}><p>📁 朋友恶搞投稿：只写轻松玩笑，不要真实严重指控或隐私。</p><input value={crimeTitle} onChange={(e) => setCrimeTitle(e.target.value)} maxLength={28} required placeholder="罪名，例如：已读但不回" aria-label="罪名" /><textarea value={crimeDescription} onChange={(e) => setCrimeDescription(e.target.value)} maxLength={120} required placeholder="事实：三天后只发来一张表情包" aria-label="罪状事实" /><button type="submit" disabled={submittingCrime}>{submittingCrime ? "正在归档…" : "＋ 追加罪状"}</button></form><div className="crimes">{crimes.map((crime, i) => <article className="crime" key={crime.id}><span>罪状 {String(i + 1).padStart(2, "0")}</span><h2>{crime.title}</h2><p><b>事实：</b>{crime.description}</p><em>{"★".repeat(crime.severity)}{"☆".repeat(5 - crime.severity)}</em></article>)}</div></section>
    <section className="votes panel"><div className="section-heading"><span>公众判决</span><small>可无限投票</small></div><div className="vote-grid">{votes.map((v, index) => <motion.button whileTap={reduceMotion ? undefined : { scale: .96 }} key={v.id} onClick={() => void increment("vote", v.id)} disabled={cooling}><span>{["🔨", "😐", "😈", "🧋"][index]} {v.label}</span><b>{v.vote_count.toLocaleString()}<small>票</small></b></motion.button>)}</div><p className="total">🔥 总讨伐票数：<strong>{total.toLocaleString()}</strong></p></section>
    <section className="verdict"><p>🔨 最终判决</p><motion.div initial={reduceMotion ? false : { rotate: -9, scale: 1.4, opacity: 0 }} whileInView={{ rotate: -4, scale: 1, opacity: 1 }} viewport={{ once: true }} className="stamp">GUILTY</motion.div><p>处罚：<b>🧋 {trial.punishment}</b></p><button className="appeal-link" onClick={() => setAppeal(true)}>🛡️ 我是本人，我要申诉</button></section>
  </section><AnimatePresence>{flash && <motion.div className="float" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: -15 }} exit={{ opacity: 0 }}>{flash}</motion.div>}{combo >= 3 && <motion.div className="combo" initial={{ scale: .7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}>COMBO ×{combo}<small>{["🔥 民愤正在上升", "⚔️ 正义值 +1", "💀 当事人情况不妙"][combo % 3]}</small></motion.div>}{milestone && <motion.div className="milestone" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{milestone}</motion.div>}{appeal && <motion.div className="modal-backdrop" onClick={() => setAppeal(false)}><motion.form className="modal" onSubmit={(e) => { e.preventDefault(); setAppeals((x) => x + 1); }} onClick={(e) => e.stopPropagation()} initial={{ y: 30 }} animate={{ y: 0 }}><button type="button" className="close" onClick={() => setAppeal(false)}>×</button><h2>我是本人，我要申诉</h2>{appeals ? <div className="rejected"><b>⚠️ 检测到当事人拒不认罪</b><p>追加罪名：拒绝接受群众审判</p></div> : <><label>申诉理由<textarea required placeholder="请陈述你的无辜…" /></label><button className="submit">提交申诉</button></>}{appeals > 0 && <button className="submit" type="submit">再次申诉</button>}{appeals === 1 && <p className="rejected">🔨 审理完毕<br />申诉驳回。证据不足以推翻原判。<br />罪恶值 +10</p>}</motion.form></motion.div>}</AnimatePresence></main>;
}
