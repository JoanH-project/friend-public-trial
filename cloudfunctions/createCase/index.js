const cloudbase = require("@cloudbase/node-sdk");
const db = cloudbase.init().database();
const clean = (value, length) => typeof value === "string" ? value.trim().slice(0, length) : "";
exports.main = async (event) => {
  const name = clean(event.name, 24); const title = clean(event.title, 36);
  if (!name || !title) throw new Error("name and title are required");
  const slug = `case-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const result = await db.collection("cases").add({ slug, name, title, avatarUrl: null, punishment: "请大家喝奶茶", heatCount: 0, createdAt: new Date() });
  const { data } = await db.collection("cases").doc(result.id).get();
  return { case: data[0] };
};
