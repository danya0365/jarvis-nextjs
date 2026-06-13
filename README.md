<div align="center">

# 🤖 Jarvis

**ระบบแชต AI หลาย session คุยต่อเนื่อง — ขับเคลื่อนด้วย WaveSpeed LLM (290+ models)**

สร้างด้วย Next.js App Router ตามหลัก Clean Architecture<br/>
Streaming แบบ real-time · ประวัติแชตเก็บบน Turso (libsql SQLite) · Dark mode

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

[เริ่มต้นใช้งาน](#-เริ่มต้นใช้งาน) · [ฟีเจอร์](#-ฟีเจอร์) · [สถาปัตยกรรม](#-สถาปัตยกรรม) · [โครงสร้างโปรเจกต์](#-โครงสร้างโปรเจกต์)

</div>

---

## ✨ ฟีเจอร์

- **💬 แชตกับ AI แบบ streaming** — คำตอบทยอยขึ้นทีละ token แบบ real-time ผ่าน Server-Sent Events พร้อมปุ่มหยุดกลางคัน (เก็บคำตอบบางส่วนไว้ให้)
- **🗂️ หลาย session แยกอิสระ** — สร้าง เปลี่ยนชื่อ ลบ และสลับบทสนทนาได้ไม่จำกัด แต่ละ session จำบริบทของตัวเอง
- **🧠 คุยต่อเนื่อง** — ส่งประวัติของ session ให้ LLM ทุกเทิร์น AI จึงจำสิ่งที่คุยกันก่อนหน้าได้
- **🎛️ เลือกโมเดลได้ต่อ session** — ค่าเริ่มต้น MiniMax M2.7 และสลับเป็น Claude, GPT, Gemini, DeepSeek ได้จาก dropdown (WaveSpeed รองรับ 290+ models)
- **📊 Monitor การใช้งาน** — เห็น token และค่าใช้จ่าย (USD) ของทุกคำตอบ ยอดรวมต่อ session และ dashboard สะสมทั้งหมด/วันนี้/แยกตามโมเดล (ยอดไม่หายแม้ลบแชต)
- **✂️ บริหาร token ประหยัดเงิน** — เลือกส่งเฉพาะข้อความล่าสุดให้ AI แทนการส่ง history ทั้งหมด, จำกัดความยาวคำตอบ (max_tokens) และเห็น preview ก่อนส่งว่าจะใช้ ~กี่ token
- **🧠 ความจำอัจฉริยะ (rolling summary)** — สรุปบทสนทนาเก่าเป็น "ความจำ" ของ session แล้วแนบให้ AI ทุกเทิร์น ส่ง token น้อยแต่ AI ยังจำเรื่องสำคัญได้ (สรุปอัตโนมัติเมื่อคุยยาว หรือกดสรุปเองได้ เลือกโมเดลถูกๆ มาสรุปได้ใน ⚙️) — เป็นโหมดเริ่มต้น
- **💾 ประวัติไม่หาย ใช้ข้ามเครื่องได้** — เก็บแชต/ตั้งค่า/ยอด token บน Turso (libsql SQLite) ผ่าน API route ฝั่ง server refresh หรือเปลี่ยนเบราว์เซอร์/อุปกรณ์ก็เห็นข้อมูลเดียวกัน
- **🌗 Dark mode** — สลับ light/dark ได้ จำค่าไว้ และไม่มี flash ตอนโหลดหน้า (FOUC-free)
- **🔐 API key ปลอดภัย** — เรียก WaveSpeed ผ่าน API route ฝั่ง server เท่านั้น key ไม่หลุดไป browser
- **🇹🇭 UI ภาษาไทย** — ทุก state ของหน้าจอ (loading / error / empty) เป็นภาษาไทยทั้งหมด

## 🚀 เริ่มต้นใช้งาน

### สิ่งที่ต้องมี

- Node.js 20 ขึ้นไป
- [WaveSpeed API key](https://wavespeed.ai) (สมัครฟรี มี credit ให้ทดลอง)
- [Turso database](https://turso.tech) (free tier — เก็บประวัติแชต/ตั้งค่า/ยอด token)

### ติดตั้ง

```bash
# 1. ติดตั้ง dependencies
npm install

# 2. ตั้งค่า env
cp .env.example .env.local
# แก้ .env.local →
#   WAVESPEED_API_KEY=ใส่คีย์ของคุณ           (wavespeed.ai → Dashboard → API Keys)
#   TURSO_DATABASE_URL=libsql://<db>.turso.io  (turso db show <db> --url)
#   TURSO_AUTH_TOKEN=ใส่ token ของคุณ          (turso db tokens create <db>)

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
│              Mock (server/dev) │ WaveSpeed AI                │
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
                          WaveSpeed LLM API (stream: true)
                                        │
              onToken() ◄── SSE parser ◄┘
                  │
                  ▼
        React state อัปเดตทีละ token ──► persist ครั้งเดียวตอนจบ
```

- API route เป็นแค่ proxy — ส่ง `upstream.body` ต่อตรงๆ ไม่ parse กลางทาง (backpressure ดี, ไม่มี transform bug)
- SSE parser ฝั่ง client ใช้ `TextDecoder` แบบ `{stream: true}` รองรับตัวอักษรไทย (multi-byte UTF-8) ที่ขาดกลาง chunk
- ยกเลิกกลางทางได้ผ่าน `AbortController` — signal ถูกส่งต่อถึง WaveSpeed จึงไม่มี request ค้าง

## 📁 โครงสร้างโปรเจกต์

```
jarvis-nextjs/
├── app/
│   ├── api/chat/route.ts            # POST proxy → WaveSpeed (streaming SSE)
│   ├── api/sessions/route.ts        # GET/POST sessions → Turso
│   ├── api/sessions/[id]/route.ts   # GET/PATCH/DELETE session → Turso
│   ├── api/settings/route.ts        # GET/PUT settings → Turso
│   ├── api/usage/route.ts           # GET/POST/DELETE usage ledger → Turso
│   ├── chat/page.tsx                # หน้าแชต (Server Component)
│   ├── layout.tsx                   # Root layout + theme init script
│   └── globals.css                  # Tailwind + import theme tokens
├── public/styles/
│   └── theme.css                    # Design tokens (light/dark) + Tailwind v4 @theme
├── src/
│   ├── application/                 # ⚖️ Contracts — ไม่มี dependency ใดๆ
│   │   ├── ai/models.ts             #    รายการ LLM models + ราคา + ค่า default
│   │   ├── ai/tokens.ts             #    token estimator (fallback/preview)
│   │   ├── chat/settings.ts         #    การตั้งค่าบริหาร token
│   │   └── repositories/
│   │       ├── IChatSessionRepository.ts
│   │       ├── IChatSettingsRepository.ts
│   │       └── IUsageLedgerRepository.ts  # บัญชีรายจ่าย token สะสม
│   ├── infrastructure/              # 🔌 Adapters — คุยกับโลกภายนอก
│   │   ├── ai/WaveSpeedClient.ts    #    WaveSpeed API client (server-only)
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
| `WAVESPEED_API_KEY` | ✅ | API key จาก [wavespeed.ai](https://wavespeed.ai) — ใช้ฝั่ง server เท่านั้น |
| `TURSO_DATABASE_URL` | ✅ | libsql connection URL ของ Turso database (เช่น `libsql://<db>.turso.io`) — ใช้ฝั่ง server เท่านั้น |
| `TURSO_AUTH_TOKEN` | ✅ | auth token ของ Turso — **ความลับฝั่ง server** ห้าม prefix `NEXT_PUBLIC_` |

> สร้าง database + token ได้ด้วย [Turso CLI](https://docs.turso.tech): `turso db create jarvis` → `turso db show jarvis --url` (URL) → `turso db tokens create jarvis` (token). Schema (`chat_sessions` / `chat_settings` / `usage_ledger`) ถูกสร้างอัตโนมัติครั้งแรกที่รัน (`ensureSchema`).

## 🤖 โมเดลที่รองรับ

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

เพิ่มโมเดลอื่นจาก [WaveSpeed (290+ models)](https://wavespeed.ai/llm) ได้ที่ [`src/application/ai/models.ts`](src/application/ai/models.ts)

## 🛣 Roadmap

- [x] ย้าย persistence จาก localStorage → Turso (libsql SQLite)
- [ ] Authentication + scope แชตต่อ user (ตอนนี้ Turso เก็บ dataset เดียวแชร์รวม)
- [ ] Render คำตอบเป็น Markdown / code highlighting
- [ ] System prompt ปรับแต่งได้ต่อ session

## 📄 License

MIT
