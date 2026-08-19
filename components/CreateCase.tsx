"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createCase, isCloudbaseConfigured, uploadAvatar } from "@/lib/cloudbase";
import Avatar from "@/components/ui/Avatar";
import { prepareAvatar } from "@/lib/avatar";

export default function CreateCase() {
  const [name, setName] = useState(""); const [title, setTitle] = useState(""); const [punishment, setPunishment] = useState("请大家喝奶茶");
  const [avatar, setAvatar] = useState<File | null>(null); const [previewUrl, setPreviewUrl] = useState<string | null>(null); const [processingAvatar, setProcessingAvatar] = useState(false); const [saving, setSaving] = useState(false); const [message, setMessage] = useState("");
  const avatarProcessingMs = useRef(0);
  useEffect(() => { void isCloudbaseConfigured(); }, []);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  const selectAvatar = async (file: File | null) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl); setMessage(""); setAvatar(null); setPreviewUrl(null);
    if (!file) return;
    setProcessingAvatar(true); const started = performance.now();
    try { const prepared = await prepareAvatar(file); avatarProcessingMs.current = performance.now() - started; setAvatar(prepared); setPreviewUrl(URL.createObjectURL(prepared)); }
    catch (error) { setMessage(error instanceof Error ? error.message : "图片处理失败"); }
    finally { setProcessingAvatar(false); }
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (processingAvatar) { setMessage("头像正在处理，请稍候"); return; }
    const started = performance.now(); const timings: Record<string, string> = {};
    const measure = async <T,>(label: string, task: () => Promise<T>) => { const mark = performance.now(); const value = await task(); timings[label] = `${Math.round(performance.now() - mark)}ms`; return value; };
    const validationStarted = performance.now();
    const cleanName = name.trim(); const cleanTitle = title.trim(); const cleanPunishment = punishment.trim() || "请大家喝奶茶";
    if (!cleanName || !cleanTitle) { setMessage("请填写昵称和搞笑称号"); return; }
    timings.validation = `${Math.round(performance.now() - validationStarted)}ms`;
    timings["avatar processing"] = avatar ? `${Math.round(avatarProcessingMs.current)}ms (提交前完成)` : "skipped";
    setSaving(true); setMessage("");
    try {
      const avatarUrl = avatar ? await measure("avatar upload + signed URL", () => uploadAvatar(avatar)) : null;
      timings["create crimes"] = "server-side: none at creation";
      timings["create vote options"] = "server trigger (included in case insert)";
      const item = await measure("case insert", () => createCase({ name: cleanName, title: cleanTitle, punishment: cleanPunishment, avatarUrl }));
      timings.navigation = `${Math.round(performance.now() - started)}ms (started)`;
      if (process.env.NODE_ENV !== "production") console.table({ ...timings, TOTAL: `${Math.round(performance.now() - started)}ms` });
      window.location.href = `/case/${item.slug}`;
    } catch (error) { if (process.env.NODE_ENV !== "production") console.table({ ...timings, TOTAL: `${Math.round(performance.now() - started)}ms (failed)` }); setMessage(error instanceof Error ? error.message : "创建失败，请重试"); setSaving(false); }
  };
  return <main><div className="noise" /><section className="shell create-page"><header className="topline"><Link href="/">← 返回案件广场</Link><span>创建新案件</span></header><div className="forum-hero"><h1>创建新案件</h1><p>来给你的朋友安排一场公开审判。</p></div><form className="crime-form create-form" onSubmit={submit}><label>昵称<input required maxLength={24} value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：小陈" /></label><label>搞笑称号<input required maxLength={36} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：消息已读消失术大师" /></label><label>头像图片（可选，2MB 以内）<input type="file" accept="image/*" disabled={processingAvatar} onChange={(e) => void selectAvatar(e.target.files?.[0] || null)} /></label>{processingAvatar && <p>正在压缩头像…</p>}{previewUrl && <div className="avatar-preview"><Avatar src={previewUrl} alt="头像预览" /><span>头像预览</span></div>}<label>最终处罚<input maxLength={48} value={punishment} onChange={(e) => setPunishment(e.target.value)} placeholder="请大家喝奶茶" /></label><p>创建后可在案件详情继续追加罪状和修改资料。</p><button disabled={saving || processingAvatar}>{saving ? "正在立案…" : processingAvatar ? "正在处理头像…" : "⚔️ 创建案件"}</button>{message && <p className="notice error">{message}</p>}</form></section></main>;
}
