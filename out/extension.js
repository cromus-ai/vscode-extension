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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const diagnosticsProvider_1 = require("./diagnosticsProvider");
const statusBarProvider_1 = require("./statusBarProvider");
const hoverProvider_1 = require("./hoverProvider");
const codeActionProvider_1 = require("./codeActionProvider");
const SKILL_FILES = ["SKILL.md", "ETHOS.md", "AGENTS.md", "MEMORY.md"];
const SKILL_SELECTOR = SKILL_FILES.map((name) => ({
    scheme: "file",
    pattern: `**/${name}`,
}));
function activate(context) {
    const diagnostics = vscode.languages.createDiagnosticCollection("cromus");
    context.subscriptions.push(diagnostics);
    const diagnosticsProvider = new diagnosticsProvider_1.DiagnosticsProvider(diagnostics);
    const statusBar = new statusBarProvider_1.StatusBarProvider(context);
    const hoverProvider = new hoverProvider_1.HoverProvider();
    const codeActionProvider = new codeActionProvider_1.CodeActionProvider(diagnostics);
    // ── Validate on save ──────────────────────────────────────────────────────
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(async (doc) => {
        if (!isCromusFile(doc.fileName))
            return;
        if (!vscode.workspace.getConfiguration("cromus").get("validateOnSave", true))
            return;
        await diagnosticsProvider.validate(doc);
        if (doc.fileName.endsWith("SKILL.md")) {
            await statusBar.update(doc);
        }
    }));
    // ── Update status bar on editor switch ────────────────────────────────────
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(async (editor) => {
        if (editor && editor.document.fileName.endsWith("SKILL.md")) {
            await statusBar.update(editor.document);
        }
        else {
            statusBar.hide();
        }
    }));
    // ── Validate already-open files on activation ────────────────────────────
    if (vscode.window.activeTextEditor) {
        const doc = vscode.window.activeTextEditor.document;
        if (isCromusFile(doc.fileName)) {
            diagnosticsProvider.validate(doc).catch(() => { });
            if (doc.fileName.endsWith("SKILL.md")) {
                statusBar.update(doc).catch(() => { });
            }
        }
    }
    // ── Hover provider ────────────────────────────────────────────────────────
    context.subscriptions.push(vscode.languages.registerHoverProvider(SKILL_SELECTOR, hoverProvider));
    // ── Code action provider ──────────────────────────────────────────────────
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider(SKILL_SELECTOR, codeActionProvider, {
        providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
    }));
    // ── Commands ──────────────────────────────────────────────────────────────
    context.subscriptions.push(vscode.commands.registerCommand("cromus.scoreCurrentFile", async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || !editor.document.fileName.endsWith("SKILL.md")) {
            vscode.window.showWarningMessage("Open a SKILL.md file to score it.");
            return;
        }
        await statusBar.update(editor.document);
        vscode.window.showInformationMessage("Cromus: SKILL.md scored — check the status bar.");
    }));
    context.subscriptions.push(vscode.commands.registerCommand("cromus.validateCurrentFile", async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || !isCromusFile(editor.document.fileName)) {
            vscode.window.showWarningMessage("Open a SKILL.md, ETHOS.md, AGENTS.md, or MEMORY.md to validate it.");
            return;
        }
        await diagnosticsProvider.validate(editor.document);
        vscode.window.showInformationMessage("Cromus: Validation complete — check the Problems panel.");
    }));
    context.subscriptions.push(vscode.commands.registerCommand("cromus.openConnect", () => {
        const apiUrl = vscode.workspace.getConfiguration("cromus").get("apiUrl", "https://cromus.ai");
        vscode.env.openExternal(vscode.Uri.parse(`${apiUrl}/connect`));
    }));
    // ── API key prompt on first use ───────────────────────────────────────────
    const apiKey = vscode.workspace.getConfiguration("cromus").get("apiKey", "");
    if (!apiKey) {
        vscode.window
            .showInformationMessage("Cromus: Add your API key to enable scoring and validation.", "Open Settings", "Get API Key")
            .then((choice) => {
            if (choice === "Open Settings") {
                vscode.commands.executeCommand("workbench.action.openSettings", "cromus.apiKey");
            }
            else if (choice === "Get API Key") {
                const apiUrl = vscode.workspace.getConfiguration("cromus").get("apiUrl", "https://cromus.ai");
                vscode.env.openExternal(vscode.Uri.parse(`${apiUrl}/connect`));
            }
        });
    }
}
function deactivate() { }
function isCromusFile(fileName) {
    return SKILL_FILES.some((name) => fileName.endsWith(`/${name}`) || fileName.endsWith(`\\${name}`));
}
//# sourceMappingURL=extension.js.map