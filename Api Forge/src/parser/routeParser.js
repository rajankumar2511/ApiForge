const fs   = require('fs');
const path = require('path');

// ─────────────────────────────────────────────────────────────
// 📁  FILE SCANNER
// ─────────────────────────────────────────────────────────────
function getAllJsFiles(dirPath, files = []) {
    if (!fs.existsSync(dirPath)) return files;

    let items;
    try {
        items = fs.readdirSync(dirPath);
    } catch {
        return files;
    }

    for (const item of items) {
        const fullPath = path.join(dirPath, item);

        try {
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                if (
                    item !== 'node_modules' &&
                    item !== 'output' &&
                    !item.startsWith('.')
                ) {
                    getAllJsFiles(fullPath, files);
                }
            } else if (item.endsWith('.js')) {
                files.push(fullPath);
            }
        } catch {
            // skip unreadable
        }
    }

    return files;
}

// ─────────────────────────────────────────────────────────────
// 🧹 COMMENT STRIPPER
// ─────────────────────────────────────────────────────────────
function stripComments(src) {
    return src
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/\/\/[^\n]*/g, '');
}

// ─────────────────────────────────────────────────────────────
// 📦 IMPORT EXTRACTOR
// ─────────────────────────────────────────────────────────────
function extractImports(content) {
    const imports = {};
    const src = stripComments(content);
    let m;

    const cjsRe = /const\s+(\w+)\s*=\s*require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
    while ((m = cjsRe.exec(src)) !== null) {
        imports[m[1]] = m[2];
    }

    const esmRe = /import\s+(\w+)\s+from\s+['"`]([^'"`]+)['"`]/g;
    while ((m = esmRe.exec(src)) !== null) {
        imports[m[1]] = m[2];
    }

    return imports;
}

// ─────────────────────────────────────────────────────────────
// 🌐 app.use EXTRACTOR
// ─────────────────────────────────────────────────────────────
function extractAppUses(content) {
    const src  = stripComments(content);
    const uses = [];
    let m;

    const namedRe = /app\s*\.\s*use\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(\w+)/g;
    while ((m = namedRe.exec(src)) !== null) {
        uses.push({ prefix: m[1], variable: m[2], inlineRequire: null });
    }

    const inlineRe = /app\s*\.\s*use\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
    while ((m = inlineRe.exec(src)) !== null) {
        uses.push({ prefix: m[1], variable: null, inlineRequire: m[2] });
    }

    return uses;
}

// ─────────────────────────────────────────────────────────────
// 🔁 router.use EXTRACTOR
// ─────────────────────────────────────────────────────────────
function extractRouterUses(content) {
    const src  = stripComments(content);
    const uses = [];
    let m;

    const namedRe = /router\s*\.\s*use\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(\w+)/g;
    while ((m = namedRe.exec(src)) !== null) {
        uses.push({ prefix: m[1], variable: m[2], inlineRequire: null });
    }

    const inlineRe = /router\s*\.\s*use\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
    while ((m = inlineRe.exec(src)) !== null) {
        uses.push({ prefix: m[1], variable: null, inlineRequire: m[2] });
    }

    return uses;
}

// ─────────────────────────────────────────────────────────────
// 🚀 ROUTE EXTRACTOR
// ─────────────────────────────────────────────────────────────
function extractRoutes(content) {
    const src = stripComments(content);

    const re = /(router|app)\s*\.\s*(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi;

    const routes = [];
    let m;

    while ((m = re.exec(src)) !== null) {
        routes.push({
            method: m[2].toUpperCase(),
            path: m[3]
        });
    }

    return routes;
}

// ─────────────────────────────────────────────────────────────
// 🔗 PATH UTILITIES
// ─────────────────────────────────────────────────────────────
function normalizePath(p) {
    if (!p) return '/';

    return p
        .replace(/\/+/g, '/')
        .replace(/\/$/, '') || '/';
}

function smartJoin(prefix, routePath) {
    const pParts = prefix.split('/').filter(Boolean);
    const rParts = routePath.split('/').filter(Boolean);

    if (rParts.length === 0) {
        return normalizePath('/' + pParts.join('/'));
    }

    // find longest overlap
    for (let len = Math.min(pParts.length, rParts.length); len > 0; len--) {
        const tail = pParts.slice(-len).join('/');
        const head = rParts.slice(0, len).join('/');

        if (tail === head) {
            return normalizePath('/' + [...pParts, ...rParts.slice(len)].join('/'));
        }
    }

    return normalizePath('/' + [...pParts, ...rParts].join('/'));
}

// ─────────────────────────────────────────────────────────────
// 🧠 IMPORT RESOLVER
// ─────────────────────────────────────────────────────────────
function resolveImport(fromFile, importPath) {
    if (!importPath || !importPath.startsWith('.')) return null;

    const base = path.dirname(fromFile);
    const full = path.resolve(base, importPath);

    try {
        if (fs.existsSync(full + '.js')) return full + '.js';
        if (fs.existsSync(path.join(full, 'index.js')))
            return path.join(full, 'index.js');
        if (fs.existsSync(full)) return full;
    } catch {
        return null;
    }

    return null;
}

// ─────────────────────────────────────────────────────────────
// 🔥 RECURSIVE PARSER
// ─────────────────────────────────────────────────────────────
function parseFile(filePath, projectPath, parentPrefix = '', visited = new Set()) {
    if (visited.has(filePath)) return [];

    const newVisited = new Set(visited);
    newVisited.add(filePath);

    let content;
    try {
        content = fs.readFileSync(filePath, 'utf-8');
    } catch {
        return [];
    }

    const imports    = extractImports(content);
    const routes     = extractRoutes(content);
    const routerUses = extractRouterUses(content);

    const result = [];

    // direct routes
    for (const route of routes) {
        result.push({
            method: route.method,
            path: smartJoin(parentPrefix, route.path)
        });
    }

    // nested routers
    for (const u of routerUses) {
        let resolved = null;

        if (u.inlineRequire) {
            resolved = resolveImport(filePath, u.inlineRequire);
        } else if (u.variable && imports[u.variable]) {
            resolved = resolveImport(filePath, imports[u.variable]);
        }

        if (!resolved) continue;

        const newPrefix = smartJoin(parentPrefix, u.prefix);

        result.push(
            ...parseFile(resolved, projectPath, newPrefix, newVisited)
        );
    }

    return result;
}

// ─────────────────────────────────────────────────────────────
// 🚀 ENTRY POINT
// ─────────────────────────────────────────────────────────────
function parseRoutes(projectPath) {
    const files = getAllJsFiles(projectPath);

    const routeSet  = new Set();
    const allRoutes = [];

    for (const file of files) {
        let content;

        try {
            content = fs.readFileSync(file, 'utf-8');
        } catch {
            continue;
        }

        const imports = extractImports(content);
        const appUses = extractAppUses(content);

        for (const u of appUses) {
            let resolved = null;

            if (u.inlineRequire) {
                resolved = resolveImport(file, u.inlineRequire);
            } else if (u.variable && imports[u.variable]) {
                resolved = resolveImport(file, imports[u.variable]);
            }

            if (!resolved) continue;

            const routes = parseFile(resolved, projectPath, u.prefix);

            for (const r of routes) {
                const norm = normalizePath(r.path);
                const key  = r.method + '|' + norm;

                if (routeSet.has(key)) continue;

                routeSet.add(key);
                allRoutes.push({
                    method: r.method,
                    path: norm
                });
            }
        }
    }

    return allRoutes;
}

module.exports = { parseRoutes };