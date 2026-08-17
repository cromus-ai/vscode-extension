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
exports.DiagnosticsProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const cromusClient_1 = require("./cromusClient");
class DiagnosticsProvider {
    constructor(collection) {
        this.collection = collection;
    }
    async validate(doc) {
        const fileName = path.basename(doc.fileName);
        const content = doc.getText();
        if (!content.trim()) {
            this.collection.set(doc.uri, []);
            return;
        }
        let issues = [];
        try {
            if (fileName === "SKILL.md") {
                const [skillResult, policyResult] = await Promise.all([
                    (0, cromusClient_1.validateSkill)(content),
                    this.runPolicyCheck(doc, content),
                ]);
                if (skillResult) {
                    issues = [...(skillResult.errors || []), ...(skillResult.warnings || [])];
                }
                if (policyResult) {
                    for (const v of policyResult.violations) {
                        issues.push({ message: `[policy:${v.rule}] ${v.message}`, severity: "error" });
                    }
                    for (const w of policyResult.warnings) {
                        issues.push({ message: `[policy:${w.rule}] ${w.message}`, severity: "warning" });
                    }
                }
            }
            else if (fileName === "ETHOS.md") {
                const result = await (0, cromusClient_1.validateEthos)(content);
                if (result)
                    issues = [...(result.errors || []), ...(result.warnings || [])];
            }
            else if (fileName === "AGENTS.md") {
                const result = await (0, cromusClient_1.validateAgents)(content);
                if (result)
                    issues = [...(result.errors || []), ...(result.warnings || [])];
            }
            else if (fileName === "MEMORY.md") {
                const result = await (0, cromusClient_1.validateMemory)(content);
                if (result)
                    issues = [...(result.errors || []), ...(result.warnings || [])];
            }
        }
        catch {
            // Network or parse error — clear stale diagnostics, don't crash.
            this.collection.set(doc.uri, []);
            return;
        }
        const diagnostics = issues.map((issue) => this.issueToDiagnostic(doc, issue));
        this.collection.set(doc.uri, diagnostics);
    }
    async runPolicyCheck(doc, skillContent) {
        const policyFileName = vscode.workspace
            .getConfiguration("cromus")
            .get("policyFile", "cromus.policy.yml");
        // Look for policy file relative to workspace root or file directory
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const searchDirs = [
            ...(workspaceFolders?.map((f) => f.uri.fsPath) || []),
            path.dirname(doc.fileName),
        ];
        let policyContent = null;
        for (const dir of searchDirs) {
            const candidate = path.join(dir, policyFileName);
            try {
                if (fs.existsSync(candidate)) {
                    policyContent = fs.readFileSync(candidate, "utf8");
                    break;
                }
            }
            catch {
                // continue
            }
        }
        if (!policyContent)
            return null;
        try {
            return await (0, cromusClient_1.checkPolicy)(skillContent, policyContent);
        }
        catch {
            return null;
        }
    }
    issueToDiagnostic(doc, issue) {
        const severity = issue.severity === "error"
            ? vscode.DiagnosticSeverity.Error
            : issue.severity === "warning"
                ? vscode.DiagnosticSeverity.Warning
                : vscode.DiagnosticSeverity.Information;
        // Try to locate the field in the document so we can point at the right line.
        let range = new vscode.Range(0, 0, 0, 0);
        if (issue.field) {
            const fieldPattern = new RegExp(`^\\s*${escapeRegex(issue.field)}\\s*:`, "m");
            const match = fieldPattern.exec(doc.getText());
            if (match) {
                const pos = doc.positionAt(match.index);
                range = new vscode.Range(pos, pos.translate(0, issue.field.length));
            }
        }
        const diagnostic = new vscode.Diagnostic(range, issue.message, severity);
        diagnostic.source = "Cromus";
        if (issue.field)
            diagnostic.code = issue.field;
        return diagnostic;
    }
}
exports.DiagnosticsProvider = DiagnosticsProvider;
function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
//# sourceMappingURL=diagnosticsProvider.js.map