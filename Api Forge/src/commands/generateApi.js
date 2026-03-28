const vscode = require('vscode');
const path = require('path');
const { parseRoutes } = require('../parser/routeParser');
const { generateApi } = require('../generator/apiGenerator');

let isRunning = false; // 🔥 Prevent duplicate execution (watcher issue)

async function generateApiCommand() {
    // 🚫 Prevent multiple runs (TC29 - debounce protection)
    if (isRunning) {
        console.log('⚠ Skipping duplicate API generation...');
        return;
    }

    isRunning = true;

    const startTime = Date.now();

    try {
        const workspaceFolders = vscode.workspace.workspaceFolders;

        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('❌ Please open a project folder first!');
            return;
        }

        const projectPath = workspaceFolders[0].uri.fsPath;

        vscode.window.setStatusBarMessage('⚡ Generating API...', 2000);

        // ═══════════════════════════════
        // 📥 STEP 1: PARSE ROUTES
        // ═══════════════════════════════
        let routes = [];

        try {
            routes = parseRoutes(projectPath);
        } catch (parseError) {
            console.error('❌ Route parsing failed:', parseError);
            vscode.window.showErrorMessage('❌ Failed to parse routes (invalid files?)');
            return;
        }

        // TC33 — no routes found
        if (!routes || routes.length === 0) {
            vscode.window.showWarningMessage('⚠ No routes found in project!');
            return;
        }

        // ═══════════════════════════════
        // ⚙️ STEP 2: LOAD CONFIG
        // ═══════════════════════════════
        const config = vscode.workspace.getConfiguration('smartApiConnector');

        const splitFiles  = config.get('splitFiles')  ?? false;
        const cleanOutput = config.get('cleanOutput') ?? true;

        console.log('📦 Parsed Routes:', routes.length);
        console.log('⚙️ Settings:', { splitFiles, cleanOutput });

        // ═══════════════════════════════
        // 🧹 STEP 3: CLEAN OUTPUT (TC26)
        // ═══════════════════════════════
        const outputDir = path.join(projectPath, 'generated-api');

        if (cleanOutput) {
            try {
                const fs = require('fs');

                if (fs.existsSync(outputDir)) {
                    fs.rmSync(outputDir, { recursive: true, force: true });
                    console.log('🧹 Old API files removed');
                }
            } catch (cleanErr) {
                console.warn('⚠ Failed to clean output folder:', cleanErr.message);
            }
        }

        // ═══════════════════════════════
        // 🛠 STEP 4: GENERATE API
        // ═══════════════════════════════
        let outputPath;

        try {
            outputPath = generateApi(routes, projectPath, splitFiles);
        } catch (genError) {
            console.error('❌ API generation failed:', genError);
            vscode.window.showErrorMessage('❌ Failed to generate API files');
            return;
        }

        // ═══════════════════════════════
        // 📊 STEP 5: SUCCESS FEEDBACK
        // ═══════════════════════════════
        const duration = Date.now() - startTime;

        vscode.window.setStatusBarMessage(
            `✅ API Generated (${routes.length} routes in ${duration}ms)`,
            4000
        );

        vscode.window.showInformationMessage(
            `✅ API generated successfully (${routes.length} routes)`
        );

        console.log('📁 Output Path:', outputPath);
        console.log(`⚡ Generation Time: ${duration}ms`);

    } catch (error) {
        console.error('❌ Unexpected Error:', error);
        vscode.window.showErrorMessage(`❌ Failed: ${error.message}`);
    } finally {
        // 🔓 Always release lock
        isRunning = false;
    }
}

module.exports = { generateApiCommand };