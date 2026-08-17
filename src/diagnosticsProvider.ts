import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import {
  validateSkill,
  validateEthos,
  validateAgents,
  validateMemory,
  checkPolicy,
  type ValidationIssue,
} from "./cromusClient";

export class DiagnosticsProvider {
  constructor(private collection: vscode.DiagnosticCollection) {}

  async validate(doc: vscode.TextDocument): Promise<void> {
    const fileName = path.basename(doc.fileName);
    const content = doc.getText();

    if (!content.trim()) {
      this.collection.set(doc.uri, []);
      return;
    }

    let issues: ValidationIssue[] = [];

    try {
      if (fileName === "SKILL.md") {
        const [skillResult, policyResult] = await Promise.all([
          validateSkill(content),
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
      } else if (fileName === "ETHOS.md") {
        const result = await validateEthos(content);
        if (result) issues = [...(result.errors || []), ...(result.warnings || [])];
      } else if (fileName === "AGENTS.md") {
        const result = await validateAgents(content);
        if (result) issues = [...(result.errors || []), ...(result.warnings || [])];
      } else if (fileName === "MEMORY.md") {
        const result = await validateMemory(content);
        if (result) issues = [...(result.errors || []), ...(result.warnings || [])];
      }
    } catch {
      // Network or parse error — clear stale diagnostics, don't crash.
      this.collection.set(doc.uri, []);
      return;
    }

    const diagnostics: vscode.Diagnostic[] = issues.map((issue) =>
      this.issueToDiagnostic(doc, issue),
    );
    this.collection.set(doc.uri, diagnostics);
  }

  private async runPolicyCheck(
    doc: vscode.TextDocument,
    skillContent: string,
  ): Promise<{ violations: Array<{ rule: string; message: string }>; warnings: Array<{ rule: string; message: string }> } | null> {
    const policyFileName = vscode.workspace
      .getConfiguration("cromus")
      .get<string>("policyFile", "cromus.policy.yml");

    // Look for policy file relative to workspace root or file directory
    const workspaceFolders = vscode.workspace.workspaceFolders;
    const searchDirs = [
      ...(workspaceFolders?.map((f) => f.uri.fsPath) || []),
      path.dirname(doc.fileName),
    ];

    let policyContent: string | null = null;
    for (const dir of searchDirs) {
      const candidate = path.join(dir, policyFileName);
      try {
        if (fs.existsSync(candidate)) {
          policyContent = fs.readFileSync(candidate, "utf8");
          break;
        }
      } catch {
        // continue
      }
    }

    if (!policyContent) return null;

    try {
      return await checkPolicy(skillContent, policyContent);
    } catch {
      return null;
    }
  }

  private issueToDiagnostic(doc: vscode.TextDocument, issue: ValidationIssue): vscode.Diagnostic {
    const severity =
      issue.severity === "error"
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
    if (issue.field) diagnostic.code = issue.field;
    return diagnostic;
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
