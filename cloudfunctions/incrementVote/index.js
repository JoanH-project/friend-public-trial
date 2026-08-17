const cloudbase = require("@cloudbase/node-sdk");
const app = cloudbase.init();
const db = app.database();
const _ = db.command;

exports.main = async (event) => {
  const optionId = typeof event.optionId === "string" ? event.optionId : "";
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(optionId)) throw new Error("invalid optionId");
  await db.collection("vote_options").doc(optionId).update({ voteCount: _.inc(1) });
  const { data } = await db.collection("vote_options").doc(optionId).get();
  if (!data[0]) throw new Error("vote option not found");
  return { voteCount: Number(data[0].voteCount) };
};
