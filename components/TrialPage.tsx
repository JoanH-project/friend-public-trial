"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { Crime, TrialCase, VoteOption } from "@/types";

const demoCase: TrialCase = { id: "demo", slug: "demo", name: "小王", title: "一级拖延重犯", avatar_url: null, punishment: "请大家喝奶茶", heat_count: 9 };
const demoCrimes: Crime[] = [
  { id: "1", case_id: "demo", title: "「马上到了」", description: "发送该消息时仍然躺在床上", severity: 5, sort_order: 1 },
  { id: "2", case_id: "demo", title: "「吃什么都可以」", description: "连续否决六家餐厅", severity: 5, sort_order: 2 },
  { id: "3", case_id: "demo", title: "已读但不回", description: "三天后只发来一张表情包", severity: 4, sort_order: 3 }
];
const demoVotes: VoteOption[] = ["有罪", "极其有罪", "罪大恶极", "请奶茶赎罪"].map((label, i) => ({ id: String(i), case_id: "demo", label, vote_count: [128, 356, 891, 204][i], sort_order: i }));
const milestones = [10, 50, 100, 500, 1000];
const milestoneText: Record<number, string> = { 10: "⚠️ 案件开始引起关注", 50: "🔥 群情激愤", 100: "🔥🔥 民愤突破 100", 500: "⚔️ 全民讨伐", 1000: "💀 罪行震惊互联网" };

export default function TrialPage({ slug }: { slug: string }) {
  const reduceMotion = useReducedMotion();
  const [trial, setTrial] = useState<TrialCase>(demoCase); const [crimes, setCrimes] = useState(demoCrimes); const [votes, setVotes] = useState(demoVotes);
  const [status, setStatus] = useState<"loading" | "ready" | "offline" | "error">("loading");
  const [flash, setFlash] = useState<string | null>(null); const [combo, setCombo] = useState(0); const [appeal, setAppeal] = useState(false); const [appeals, setAppeals] = useState(0); const [milestone, setMilestone] = useState<string | null>(null); const [cooling, setCooling] = useState(false); const [crimeTitle, setCrimeTitle] = useState(""); const [crimeDescription, setCrimeDescription] = useState(""); const [submittingCrime, setSubmittingCrime] = useState(false);
  const total = useMemo(() => votes.reduce((sum, item) => sum + item.vote_count, 0), [votes]);
  const celebrate = useCallback((value: number) => { setFlash("⚔️ +1"); window.setTimeout(() => setFlash(null), 700); setCombo((n) => n + 1); window.setTimeout(() => setCombo(0), 1100); const hit = milestones.find((m) => value === m); if (hit) { setMilestone(milestoneText[hit]); window.setTimeout(() => setMilestone(null), 2100); } }, []);

  useEffect(() => {
    if (!supabase) { setStatus("offline"); return; }
    let active = true;
    async function load() {
      const { data: found, error } = await supabase!.from("cases").select("*").eq("slug", slug).single();
      if (error || !found) { if (active) setStatus("error"); return; }
      const [crimeResult, voteResult] = await Promise.all([supabase!.from("crimes").select("*").eq("case_id", found.id).order("sort_order"), supabase!.from("vote_options").select("*").eq("case_id", found.id).order("sort_order")]);
      if (!active) return; setTrial(found); setCrimes(crimeResult.data ?? []); setVotes(voteResult.data ?? []); setStatus("ready");
    }
    load();
    const client = supabase;
    const channel = client.channel(`trial-${slug}`).on("postgres_changes", { event: "UPDATE", schema: "public", table: "cases" }, (p) => setTrial((old) => p.new.id === old.id ? { ...old, heat_count: p.new.heat_count } : old)).on("postgres_changes", { event: "UPDATE", schema: "public", table: "vote_options" }, (p) => setVotes((old) => old.map((v) => v.id === p.new.id ? { ...v, vote_count: p.new.vote_count } : v))).on("postgres_changes", { event: "INSERT", schema: "public", table: "crimes" }, (p) => { const added = p.new as Crime; if (added.case_id === trial.id) setCrimes((old) => old.some((crime) => crime.id === added.id) ? old : [...old, added].sort((a, b) => a.sort_order - b.sort_order)); }).subscribe();
    return () => { active = false; client.removeChannel(channel); };
  }, [slug]);

  const increment = async (kind: "heat" | "vote", id?: string) => {
    if (cooling) return; setCooling(true); window.setTimeout(() => setCooling(false), 380);
    if (!supabase || status !== "ready") { if (kind === "heat") setTrial((x) => ({ ...x, heat_count: x.heat_count + 1 })); else setVotes((all) => all.map((x) => x.id === id ? { ...x, vote_count: x.vote_count + 1 } : x)); celebrate(kind === "heat" ? trial.heat_count + 1 : total + 1); return; }
    const { data, error } = await supabase.rpc(kind === "heat" ? "increment_heat" : "increment_vote", kind === "heat" ? { target_case_id: trial.id } : { target_option_id: id });
    if (error) { setFlash("连接失败，请重试"); window.setTimeout(() => setFlash(null), 1500); return; }
    if (kind === "heat") setTrial((x) => ({ ...x, heat_count: Number(data) })); else setVotes((all) => all.map((x) => x.id === id ? { ...x, vote_count: Number(data) } : x)); celebrate(Number(data));
  };
  const submitCrime = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const title = crimeTitle.trim(); const description = crimeDescription.trim();
    if (!title || !description) return;
    if (!supabase || status !== "ready") { setFlash("请先连接 Supabase 再投稿"); window.setTimeout(() => setFlash(null), 1600); return; }
    setSubmittingCrime(true);
    const { data, error } = await supabase.from("crimes").insert({ case_id: trial.id, title: `「${title.replace(/[「」]/g, "")}」`, description, severity: 3, sort_order: crimes.length + 1 }).select().single();
    setSubmittingCrime(false);
    if (error) { setFlash("罪状投稿失败，请重试"); window.setTimeout(() => setFlash(null), 1600); return; }
    setCrimes((old) => old.some((crime) => crime.id === data.id) ? old : [...old, data]); setCrimeTitle(""); setCrimeDescription(""); setFlash("📁 罪状已入档"); window.setTimeout(() => setFlash(null), 1200);
  };
  const editCase = async () => {
    if (!supabase || status !== "ready") return;
    const name = window.prompt("修改昵称", trial.name); if (name === null || !name.trim()) return;
    const title = window.prompt("修改搞笑称号", trial.title); if (title === null || !title.trim()) return;
    const avatar = window.prompt("修改头像图片 URL（留空则使用默认头像）", trial.avatar_url ?? ""); if (avatar === null) return;
    const { data, error } = await supabase.from("cases").update({ name: name.trim().slice(0, 24), title: title.trim().slice(0, 36), avatar_url: avatar.trim() || null }).eq("id", trial.id).select().single();
    if (error) { setFlash("资料修改失败，请重试"); window.setTimeout(() => setFlash(null), 1600); return; } setTrial(data); setFlash("📁 案件资料已更新"); window.setTimeout(() => setFlash(null), 1200);
  };
  return <main>
    <div className="noise" /><section className="shell">
      <header className="topline"><span>PUBLIC TRIAL</span><span>CASE #{trial.id === "demo" ? "000001" : trial.id.slice(0, 6).toUpperCase()}</span></header>
      <motion.section initial={reduceMotion ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="hero">
        <div className="avatar">{trial.avatar_url ? <img src={trial.avatar_url} alt={`${trial.name} 的头像`} onError={(e) => { e.currentTarget.style.display = "none"; }} /> : "😈"}</div>
        <p className="eyebrow">今日公开审判</p><h1>{trial.name}</h1><p className="title">{trial.title}</p><button className="case-edit" onClick={editCase}>修改案件资料</button>
      </motion.section>
      {status === "loading" && <p className="notice">正在接入法庭档案…</p>}{status === "offline" && <p className="notice">演示模式：配置 Supabase 后即可多人实时同步。</p>}{status === "error" && <p className="notice error">案件读取失败，正在显示演示案件。</p>}
      <section className="heat panel"><p className="eyebrow">🔥 当前讨伐热度</p><motion.strong key={trial.heat_count} initial={reduceMotion ? false : { scale: 1.18 }} animate={{ scale: 1 }}>{trial.heat_count.toLocaleString()}</motion.strong><button className="heat-button" onClick={() => increment("heat")} disabled={cooling}>⚔️ 加入讨伐</button></section>
      <section><div className="section-heading"><span>罪状档案</span><small>PUBLIC EVIDENCE</small></div><form className="crime-form" onSubmit={submitCrime}><p>📁 朋友恶搞投稿：只写轻松玩笑，不要真实严重指控或隐私。</p><input value={crimeTitle} onChange={(e) => setCrimeTitle(e.target.value)} maxLength={28} required placeholder="罪名，例如：已读但不回" aria-label="罪名" /><textarea value={crimeDescription} onChange={(e) => setCrimeDescription(e.target.value)} maxLength={120} required placeholder="事实：三天后只发来一张表情包" aria-label="罪状事实" /><button type="submit" disabled={submittingCrime}>{submittingCrime ? "正在归档…" : "＋ 追加罪状"}</button></form><div className="crimes">{crimes.map((crime, i) => <article className="crime" key={crime.id}><span>罪状 {String(i + 1).padStart(2, "0")}</span><h2>{crime.title}</h2><p><b>事实：</b>{crime.description}</p><em>{"★".repeat(crime.severity)}{"☆".repeat(5 - crime.severity)}</em></article>)}</div></section>
      <section className="votes panel"><div className="section-heading"><span>公众判决投票</span><small>无限次投票</small></div>{votes.map((v) => <motion.button whileTap={reduceMotion ? undefined : { scale: .96 }} key={v.id} onClick={() => increment("vote", v.id)} disabled={cooling}><span>{v.label}</span><b>{v.vote_count.toLocaleString()}</b></motion.button>)}<p className="total">🔥 总讨伐票：<strong>{total.toLocaleString()}</strong></p></section>
      <section className="verdict"><p>🔨 最终判决</p><motion.div initial={reduceMotion ? false : { rotate: -9, scale: 1.4, opacity: 0 }} whileInView={{ rotate: -4, scale: 1, opacity: 1 }} viewport={{ once: true }} className="stamp">GUILTY</motion.div><p>处罚：<b>🧋 {trial.punishment}</b></p><button className="appeal-link" onClick={() => setAppeal(true)}>我是本人，我要申诉</button></section>
    </section>
    <AnimatePresence>{flash && <motion.div className="float" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: -15 }} exit={{ opacity: 0 }}>{flash}</motion.div>}{combo >= 3 && <motion.div className="combo" initial={{ scale: .7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}>COMBO ×{combo}<small>{["🔥 民愤正在上升", "⚔️ 正义值 +1", "💀 当事人情况不妙"][combo % 3]}</small></motion.div>}{milestone && <motion.div className="milestone" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{milestone}</motion.div>}{appeal && <motion.div className="modal-backdrop" onClick={() => setAppeal(false)}><motion.form className="modal" onSubmit={(e) => { e.preventDefault(); setAppeals((x) => x + 1); }} onClick={(e) => e.stopPropagation()} initial={{ y: 30 }} animate={{ y: 0 }}><button type="button" className="close" onClick={() => setAppeal(false)}>×</button><h2>我是本人，我要申诉</h2>{appeals ? <div className="rejected"><b>⚠️ 检测到当事人拒不认罪</b><p>追加罪名：拒绝接受群众审判</p></div> : <><label>申诉理由<textarea required placeholder="请陈述你的无辜…" /></label><button className="submit">提交申诉</button></>}{appeals > 0 && <button className="submit" type="submit">再次申诉</button>}{appeals === 1 && <p className="rejected">🔨 审理完毕<br />申诉驳回。证据不足以推翻原判。<br />罪恶值 +10</p>}</motion.form></motion.div>}</AnimatePresence>
  </main>;
}
