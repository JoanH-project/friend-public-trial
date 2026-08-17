const cloudbase = require("@cloudbase/node-sdk");
const db = cloudbase.init().database();
exports.main = async (event) => {
  const caseId = typeof event.caseId === "string" ? event.caseId : "";
  const name = typeof event.name === "string" ? event.name.trim().slice(0, 24) : "";
  const title = typeof event.title === "string" ? event.title.trim().slice(0, 36) : "";
  if (!caseId || !name || !title) throw new Error("invalid case");
  await db.collection("cases").doc(caseId).update({ name, title, avatarUrl: typeof event.avatarUrl === "string" ? event.avatarUrl.slice(0, 1024) : null });
  const { data } = await db.collection("cases").doc(caseId).get();
  return { case: data[0] };
};
