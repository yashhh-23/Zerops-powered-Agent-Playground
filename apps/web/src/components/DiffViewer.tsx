import React, { useState } from 'react';
import type { CodeDiffPayload, InfraDiffPayload } from '@playground/types';
import { CheckIcon } from './Icons';

interface DiffViewerProps {
  codeDiffStr: string | null;
  infraDiffStr: string | null;
  deployStatus?: string | null;
}

// ─── Multi-language keyword sets ─────────────────────────────────────────────

const KEYWORDS: Record<string, Set<string>> = {
  js: new Set([
    'const','let','var','function','return','import','from','export','default',
    'class','extends','new','this','super','if','else','for','while','do',
    'switch','case','break','continue','typeof','instanceof','in','of',
    'async','await','try','catch','finally','throw','yield','delete','void',
    'true','false','null','undefined','NaN','Infinity','static','get','set',
  ]),
  ts: new Set([
    'const','let','var','function','return','import','from','export','default',
    'class','extends','new','this','super','if','else','for','while','do',
    'switch','case','break','continue','typeof','instanceof','in','of',
    'async','await','try','catch','finally','throw','yield','delete','void',
    'true','false','null','undefined','NaN','Infinity','static','get','set',
    'type','interface','enum','namespace','declare','abstract','readonly',
    'implements','as','any','never','unknown','infer','keyof',
    'string','number','boolean','object','symbol','bigint',
  ]),
  go: new Set([
    'package','import','func','return','var','const','type','struct','interface',
    'map','chan','go','defer','select','case','default','for','range','if','else',
    'switch','break','continue','fallthrough','goto','true','false','nil',
    'make','new','append','len','cap','close','panic','recover','delete',
    'string','int','int8','int16','int32','int64','uint','uint8','uint16',
    'uint32','uint64','float32','float64','complex64','complex128','bool','byte','rune','error',
  ]),
  rust: new Set([
    'fn','let','mut','const','static','struct','enum','trait','impl','for',
    'use','mod','pub','crate','super','self','Self','in','where','match','if',
    'else','while','loop','return','break','continue','async','await','move',
    'ref','box','unsafe','extern','type','true','false','as','dyn',
    'String','str','i8','i16','i32','i64','i128','u8','u16','u32','u64','u128',
    'f32','f64','bool','char','usize','isize','Option','Some','None','Result','Ok','Err','Vec',
  ]),
  python: new Set([
    'def','class','return','import','from','as','if','elif','else','for','while',
    'try','except','finally','raise','with','yield','lambda','pass','break',
    'continue','global','nonlocal','del','in','not','and','or','is','None',
    'True','False','print','self','super','open','len','range','type','list',
    'dict','set','tuple','str','int','float','bool','bytes',
  ]),
  java: new Set([
    'public','private','protected','static','final','class','interface','extends',
    'implements','abstract','new','return','import','package','void','int','long',
    'short','byte','float','double','char','boolean','true','false','null',
    'if','else','for','while','do','switch','case','default','break','continue',
    'try','catch','finally','throw','throws','this','super','instanceof','enum',
  ]),
  yaml: new Set(['true','false','null','yes','no','on','off']),
  shell: new Set([
    'if','then','else','elif','fi','for','do','done','while','case','esac',
    'function','return','exit','echo','export','source','set','unset','local',
    'readonly','declare','shift','trap','exec','eval',
  ]),
};

const LANG_BY_EXT: Record<string, keyof typeof KEYWORDS> = {
  js: 'js', jsx: 'js', mjs: 'js',
  ts: 'ts', tsx: 'ts',
  go: 'go',
  rs: 'rust',
  py: 'python',
  java: 'java',
  yaml: 'yaml', yml: 'yaml',
  sh: 'shell', bash: 'shell', zsh: 'shell',
};

function detectLang(filePath?: string): keyof typeof KEYWORDS {
  if (!filePath) return 'js';
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  return LANG_BY_EXT[ext] ?? 'js';
}

// ─── Per-line tokenizer ──────────────────────────────────────────────────────

function highlightLine(line: string, lang: keyof typeof KEYWORDS = 'js'): { __html: string } {
  const prefix = line.charAt(0);
  const codeContent = (prefix === '+' || prefix === '-') ? line.slice(1) : line;

  const escape = (t: string) =>
    t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const keywords = KEYWORDS[lang] ?? KEYWORDS.js;
  let result = '';
  let i = 0;
  const len = codeContent.length;

  while (i < len) {
    const char = codeContent[i];

    // 1. Block comments /* … */
    if (char === '/' && codeContent[i + 1] === '*') {
      const end = codeContent.indexOf('*/', i + 2);
      const comment = end === -1 ? codeContent.slice(i) : codeContent.slice(i, end + 2);
      result += `<span class="hl-comment">${escape(comment)}</span>`;
      i += comment.length;
      continue;
    }

    // 2. Line comments // or #
    if ((char === '/' && codeContent[i + 1] === '/') || char === '#') {
      result += `<span class="hl-comment">${escape(codeContent.slice(i))}</span>`;
      break;
    }

    // 3. Strings (single, double, backtick)
    if (char === '"' || char === "'" || char === '`') {
      const quote = char;
      const start = i;
      i++;
      while (i < len && codeContent[i] !== quote) {
        if (codeContent[i] === '\\') i++; // skip escaped char
        i++;
      }
      if (i < len) i++; // include closing quote
      result += `<span class="hl-string">${escape(codeContent.slice(start, i))}</span>`;
      continue;
    }

    // 4. Numbers (dec, hex, float, suffixed like 42u64, 0xFF)
    if (/\d/.test(char) && (i === 0 || !/[a-zA-Z0-9_]/.test(codeContent[i - 1]))) {
      const start = i;
      while (i < len && /[\d._xXa-fA-FoObBlL]/.test(codeContent[i])) i++;
      result += `<span class="hl-number">${escape(codeContent.slice(start, i))}</span>`;
      continue;
    }

    // 5. Words: keywords / types / function calls / identifiers
    if (/[a-zA-Z_]/.test(char)) {
      const start = i;
      while (i < len && /[a-zA-Z0-9_]/.test(codeContent[i])) i++;
      const word = codeContent.slice(start, i);

      if (keywords.has(word)) {
        result += `<span class="hl-keyword">${word}</span>`;
      } else if (i < len && codeContent[i] === '(') {
        result += `<span class="hl-function">${word}</span>`;
      } else if (/^[A-Z]/.test(word)) {
        // Capitalised → type-like in most languages
        result += `<span class="hl-type">${word}</span>`;
      } else {
        result += escape(word);
      }
      continue;
    }

    // 6. Everything else
    result += escape(char);
    i++;
  }

  const prefixHtml =
    prefix === '+' ? '<span class="diff-sign">+</span>' :
    prefix === '-' ? '<span class="diff-sign">-</span>' :
                     '<span class="diff-sign"> </span>';

  return { __html: prefixHtml + result };
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DiffViewer({ codeDiffStr, infraDiffStr, deployStatus }: DiffViewerProps) {
  const [collapsedFiles, setCollapsedFiles] = useState<Record<string, boolean>>({});
  const [infraCollapsed, setInfraCollapsed] = useState(false);

  let codeDiff: CodeDiffPayload | null = null;
  let codeParseError: string | null = null;
  try {
    codeDiff = codeDiffStr ? JSON.parse(codeDiffStr) : null;
  } catch (err: any) {
    codeParseError = err.message || 'Failed to parse code diff JSON';
  }

  let infraDiff: InfraDiffPayload | null = null;
  let infraParseError: string | null = null;
  try {
    infraDiff = infraDiffStr ? JSON.parse(infraDiffStr) : null;
  } catch (err: any) {
    infraParseError = err.message || 'Failed to parse infrastructure diff JSON';
  }

  const actionClass = (act: string) => {
    if (act === 'create') return 'diff-act-create';
    if (act === 'delete') return 'diff-act-delete';
    return 'diff-act-update';
  };

  const getActionLabel = (act: string) => {
    if (act === 'create') return 'ADDED';
    if (act === 'delete') return 'DELETED';
    return 'MODIFIED';
  };

  const toggleFile = (path: string) => {
    setCollapsedFiles(prev => ({ ...prev, [path]: !prev[path] }));
  };

  // ── Deploy progress bar ──────────────────────────────────────────────────
  const renderDeployProgress = () => {
    if (!deployStatus || deployStatus === 'pending') return null;

    const steps = [
      { id: 'packaging', label: 'Packaging' },
      { id: 'uploading', label: 'Uploading' },
      { id: 'deploying', label: 'Deploying' },
      { id: 'deployed', label: 'Done' },
    ];

    const ORDER = ['packaging', 'uploading', 'deploying', 'deployed'];

    const getStepStatus = (stepId: string) => {
      if (deployStatus === 'failed') {
        const failedAt = ORDER.indexOf('deploying');
        const stepIdx = ORDER.indexOf(stepId);
        if (stepIdx < failedAt) return 'done';
        if (stepIdx === failedAt) return 'failed';
        return 'pending';
      }
      const currentIdx = ORDER.indexOf(deployStatus);
      const stepIdx = ORDER.indexOf(stepId);
      if (stepIdx < currentIdx) return 'done';
      if (stepIdx === currentIdx) return 'active';
      return 'pending';
    };

    return (
      <div className="deploy-progress-container">
        <div className="deploy-progress-header">
          <span>Infrastructure Pipeline Status</span>
          {deployStatus === 'failed' ? (
            <span className="pipeline-status-badge pipeline-failed">Failed</span>
          ) : deployStatus === 'deployed' ? (
            <span className="pipeline-status-badge pipeline-done">Success</span>
          ) : (
            <span className="pipeline-status-badge pipeline-active">Active</span>
          )}
        </div>
        <div className="deploy-progress-steps">
          {steps.map((step, idx) => {
            const status = getStepStatus(step.id);
            return (
              <React.Fragment key={step.id}>
                <div className={`progress-step-item ${status}`}>
                  <div className="step-circle">
                    {status === 'done' ? (
                      <CheckIcon size={10} strokeWidth={4} />
                    ) : status === 'failed' ? (
                      '✕'
                    ) : status === 'active' ? (
                      <span className="spinning-dot" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <span className="step-label">{step.label}</span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`step-connector ${
                    getStepStatus(steps[idx + 1].id) === 'done' || getStepStatus(steps[idx + 1].id) === 'active'
                      ? 'active' : ''
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="diff-viewer-wrapper">
      {renderDeployProgress()}

      <div className="diff-container">
        {codeParseError && (
          <div className="diff-file error-block" style={{ border: '1px solid var(--red)' }}>
            <div className="diff-file-header" style={{ color: 'var(--red)' }}>
              <span>⚠️ Malformed Code Diff Response ({codeParseError})</span>
            </div>
            <pre className="diff-code" style={{ opacity: 0.8 }}>{codeDiffStr}</pre>
          </div>
        )}

        {codeDiff?.files?.map((file, idx) => {
          const isCollapsed = !!collapsedFiles[file.path];
          const lang = detectLang(file.path);
          return (
            <div key={idx} className={`diff-file ${isCollapsed ? 'collapsed' : ''}`}>
              <div className="diff-file-header" onClick={() => toggleFile(file.path)} style={{ cursor: 'pointer' }}>
                <span className="diff-file-path">
                  <span className="collapse-arrow">{isCollapsed ? '▶' : '▼'}</span>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style={{ color: 'var(--text-secondary)', marginRight: '6px' }} role="img" aria-label="File icon">
                    <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 8.75 4.25V1.5Zm6.75.103V4.25c0 .138.112.25.25.25h2.647Z"/>
                  </svg>
                  {file.path}
                  {lang !== 'js' && (
                    <span className="diff-lang-badge">{lang}</span>
                  )}
                </span>
                <span className={`diff-action-tag ${actionClass(file.action || 'update')}`}>
                  {getActionLabel(file.action || 'update')}
                </span>
              </div>

              {!isCollapsed && (
                <pre className="diff-code">
                  {file.diff?.split('\n').map((line, li) => {
                    const cls = line.startsWith('+') ? 'diff-line-add'
                              : line.startsWith('-') ? 'diff-line-del'
                              : 'diff-line-ctx';
                    return (
                      <span
                        key={li}
                        className={cls}
                        dangerouslySetInnerHTML={highlightLine(line, lang)}
                      />
                    );
                  })}
                </pre>
              )}
            </div>
          );
        })}

        {infraParseError && (
          <div className="infra-block error-block" style={{ border: '1px solid var(--red)' }}>
            <div className="infra-header" style={{ color: 'var(--red)' }}>
              <span>⚠️ Malformed Infrastructure Diff Response ({infraParseError})</span>
            </div>
            <pre className="infra-code" style={{ opacity: 0.8 }}>{infraDiffStr}</pre>
          </div>
        )}

        {infraDiff?.zeropsYaml && (
          <div className={`infra-block ${infraCollapsed ? 'collapsed' : ''}`}>
            <div className="infra-header" onClick={() => setInfraCollapsed(!infraCollapsed)} style={{ cursor: 'pointer' }}>
              <span className="diff-file-path">
                <span className="collapse-arrow">{infraCollapsed ? '▶' : '▼'}</span>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style={{ color: 'var(--amber)', marginRight: '6px' }} role="img" aria-label="Infrastructure icon">
                  <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm7-3.25v2.992l2.028.812a.75.75 0 0 1-.557 1.392l-2.5-1A.751.751 0 0 1 7 8.25v-3.5a.75.75 0 0 1 1.5 0Z"/>
                </svg>
                zerops.yaml — Infrastructure Config
              </span>
            </div>
            {!infraCollapsed && (
              <pre className="infra-code">
                {infraDiff.zeropsYaml.split('\n').map((line, li) => (
                  <span
                    key={li}
                    className="infra-line"
                    dangerouslySetInnerHTML={highlightLine(line, 'yaml')}
                  />
                ))}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
