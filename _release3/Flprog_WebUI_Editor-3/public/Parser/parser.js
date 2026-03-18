/**
 * Парсер Arduino скетчей (.ino) — извлечение переменных, функций, директив (порт с Python)
 */
/**
 * Парсер Arduino скетчей (.ino) — извлечение переменных, функций, директив (порт с Python)
 */
// Поддержка как модулей, так и обычных скриптов
const _PRIMITIVE_TYPES = (typeof PRIMITIVE_TYPES !== 'undefined') 
    ? PRIMITIVE_TYPES 
    : new Set(['int', 'long', 'unsigned long', 'bool', 'boolean', 'float', 'double', 'byte', 'char', 'String', 'uint8_t', 'int16_t', 'uint16_t', 'int32_t', 'uint32_t']);

const PRIMITIVE_TYPES_LIST = [..._PRIMITIVE_TYPES].sort((a, b) => b.length - a.length);
const PRIMITIVE_TYPE_REGEX = new RegExp(
  '^(' + PRIMITIVE_TYPES_LIST.map(t => t.replace(/\s+/g, '\\s+')).join('|') + ')\\b\\s+(.+)$'
);

export function maskComments(text) {
  let t = text.replace(/\/\*[\s\S]*?\*\//g, match => ' '.repeat(match.length));
  t = t.replace(/\/\/[^\n]*/g, match => ' '.repeat(match.length));
  return t;
}

export function extractFunctionBody(code, funcName) {
  const escaped = funcName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp('void\\s+' + escaped + '\\s*\\(\\s*\\)\\s*\\{');
  const masked = maskComments(code);
  const match = masked.match(pattern);
  if (!match) return '';
  let startPos = match.index + match[0].length;
  let braceCount = 1;
  let pos = startPos;
  while (pos < code.length && braceCount > 0) {
    if (code[pos] === '{') braceCount++;
    else if (code[pos] === '}') braceCount--;
    pos++;
  }
  if (braceCount === 0) return code.slice(startPos, pos - 1).trim();
  return '';
}

function extractCustomFunctionBody(code, startPos) {
  let braceCount = 1;
  let pos = startPos;
  while (pos < code.length && braceCount > 0) {
    if (code[pos] === '{') braceCount++;
    else if (code[pos] === '}') braceCount--;
    pos++;
  }
  if (braceCount === 0) return code.slice(startPos, pos - 1).trim();
  return '';
}

function extractGlobalSection(code) {
  const setupMatch = code.match(/void\s+setup\s*\(/);
  const loopMatch = code.match(/void\s+loop\s*\(/);
  let firstFuncPos = code.length;
  if (setupMatch && setupMatch.index < firstFuncPos) firstFuncPos = setupMatch.index;
  if (loopMatch && loopMatch.index < firstFuncPos) firstFuncPos = loopMatch.index;
  return code.slice(0, firstFuncPos).trim();
}

function extractLeadingComment(code) {
  let i = 0;
  const n = code.length;
  while (i < n && /\s/.test(code[i])) i++;
  if (i >= n) return null;
  if (code.startsWith('/*', i)) {
    const end = code.indexOf('*/', i + 2);
    const commentBody = end === -1 ? code.slice(i + 2).trim() : code.slice(i + 2, end).trim();
    return commentBody || null;
  }
  if (code.startsWith('//', i)) {
    const lines = [];
    let pos = i;
    while (pos < n) {
      const lineEnd = code.indexOf('\n', pos);
      const end = lineEnd === -1 ? n : lineEnd;
      const line = code.slice(pos, end);
      if (line.trim().startsWith('//')) {
        lines.push(line.replace(/^\s*\/\/\s*/, '').trimEnd());
        pos = end + 1;
      } else break;
    }
    const commentBody = lines.join('\n').trim();
    return commentBody || null;
  }
  return null;
}

function hasEnableInputMarkerInLeadingComment(leadingComment) {
  if (!leadingComment) return false;
  // Явный тег для автовключения входа En в UI.
  // Пример: /* @en */ или // @en
  return /(^|\s)@en(\s|$)/i.test(leadingComment);
}

function hasSingleUseMarkerInLeadingComment(leadingComment) {
  if (!leadingComment) return false;
  // Теги для опции "Разрешено использовать в проекте один раз".
  // Примеры: @once, @singleuse, @single_use
  return /(^|\s)@(once|singleuse|single_use)(\s|$)/i.test(leadingComment);
}

function extractBlockNameFromLeadingComment(leadingComment) {
  if (!leadingComment) return null;
  // Тег имени блока в первом комментарии.
  // Примеры: "@name MyBlock", "@name: MyBlock"
  const m = leadingComment.match(/(?:^|\n)\s*@name\s*[:=-]?\s*(.+)\s*$/im);
  if (!m) return null;
  const value = String(m[1] || '').trim();
  return value || null;
}

function stripServiceMarkersFromLeadingComment(leadingComment) {
  if (!leadingComment) return null;
  let cleaned = String(leadingComment);
  // Убираем служебные метки из описания блока.
  cleaned = cleaned.replace(/(?:^|\n)\s*@name\s*[:=-]?\s*[^\n]*\s*(?=\n|$)/ig, '\n');
  cleaned = cleaned.replace(/(?:^|\n)\s*@en\b[^\n]*\s*(?=\n|$)/ig, '\n');
  cleaned = cleaned
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return cleaned || null;
}

function parseFunctionParams(paramsStr) {
  if (!paramsStr || !paramsStr.trim()) return [];
  const params = [];
  paramsStr.split(',').forEach(p => {
    const param = p.trim();
    if (!param) return;
    const parts = param.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) params.push({ type: parts[0], name: parts[1] });
  });
  return params;
}

function parseFunctions(code) {
  const funcPattern = /(void|int|long|bool|boolean|float|double|byte|char|String|uint8_t|int16_t|uint16_t|int32_t|uint32_t)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s*\{/g;
  const masked = maskComments(code);
  const functions = {};
  let match;
  while ((match = funcPattern.exec(masked)) !== null) {
    const funcName = match[2];
    if (funcName === 'setup' || funcName === 'loop') continue;
    const returnType = match[1].trim();
    const paramsStr = match[3].trim();
    const bodyStart = match.index + match[0].length;
    const funcBody = extractCustomFunctionBody(code, bodyStart);
    const parsedParams = parseFunctionParams(paramsStr);
    const funcPos = match.index;
    const setupM = code.match(/void\s+setup\s*\(/);
    const loopM = code.match(/void\s+loop\s*\(/);
    const setupPos = setupM ? setupM.index : code.length;
    const loopPos = loopM ? loopM.index : code.length;
    const firstFuncPos = Math.min(setupPos, loopPos);
    const location = funcPos < firstFuncPos ? 'до setup/loop' : 'после loop';
    functions[funcName] = {
      return_type: returnType,
      params: paramsStr,
      parsed_params: parsedParams,
      body: funcBody,
      location
    };
  }
  return functions;
}

function splitTopLevel(text, delimiter) {
  const parts = [];
  let buf = [];
  let paren = 0, bracket = 0, brace = 0;
  let inString = false, stringChar = '', escape = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      buf.push(ch);
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === stringChar) inString = false;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = true;
      stringChar = ch;
      buf.push(ch);
      continue;
    }
    if (ch === '(') paren++;
    else if (ch === ')') paren = Math.max(paren - 1, 0);
    else if (ch === '[') bracket++;
    else if (ch === ']') bracket = Math.max(bracket - 1, 0);
    else if (ch === '{') brace++;
    else if (ch === '}') brace = Math.max(brace - 1, 0);
    if (ch === delimiter && paren === 0 && bracket === 0 && brace === 0) {
      const part = buf.join('').trim();
      if (part) parts.push(part);
      buf = [];
    } else buf.push(ch);
  }
  const tail = buf.join('').trim();
  if (tail) parts.push(tail);
  return parts;
}

function splitInitializer(decl) {
  let paren = 0, bracket = 0, brace = 0;
  let inString = false, stringChar = '', escape = false;
  for (let idx = 0; idx < decl.length; idx++) {
    const ch = decl[idx];
    if (inString) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === stringChar) inString = false;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = true;
      stringChar = ch;
      continue;
    }
    if (ch === '(') paren++;
    else if (ch === ')') paren = Math.max(paren - 1, 0);
    else if (ch === '[') bracket++;
    else if (ch === ']') bracket = Math.max(bracket - 1, 0);
    else if (ch === '{') brace++;
    else if (ch === '}') brace = Math.max(brace - 1, 0);
    if (ch === '=' && paren === 0 && bracket === 0 && brace === 0) {
      const namePart = decl.slice(0, idx).trim();
      const valuePart = decl.slice(idx + 1).trim();
      return [namePart, valuePart || null];
    }
  }
  return [decl.trim(), null];
}

function splitStatements(text) {
  const statements = [];
  let buf = [];
  let paren = 0, bracket = 0, brace = 0;
  let inString = false, stringChar = '', escape = false;
  let startIdx = 0;
  for (let idx = 0; idx < text.length; idx++) {
    const ch = text[idx];
    if (inString) {
      buf.push(ch);
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === stringChar) inString = false;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = true;
      stringChar = ch;
      buf.push(ch);
      continue;
    }
    if (ch === '(') paren++;
    else if (ch === ')') paren = Math.max(paren - 1, 0);
    else if (ch === '[') bracket++;
    else if (ch === ']') bracket = Math.max(bracket - 1, 0);
    else if (ch === '{') brace++;
    else if (ch === '}') brace = Math.max(brace - 1, 0);
    if (ch === ';' && paren === 0 && bracket === 0 && brace === 0) {
      const statement = buf.join('').trim();
      if (statement) statements.push([statement, startIdx]);
      buf = [];
      startIdx = idx + 1;
    } else buf.push(ch);
  }
  return statements;
}

function parseGlobalSection(globalSection, functions) {
  let section = globalSection;
  for (const [funcName, funcInfo] of Object.entries(functions)) {
    if (funcInfo.location !== 'до setup/loop') continue;
    const escaped = funcName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const headPattern = new RegExp('(void|int|long|bool|boolean|float|double|byte|char|String)\\s+' + escaped + '\\s*\\([^)]*\\)\\s*\\{');
    let match;
    while ((match = maskComments(section).match(headPattern)) !== null) {
      const start = match.index;
      const braceStart = match.index + match[0].length;
      let depth = 1;
      let pos = braceStart;
      while (pos < section.length && depth > 0) {
        if (section[pos] === '{') depth++;
        else if (section[pos] === '}') depth--;
        pos++;
      }
      const end = depth === 0 ? pos : section.length;
      section = section.slice(0, start) + section.slice(end);
    }
  }

  const globalIncludes = section.match(/^\s*#include[^\n]*$/gm) || [];
  globalIncludes.forEach((s, i) => { globalIncludes[i] = s.trim(); });

  function inferDefineType(value) {
    if (!value) return 'String';
    const s = value.trim();
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return 'String';
    if (s.toLowerCase() === 'true' || s.toLowerCase() === 'false') return 'boolean';
    if (s.includes(',') || s.includes('.')) {
      try {
        parseFloat(s.replace(',', '.'));
        return 'float';
      } catch (_) {}
    }
    try {
      parseInt(s, 10);
      return 'long';
    } catch (_) {}
    return 'String';
  }

  const defines = [];
  let lineOffset = 0;
  section.split('\n').forEach(line => {
    const stripped = line.trim();
    if (!stripped.startsWith('#define')) {
      lineOffset += line.length + 1;
      return;
    }
    const m = stripped.match(/^#define\s+([A-Za-z_][A-Za-z0-9_]*)\s*(.*)$/);
    if (!m) {
      lineOffset += line.length + 1;
      return;
    }
    const name = m[1];
    let rest = m[2].trim();
    // Маркер роли для #define ищем в комментарии на той же строке: // par
    const role = /\/\/\s*par\b/.test(rest) ? 'parameter' : 'global';
    const value = rest.includes('//') ? rest.split('//')[0].trim() : rest;
    defines.push({ name, value, role, type: inferDefineType(value), position: lineOffset });
    lineOffset += line.length + 1;
  });

  const variables = {};
  const extraDeclarations = [];
  const staticDeclarations = [];

  function normalizeType(typeName) {
    return typeName.trim().replace(/\s+/g, ' ');
  }

  function maskDirectives(text) {
    return text.replace(/^[ \t]*#.*$/gm, match => ' '.repeat(match.length));
  }
  const maskedSection = maskComments(maskDirectives(section));

  for (const [statement, startIdx] of splitStatements(maskedSection)) {
    const stmt = statement.trim();
    if (!stmt || stmt.startsWith('#')) continue;
    // Прототипы функций и объявления объектов вида Type Name(args);
    // Раньше мы их просто пропускали, теперь сохраняем как extra_declarations,
    // чтобы, например, строки вида "U8G2_ST7920_128X64_1_HW_SPI u8g2(...);" попадали в блок declare.
    if (/\w+\s*\([^)]*\)\s*$/.test(stmt) && !stmt.includes('=')) {
      extraDeclarations.push(stmt + ';');
      continue;
    }

    // Определяем строку исходного кода, к которой относится текущее объявление.
    // Берём позицию самого объявления в "замаскированной" секции, чтобы корректно
    // найти строку комментария (// in, // out, // par) без сдвига на соседнюю строку.
    const stmtIndexInMasked = maskedSection.indexOf(statement, startIdx);
    const anchorIdx = stmtIndexInMasked !== -1 ? stmtIndexInMasked : startIdx;
    const lineStart = section.lastIndexOf('\n', anchorIdx) + 1;
    let lineEnd = section.indexOf('\n', anchorIdx);
    if (lineEnd === -1) lineEnd = section.length;
    const lineText = section.slice(lineStart, lineEnd);

    // Автоопределение роли переменной по комментарию на той же строке:
    // // in, // out, // par
    let role = 'variable';
    if (/\/\/\s*in\b/.test(lineText)) role = 'input';
    else if (/\/\/\s*out\b/.test(lineText)) role = 'output';
    else if (/\/\/\s*par\b/.test(lineText)) role = 'parameter';

    const stmtNoQual = stmt.replace(/^\s*(?:(?:static|const|volatile)\s+)+/, '');
    const isStatic = /^\s*static\b/.test(stmt);

    const primitiveMatch = stmtNoQual.match(PRIMITIVE_TYPE_REGEX);
    if (primitiveMatch) {
      const varType = normalizeType(primitiveMatch[1]);
      const decls = primitiveMatch[2].trim();
      if (isStatic) {
        splitTopLevel(decls, ',').forEach(decl => {
          const one = (decl || '').trim();
          if (one) staticDeclarations.push('static ' + varType + ' ' + one + ';');
        });
        continue;
      }
      splitTopLevel(decls, ',').forEach(decl => {
        const [namePart, valuePart] = splitInitializer(decl);
        // Поддержка кириллицы и других Unicode-букв в именах переменных (последний идентификатор в объявлении)
        const nameMatch = namePart.match(/[\p{L}_][\p{L}\p{N}_]*/gu);
        const varName = nameMatch ? nameMatch[nameMatch.length - 1] : null;
        if (!varName) return;
        variables[varName] = {
          type: varType,
          default: valuePart,
          role,
          alias: varName,
          position: startIdx
        };
      });
      continue;
    }
    if (/^[A-Za-z_][A-Za-z0-9_:<>]*\s+.+$/s.test(stmt)) extraDeclarations.push(stmt + ';');
  }

  return [variables, globalIncludes, defines, extraDeclarations, staticDeclarations];
}

export function parseArduinoCode(code) {
  const leadingComment = extractLeadingComment(code);
  const enableInputByMarker = hasEnableInputMarkerInLeadingComment(leadingComment);
  const singleUseByMarker = hasSingleUseMarkerInLeadingComment(leadingComment);
  const blockNameByMarker = extractBlockNameFromLeadingComment(leadingComment);
  const descriptionFromLeadingComment = stripServiceMarkersFromLeadingComment(leadingComment);
  const functions = parseFunctions(code);
  const globalSectionRaw = extractGlobalSection(code);
  const [variables, globalIncludes, defines, extraDeclarations, staticDeclarations] =
    parseGlobalSection(globalSectionRaw, functions);
  return {
    leading_comment: descriptionFromLeadingComment,
    enable_input_by_marker: enableInputByMarker,
    not_can_many_use_by_marker: singleUseByMarker,
    block_name_by_marker: blockNameByMarker,
    variables,
    functions,
    global_section_raw: globalSectionRaw,
    global_includes: globalIncludes,
    defines,
    extra_declarations: extraDeclarations,
    static_declarations: staticDeclarations
  };
}

// Для GitHub Pages / standalone / Обратной совместимости
if (typeof window !== 'undefined') {
  window.parseArduinoCode = parseArduinoCode;
  window.extractFunctionBody = extractFunctionBody;
  window.parseFunctions = parseFunctions;
  window.maskComments = maskComments;
}
