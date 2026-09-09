/**
 * 知识库 bundle 生成脚本（纯前端版，不依赖后端数据库）
 *
 * 从 frontend/data/knowledge/ 下的 markdown 文件直接生成 knowledge-bundle.json，
 * 移植后端的 chunk 切分逻辑（按 ## / ### 标题切分，合并 <50 字小块）。
 *
 * 用法：
 *   cd frontend && node scripts/build-knowledge-bundle.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const KNOWLEDGE_DIR = path.resolve("data/knowledge");
const OUT_FILE = path.resolve("src/data/knowledge-bundle.json");

/** frontmatter 解析 */
function parseFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { data: {}, content: raw };
  const data = {};
  for (const line of m[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim().replace(/^["']|["']/g, "");
    data[key] = val;
  }
  return { data, content: m[2] };
}

/** 按 ## / ### 标题切分（移植后端 ingestion_service._chunk_by_headers） */
function chunkByHeaders(content) {
  const lines = content.split("\n");
  const chunks = [];
  let curSection = [];
  let curContent = [];

  for (const line of lines) {
    if (line.startsWith("##") || line.startsWith("###")) {
      if (curContent.length) {
        const text = curContent.join("\n").trim();
        if (text) chunks.push({ content: text, section: curSection.join(" > ") });
      }
      curSection = [line.replace(/^#+\s*/, "").trim()];
      curContent = [line];
    } else {
      curContent.push(line);
    }
  }
  if (curContent.length) {
    const text = curContent.join("\n").trim();
    if (text) chunks.push({ content: text, section: curSection.join(" > ") });
  }

  // 合并 <50 字的小块到前一个 chunk
  const merged = [];
  for (const c of chunks) {
    if (merged.length && c.content.length < 50) {
      merged[merged.length - 1].content += "\n" + c.content;
    } else {
      merged.push({ ...c });
    }
  }
  return merged;
}

/** 生成 bundle */
function main() {
  const outDir = KNOWLEDGE_DIR;
  if (!fs.existsSync(outDir)) {
    console.error(`[bundle] 知识库目录不存在: ${outDir}`);
    process.exit(1);
  }

  const documents = [];
  const chunks = [];

  const walk = (subdir) => {
    const full = path.join(outDir, subdir);
    if (!fs.existsSync(full)) return;
    for (const f of fs.readdirSync(full).sort()) {
      if (f.endsWith(".md")) {
        const filePath = path.join(full, f);
        const raw = fs.readFileSync(filePath, "utf-8");
        const { data: fm, content } = parseFrontmatter(raw);
        const title = fm.title || f.replace(/\.md$/, "");
        const docId = title;

        // 构建文档记录
        documents.push({
          id: docId,
          title,
          source: fm.source || "",
          organization: fm.organization || "",
          publicationDate: fm.publication_date || "",
          domain: fm.domain || "general",
          population: fm.population || "all",
          evidenceLevel: fm.evidence_level || "C",
          url: fm.url || "",
        });

        // 切分 chunks
        const chunkList = chunkByHeaders(content);
        for (let i = 0; i < chunkList.length; i++) {
          chunks.push({
            id: `${docId}-${i}`,
            documentId: docId,
            content: chunkList[i].content,
            domain: fm.domain || "general",
            section: chunkList[i].section || "",
            evidenceLevel: fm.evidence_level || "C",
            title,
            source: fm.source || "",
            url: fm.url || "",
          });
        }
        console.log(`[bundle] ${title} (${chunkList.length} chunks)`);
      }
    }
  };

  for (const d of ["exercise", "food_safety", "medical", "nutrition"]) {
    walk(d);
  }

  // 用户画像（取自种子数据，与后端 seed_data.py 一致）
  const profile = {
    age: 28,
    sex: "male",
    height: 175,
    weight: 78,
    goal: "减脂 + 增肌",
    activityLevel: "moderate",
    workSchedule: "9-18, 偶尔加班到21",
    dietPreference: "杂食",
    foodPreferences: '["喜欢吃辣", "不喜欢香菜", "偏好米饭"]',
    allergies: '["无"]',
  };

  const bundle = {
    version: 1,
    exportedAt: new Date().toISOString(),
    profile,
    documents,
    chunks,
  };

  const outPath = path.dirname(OUT_FILE);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(bundle, null, 2));
  const sizeKB = (fs.statSync(OUT_FILE).size / 1024).toFixed(1);
  console.log(`[bundle] ${documents.length} 文档 / ${chunks.length} chunks → ${OUT_FILE}`);
  console.log(`[bundle] 文件大小: ${sizeKB} KB`);
}

main();
