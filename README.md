<div align="center">

# 🤖 Jarvis

**ระบบแชต AI หลาย session คุยต่อเนื่อง — ขับเคลื่อนด้วย WaveSpeed LLM (290+ models)**

สร้างด้วย Next.js App Router ตามหลัก Clean Architecture<br/>
Streaming แบบ real-time · ประวัติแชตเก็บใน localStorage · Dark mode

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
- **🧠 คุยต่อเนื่อง** — ส่งประวัติทั้งหมดของ session ให้ LLM ทุกเทิร์น AI จึงจำสิ่งที่คุยกันก่อนหน้าได้
- **🎛️ เลือกโมเดลได้ต่อ session** — ค่าเริ่มต้น MiniMax M2.7 และสลับเป็น Claude, GPT, Gemini, DeepSeek ได้จาก dropdown (WaveSpeed รองรับ 290+ models)
- **💾 ประวัติไม่หาย** — เก็บทุกอย่างใน localStorage refresh แล้วบทสนทนายังอยู่ครบ ไม่ต้องมี backend
- **🌗 Dark mode** — สลับ light/dark ได้ จำค่าไว้ และไม่มี flash ตอนโหลดหน้า (FOUC-free)
- **🔐 API key ปลอดภัย** — เรียก WaveSpeed ผ่าน API route ฝั่ง server เท่านั้น key ไม่หลุดไป browser
- **🇹🇭 UI ภาษาไทย** — ทุก state ของหน้าจอ (loading / error / empty) เป็นภาษาไทยทั้งหมด

## 🚀 เริ่มต้นใช้งาน

### สิ่งที่ต้องมี

- Node.js 20 ขึ้นไป
- [WaveSpeed API key](https://wavespeed.ai) (สมัครฟรี มี credit ให้ทดลอง)

### ติดตั้ง

```bash
# 1. ติดตั้ง dependencies
npm install

# 2. ตั้งค่า API key
cp .env.example .env.local
# แก้ .env.local → WAVESPEED_API_KEY=ใส่คีย์ของคุณ
# (สร้าง key ได้ที่ wavespeed.ai → Dashboard → API Keys)

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
│   LocalStorage (client) │ Mock (server/dev) │ WaveSpeed AI  │
└─────────────────────────────────────────────────────────────┘
```

**หลักการสำคัญ:**

- **Repository Pattern** — Presenter รับ `IChatSessionRepository` ผ่าน constructor ไม่ผูกกับ storage ใดๆ จะสลับ localStorage → Supabase ก็แก้แค่ factory บรรทัดเดียว
- **Presenter Pattern** — business logic ทั้งหมด (จัดการ session, ส่งข้อความ, parse SSE stream) อยู่ใน `ChatPresenter` ตัวเดียว ใช้ร่วมกันทั้ง server และ client
- **Logic-free View** — `ChatView` เป็น JSX ล้วน 100% ทุก state และ action มาจาก hook `useChatPresenter` ที่คืน `[state, actions]` tuple
- **Mock-first Workflow** — พัฒนา UI กับ Mock repository ก่อน แล้วค่อยสลับเป็น implementation จริงเมื่อนิ่ง

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
│   ├── chat/page.tsx                # หน้าแชต (Server Component)
│   ├── layout.tsx                   # Root layout + theme init script
│   └── globals.css                  # Tailwind + import theme tokens
├── public/styles/
│   └── theme.css                    # Design tokens (light/dark) + Tailwind v4 @theme
├── src/
│   ├── application/                 # ⚖️ Contracts — ไม่มี dependency ใดๆ
│   │   ├── ai/models.ts             #    รายการ LLM models + ค่า default
│   │   └── repositories/
│   │       └── IChatSessionRepository.ts
│   ├── infrastructure/              # 🔌 Adapters — คุยกับโลกภายนอก
│   │   ├── ai/WaveSpeedClient.ts    #    WaveSpeed API client (server-only)
│   │   └── repositories/
│   │       ├── localstorage/        #    persistence จริง (client)
│   │       └── mock/                #    สำหรับ dev/test/SSR
│   └── presentation/                # 🎨 UI Layer
│       ├── components/
│       │   ├── chat/ChatView.tsx    #    JSX ล้วน — ไม่มี logic
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

## 🤖 โมเดลที่รองรับ

| โมเดล | จุดเด่น |
|---|---|
| **MiniMax M2.7** (default) | เร็ว ราคาถูก context 205K |
| Claude Opus 4.6 | คุณภาพคำตอบสูง เหมาะกับงานซับซ้อน |
| GPT-5.2 Pro | โมเดลเรือธงจาก OpenAI |
| Gemini 3 Flash | ตอบเร็ว เหมาะกับบทสนทนาทั่วไป |
| DeepSeek V4 | ราคาประหยัด ความสามารถสูง |

เพิ่มโมเดลอื่นจาก [WaveSpeed (290+ models)](https://wavespeed.ai/llm) ได้ที่ [`src/application/ai/models.ts`](src/application/ai/models.ts)

## 🛣 Roadmap

- [ ] สลับ persistence เป็น Supabase (สร้าง `SupabaseChatSessionRepository` แล้วแก้ factory)
- [ ] Authentication + แชตผูกกับ user
- [ ] Render คำตอบเป็น Markdown / code highlighting
- [ ] System prompt ปรับแต่งได้ต่อ session

## 📄 License

MIT
