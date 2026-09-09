/**
 * BM25Okapi 移植自 Python rank_bm25.BM25Okapi（默认 k1=1.5, b=0.75, epsilon=0.25）
 *
 * 后端 retrieval_service.py 使用 `BM25Okapi(tokenized_corpus)` + `get_scores(list(query))`，
 * 中文按字切分（`list(str)`），前端保持完全一致。
 *
 * 源码对照：rank_bm25.BM25Okapi（_initialize / _calc_idf / get_scores）
 */

import type { KnowledgeSource } from "@/types/chat";

export interface BundleChunk {
  id: string;
  documentId: string;
  content: string;
  domain: string;
  section: string;
  evidenceLevel: string;
  title: string;
  source: string;
  url: string;
  embedding?: number[];
}

export class BM25Okapi {
  private k1: number;
  private b: number;
  private epsilon: number;
  private corpusSize = 0;
  private avgdl = 0;
  private docFreqs: Map<string, number>[] = [];
  private idf = new Map<string, number>();
  private docLen: number[] = [];

  constructor(
    corpus: string[][],
    opts: { k1?: number; b?: number; epsilon?: number } = {},
  ) {
    this.k1 = opts.k1 ?? 1.5;
    this.b = opts.b ?? 0.75;
    this.epsilon = opts.epsilon ?? 0.25;
    const nd = this.initialize(corpus);
    this.calcIdf(nd);
  }

  private initialize(corpus: string[][]): Map<string, number> {
    const nd = new Map<string, number>(); // word -> 含该词的文档数
    let numDoc = 0;
    for (const document of corpus) {
      this.docLen.push(document.length);
      numDoc += document.length;

      const frequencies = new Map<string, number>();
      for (const word of document) {
        frequencies.set(word, (frequencies.get(word) ?? 0) + 1);
      }
      this.docFreqs.push(frequencies);

      for (const word of Array.from(frequencies.keys())) {
        nd.set(word, (nd.get(word) ?? 0) + 1);
      }

      this.corpusSize += 1;
    }
    this.avgdl = this.corpusSize > 0 ? numDoc / this.corpusSize : 0;
    return nd;
  }

  private calcIdf(nd: Map<string, number>): void {
    let idfSum = 0;
    const negativeIdfs: string[] = [];
    for (const [word, freq] of Array.from(nd.entries())) {
      const idf = Math.log(this.corpusSize - freq + 0.5) - Math.log(freq + 0.5);
      this.idf.set(word, idf);
      idfSum += idf;
      if (idf < 0) negativeIdfs.push(word);
    }
    const averageIdf = this.idf.size > 0 ? idfSum / this.idf.size : 0;
    const eps = this.epsilon * averageIdf;
    for (const word of negativeIdfs) {
      this.idf.set(word, eps);
    }
  }

  /** 返回每个文档的 BM25 分数数组（长度 = corpusSize） */
  getScores(query: string[]): number[] {
    const score = new Array(this.corpusSize).fill(0);
    for (const q of query) {
      const idfQ = this.idf.get(q) ?? 0;
      for (let i = 0; i < this.corpusSize; i++) {
        const qFreq = this.docFreqs[i].get(q) ?? 0;
        const dl = this.docLen[i];
        const denom =
          qFreq + this.k1 * (1 - this.b + this.b * (dl / (this.avgdl || 1)));
        score[i] += (idfQ * (qFreq * (this.k1 + 1))) / (denom || 1);
      }
    }
    return score;
  }
}

/** 中文按字切分（与后端 `list(str)` 一致） */
export function tokenize(text: string): string[] {
  return Array.from(text);
}

/**
 * 本地 BM25 检索器：从 knowledge-bundle.json 构建索引，按查询返回 top-k 来源。
 *
 * 用法：
 *   const searcher = new BM25Searcher(bundleChunks);
 *   const results = searcher.search("低血糖怎么办", 5);
 */
export class BM25Searcher {
  private bm25: BM25Okapi;
  private chunks: BundleChunk[];
  private tokenizedCorpus: string[][];

  constructor(chunks: BundleChunk[]) {
    this.chunks = chunks;
    this.tokenizedCorpus = chunks.map((c) => tokenize(c.content));
    this.bm25 = new BM25Okapi(this.tokenizedCorpus);
  }

  search(query: string, topK = 5): KnowledgeSource[] {
    const scores = this.bm25.getScores(tokenize(query));
    const ranked = scores
      .map((score, idx) => ({ score, idx }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return ranked.map(({ score, idx }) => {
      const c = this.chunks[idx];
      return {
        chunk_id: c.id,
        content: c.content,
        score: Math.round(score * 10000) / 10000,
        domain: c.domain,
        section: c.section,
        source: c.source,
        title: c.title,
        evidence_level: c.evidenceLevel,
        document_id: c.documentId,
        url: c.url,
      };
    });
  }
}
