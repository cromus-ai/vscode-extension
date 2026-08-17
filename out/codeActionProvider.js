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
exports.CodeActionProvider = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Provides quick-fix code actions for Cromus diagnostics.
 *
 * Currently offers:
 * - "Add ethos: block" for require_ethos violations
 * - "Add agents: block" for require_agents violations
 * - "Open Cromus validator" for any Cromus diagnostic
 */
class CodeActionProvider {
    constructor(diagnostics) {
        this.diagnostics = diagnostics;
    }
    provideCodeActions(document, range, context) {
        const actions = [];
        for (const diagnostic of context.diagnostics) {
            if (diagnostic.source !== "Cromus")
                continue;
            const msg = diagnostic.message;
            // ── require_ethos fix ────────────────────────────────────────────────
            if (msg.includes("policy:require_ethos") || msg.includes("ethos:")) {
                const fix = new vscode.CodeAction("Add ethos: governance block", vscode.CodeActionKind.QuickFix);
                fix.edit = new vscode.WorkspaceEdit();
                const ethosSkeleton = [
                    "",
                    "ethos:",
                    "  name: My Workflow Governance",
                    "  owner: Team Name",
                    "  approved: false",
                    "  approved_date: null",
                    "  risk_tolerance: medium",
                    "  uncertainty_behavior: pause_and_escalate",
                    "  escalation_contacts:",
                    "    primary: owner@example.com",
                ].join("\n");
                fix.edit.insert(document.uri, document.positionAt(document.getText().length), ethosSkeleton);
                fix.diagnostics = [diagnostic];
                fix.isPreferred = false;
                actions.push(fix);
            }
            // ── require_agents fix ───────────────────────────────────────────────
            if (msg.includes("policy:require_agents") || msg.includes("agents:")) {
                const fix = new vscode.CodeAction("Add agents: block", vscode.CodeActionKind.QuickFix);
                fix.edit = new vscode.WorkspaceEdit();
                const agentsSkeleton = [
                    "",
                    "agents:",
                    "  - role: executor",
                    "    model: anthropic:claude-sonnet-5",
                    "    effort: medium",
                ].join("\n");
                fix.edit.insert(document.uri, document.positionAt(document.getText().length), agentsSkeleton);
                fix.diagnostics = [diagnostic];
                actions.push(fix);
            }
            // ── Open Cromus validator ────────────────────────────────────────────
            const openValidator = new vscode.CodeAction("Open Cromus validator", vscode.CodeActionKind.QuickFix);
            openValidator.command = {
                command: "vscode.open",
                title: "Open Cromus validator",
                arguments: [
                    vscode.Uri.parse(vscode.workspace.getConfiguration("cromus").get("apiUrl", "https://cromus.ai") +
                        "/validator/skill"),
                ],
            };
            openValidator.diagnostics = [diagnostic];
            actions.push(openValidator);
        }
        return actions;
    }
}
exports.CodeActionProvider = CodeActionProvider;
//# sourceMappingURL=codeActionProvider.js.map