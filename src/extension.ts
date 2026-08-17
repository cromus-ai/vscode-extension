import * as vscode from "vscode";
import { DiagnosticsProvider } from "./diagnosticsProvider";
import { StatusBarProvider } from "./statusBarProvider";
import { HoverProvider } from "./hoverProvider";
import { CodeActionProvider } from "./codeActionProvider";

const SKILL_FILES = ["SKILL.md", "ETHOS.md", "AGENTS.md", "MEMORY.md"];
const SKILL_SELECTOR: vscode.DocumentSelector = SKILL_FILES.map((name) => ({
  scheme: "file",
  pattern: `**/${name}`,
}));

export function activate(context: vscode.ExtensionContext) {
  const diagnostics = vscode.languages.createDiagnosticCollection("cromus");
  context.subscriptions.push(diagnostics);

  const diagnosticsProvider = new DiagnosticsProvider(diagnostics);
  const statusBar = new StatusBarProvider(context);
  const hoverProvider = new HoverProvider();
  const codeActionProvider = new CodeActionProvider(diagnostics);

  // ── Validate on save ──────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(async (doc) => {
      if (!isCromusFile(doc.fileName)) return;
      if (!vscode.workspace.getConfiguration("cromus").get<boolean>("validateOnSave", true)) return;
      await diagnosticsProvider.validate(doc);
      if (doc.fileName.endsWith("SKILL.md")) {
        await statusBar.update(doc);
      }
    }),
  );

  // ── Update status bar on editor switch ────────────────────────────────────
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(async (editor) => {
      if (editor && editor.document.fileName.endsWith("SKILL.md")) {
        await statusBar.update(editor.document);
      } else {
        statusBar.hide();
      }
    }),
  );

  // ── Validate already-open files on activation ────────────────────────────
  if (vscode.window.activeTextEditor) {
    const doc = vscode.window.activeTextEditor.document;
    if (isCromusFile(doc.fileName)) {
      diagnosticsProvider.validate(doc).catch(() => {});
      if (doc.fileName.endsWith("SKILL.md")) {
        statusBar.update(doc).catch(() => {});
      }
    }
  }

  // ── Hover provider ────────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(SKILL_SELECTOR, hoverProvider),
  );

  // ── Code action provider ──────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(SKILL_SELECTOR, codeActionProvider, {
      providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
    }),
  );

  // ── Commands ──────────────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand("cromus.scoreCurrentFile", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || !editor.document.fileName.endsWith("SKILL.md")) {
        vscode.window.showWarningMessage("Open a SKILL.md file to score it.");
        return;
      }
      await statusBar.update(editor.document);
      vscode.window.showInformationMessage("Cromus: SKILL.md scored — check the status bar.");
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("cromus.validateCurrentFile", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || !isCromusFile(editor.document.fileName)) {
        vscode.window.showWarningMessage("Open a SKILL.md, ETHOS.md, AGENTS.md, or MEMORY.md to validate it.");
        return;
      }
      await diagnosticsProvider.validate(editor.document);
      vscode.window.showInformationMessage("Cromus: Validation complete — check the Problems panel.");
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("cromus.openConnect", () => {
      const apiUrl = vscode.workspace.getConfiguration("cromus").get<string>("apiUrl", "https://cromus.ai");
      vscode.env.openExternal(vscode.Uri.parse(`${apiUrl}/connect`));
    }),
  );

  // ── API key prompt on first use ───────────────────────────────────────────
  const apiKey = vscode.workspace.getConfiguration("cromus").get<string>("apiKey", "");
  if (!apiKey) {
    vscode.window
      .showInformationMessage(
        "Cromus: Add your API key to enable scoring and validation.",
        "Open Settings",
        "Get API Key",
      )
      .then((choice) => {
        if (choice === "Open Settings") {
          vscode.commands.executeCommand("workbench.action.openSettings", "cromus.apiKey");
        } else if (choice === "Get API Key") {
          const apiUrl = vscode.workspace.getConfiguration("cromus").get<string>("apiUrl", "https://cromus.ai");
          vscode.env.openExternal(vscode.Uri.parse(`${apiUrl}/connect`));
        }
      });
  }
}

export function deactivate() {}

function isCromusFile(fileName: string): boolean {
  return SKILL_FILES.some((name) => fileName.endsWith(`/${name}`) || fileName.endsWith(`\\${name}`));
}
