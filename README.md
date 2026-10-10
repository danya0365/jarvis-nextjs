<div align="center">

# 🤖 Jarvis

**ระบบแชต AI หลาย session คุยต่อเนื่อง — เลือก provider ได้ 3 เจ้า (WaveSpeed / 9router / OpenCode Zen)**

สร้างด้วย Next.js App Router ตามหลัก Clean Architecture<br/>
Streaming แบบ real-time · ประวัติแชตเก็บบน Turso (libsql SQLite) · Dark mode

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

[เริ่มต้นใช้งาน](#-เริ่มต้นใช้งาน) · [ฟีเจอร์](#-ฟีเจอร์) · [สถาปัตยกรรม](#-สถาปัตยกรรม) · [โครงสร้างโปรเจกต์](#-โครงสร้างโปรเจกต์) · [โมเดลที่รองรับ](#-โมเดลที่รองรับ)

</div>

---

## ✨ ฟีเจอร์

- **💬 แชตกับ AI แบบ streaming** — คำตอบทยอยขึ้นทีละ token แบบ real-time ผ่าน Server-Sent Events พร้อมปุ่มหยุดกลางคัน (เก็บคำตอบบางส่วนไว้ให้)
- **🗂️ หลาย session แยกอิสระ** — สร้าง เปลี่ยนชื่อ ลบ และสลับบทสนทนาได้ไม่จำกัด แต่ละ session จำบริบทของตัวเอง
- **🧠 คุยต่อเนื่อง** — ส่งประวัติของ session ให้ LLM ทุกเทิร์น AI จึงจำสิ่งที่คุยกันก่อนหน้าได้
- **🎛️ เลือก provider และโมเดลได้ต่อ session** — สลับ provider (WaveSpeed / 9router / OpenCode Zen) และโมเดลได้จาก dropdown ที่กรองตาม provider ที่เลือก (เปลี่ยน provider แล้วโมเดลจะถูก remap ให้อัตโนมัติ)
- **♻️ รายการโมเดลฟรี sync อัตโนมัติ** — รายสัปดาห์ดึงโมเดลฟรีล่าสุดจาก OpenCode มาให้เอง ตัวที่ end-of-life แล้วจะหายไปเอง (ตั้งค่าเป็นรายสัปดาห์ได้)
- **📊 Monitor การใช้งาน** — เห็น token และค่าใช้จ่าย (USD) ของทุกคำตอบ ยอดรวมต่อ session และ dashboard สะสมทั้งหมด/วันนี้/แยกตามโมเดล (ยอดไม่หายแม้ลบแชต)
- **✂️ บริหาร token ประหยัดเงิน** — เลือกส่งเฉพาะข้อความล่าสุดให้ AI แทนการส่ง history ทั้งหมด, จำกัดความยาวคำตอบ (max_tokens) และเห็น preview ก่อนส่งว่าจะใช้ ~กี่ token
- **🧠 ความจำอัจฉริยะ (rolling summary)** — สรุปบทสนทนาเก่าเป็น "ความจำ" ของ session แล้วแนบให้ AI ทุกเทิร์น ส่ง token น้อยแต่ AI ยังจำเรื่องสำคัญได้ (สรุปอัตโนมัติเมื่อคุยยาว หรือกดสรุปเองได้ เลือกโมเดลถูกๆ มาสรุปได้ใน ⚙️) — เป็นโหมดเริ่มต้น
- **🗂️ Workspace + AI จัดการข้อมูลเอง (tool-calling)** — คลังข้อมูลที่ใช้ร่วมกันข้ามทุกแชต (ข้อมูลบริษัท/รายรับ-รายจ่าย/โน้ต) AI **query และเพิ่ม/แก้/ลบข้อมูลเองได้** ผ่าน agentic loop ฝั่ง server เช่นบอก "บันทึกรายรับ 5000 วันนี้" หรือ "เดือนนี้กำไรเท่าไหร่" แล้ว AI ลงมือผ่าน tool ให้ทันที — เปิดดู/จัดการที่ปุ่ม 🗂️
- **👤 โปรไฟล์ผู้ใช้ข้ามทุกแชต** — ข้อมูลถาวรเกี่ยวกับตัวคุณ (ชื่อ/บทบาท/ความชอบ) แนบให้ AI ทุกบทสนทนาเพื่อตอบตรงตัวคุณโดยไม่ต้องเล่าซ้ำ — AI อัปเดตให้อัตโนมัติเมื่อรู้จักคุณมากขึ้น (tool `update_user_profile`) หรือแก้เองที่ปุ่ม 👤
- **🪶 Optimize input token** — context จัดเป็นชั้น (System → Profile → Summary → Recent → Current), tool schemas ย่อสั้น, และไม่ส่ง tools ตอนตอบสุดท้าย → ลด prompt tokens ~18-20%/เทิร์น (วัดด้วย `scripts/agent-eval.mjs <provider> [model]`)
- **💾 ประวัติไม่หาย ใช้ข้ามเครื่องได้** — เก็บแชต/ตั้งค่า/ยอด token บน Turso (libsql SQLite) ผ่าน API route ฝั่ง server refresh หรือเปลี่ยนเบราว์เซอร์/อุปกรณ์ก็เห็นข้อมูลเดียวกัน
- **🌗 Dark mode** — สลับ light/dark ได้ จำค่าไว้ และไม่มี flash ตอนโหลดหน้า (FOUC-free)
- **🔐 API key ปลอดภัย** — เรียก LLM ผ่าน API route ฝั่ง server เท่านั้น key ไม่หลุดไป browser
- **🇹🇭 UI ภาษาไทย** — ทุก state ของหน้าจอ (loading / error / empty) เป็นภาษาไทยทั้งหมด

## 🚀 เริ่มต้นใช้งาน

### สิ่งที่ต้องมี

- Node.js 20 ขึ้นไป
- **LLM provider อย่างน้อย 1 เจ้า** (เลือกได้ตามต้องการ ไม่บังคับให้มีครบ):
  - [WaveSpeed](https://wavespeed.ai) (สมัครฟรี มี credit ให้ทดลอง)
  - [OpenCode Zen](https://opencode.ai/auth) — มีโมเดลฟรี `space-bunny-free` ใช้ได้เลย
  - 9router — ต้องผูกบัญชี upstream ราย provider ก่อนถึงจะเรียกโมเดลส่วนใหญ่ได้
- [Turso database](https://turso.tech) (free tier — เก็บประวัติแชต/ตั้งค่า/ยอด token)

### ติดตั้ง

```bash
# 1. ติดตั้ง dependencies
npm install

# 2. ตั้งค่า env
cp .env.example .env.local
# แก้ .env.local →
#   TURSO_DATABASE_URL=libsql://<db>.turso.io  (turso db show <db> --url)
#   TURSO_AUTH_TOKEN=ใส่ token ของคุณ          (turso db tokens create <db>)
#
#   ใส่ key ของ provider ที่ต้องการใช้ (อย่างน้อย 1 ตัว):
#   WAVESPEED_API_KEY=...    (wavespeed.ai → Dashboard → API Keys)
#   OPENCODE_API_KEY=...     (opencode.ai/auth)
#   NINE_ROUTER_API_KEY=...  (9router — ต้องผูก upstream เพิ่มด้วย)

# 3. รัน dev server
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000) แล้วเริ่มแชตได้เลย 🎉

### คำสั่งทั้งหมด

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run dev` | รัน development server |
| `npm run build` | build สำหรับ production |
| `npm start` | รัน production server |
| `npm run lint` | ตรวจโค้ดด้วย ESLint |
| `npm run sync:models` | ดึงโมเดลฟรีล่าสุดจาก OpenCode มาอัปเดต catalog (ต้องต่อเน็ต) |

## 🏗 สถาปัตยกรรม

โปรเจกต์ยึด **Clean Architecture** แยกชั้นชัดเจน — UI ไม่รู้จัก data source, business logic ทดสอบได้โดยไม่ต้องมี database

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│  page.tsx ──► PresenterFactory ──► Presenter ──► View.tsx   │
│                                        │                     │
│                          usePresenter Hook ──► [state, actions]
└─────────────────────────────────────────────────────────────┘
                              │ Dependency Injection
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│           IChatSessionRepository (Contract)                  │
└─────────────────────────────────────────────────────────────┘
                              │ Implementation
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                      │
│  Http repo (client) → API route → Turso repo → libsql DB    │
│         Mock (server/dev) │ WaveSpeed │ 9router │ OpenCode   │
└─────────────────────────────────────────────────────────────┘
```

**หลักการสำคัญ:**

- **Repository Pattern** — Presenter รับ `IChatSessionRepository` ผ่าน constructor ไม่ผูกกับ storage ใดๆ การสลับ localStorage → Turso ทำที่ factory บรรทัดเดียว (`ChatPresenter` ไม่ต้องแก้เลย)
- **เก็บข้อมูลบน Turso ผ่าน 3 ชั้น** — Turso token เป็นความลับฝั่ง server และ `@libsql/client` ต้องรัน Node runtime แต่ Presenter รันฝั่ง client จึงคั่นด้วย: `Http*Repository` (client, `fetch`) → API route (`/api/sessions|settings|usage`, Node) → `Turso*Repository` (SQL จริง) → libsql SQLite
- **Presenter Pattern** — business logic ทั้งหมด (จัดการ session, ส่งข้อความ, parse SSE stream) อยู่ใน `ChatPresenter` ตัวเดียว ใช้ร่วมกันทั้ง server และ client
- **Logic-free View** — `ChatView` เป็น JSX ล้วน 100% ทุก state และ action มาจาก hook `useChatPresenter` ที่คืน `[state, actions]` tuple

### Streaming Flow

```
ChatView ──► useChatPresenter ──► ChatPresenter.sendMessage()
                                        │
                                        ▼
                              POST /api/chat (route handler)
                                        │  pass-through SSE
                                        ▼
                     LLM provider (stream: true) — เลือกต่อ session
                                        │
              onToken() ◄── SSE parser ◄┘
                  │
                  ▼
        React state อัปเดตทีละ token ──► persist ครั้งเดียวตอนจบ
```

- การแชตจริงส่งผ่าน `POST /api/agent` (agentic loop ด้านล่าง) ส่วน `/api/chat` เป็น proxy ตรงๆ ใช้ตอนสรุปความจำ — ส่ง `upstream.body` ต่อ ไม่ parse กลางทาง (backpressure ดี)
- SSE parser ฝั่ง client ใช้ `TextDecoder` แบบ `{stream: true}` รองรับตัวอักษรไทย (multi-byte UTF-8) ที่ขาดกลาง chunk

### Agent Loop (AI จัดการ workspace เอง)

```
ChatPresenter.sendMessage() ──► POST /api/agent (Node runtime)
                                      │  inject: รายชื่อ workspace + นิยาม tools
                                      ▼
                            ┌── provider (stream:false, tools) ◄──┐
                            ▼                                     │ วนซ้ำ (≤6 รอบ)
                  มี tool_calls?  ──yes──► executeTool() แตะ Turso ─┘ + emit SSE event:tool
                            │ no
                            ▼
                  stream คำตอบสุดท้าย ──► SSE content + usage ──► client persist
```

- **tool รันฝั่ง server เท่านั้น** — เป็น interface เดียวที่ AI แตะ DB ได้ (query/เพิ่ม/แก้/ลบ workspace) จึงไม่ต้องแยก sandbox DB และ token ไม่หลุดไป client
- tool คือ native OpenAI function-calling — `WORKSPACE_TOOLS` + `executeTool()` ใน `workspaceTools.ts` (ทดสอบแล้วว่าใช้ได้กับ WaveSpeed, 9router และ OpenCode Zen)
- ไม่ persist tool messages — history สะอาด ข้อมูลจริงอยู่ใน workspace DB อยู่แล้ว; usage รวมทุก step บันทึก ledger เป็น `kind: "agent"`
- ยกเลิกกลางทางได้ผ่าน `AbortController` — signal ถูกส่งต่อถึง provider จึงไม่มี request ค้าง

**Optimize input token (layered context):** context จัดเป็นชั้น System → User Profile → Conversation Summary → Recent → Current. ลด token ด้วย (1) tool schemas ย่อสั้น (2) **ไม่ส่ง tools ใน step ตอบสุดท้าย** (3) ใส่รายชื่อ workspace ใน system prompt เพื่อตัด step `list_workspaces` → ลด ~18-20%/เทิร์น. *หมายเหตุ: ทดสอบแล้ว WaveSpeed ไม่ทำ prompt-caching ให้เมื่อมี `tools` ในคำขอ จึงพึ่งการลดขนาด/จำนวน step แทน — ส่วน OpenCode Zen ทำ caching ได้ดี (รวม ~24.8K cached จาก ~44.5K prompt ใน 8 เทิร์น)*. วัดผลด้วย `node scripts/agent-eval.mjs <provider> [model]` (ยิงทุก tool + เช็ค DB + วัด prompt/cached tokens).

### Multi-provider

ตาราง provider ทั้งหมดอยู่ใน [`src/application/ai/providers.ts`](src/application/ai/providers.ts) — เพิ่ม provider ใหม่ได้โดยเพิ่ม entry ใน `PROVIDERS` (ต้องมี `envVar`, `defaultModel`, `createClient`, `supportedModels`)

**โมเดลต้องอยู่ใน provider ที่เลือกเสมอ** — ถ้าคู่ provider/model ไม่ตรงกันจะถูก remap ให้อัตโนมัติ (`resolveModelForProvider`) เพราะการข้าม provider ทำให้ upstream ตอบ 404

| provider | base URL | หมายเหตุ |
|---|---|---|
| `wavespeed` | `https://api.wavespeed.ai/api/v3` | รองรับ ~290 models |
| `ninerouter` | `https://nine-router-1.easy-ai.online/v1` | aggregator — ต้องผูกบัญชี upstream ราย provider ไม่งั้น 401/404 |
| `opencode` | `https://opencode.ai/zen/v1` | เรียกตรง ไม่ต้องผูก upstream · มีโมเดลฟรี |

**ข้อจำกัดที่เจอตอนทดสอบจริง:**

- **9router** — `oc/*` (โมเดลฟรีของ OpenCode) โดน `403 FreeTierError` เพราะ OpenCode บังคับให้เรียกจากใน CLI เท่านั้น · ตัวอื่นต้องผูกบัญชี upstream ก่อน · alias ที่ใช้ได้เลยคือ `nvidia/nvidia/nemotron-3-ultra-550b-a55b`, `openrouter/nvidia/nemotron-3-ultra-550b-a55b:free`, `openrouter/auto:free`, `openrouter/auto` และ `oc/space-bunny-free`
- **OpenCode Zen** — free tier ล็อกไว้เฉพาะใน CLI เช่นกัน ผ่าน API ตรงได้แค่ `space-bunny-free` (ฟรี รองรับ tool-calling) · ตัวเสียเงินที่ใช้ได้ผ่าน `/chat/completions` คือ `glm-5.3-flash`, `kimi-k3` · Claude/GPT/Gemini ต้องใช้ endpoint อื่น (`/responses`, `/messages`) ซึ่งแอปยังไม่รองรับ

### Sync รายการโมเดลฟรี

โมเดลฟรีทุกตัวมี end-of-life ติดมาด้วย และ provider ไม่ได้ flag ตัวที่ตาย จึงต้อง sync เป็นระยะ

[`scripts/sync-ninerouter-models.ts`](scripts/sync-ninerouter-models.ts) ดึงจาก 2 แหล่งแล้ว **intersect**:
1. `GET https://opencode.ai/zen/v1/models` — โมเดลที่ Zen เปิดให้เรียกจริง (ไม่ต้องใช้ key)
2. [models.dev](https://models.dev) provider `opencode` — metadata ราคา (`cost === 0` = ฟรี), context, tool support

ผลคือเฉพาะตัวที่ **ฟรีและยังเรียกได้** (ปัจจุบัน 12 ตัวจาก 38 ที่ models.dev บอก) พร้อมเขียนทับเฉพาะช่วงที่ generate ได้ มี guard ตรวจว่าโมเดลที่ verify แล้วไม่หาย

[`.github/workflows/sync-models.yml`](.github/workflows/sync-models.yml) รันอัตโนมัติทุกวันจันทร์ (commit เฉพาะตอน catalog เปลี่ยน) + ตรวจตอนเปิด PR ว่ายังตรงกับต้นทางไหม · กดมือได้จากหน้า Actions

> repo เป็น public → ต้องเปิด **Settings → Actions → Workflow permissions → Read and write permissions** ก่อน ไม่งั้น workflow push ไม่ได้

## 📁 โครงสร้างโปรเจกต์

```
jarvis-nextjs/
├── app/
│   ├── api/chat/route.ts            # POST proxy → provider (streaming SSE, ใช้ตอนสรุปความจำ)
│   ├── api/agent/route.ts           # POST agentic loop — AI เรียก tool จัดการ workspace (SSE)
│   ├── api/workspaces/**            # GET/POST/PATCH/DELETE workspace + records + transactions → Turso
│   ├── api/user-profile/route.ts    # GET/PUT โปรไฟล์ผู้ใช้ (singleton) → Turso
│   ├── api/sessions/route.ts        # GET/POST sessions → Turso
│   ├── api/sessions/[id]/route.ts   # GET/PATCH/DELETE session → Turso
│   ├── api/settings/route.ts        # GET/PUT settings → Turso
│   ├── api/usage/route.ts           # GET/POST/DELETE usage ledger → Turso
│   ├── chat/page.tsx                # หน้าแชต (Server Component)
│   ├── layout.tsx                   # Root layout + theme init script
│   └── globals.css                  # Tailwind + import theme tokens
├── .github/workflows/
│   └── sync-models.yml              # sync โมเดลฟรีอัตโนมัติทุกวันจันทร์ + ตรวจตอน PR
├── public/styles/
│   └── theme.css                    # Design tokens (light/dark) + Tailwind v4 @theme
├── scripts/
│   ├── sync-ninerouter-models.ts    # ดึงโมเดลฟรีจาก OpenCode Zen + models.dev
│   └── agent-eval.mjs               # ยิงทุก tool + วัด prompt/cached tokens
├── src/
│   ├── application/                 # ⚖️ Contracts — ไม่มี dependency ใดๆ
│   │   ├── ai/models.ts             #    รายการ LLM models + ราคา + ค่า default (ส่วน 9router/OpenCode generate โดย script)
│   │   ├── ai/providers.ts          #    provider registry (wavespeed/ninerouter/opencode)
│   │   ├── ai/tokens.ts             #    token estimator (fallback/preview)
│   │   ├── chat/settings.ts         #    การตั้งค่าบริหาร token
│   │   └── repositories/
│   │       ├── IChatSessionRepository.ts
│   │       ├── IChatSettingsRepository.ts
│   │       ├── IUsageLedgerRepository.ts  # บัญชีรายจ่าย token สะสม
│   │       ├── IWorkspaceRepository.ts    # คลังข้อมูลที่ AI เข้าถึงผ่าน tools
│   │       └── IUserProfileRepository.ts  # โปรไฟล์ผู้ใช้ (singleton, ชั้น context)
│   ├── infrastructure/              # 🔌 Adapters — คุยกับโลกภายนอก
│   │   ├── ai/OpenAICompatibleClient.ts  # base client (OpenAI-compatible, streaming + tools)
│   │   ├── ai/WaveSpeedClient.ts    #    WaveSpeed API client (server-only, รองรับ tools)
│   │   ├── ai/NineRouterClient.ts   #    9router (Virtual Ocean)
│   │   ├── ai/OpenCodeClient.ts     #    OpenCode Zen
│   │   ├── ai/workspaceTools.ts     #    นิยาม tool + executeTool (server-only)
│   │   ├── db/turso.ts              #    libsql client singleton + ensureSchema (server-only)
│   │   └── repositories/
│   │       ├── turso/               #    persistence จริงบน Turso (server-only)
│   │       ├── http/                #    client adapter → เรียก /api/* (persistence ที่ใช้งานจริง)
│   │       ├── localstorage/        #    เลิกใช้แล้ว — คงไว้เผื่อ rollback
│   │       └── mock/                #    สำหรับ dev/test/SSR
│   └── presentation/                # 🎨 UI Layer
│       ├── components/
│       │   ├── chat/ChatView.tsx    #    JSX ล้วน — ไม่มี logic
│       │   ├── chat/ChatSettingsPanel.tsx  # ตั้งค่าบริหาร token + โหมดความจำ
│       │   ├── chat/UsageStatsPanel.tsx     # 📊 dashboard การใช้งาน
│       │   ├── chat/MemoryPanel.tsx         # 🧠 ดู/สรุป/ล้างความจำของ session
│       │   ├── chat/WorkspacePanel.tsx      # 🗂️ ดู/สร้าง/ลบ workspace + ข้อมูลที่ AI เก็บ
│       │   ├── chat/UserProfilePanel.tsx     # 👤 ดู/แก้โปรไฟล์ผู้ใช้
│       │   └── shared/ThemeToggle.tsx
│       └── presenters/chat/
│           ├── ChatPresenter.ts     #    business logic + SSE parser
│           ├── ChatPresenterServerFactory.ts
│           ├── ChatPresenterClientFactory.ts
│           └── useChatPresenter.ts  #    state management hook
└── .env.example                     # template ตัวแปร environment
```

## ⚙️ Environment Variables

| ตัวแปร | จำเป็น | คำอธิบาย |
|---|---|---|
| `TURSO_DATABASE_URL` | ✅ | libsql connection URL ของ Turso database (เช่น `libsql://<db>.turso.io`) — ใช้ฝั่ง server เท่านั้น |
| `TURSO_AUTH_TOKEN` | ✅ | auth token ของ Turso — **ความลับฝั่ง server** ห้าม prefix `NEXT_PUBLIC_` |
| `WAVESPEED_API_KEY` | อย่างน้อย 1 | API key จาก [wavespeed.ai](https://wavespeed.ai) — ใช้ฝั่ง server เท่านั้น |
| `OPENCODE_API_KEY` | อย่างน้อย 1 | API key จาก [opencode.ai/auth](https://opencode.ai/auth) — มีโมเดลฟรี `space-bunny-free` |
| `NINE_ROUTER_API_KEY` | อย่างน้อย 1 | API key จาก 9router — **ต้องผูกบัญชี upstream ราย provider เพิ่มด้วย** ไม่งั้นเรียกโมเดลส่วนใหญ่ไม่ได้ · upstream ไม่เสถียร (เจอ 500/502 กลางคัน) |
| `NINE_ROUTER_BASE_URL` | — | มีค่า default อยู่แล้ว เปลี่ยนได้ถ้าเปลี่ยน endpoint |

> ใส่ key ของ provider ที่ต้องการใช้ **อย่างน้อย 1 ตัว** — provider ที่ไม่ได้ตั้ง key จะขึ้น error ตอนสลับไปใช้ ไม่กระทบตัวอื่น

> สร้าง database + token ได้ด้วย [Turso CLI](https://docs.turso.tech): `turso db create jarvis` → `turso db show jarvis --url` (URL) → `turso db tokens create jarvis` (token). Schema (`chat_sessions` / `chat_settings` / `usage_ledger` / `user_profile` / `workspaces` / `workspace_records` / `workspace_transactions`) ถูกสร้างอัตโนมัติครั้งแรกที่รัน (`ensureSchema`).

## 🤖 โมเดลที่รองรับ

รายการโมเดลอยู่ใน [`src/application/ai/models.ts`](src/application/ai/models.ts) และจะแสดงใน dropdown ตาม provider ที่เลือก

### WaveSpeed (~290 models)

| โมเดล | จุดเด่น |
|---|---|
| **MiniMax M2.7** (default) | เร็ว ราคาถูก context 205K |
| MiniMax M3 | รุ่นใหม่กว่า M2.7 — context 1M ราคาประหยัด |
| Claude Fable 5 | เรือธงตระกูล Claude 5 — reasoning ขั้นสูง context 1M |
| Claude Opus 4.8 | โค้ดและงาน agent ซับซ้อน context 1M |
| Claude Opus 4.7 | งาน agent หลายขั้นตอนต่อเนื่อง context 1M |
| Claude Opus 4.6 | คุณภาพคำตอบสูง เหมาะกับงานซับซ้อน |
| Claude Sonnet 4.6 | สมดุลคุณภาพ/ราคา context 1M |
| GPT-5.5 | agentic coding/deep research context 1M |
| GPT-5.4 Pro | reasoning แม่นยำสูง (ราคาสูง) |
| GPT-5.2 Pro | โมเดลเรือธงจาก OpenAI |
| Gemini 3.5 Flash | โค้ดขั้นสูง/งาน agent ขนาน context 1M |
| Gemini 3 Flash | ตอบเร็ว เหมาะกับบทสนทนาทั่วไป |
| DeepSeek V4 | ราคาประหยัด ความสามารถสูง |
| DeepSeek V4 Pro | เก่งโค้ด/คณิต/งาน agent context 1M |

### 9router

ใช้ได้เลยโดยไม่ต้องผูกบัญชี upstream:

| โมเดล | จุดเด่น |
|---|---|
| **Nemotron 3 Ultra** (default) | `nvidia/nvidia/nemotron-3-ultra-550b-a55b` — ราคาถูก context 128K |
| Nemotron 3 Ultra (ฟรี) | `openrouter/...:free` — alias ฟรี |
| Auto Router (ฟรี) | `openrouter/auto:free` — ให้ 9router เลือกโมเดลให้เอง ตัวที่ได้เปลี่ยนตามเวลา |
| Auto Router | `openrouter/auto` — เหมือนข้างบนแต่เสียเงิน |
| Space Bunny (ฟรี) | `oc/space-bunny-free` |

> โมเดล `oc/*` ที่เหลือโดน `403 FreeTierError` — OpenCode บังคับให้เรียกจากใน CLI เท่านั้น ในรายการมีไว้รอผูกบัญชี

> ⚠️ **upstream ของ 9router ไม่เสถียร** — ระหว่างทดสอบเจอ `500 Internal server error` และ `502 fetch connect timeout` เป็นระยะ โดยเฉพาะหลังส่ง tool result กลับเข้า loop (ขั้นที่ 2 ของ agentic loop) ทำให้ agent loop หยุดกลางคัน ถ้าเจออาการนี้ให้ลองสลับไป provider อื่น หรือรันใหม่

### OpenCode Zen

เรียกตรง ไม่ต้องผูกบัญชี upstream:

| โมเดล | จุดเด่น |
|---|---|
| **Space Bunny (ฟรี)** (default) | `space-bunny-free` — ฟรี รองรับ tool-calling |
| GLM 5.3 Flash | `glm-5.3-flash` — ถูก ตอบเร็ว รองรับ tool-calling |
| Kimi K3 | `kimi-k3` — รองรับ tool-calling และ reasoning |

> ทดสอบด้วย `node scripts/agent-eval.mjs opencode space-bunny-free` → ผ่าน 8/8 ทุก tool ทำงานถูกต้อง · prompt caching ทำงานดี (รวม ~44.5K prompt / ~24.8K cached)

> Claude/GPT/Gemini ของ Zen ต้องใช้ endpoint อื่น (`/responses`, `/messages`) ซึ่งแอปยังไม่รองรับ — ตอนนี้ใช้ได้แค่ผ่าน `/chat/completions`

เพิ่มโมเดลได้ที่ [`src/application/ai/models.ts`](src/application/ai/models.ts) — ส่วน 9router และ OpenCode ให้ generate ผ่าน `npm run sync:models` แทนการแก้เอง

## 🛣 Roadmap

- [x] ย้าย persistence จาก localStorage → Turso (libsql SQLite)
- [x] Workspace + AI tool-calling — AI query/จัดการข้อมูลเองได้
- [x] Multi-provider (WaveSpeed / 9router / OpenCode Zen) + sync รายการโมเดลฟรีอัตโนมัติ
- [ ] Authentication + scope workspace/แชตต่อ user (ตอนนี้เก็บ dataset เดียวแชร์รวม)
- [ ] Retry ชั่วคราวเมื่อ provider ตอบ 5xx (9router มี 500/502 เป็นระยะ)
- [ ] รองรับ `/responses` + `/messages` ของ OpenCode Zen (Claude/GPT/Gemini ใช้โปรโตคอลแยก)
- [ ] True token-streaming ระหว่าง agent loop (ตอนนี้ chunk คำตอบสุดท้าย)
- [ ] ยืนยันก่อน AI ลบข้อมูล (confirmation gate) เผื่ออยากปลอดภัยขึ้น
- [ ] Render คำตอบเป็น Markdown / code highlighting

## 📄 License

MIT
