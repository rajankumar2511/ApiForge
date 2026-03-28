const vscode = require('vscode');
const path   = require('path');
const { generateApiCommand } = require('./commands/generateApi');

let watcherInstance = null;
let debounceTimer   = null;
let isRunning       = false;

const DEBOUNCE_MS = 400;

function activate(context) {
    console.log('🚀 Smart API Connector activated!');

    // 🔥 STATUS BAR BUTTON
    const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
    statusBar.text = "⚡ Generate API";
    statusBar.command = "smart-api-connector.generateApi";
    statusBar.tooltip = "Generate API from backend routes";
    statusBar.show();
    context.subscriptions.push(statusBar);

    // 🔥 COMMAND
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'smart-api-connector.generateApi',
            async () => {
                if (isRunning) return;

                isRunning = true;
                try {
                    await generateApiCommand();
                } catch (err) {
                    console.error('❌ Manual generate failed:', err);
                    vscode.window.showErrorMessage(`❌ ${err.message}`);
                } finally {
                    isRunning = false;
                }
            }
        )
    );

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showWarningMessage('⚠ Open a project folder to use Smart API Connector');
        return;
    }

    const config       = vscode.workspace.getConfiguration('smartApiConnector');
    const autoGenerate = config.get('autoGenerate') ?? true;

    if (autoGenerate) startWatcher(context);

    // 🔄 CONFIG CHANGE HANDLER
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (!e.affectsConfiguration('smartApiConnector.autoGenerate')) return;

            const on = vscode.workspace
                .getConfiguration('smartApiConnector')
                .get('autoGenerate') ?? true;

            if (on && !watcherInstance) {
                startWatcher(context);
            } else if (!on && watcherInstance) {
                stopWatcher();
            }
        })
    );
}

// 👀 WATCHER
function startWatcher(context) {
    if (watcherInstance) return;

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) return;

    // 🔥 WATCH ALL RELEVANT FILES (future-proof for Python)
    const pattern = new vscode.RelativePattern(workspaceFolder, '**/*.{js,ts,py}');
    const watcher = vscode.workspace.createFileSystemWatcher(pattern);

    watcherInstance = watcher;

    const shouldIgnore = (filePath) => {
        if (!filePath) return true;

        const normalized = filePath.split(path.sep).join('/');

        if (normalized.includes('/output/')) return true;
        if (normalized.includes('/node_modules/')) return true;

        return false;
    };

    const trigger = (uri) => {
        if (!uri?.fsPath) return;

        const fp = uri.fsPath;
        if (shouldIgnore(fp)) return;

        clearTimeout(debounceTimer);

        debounceTimer = setTimeout(async () => {
            if (isRunning) {
                console.log('⚠ Skipping (already running)');
                return;
            }

            isRunning = true;

            try {
                console.log('📡 File changed:', fp);
                vscode.window.setStatusBarMessage('⚡ Auto-generating API...', 2000);

                await generateApiCommand();

            } catch (err) {
                console.error('❌ Auto-generate failed:', err);
                vscode.window.showErrorMessage(`❌ ${err.message}`);
            } finally {
                isRunning = false;
            }
        }, DEBOUNCE_MS);
    };

    watcher.onDidChange(trigger);
    watcher.onDidCreate(trigger);
    watcher.onDidDelete(trigger);

    context.subscriptions.push(watcher);

    console.log('👀 Watcher started');
}

// 🛑 STOP WATCHER
function stopWatcher() {
    if (!watcherInstance) return;

    watcherInstance.dispose();
    watcherInstance = null;

    clearTimeout(debounceTimer);

    console.log('🛑 Watcher stopped');
}

// 🛑 DEACTIVATE
function deactivate() {
    stopWatcher();
    console.log('🛑 Smart API Connector deactivated');
}

module.exports = { activate, deactivate };