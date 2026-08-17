import * as vscode from "vscode";

/**
 * Provides quick-fix code actions for Cromus diagnostics.
 *
 * Currently offers:
 * - "Add ethos: block" for require_ethos violations
 * - "Add agents: block" for require_agents violations
 * - "Open Cromus validator" for any Cromus diagnostic
 */
export class CodeActionProvider implements vscode.CodeActionProvider {
  constructor(private diagnostics: vscode.DiagnosticCollection) {}

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source !== "Cromus") continue;

      const msg = diagnostic.message;

      // ── require_ethos fix ────────────────────────────────────────────────
      if (msg.includes("policy:require_ethos") || msg.includes("ethos:")) {
        const fix = new vscode.CodeAction(
          "Add ethos: governance block",
          vscode.CodeActionKind.QuickFix,
        );
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
        const fix = new vscode.CodeAction(
          "Add agents: block",
          vscode.CodeActionKind.QuickFix,
        );
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
      const openValidator = new vscode.CodeAction(
        "Open Cromus validator",
        vscode.CodeActionKind.QuickFix,
      );
      openValidator.command = {
        command: "vscode.open",
        title: "Open Cromus validator",
        arguments: [
          vscode.Uri.parse(
            vscode.workspace.getConfiguration("cromus").get<string>("apiUrl", "https://cromus.ai") +
              "/validator/skill",
          ),
        ],
      };
      openValidator.diagnostics = [diagnostic];
      actions.push(openValidator);
    }

    return actions;
  }
}
