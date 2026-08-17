"use client";

import Link from "next/link";
import { useState } from "react";
import { createCase, isCloudbaseConfigured, uploadAvatar } from "@/lib/cloudbase";

export default function CreateCase() {
  const [name, setName] = useState(""); const [title, setTitle] = useState(""); const [punishment, setPunishment] = useState("请大家喝奶茶");
  const [avatar, setAvatar] = useState<File | null>(null); const [saving, setSaving] = useState(false); const [message, setMessage] = useState("");
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (!isCloudbaseConfigured) { setMessage("CloudBase 环境尚未配置"); return; }
    setSaving(true); setMessage("");
    try {
      const avatarUrl = avatar ? await uploadAvatar(avatar) : null;
      const item = await createCase({ name: name.trim(), title: title.trim(), punishment: punishment.trim() || "请大家喝奶茶", avatarUrl });
      window.location.href = `/case/${item.slug}`;
    } catch (error) { setMessage(error instanceof Error ? error.message : "创建失败，请重试"); setSaving(false); }
  };
  return <main><div className="noise" /><section className="shell create-page"><header className="topline"><Link href="/">← 返回案件广场</Link><span>创建新案件</span></header><div className="forum-hero"><h1>创建新案件</h1><p>来给你的朋友安排一场公开审判。</p></div><form className="crime-form create-form" onSubmit={submit}><label>昵称<input required maxLength={24} value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：小陈" /></label><label>搞笑称号<input required maxLength={36} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：消息已读消失术大师" /></label><label>头像图片（可选，2MB 以内）<input type="file" accept="image/*" onChange={(e) => setAvatar(e.target.files?.[0] || null)} /></label><label>最终处罚<input maxLength={48} value={punishment} onChange={(e) => setPunishment(e.target.value)} placeholder="请大家喝奶茶" /></label><p>创建后可在案件详情继续追加罪状和修改资料。</p><button disabled={saving}>{saving ? "正在立案…" : "⚔️ 创建案件"}</button>{message && <p className="notice error">{message}</p>}</form></section></main>;
}
