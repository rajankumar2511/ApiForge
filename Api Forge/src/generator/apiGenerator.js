const fs = require('fs');
const path = require('path');
const vscode = require('vscode');

// ═══════════════════════════════════════════════════════════
// 🔤 STRING HELPERS
// ═══════════════════════════════════════════════════════════

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function toSingular(word) {
    if (!word || word.length <= 2) return word;

    if (word.endsWith('sses') || word.endsWith('xes') || word.endsWith('zes'))
        return word.slice(0, -2);

    if (word.endsWith('ies'))
        return word.slice(0, -3) + 'y';

    if (word.endsWith('ves'))
        return word.slice(0, -3) + 'f';

    if (word.endsWith('s') && !word.endsWith('ss') && word.length > 3)
        return word.slice(0, -1);

    return word;
}

// ═══════════════════════════════════════════════════════════
// 🧠 NAMING ENGINE
// ═══════════════════════════════════════════════════════════

const AUTH_VERBS = new Set([
    'login', 'logout', 'signup', 'register', 'verify',
    'refresh', 'reset', 'activate', 'confirm', 'resend',
    'forgot', 'recover', 'revoke',
]);

const AUTH_NOUNS = new Set([
    'auth', 'password', 'token', 'otp', 'email', 'session', 'me',
]);

function isAuthFamily(segs) {
    return segs.some(s => AUTH_VERBS.has(s) || AUTH_NOUNS.has(s));
}

function generateFunctionName(method, routePath) {
    const rawParts = routePath.split('/').filter(Boolean);
    const allStatic = rawParts.filter(p => !p.startsWith(':'));
    const paramParts = rawParts.filter(p => p.startsWith(':'));

    const segs = allStatic[0] === 'api' ? allStatic.slice(1) : allStatic;

    const hasParam = paramParts.length > 0;
    const paramName = paramParts[0]?.slice(1) || 'Id';

    if (isAuthFamily(segs)) {
        const verbIdx = [...segs].reverse().findIndex(s => AUTH_VERBS.has(s));
        if (verbIdx !== -1) {
            const fromEnd = segs.length - 1 - verbIdx;
            const verb = segs[fromEnd];
            const qualifier = segs.slice(0, fromEnd).filter(s => s !== 'auth');
            return verb + qualifier.map(capitalize).join('');
        }
    }

    if (segs.length === 0) return method.toLowerCase() + 'Root';

    const noun = segs[segs.length - 1];
    const context = segs.slice(0, -1);
    const contextSingular = context.length > 0 ? toSingular(context[context.length - 1]) : null;

    const lastStaticIdx = rawParts.lastIndexOf(noun);
    const firstParamIdx = rawParts.findIndex(p => p.startsWith(':'));
    const paramIsSelector = hasParam && (firstParamIdx > lastStaticIdx);

    switch (method) {
        case 'GET':
            if (paramIsSelector)
                return `get${capitalize(toSingular(noun))}By${capitalize(paramName)}`;
            if (hasParam && contextSingular)
                return `get${capitalize(contextSingular)}${capitalize(noun)}`;
            return `get${capitalize(noun)}`;

        case 'POST':
            if (hasParam && contextSingular)
                return `create${capitalize(toSingular(contextSingular))}${capitalize(toSingular(noun))}`;
            return `create${capitalize(toSingular(noun))}`;

        case 'DELETE': return `delete${capitalize(toSingular(noun))}`;
        case 'PUT': return `replace${capitalize(toSingular(noun))}`;
        case 'PATCH': return `update${capitalize(toSingular(noun))}`;
        default: return method.toLowerCase() + capitalize(toSingular(noun));
    }
}

// ═══════════════════════════════════════════════════════════
// 🛠 PATH HELPERS
// ═══════════════════════════════════════════════════════════

function removeBase(pathStr) {
    return pathStr.replace(/^\/api/, '') || '/';
}

function normalizePath(pathStr) {
    if (!pathStr) return pathStr;
    return pathStr.replace(/\/+/g, '/').replace(/(?<=.)\/+$/, '');
}

// ═══════════════════════════════════════════════════════════
// 🧹 DEDUP
// ═══════════════════════════════════════════════════════════

function removeDuplicateRoutes(routes) {
    const seen = new Set();
    return routes.filter(r => {
        const key = r.method + '|' + r.path;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

// ═══════════════════════════════════════════════════════════
// ⚡ SMART WRITE (NO REWRITE IF SAME)
// ═══════════════════════════════════════════════════════════

function writeIfChanged(filePath, content) {
    if (fs.existsSync(filePath)) {
        const existing = fs.readFileSync(filePath, 'utf-8');
        if (existing === content) return;
    }
    fs.writeFileSync(filePath, content);
}

// ═══════════════════════════════════════════════════════════
// 🧩 API CLIENT
// ═══════════════════════════════════════════════════════════

function writeApiClient(outputDir) {
    const filePath = path.join(outputDir, 'apiClient.js');

    const content = `import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

api.interceptors.response.use(
  res => res.data,
  err => {
    console.error("API Error:", err.response?.data || err.message);
    return Promise.reject(err.response?.data || err.message);
  }
);

export default api;
`;

    writeIfChanged(filePath, content);
}

// ═══════════════════════════════════════════════════════════
// 📦 GROUPING
// ═══════════════════════════════════════════════════════════

function groupRoutesByModule(routes) {
    const grouped = {};

    for (const route of routes) {
        const parts = route.path.split('/').filter(Boolean);

        const raw = parts[0] === 'api'
            ? (parts[1] || 'common')
            : (parts[0] || 'common');

        const moduleName = raw.startsWith(':') ? 'common' : raw;

        if (!grouped[moduleName]) grouped[moduleName] = [];
        grouped[moduleName].push(route);
    }

    return grouped;
}

// ═══════════════════════════════════════════════════════════
// 🔥 CODE GENERATOR (FIXED - CRITICAL PARAM BUG)
// ═══════════════════════════════════════════════════════════

function generateCodeBlock(route) {
    const funcName = generateFunctionName(route.method, route.path);
    const hasParams = route.path.includes(':');
    const cleanPath = removeBase(route.path);

    // 🔥 FIXED: Properly convert :id → ${params.id}
    const urlExpr = hasParams
        ? `\`${cleanPath.replace(/:(\w+)/g, (_, p1) => '${params.' + p1 + '}')}\``
        : `'${cleanPath}'`;

    // Enhanced param validation
    const paramGuard = hasParams
        ? `if (!params?.${route.path.match(/:(\w+)/)?.[1] || 'id'}) throw new Error("Missing param: ${route.path.match(/:(\w+)/)?.[1] || 'id'}");\n  `
        : '';

    // Detect if route actually needs params
    const needsParams = hasParams;
    const needsQuery = route.method === 'GET';
    const needsData = ['POST', 'PUT', 'PATCH'].includes(route.method);

    // Build signature with only needed args
    const signatureParts = [];
    if (needsParams) signatureParts.push('params');
    if (needsQuery) signatureParts.push('query');
    if (needsData && !needsParams) signatureParts.push('data');

    const signature = signatureParts.length > 0
        ? `{ ${signatureParts.join(', ')} } = {}`
        : '{}';

    switch (route.method) {
        case 'GET':
            return `export const ${funcName} = (${signature}) => {
  ${paramGuard}return api.get(${urlExpr}, { params: query });
};\n\n`;

        case 'POST':
            return `export const ${funcName} = (${signature}) => {
  ${paramGuard}return api.post(${urlExpr}, data);
};\n\n`;

        case 'DELETE':
            return `export const ${funcName} = (${signature}) => {
  ${paramGuard}return api.delete(${urlExpr});
};\n\n`;

        case 'PUT':
            return `export const ${funcName} = (${signature}) => {
  ${paramGuard}return api.put(${urlExpr}, data);
};\n\n`;

        case 'PATCH':
            return `export const ${funcName} = (${signature}) => {
  ${paramGuard}return api.patch(${urlExpr}, data);
};\n\n`;

        default:
            return '';
    }
}

// ═══════════════════════════════════════════════════════════
// 🧾 FILE GENERATOR
// ═══════════════════════════════════════════════════════════

function generateApiCode(routes) {
    const grouped = groupRoutesByModule(routes);
    const files = {};

    for (const [moduleName, moduleRoutes] of Object.entries(grouped)) {
        files[moduleName] =
            `import api from "./apiClient";\n\n` +
            moduleRoutes.map(generateCodeBlock).join('');
    }

    return files;
}

// ═══════════════════════════════════════════════════════════
// 🚀 MAIN
// ═══════════════════════════════════════════════════════════

function generateApi(routes, projectPath, splitFiles) {
    const config = vscode.workspace.getConfiguration('smartApiConnector');
    const outputDir = path.join(projectPath, config.get('outputDir') || 'output');

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const normalizedRoutes = routes.map(r => ({
        ...r,
        path: normalizePath(r.path)
    }));

    const uniqueRoutes = removeDuplicateRoutes(normalizedRoutes);

    writeApiClient(outputDir);

    const files = generateApiCode(uniqueRoutes);

    for (const [moduleName, code] of Object.entries(files)) {
        const filePath = path.join(outputDir, `${moduleName}Api.js`);
        writeIfChanged(filePath, code);
    }

    return outputDir;
}

module.exports = { generateApi };