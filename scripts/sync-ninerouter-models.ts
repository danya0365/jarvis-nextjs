/**
 * sync-ai-models
 * ดึงโมเดลฟรีมาอัปเดต src/application/ai/models.ts จาก 2 แหล่ง
 *
 *  - OpenCode Zen: GET https://opencode.ai/zen/v1/models (ไม่ต้องใช้ key)
 *    คือรายการโมเดลที่ Zen เปิดให้เรียกจริง — แหล่งที่เชื่อถือที่สุด
 *  - models.dev (provider "opencode"): ใช้หา metadata (ราคา, context, tool support)
 *    เพราะ Zen ไม่คืนราคามา
 *
 * เหตุผลที่ต้อง sync อัตโนมัติ: โมเดลฟรีทุกตัวมี end-of-life ติดมาด้วย
 * models.dev ยังมีตัวที่ตายแล้วอยู่ (เช่น 38 ตัว แต่ Zen เปิดแค่ 12)
 * ต้อง intersect สองเส้นถึงจะได้เฉพาะตัวที่ยังเรียกได้
 *
 * ใช้: npm run sync:models
 */

import { writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ZEN_MODELS_URL = "https://opencode.ai/zen/v1/models";
const MODELS_DEV_URL = "https://models.dev/api.json";
const PROVIDER_KEY = "opencode";
/** ช่องระบุว่าโมเดลตัวนี้ฟรี (ไม่มีค่าใช้จ่ายเลย) */
const FREE = 0;

interface ModelsDevModel {
  id: string;
  name: string;
  cost?: { input?: number; output?: number };
  limit?: { context?: number };
  tool_call?: boolean;
}

interface ModelsDevProvider {
  name?: string;
  models: Record<string, ModelsDevModel>;
}

interface ZenModel {
  id: string;
}

interface ZenModelList {
  data: ZenModel[];
}

const MODELS_FILE = resolve(
  process.cwd(),
  "src/application/ai/models.ts"
);

/** ขอบเขตที่ script นี้จัดการ — ป้องกันไปแตะส่วนอื่นของไฟล์ */
const BEGIN_MARKER = "  // ── 9router";
/** ปิดท้ายด้วยการหา "];\n" ถัดไปจาก BEGIN_MARKER — ทนทานกว่าผูกกับโค้ดหลัง */
const ARRAY_CLOSE = "];";

async function main(): Promise<void> {
  // ── 1. โมเดลที่ Zen เปิดให้เรียกจริง (ไม่ต้องใช้ key) ──
  const zenResponse = await fetch(ZEN_MODELS_URL);
  if (!zenResponse.ok) {
    throw new Error(`OpenCode Zen ไม่ตอบ (${zenResponse.status})`);
  }
  const zen = (await zenResponse.json()) as ZenModelList;
  const liveIds = new Set(zen.data.map((m) => m.id));

  if (liveIds.size === 0) {
    throw new Error("Zen คืนรายการโมเดลว่าง — อย่าเขียนทับไฟล์");
  }

  // ── 2. metadata (ราคา/context/tool) จาก models.dev ──
  const response = await fetch(MODELS_DEV_URL);
  if (!response.ok) {
    throw new Error(`models.dev ไม่ตอบ (${response.status})`);
  }

  const catalog = (await response.json()) as Record<string, ModelsDevProvider>;
  const provider = catalog[PROVIDER_KEY];
  if (!provider) {
    throw new Error(`ไม่พบ provider "${PROVIDER_KEY}" ใน models.dev`);
  }

  // ฟรี (cost 0) และ Zen ยังเปิดให้เรียก → เป็นตัวที่ใช้ได้จริง
  const freeModels = Object.values(provider.models)
    .filter((m) => m.cost?.input === FREE && m.cost?.output === FREE)
    .filter((m) => liveIds.has(m.id))
    .sort((a, b) => a.id.localeCompare(b.id));

  if (freeModels.length === 0) {
    throw new Error("ไม่พบโมเดลฟรีที่ Zen ยังเปิดให้เรียก — อย่าเขียนทับไฟล์");
  }

  const source = readFileSync(MODELS_FILE, "utf-8");
  const begin = source.indexOf(BEGIN_MARKER);
  if (begin === -1) {
    throw new Error("หา marker ของช่วง 9router ไม่เจอ — แก้ marker ในสคริปต์ก่อน");
  }
  const end = source.indexOf(ARRAY_CLOSE, begin);
  if (end === -1) {
    throw new Error("หาปิดอาเรย์ MODEL_OPTIONS ไม่เจอ");
  }

  // ── โมเดลที่ verify ว่าเรียกได้จริง — ไม่ใช่โมเดลฟรีจาก models.dev จึงต้องเขียนเอง ──
  // oc/* ที่เหลือโดน FreeTierError 403 (OpenCode บังคับให้เรียกจากใน OpenCode เท่านั้น)
  const curated = [
    {
      id: "nvidia/nvidia/nemotron-3-ultra-550b-a55b",
      label: "Nemotron 3 Ultra",
      description: "9router (Virtual Ocean) — เร็ว ราคาถูก context 128K",
      pricing: { inputPerMTok: 0.5, outputPerMTok: 1.5 },
    },
    {
      id: "openrouter/nvidia/nemotron-3-ultra-550b-a55b:free",
      label: "Nemotron 3 Ultra (ฟรี)",
      description: "alias ฟรีของ Nemotron บน 9router — context 128K",
      pricing: { inputPerMTok: 0, outputPerMTok: 0 },
    },
    {
      id: "openrouter/auto:free",
      label: "Auto Router (ฟรี)",
      description: "ให้ 9router เลือกโมเดลฟรีเองอัตโนมัติ (ไม่ต้องผูกบัญชี) — ตัวที่ได้จะเปลี่ยนตามเวลา",
      pricing: { inputPerMTok: 0, outputPerMTok: 0 },
    },
    {
      id: "openrouter/auto",
      label: "Auto Router",
      description: "ให้ 9router เลือกโมเดลเองอัตโนมัติ (เสียเงิน) — คุณภาพ/ราคาขึ้นกับตัวที่ถูก route",
      pricing: { inputPerMTok: 0, outputPerMTok: 0 },
    },
    {
      id: "oc/space-bunny-free",
      label: "Space Bunny (ฟรี)",
      description: "โมเดลฟรีตัวเดียวใน oc/ ที่เรียกได้โดยไม่ต้องผูกบัญชี — ตัวอื่นโดน 403",
      pricing: { inputPerMTok: 0, outputPerMTok: 0 },
    },
  ];

  // ── โมเดลของ OpenCode Zen ที่ตั้งใจให้เป็นค่าเริ่มต้น ──
  // ⚠️ free ตัวอื่นใน Zen โดน 403 FreeTierError ("only be used from within OpenCode")
  //    ผ่าน Zen เรียกได้จริงตัวเดียวคือ space-bunny-free (ยืนยันแล้วว่ารองรับ tool-calling)
  const zenCurated = [
    {
      id: "space-bunny-free",
      label: "Space Bunny (ฟรี)",
      description:
        "OpenCode Zen — ฟรี เรียกได้จริงจากนอก รองรับ tool-calling (ค่าเริ่มต้น)",
      pricing: { inputPerMTok: 0, outputPerMTok: 0 },
    },
    {
      id: "glm-5.3-flash",
      label: "GLM 5.3 Flash",
      description:
        "OpenCode Zen — ถูก ตอบเร็ว รองรับ tool-calling (เสียเงิน)",
      pricing: { inputPerMTok: 0.15, outputPerMTok: 0.5 },
    },
    {
      id: "kimi-k3",
      label: "Kimi K3",
      description:
        "OpenCode Zen — รองรับ tool-calling และ reasoning (เสียเงิน)",
      pricing: { inputPerMTok: 3, outputPerMTok: 15 },
    },
  ];

  const block = [
    BEGIN_MARKER,
    "  // ⚠️ ส่วนนี้ generate โดย scripts/sync-ninerouter-models.ts — อย่าแก้เอง",
    "  // ที่มาของชื่อโมเดลฟรี: models.dev (provider \"opencode\", cost 0 = ฟรี)",
    "  // ⚠️ oc/* ที่ไม่ใช่ space-bunny-free จะได้ 403 — OpenCode บังคับให้เรียกจากใน OpenCode เท่านั้น",
    "  //    การมีชื่อในรายการจึงไม่ได้แปลว่าเรียกได้ ให้ถือว่าเป็นตัวเลือกสำรอง",
    ...curated.map(
      (m) =>
        `  {\n` +
        `    id: ${JSON.stringify(m.id)},\n` +
        `    label: ${JSON.stringify(m.label)},\n` +
        `    description: ${JSON.stringify(m.description)},\n` +
        `    vendor: "9router",\n` +
        `    pricing: { inputPerMTok: ${m.pricing.inputPerMTok}, outputPerMTok: ${m.pricing.outputPerMTok} },\n` +
        `  },`
    ),
    "",
    "  // ── โมเดลฟรีจาก OpenCode ผ่าน 9router (oc/*) ──",
    "  // ⚠️ 9router บังคับให้เรียก oc/* จากใน OpenCode เท่านั้น → 403 FreeTierError",
    "  //    ตัวเหล่านี้จึงยังใช้ไม่ได้จริง มีไว้รอผูกบัญชี — ใช้งานจริงให้เลือก provider OpenCode",
    ...freeModels
      // curated ประกาศ id ไว้แล้ว (เช่น oc/space-bunny-free) — อย่าเขียนซ้ำ
      .filter((m) => !curated.some((c) => c.id === `oc/${m.id}`))
      .map(
        (m) =>
          `  {\n` +
          `    id: "oc/${m.id}",\n` +
          `    label: ${JSON.stringify(m.name)},\n` +
          `    description: "ผ่าน 9router โดน 403 — รอผูกบัญชี (ผ่าน OpenCode เรียกได้)",\n` +
          `    vendor: "9router",\n` +
          `    pricing: { inputPerMTok: 0, outputPerMTok: 0 },\n` +
          `  },`
      ),
    "",
    "  // ── OpenCode Zen (เรียกตรง ไม่ต้องผูกบัญชี upstream) ──",
    ...zenCurated.map(
      (m) =>
        `  {\n` +
        `    id: ${JSON.stringify(m.id)},\n` +
        `    label: ${JSON.stringify(m.label)},\n` +
        `    description: ${JSON.stringify(m.description)},\n` +
        `    vendor: "OpenCode",\n` +
        `    pricing: { inputPerMTok: ${m.pricing.inputPerMTok}, outputPerMTok: ${m.pricing.outputPerMTok} },\n` +
        `  },`
    ),
    ...freeModels
      // curated ของ Zen ประกาศ id ไว้แล้ว — อย่าเขียนซ้ำ
      .filter((m) => !zenCurated.some((c) => c.id === m.id))
      .map(
        (m) =>
          `  {\n` +
          `    id: ${JSON.stringify(m.id)},\n` +
          `    label: ${JSON.stringify(m.name)},\n` +
          `    description: "ฟรีชั่วคราวบน OpenCode Zen — context ` +
          `${formatContext(m.limit?.context)}${m.tool_call ? ", รองรับ tool" : ""}",\n` +
          `    vendor: "OpenCode",\n` +
          `    pricing: { inputPerMTok: 0, outputPerMTok: 0 },\n` +
          `  },`
      ),
    "",
  ].join("\n");

  writeFileSync(MODELS_FILE, source.slice(0, begin) + block + source.slice(end));

  // ── ยืนยันหลังเขียน: curated ต้องไม่หายไปไหน ──
  const after = readFileSync(MODELS_FILE, "utf-8");
  const lost = [...curated, ...zenCurated].filter(
    (m) => !after.includes(`id: ${JSON.stringify(m.id)}`)
  );
  if (lost.length > 0) {
    throw new Error(
      `โมเดลที่ verify แล้วหายไปหลัง sync: ${lost.map((m) => m.id).join(", ")}`
    );
  }

  console.log(
    `อัปเดต ${freeModels.length} โมเดลฟรี (Zen เปิดให้เรียก ${liveIds.size} ตัว) ` +
      `+ ${curated.length + zenCurated.length} โมเดลที่ verify แล้ว ใน ${MODELS_FILE}`
  );
}

function formatContext(context: number | undefined): string {
  if (!context) return "ไม่ระบุ";
  return context >= 1_000_000
    ? `${(context / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
    : `${Math.round(context / 1000)}K`;
}

main().catch((error) => {
  console.error("sync-ninerouter-models ล้มเหลว:", error);
  process.exit(1);
});
