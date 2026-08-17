const cloudbase = require("@cloudbase/node-sdk");
const app = cloudbase.init();
const db = app.database();
const _ = db.command;

exports.main = async (event) => {
  const caseId = typeof event.caseId === "string" ? event.caseId : "";
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(caseId)) throw new Error("invalid caseId");
  await db.collection("cases").doc(caseId).update({ heatCount: _.inc(1) });
  const { data } = await db.collection("cases").doc(caseId).get();
  if (!data[0]) throw new Error("case not found");
  return { heatCount: Number(data[0].heatCount) };
};
