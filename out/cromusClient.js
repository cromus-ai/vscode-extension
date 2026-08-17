"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getApiKey = getApiKey;
exports.getApiUrl = getApiUrl;
exports.validateSkill = validateSkill;
exports.validateEthos = validateEthos;
exports.validateAgents = validateAgents;
exports.validateMemory = validateMemory;
exports.scoreSkill = scoreSkill;
exports.checkPolicy = checkPolicy;
exports.lookupModel = lookupModel;
const https = __importStar(require("https"));
const http = __importStar(require("http"));
const vscode = __importStar(require("vscode"));
function cfg(key) {
    return vscode.workspace.getConfiguration("cromus").get(key);
}
function getApiKey() {
    return cfg("apiKey") || "";
}
function getApiUrl() {
    return cfg("apiUrl") || "https://cromus.ai";
}
// ── Low-level fetch ────────────────────────────────────────────────────────
function post(url, body, apiKey) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(body);
        const parsed = new URL(url);
        const options = {
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
                }
                catch {
                    resolve(data);
                }
            });
        });
        req.on("error", reject);
        req.write(payload);
        req.end();
    });
}
function get(url, apiKey) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const options = {
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
                }
                catch {
                    resolve(data);
                }
            });
        });
        req.on("error", reject);
        req.end();
    });
}
async function validateSkill(skillMd) {
    const apiKey = getApiKey();
    const apiUrl = getApiUrl();
    try {
        const result = await post(`${apiUrl}/api/validate/skill`, { skill_md: skillMd }, apiKey);
        return result;
    }
    catch {
        return null;
    }
}
async function validateEthos(yamlContent) {
    const apiKey = getApiKey();
    const apiUrl = getApiUrl();
    try {
        const result = await post(`${apiUrl}/api/validate/ethos`, { yaml: yamlContent }, apiKey);
        return result;
    }
    catch {
        return null;
    }
}
async function validateAgents(content) {
    const apiKey = getApiKey();
    const apiUrl = getApiUrl();
    try {
        const result = await post(`${apiUrl}/api/validate/agents`, { content }, apiKey);
        return result;
    }
    catch {
        return null;
    }
}
async function validateMemory(content) {
    const apiKey = getApiKey();
    const apiUrl = getApiUrl();
    try {
        const result = await post(`${apiUrl}/api/validate/memory`, { content }, apiKey);
        return result;
    }
    catch {
        return null;
    }
}
async function scoreSkill(skillMd) {
    const apiKey = getApiKey();
    const apiUrl = getApiUrl();
    try {
        const result = await post(`${apiUrl}/api/policy/score-skill`, { skill_md: skillMd }, apiKey);
        if (result && typeof result.croms === "number") {
            return {
                croms: result.croms,
                cromsSeverity: result.cromsSeverity || "",
                costPerRun: result.costPerRun,
                gapScore: result.gapScore,
                recommendations: result.recommendations,
            };
        }
        return null;
    }
    catch {
        return null;
    }
}
async function checkPolicy(skillMd, policyYaml) {
    const apiKey = getApiKey();
    const apiUrl = getApiUrl();
    try {
        const result = await post(`${apiUrl}/api/policy/check`, { skill_md: skillMd, policy_yaml: policyYaml }, apiKey);
        return result;
    }
    catch {
        return null;
    }
}
async function lookupModel(modelKey) {
    const apiKey = getApiKey();
    const apiUrl = getApiUrl();
    try {
        const encoded = encodeURIComponent(modelKey);
        const result = await get(`${apiUrl}/api/models/lookup?key=${encoded}`, apiKey);
        return result;
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=cromusClient.js.map