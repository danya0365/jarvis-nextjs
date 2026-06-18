/**
 * agent-eval.mjs — ชุดทดสอบ agent อัตโนมัติ + วัด input token
 *
 * รัน dev server ก่อน (npx next dev -p 3210) แล้ว:
 *   node scripts/agent-eval.mjs [model] [baseUrl]
 * ตัวอย่าง:
 *   node scripts/agent-eval.mjs anthropic/claude-sonnet-4.6 http://localhost:3210
 *
 * ตรวจ: (1) AI เรียก tool ถูกตัว (2) ข้อมูลลง Turso ถูก (3) prompt/cached tokens ต่อ turn
 * ใช้ workspace ชื่อ "eval-jarvis" (ลบทิ้งต้น/ปลายการทดสอบ) — ไม่แตะข้อมูลจริง
 */

const MODEL = process.argv[2] || "anthropic/claude-sonnet-4.6";
const BASE = process.argv[3] || "http://localhost:3210";
const WS = "eval-jarvis";
const today = new Date().toISOString().slice(0, 10);

const api = {
  async get(path) {
    const r = await fetch(BASE + path, { cache: "no-store" });
    return r.ok ? r.json() : null;
  },
  async del(path) {
    await fetch(BASE + path, { method: "DELETE" }).catch(() => {});
  },
};

/** ยิงข้อความเข้า /api/agent (1 turn) → คืน {tools, content, usage} */
async function agent(prompt) {
  const res = await fetch(BASE + "/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: prompt }] }),
  });
  const text = await res.text();
  const tools = [];
  let content = "";
  let usage = { prompt_tokens: 0, completion_tokens: 0, cached_tokens: 0 };
  for (const line of text.split("\n")) {
    const l = line.trim();
    if (!l.startsWith("data:")) continue;
    const p = l.slice(5).trim();
    if (p === "[DONE]") break;
    let d;
    try { d = JSON.parse(p); } catch { continue; }
    if (d.jarvis_tool) tools.push(d.jarvis_tool.tool);
    else if (d.jarvis_error) content += `[ERROR] ${d.jarvis_error}`;
    else if (d.choices) content += d.choices[0]?.delta?.content ?? "";
    else if (d.usage) usage = d.usage;
  }
  return { tools, content, usage };
}

async function findWsId(name) {
  const all = (await api.get("/api/workspaces")) || [];
  return all.find((w) => w.name === name)?.id ?? null;
}

const results = [];
function record(name, prompt, r, pass, note) {
  results.push({ name, prompt, tools: r.tools.join(",") || "-", ...r.usage, pass, note });
}

async function main() {
  console.log(`\n🧪 agent-eval | model=${MODEL} | base=${BASE}\n`);

  // cleanup ก่อน
  const pre = await findWsId(WS);
  if (pre) await api.del(`/api/workspaces/${pre}`);
  await api.del("/api/user-profile"); // ไม่มี DELETE — ข้าม (จะ overwrite ตอนเทสต์)

  // ── 1. ทักทาย (ไม่ควรเรียก tool — วัด baseline token ต่ำ) ──
  let r = await agent("สวัสดี ทักทายสั้นๆ");
  record("greet (no-tool)", "สวัสดี", r, r.tools.length === 0, r.tools.length ? `เรียก ${r.tools}` : "");

  // ── 2. สร้าง workspace ──
  r = await agent(`สร้าง workspace ชื่อ ${WS}`);
  record("create_workspace", "สร้าง ws", r, r.tools.includes("create_workspace"), "");

  // ── 3. เพิ่ม record ──
  r = await agent(`บันทึกลง ${WS} ว่าบริษัทก่อตั้งปี 2024 ทุน 1 ล้าน`);
  record("add_record", "เพิ่ม record", r, r.tools.includes("add_record"), "");

  // ── 4. รายรับ ──
  r = await agent(`บันทึกรายรับ 5000 บาทวันที่ ${today} ของ ${WS} หมวดค่าคอร์ส`);
  record("add_transaction income", "income 5000", r, r.tools.includes("add_transaction"), "");

  // ── 5. รายจ่าย ──
  r = await agent(`บันทึกรายจ่าย 2000 บาทวันที่ ${today} ของ ${WS} หมวดค่าโฆษณา`);
  record("add_transaction expense", "expense 2000", r, r.tools.includes("add_transaction"), "");

  // ── 6. สรุปการเงิน + ตรวจ DB ──
  r = await agent(`${WS} ตอนนี้กำไรเท่าไหร่`);
  const wsId = await findWsId(WS);
  const sum = wsId ? await api.get(`/api/workspaces/${wsId}/transactions/summary`) : null;
  const netOk = sum && sum.income === 5000 && sum.expense === 2000 && sum.net === 3000;
  record("summarize_finance", "กำไร?", r,
    r.tools.includes("summarize_finance") && netOk,
    sum ? `DB net=${sum.net} (income ${sum.income}/expense ${sum.expense})` : "no DB");

  // ── 7. recall record ──
  r = await agent(`${WS} ก่อตั้งปีไหน`);
  record("list_records recall", "ก่อตั้งปีไหน", r,
    r.tools.includes("list_records") && /2024/.test(r.content),
    /2024/.test(r.content) ? "ตอบ 2024 ✓" : `ตอบ: ${r.content.slice(0, 40)}`);

  // ── 8. update_user_profile + ตรวจ DB ──
  r = await agent("จำไว้นะ ผมชื่อมารดี เป็นเจ้าของ AI Agent Academy ชอบคำตอบสั้นๆ");
  const prof = await api.get("/api/user-profile");
  const profOk = r.tools.includes("update_user_profile") && prof && /มารดี/.test(prof.profile || "");
  record("update_user_profile", "บอกชื่อ", r, profOk,
    prof?.profile ? `profile: ${prof.profile.slice(0, 50)}` : "no profile");

  // ── สรุปผล ──
  console.log("─".repeat(110));
  console.log(
    "case".padEnd(26),
    "tools".padEnd(26),
    "prompt".padStart(7),
    "cached".padStart(7),
    "compl".padStart(6),
    " pass"
  );
  console.log("─".repeat(110));
  let promptSum = 0, cachedSum = 0, passCount = 0;
  for (const x of results) {
    promptSum += x.prompt_tokens; cachedSum += x.cached_tokens; if (x.pass) passCount++;
    console.log(
      x.name.padEnd(26),
      x.tools.slice(0, 25).padEnd(26),
      String(x.prompt_tokens).padStart(7),
      String(x.cached_tokens).padStart(7),
      String(x.completion_tokens).padStart(6),
      x.pass ? "  ✅" : "  ❌",
      x.note ? `  ${x.note}` : ""
    );
  }
  console.log("─".repeat(110));
  console.log(`รวม prompt_tokens=${promptSum}  cached_tokens=${cachedSum}  ผ่าน ${passCount}/${results.length}`);
  const greet = results[0];
  console.log(`baseline (turn ไม่เรียก tool): prompt=${greet.prompt_tokens} tokens`);

  // cleanup ปลาย — ลบ workspace ทดสอบ + รีเซ็ต profile (กันข้อมูลทดสอบค้าง)
  const finalId = await findWsId(WS);
  if (finalId) await api.del(`/api/workspaces/${finalId}`);
  await fetch(BASE + "/api/user-profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile: "" }),
  }).catch(() => {});
  console.log(`\n🧹 ลบ workspace ทดสอบ "${WS}" + รีเซ็ต profile แล้ว\n`);

  process.exit(passCount === results.length ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
