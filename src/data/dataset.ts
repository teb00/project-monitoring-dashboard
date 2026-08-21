import type { DayPoint, Project } from "@/types";

/** Number of days of history generated. */
export const DAYS = 365;

/* ----------------------------------------------------------------------------
 * Seeded PRNG (mulberry32) so the sample data is stable across renders.
 * ------------------------------------------------------------------------- */
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260214);

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

/* ----------------------------------------------------------------------------
 * Taxonomy
 * ------------------------------------------------------------------------- */
export const CATEGORIES = [
  "Operating Systems",
  "Compilers & Runtimes",
  "Emulators & VMs",
  "Hardware & Firmware",
  "Databases & Storage",
  "Networking & Web",
  "DevTools & CLI",
  "Graphics & GPU",
  "AI & ML Systems",
  "Editors & IDEs",
  "Security & Crypto",
] as const;

/** GitHub-flavoured language colours (used for badges + language segments). */
export const LANG_COLORS: Record<string, string> = {
  Rust: "#dea584",
  C: "#8b949e",
  "C++": "#f34b7d",
  Python: "#3572a5",
  Go: "#00add8",
  TypeScript: "#3178c6",
  Zig: "#ec915c",
  Java: "#b07219",
  "Vim Script": "#199f4b",
};

/** Ordered palette used for category segments (and fallbacks). */
export const SEGMENT_PALETTE = [
  "#6366f1",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#3b82f6",
  "#f97316",
  "#84cc16",
  "#a855f7",
];

export function colorForSegment(segment: "language" | "category", key: string) {
  if (segment === "language") {
    return LANG_COLORS[key] ?? SEGMENT_PALETTE[key.length % SEGMENT_PALETTE.length];
  }
  const idx = CATEGORIES.indexOf(key as (typeof CATEGORIES)[number]);
  return SEGMENT_PALETTE[(idx < 0 ? key.length : idx) % SEGMENT_PALETTE.length];
}

/* ----------------------------------------------------------------------------
 * Curated project set — real computer-systems repos on GitHub.
 * [repo, language, category, description, starsK, ageDays, trendBias]
 * ------------------------------------------------------------------------- */
type Raw = [string, string, string, string, number, number, number];

const RAW: Raw[] = [
  // Operating Systems
  ["torvalds/linux", "C", "Operating Systems", "The Linux kernel source tree — the heart of the computing world.", 173, 5600, 0.9],
  ["redox-os/redox", "Rust", "Operating Systems", "A Unix-like microkernel operating system written in Rust.", 15.2, 3500, 1.2],
  ["SerenityOS/serenity", "C++", "Operating Systems", "A graphical Unix-like OS for x86 computers.", 31, 2400, 1.4],
  ["seL4/seL4", "C", "Operating Systems", "Microkernel with mathematically proven correctness.", 5.1, 4100, 0.8],
  ["reactos/reactos", "C", "Operating Systems", "A free open-source operating system compatible with Windows.", 14.3, 6800, 0.7],
  ["haiku/haiku", "C++", "Operating Systems", "An open-source operating system inspired by BeOS.", 13.1, 6200, 0.7],
  ["microsoft/WSL2-Linux-Kernel", "C", "Operating Systems", "The Linux kernel source tree for WSL2.", 8.4, 2100, 1.0],

  // Compilers & Runtimes
  ["rust-lang/rust", "Rust", "Compilers & Runtimes", "A language empowering everyone to build reliable and efficient software.", 97, 4900, 1.3],
  ["python/cpython", "Python", "Compilers & Runtimes", "The Python programming language reference implementation.", 63, 7200, 1.0],
  ["golang/go", "Go", "Compilers & Runtimes", "The Go programming language and toolchain.", 122, 5400, 1.0],
  ["openjdk/jdk", "Java", "Compilers & Runtimes", "JDK source code — the Java development kit.", 19.6, 2400, 0.9],
  ["dotnet/runtime", "C#", "Compilers & Runtimes", ".NET libraries, runtime and host.", 15.4, 2600, 0.9],
  ["llvm/llvm-project", "C++", "Compilers & Runtimes", "The LLVM compiler infrastructure project.", 28.5, 5900, 0.9],
  ["ziglang/zig", "Zig", "Compilers & Runtimes", "A general-purpose programming language and toolchain.", 17.8, 2900, 1.6],
  ["denoland/deno", "Rust", "Compilers & Runtimes", "A modern runtime for JavaScript and TypeScript.", 96, 2500, 1.1],
  ["oven-sh/bun", "Zig", "Compilers & Runtimes", "An incredibly fast JavaScript runtime, bundler and test runner.", 74, 900, 1.8],

  // Emulators & VMs
  ["qemu/qemu", "C", "Emulators & VMs", "A generic and open source machine emulator and virtualizer.", 11.2, 6100, 0.9],
  ["dolphin-emu/dolphin", "C++", "Emulators & VMs", "A GameCube and Wii emulator with high compatibility.", 12.6, 5300, 1.0],
  ["PCSX2/pcsx2", "C++", "Emulators & VMs", "A PlayStation 2 emulator for Windows, Linux and macOS.", 11.4, 5600, 1.1],
  ["mamedev/mame", "C++", "Emulators & VMs", "MAME — Multiple Arcade Machine Emulator.", 8.3, 7400, 0.7],

  // Hardware & Firmware
  ["coreboot/coreboot", "C", "Hardware & Firmware", "A fast and secure open source firmware project.", 1.7, 6900, 0.8],
  ["tianocore/edk2", "C", "Hardware & Firmware", "EDK II — modern, cross-platform firmware development.", 4.6, 4800, 0.8],
  ["espressif/esp-idf", "C", "Hardware & Firmware", "Espressif IoT development framework for ESP32 chips.", 14.1, 3100, 1.1],
  ["zephyrproject-rtos/zephyr", "C", "Hardware & Firmware", "A scalable real-time operating system (RTOS) for embedded.", 10.3, 3400, 1.2],
  ["arduino/Arduino", "C++", "Hardware & Firmware", "Open-source electronics prototyping platform.", 16.2, 6600, 0.7],
  ["raspberrypi/linux", "C", "Hardware & Firmware", "The Linux kernel sources for Raspberry Pi boards.", 2.7, 4000, 0.8],

  // Databases & Storage
  ["postgres/postgres", "C", "Databases & Storage", "The world's most advanced open source database.", 16.4, 6300, 1.0],
  ["redis/redis", "C", "Databases & Storage", "An in-memory data structure store, used as a database.", 67, 6500, 0.9],
  ["ClickHouse/ClickHouse", "C++", "Databases & Storage", "A column-oriented database for real-time analytics.", 38, 3100, 1.5],
  ["duckdb/duckdb", "C++", "Databases & Storage", "An in-process SQL OLAP database engine.", 24.2, 1900, 1.7],
  ["sqlite/sqlite", "C", "Databases & Storage", "A self-contained, serverless SQL database engine.", 6.2, 5900, 0.8],
  ["etcd-io/etcd", "Go", "Databases & Storage", "Distributed reliable key-value store for critical data.", 47.5, 4400, 0.9],

  // Networking & Web
  ["nginx/nginx", "C", "Networking & Web", "The high-performance HTTP and reverse proxy server.", 25.4, 6700, 0.8],
  ["caddyserver/caddy", "Go", "Networking & Web", "Fast multi-platform web server with automatic HTTPS.", 58, 3300, 1.2],
  ["curl/curl", "C", "Networking & Web", "Command-line tool and library for transferring data with URLs.", 36, 7200, 0.9],
  ["mitmproxy/mitmproxy", "Python", "Networking & Web", "An interactive HTTPS proxy for debugging traffic.", 38.4, 4600, 1.0],
  ["envoyproxy/envoy", "C++", "Networking & Web", "Cloud-native high-performance edge and service proxy.", 25.1, 3500, 1.0],

  // DevTools & CLI
  ["git/git", "C", "DevTools & CLI", "Git source code mirror — the version control system.", 53.6, 6900, 0.8],
  ["BurntSushi/ripgrep", "Rust", "DevTools & CLI", "Recursively search directories for a regex pattern.", 48.5, 3800, 1.0],
  ["junegunn/fzf", "Go", "DevTools & CLI", "A command-line fuzzy finder that just works.", 65.3, 3600, 1.0],
  ["sharkdp/bat", "Rust", "DevTools & CLI", "A cat clone with syntax highlighting and Git integration.", 49.4, 3500, 0.9],
  ["cli/cli", "Go", "DevTools & CLI", "GitHub's official command line tool.", 38.7, 2900, 0.9],
  ["starship/starship", "Rust", "DevTools & CLI", "The minimal, blazing-fast shell prompt for any shell.", 44.6, 2700, 1.1],
  ["dandavison/delta", "Rust", "DevTools & CLI", "A syntax-highlighting pager for git and diff output.", 24.8, 2400, 1.0],

  // Graphics & GPU
  ["bevyengine/bevy", "Rust", "Graphics & GPU", "A refreshingly simple data-driven game engine.", 35.1, 2400, 1.6],
  ["godotengine/godot", "C++", "Graphics & GPU", "A cross-platform, free and open-source game engine.", 92.4, 4200, 1.3],
  ["gfx-rs/wgpu", "Rust", "Graphics & GPU", "A cross-platform safe graphics & compute API.", 12.9, 2700, 1.4],
  ["mpv-player/mpv", "C", "Graphics & GPU", "A free, open-source command-line video player.", 28.7, 4800, 0.9],
  ["obsproject/obs-studio", "C++", "Graphics & GPU", "Software for live streaming and screen recording.", 58.9, 3700, 1.0],

  // AI & ML Systems
  ["ggml-org/llama.cpp", "C++", "AI & ML Systems", "LLM inference in pure C/C++ — runs anywhere.", 69.2, 900, 2.2],
  ["huggingface/transformers", "Python", "AI & ML Systems", "State-of-the-art machine learning for everyone.", 132, 3300, 1.3],
  ["ollama/ollama", "Go", "AI & ML Systems", "Get up and running with large language models locally.", 96.3, 480, 2.4],
  ["vllm-project/vllm", "Python", "AI & ML Systems", "A high-throughput and memory-efficient LLM serving engine.", 28.6, 760, 2.1],
  ["openai/whisper", "Python", "AI & ML Systems", "Robust automatic speech recognition via large models.", 70.1, 1500, 1.4],
  ["pytorch/pytorch", "C++", "AI & ML Systems", "Tensors and dynamic neural networks with strong GPU support.", 82.5, 3700, 1.1],

  // Editors & IDEs
  ["neovim/neovim", "C", "Editors & IDEs", "Vim-fork focused on extensibility and usability.", 82.6, 3900, 1.1],
  ["vim/vim", "Vim Script", "Editors & IDEs", "The official Vim repository — the ubiquitous text editor.", 36.4, 7100, 0.7],
  ["emacs-mirror/emacs", "C", "Editors & IDEs", "Mirror of the GNU Emacs extensible editor.", 2.4, 7300, 0.7],
  ["helix-editor/helix", "Rust", "Editors & IDEs", "A post-modern modal text editor written in Rust.", 33.7, 1700, 1.5],
  ["microsoft/vscode", "TypeScript", "Editors & IDEs", "The editor that defined the modern development experience.", 161, 3200, 1.0],
  ["zed-industries/zed", "Rust", "Editors & IDEs", "Code at the speed of thought — a high-performance editor.", 47.3, 720, 1.9],

  // Security & Crypto
  ["openssl/openssl", "C", "Security & Crypto", "TLS/SSL and general-purpose cryptography library.", 25.3, 6400, 0.8],
  ["hashcat/hashcat", "C", "Security & Crypto", "World's fastest and most advanced password recovery utility.", 21.2, 5500, 0.9],
  ["wireshark/wireshark", "C", "Security & Crypto", "A network protocol analyzer for troubleshooting.", 7.1, 5800, 0.8],
  ["keepassxreboot/keepassxc", "C++", "Security & Crypto", "A cross-platform community-driven password manager.", 20.6, 3500, 0.9],
];

/* ----------------------------------------------------------------------------
 * Expand raw rows into fully-derived Project objects with daily history.
 * ------------------------------------------------------------------------- */
function makeProject(row: Raw, id: number): Project {
  const [repo, language, category, description, k, age, bias] = row;
  const [owner, name] = repo.split("/");
  const stars = Math.round(k * 1000);

  // Fraction of *current* stars that were earned in the last year.
  const baseFrac = clamp(0.05 + (age < 900 ? 0.45 : 0) + rng() * 0.12, 0.04, 0.9);
  const frac365 = baseFrac * (0.7 + bias * 0.35);
  const gain365 = Math.round(stars * frac365);
  const startStars = stars - gain365;
  const avgDaily = gain365 / DAYS;

  const spike1 = Math.floor(rng() * DAYS);
  const spike2 = Math.floor(rng() * DAYS);
  const raw: number[] = [];
  for (let i = 0; i < DAYS; i++) {
    const dow = (i + 4) % 7; // weekday pattern
    const weekend = dow === 0 || dow === 6 ? 0.7 : 1;
    const season = 1 + 0.16 * Math.sin(i / 57 + id);
    const noise = 0.55 + rng() * 0.9;
    const upTrend = 1 + (i / DAYS) * 0.5 * bias; // hotter repos accelerate
    let v = avgDaily * weekend * season * noise * upTrend * (0.8 + bias * 0.25);
    if (i === spike1) v *= 2.4 + rng() * 2.2;
    if (i === spike2) v *= 1.8 + rng() * 1.4;
    raw.push(Math.max(0, Math.round(v)));
  }
  // Scale increments so they sum to gain365 (keeps total stars consistent).
  const sum = raw.reduce((a, b) => a + b, 0) || 1;
  const scale = gain365 / sum;
  const increments = raw.map((x) => Math.max(0, Math.round(x * scale)));
  const gained = increments.reduce((a, b) => a + b, 0);
  const currentStars = startStars + gained;

  return {
    id,
    repo,
    owner,
    name,
    description,
    language,
    category,
    stars: currentStars,
    forks: Math.round(currentStars * (0.1 + rng() * 0.18)),
    watchers: Math.round(currentStars * (0.006 + rng() * 0.014)),
    issues: Math.round(currentStars * (0.005 + rng() * 0.016)),
    contributors: clamp(Math.round(Math.sqrt(currentStars) * (0.9 + rng() * 0.8)), 12, 4200),
    ageDays: age,
    trendBias: bias,
    gain365: gained,
    increments,
  };
}

export const PROJECTS: Project[] = RAW.map(makeProject);

export const LANGUAGES = Array.from(
  new Set(PROJECTS.map((p) => p.language)),
).sort();

/** Stars earned by a project during the most recent `days`. */
export function gainInRange(p: Project, days: number): number {
  const start = Math.max(0, DAYS - days);
  let s = 0;
  for (let i = start; i < DAYS; i++) s += p.increments[i];
  return s;
}

/* ----------------------------------------------------------------------------
 * Aggregate daily metrics across all tracked projects.
 * ------------------------------------------------------------------------- */
export function buildDays(): DayPoint[] {
  const newStarsArr = new Array(DAYS).fill(0);
  for (const p of PROJECTS) {
    for (let i = 0; i < DAYS; i++) newStarsArr[i] += p.increments[i];
  }

  const days: DayPoint[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < DAYS; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - (DAYS - 1 - i));
    const dow = d.getDay();
    const weekend = dow === 0 || dow === 6 ? 0.65 : 1;

    const commits =
      newStarsArr[i] * (0.4 + rng() * 0.2) * weekend +
      (90 + rng() * 360) * weekend +
      (i % 17 === 0 ? 2600 + rng() * 3800 : 0);
    const newRepos = Math.round((3 + rng() * 7) * weekend) + (i % 23 === 0 ? 3 : 0);
    const contributors =
      Math.round((940 + i * 0.55) * (0.9 + rng() * 0.2) * weekend) +
      (i % 29 === 0 ? 360 : 0);

    days.push({
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      weekday: d.toLocaleDateString("en-US", { weekday: "short" }),
      newStars: newStarsArr[i],
      commits: Math.round(commits),
      newRepos,
      contributors,
    });
  }
  return days;
}

export const DAYS_SERIES: DayPoint[] = buildDays();
