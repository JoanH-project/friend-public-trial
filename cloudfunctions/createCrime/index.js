const cloudbase = require("@cloudbase/node-sdk");
const db = cloudbase.init().database();
exports.main = async (event) => {
  const caseId = typeof event.caseId === "string" ? event.caseId : "";
  const title = typeof event.title === "string" ? event.title.trim().slice(0, 32) : "";
  const description = typeof event.description === "string" ? event.description.trim().slice(0, 120) : "";
  if (!caseId || !title || !description) throw new Error("invalid crime");
  const result = await db.collection("crimes").add({ caseId, title, description, severity: 3, sortOrder: Number(event.sortOrder) || 0, createdAt: new Date() });
  const { data } = await db.collection("crimes").doc(result.id).get();
  return { crime: data[0] };
};
