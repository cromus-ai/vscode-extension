import * as https from "https";
import * as http from "http";
import * as vscode from "vscode";

function cfg<T>(key: string): T {
  return vscode.workspace.getConfiguration("cromus").get<T>(key) as T;
}

export function getApiKey(): string {
  return cfg<string>("apiKey") || "";
}
export function getApiUrl(): string {
  return cfg<string>("apiUrl") || "https://cromus.ai";
}

// ── Low-level fetch ────────────────────────────────────────────────────────

function post(url: string, body: object, apiKey: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const parsed = new URL(url);
    const options: https.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
    };
    const mod = parsed.protocol === "https:" ? https : http;
    const req = mod.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

function get(url: string, apiKey: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options: https.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: "GET",
      headers: {
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
    };
    const mod = parsed.protocol === "https:" ? https : http;
    const req = mod.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

// ── API methods ────────────────────────────────────────────────────────────

export interface ValidationIssue {
  field?: string;
  message: string;
  severity?: "error" | "warning" | "info";
}

export interface SkillValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  recommendations?: Array<{ title: string; description: string }>;
  scores?: { overall?: number; completeness?: number };
}

export interface ScoreResult {
  croms: number;
  cromsSeverity: string;
  costPerRun?: number;
  gapScore?: number;
  recommendations?: Array<{ title: string; description: string; croms?: number }>;
}

export interface PolicyCheckResult {
  pass: boolean;
  violations: Array<{ rule: string; message: string; expected?: unknown; actual?: unknown }>;
  warnings: Array<{ rule: string; message: string }>;
  checked: string[];
  summary: string;
}

export async function validateSkill(skillMd: string): Promise<SkillValidationResult | null> {
  const apiKey = getApiKey();
  const apiUrl = getApiUrl();
  try {
    const result = await post(`${apiUrl}/api/validate/skill`, { skill_md: skillMd }, apiKey);
    return result as SkillValidationResult;
  } catch {
    return null;
  }
}

export async function validateEthos(yamlContent: string): Promise<SkillValidationResult | null> {
  const apiKey = getApiKey();
  const apiUrl = getApiUrl();
  try {
    const result = await post(`${apiUrl}/api/validate/ethos`, { yaml: yamlContent }, apiKey);
    return result as SkillValidationResult;
  } catch {
    return null;
  }
}

export async function validateAgents(content: string): Promise<SkillValidationResult | null> {
  const apiKey = getApiKey();
  const apiUrl = getApiUrl();
  try {
    const result = await post(`${apiUrl}/api/validate/agents`, { content }, apiKey);
    return result as SkillValidationResult;
  } catch {
    return null;
  }
}

export async function validateMemory(content: string): Promise<SkillValidationResult | null> {
  const apiKey = getApiKey();
  const apiUrl = getApiUrl();
  try {
    const result = await post(`${apiUrl}/api/validate/memory`, { content }, apiKey);
    return result as SkillValidationResult;
  } catch {
    return null;
  }
}

export async function scoreSkill(skillMd: string): Promise<ScoreResult | null> {
  const apiKey = getApiKey();
  const apiUrl = getApiUrl();
  try {
    const result = await post(`${apiUrl}/api/policy/score-skill`, { skill_md: skillMd }, apiKey) as Record<string, unknown>;
    if (result && typeof result.croms === "number") {
      return {
        croms: result.croms as number,
        cromsSeverity: (result.cromsSeverity as string) || "",
        costPerRun: result.costPerRun as number | undefined,
        gapScore: result.gapScore as number | undefined,
        recommendations: result.recommendations as ScoreResult["recommendations"],
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function checkPolicy(
  skillMd: string,
  policyYaml: string,
): Promise<PolicyCheckResult | null> {
  const apiKey = getApiKey();
  const apiUrl = getApiUrl();
  try {
    const result = await post(`${apiUrl}/api/policy/check`, { skill_md: skillMd, policy_yaml: policyYaml }, apiKey);
    return result as PolicyCheckResult;
  } catch {
    return null;
  }
}

export async function lookupModel(modelKey: string): Promise<Record<string, unknown> | null> {
  const apiKey = getApiKey();
  const apiUrl = getApiUrl();
  try {
    const encoded = encodeURIComponent(modelKey);
    const result = await get(`${apiUrl}/api/models/lookup?key=${encoded}`, apiKey);
    return result as Record<string, unknown>;
  } catch {
    return null;
  }
}
