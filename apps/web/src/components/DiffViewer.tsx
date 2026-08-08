import React, { useState } from 'react';
import type { CodeDiffPayload, InfraDiffPayload } from '@playground/types';

interface DiffViewerProps {
  codeDiffStr: string | null;
  infraDiffStr: string | null;
  deployStatus?: string | null;
}

function highlightLine(line: string): { __html: string } {
  const prefix = line.charAt(0);
  const codeContent = (prefix === '+' || prefix === '-') ? line.slice(1) : line;

  let html = codeContent
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Apply basic syntax highlighting rules
  // 1. Strings
  html = html.replace(/(["'])(.*?)\1/g, '<span class="hl-string">$1$2$1</span>');
  // 2. Numbers
  html = html.replace(/\b(\d+)\b/g, '<span class="hl-number">$1</span>');
  // 3. Comments
  html = html.replace(/(\/\/.*|#.*)/g, '<span class="hl-comment">$1</span>');
  // 4. Keywords
  const keywords = /\b(const|let|var|function|return|import|from|export|default|class|if|else|for|while|async|await|def|print|try|except|as|true|false|null|undefined|app|version|deploy|zcp|yaml|ports)\b/g;
  html = html.replace(keywords, '<span class="hl-keyword">$1</span>');
  // 5. Functions
  html = html.replace(/\b(\w+)(?=\()/g, '<span class="hl-function">$1</span>');

  // Wrap with prefix token if there is one
  const prefixHtml = prefix ? `<span class="diff-sign">${prefix}</span>` : '<span class="diff-sign"> </span>';
  return { __html: prefixHtml + html };
}

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

  const toggleFile = (path: string) => {
    setCollapsedFiles(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const renderDeployProgress = () => {
    if (!deployStatus || deployStatus === 'pending') return null;

    const steps = [
      { id: 'packaging', label: 'Packaging' },
      { id: 'uploading', label: 'Uploading' },
      { id: 'deploying', label: 'Deploying' },
      { id: 'deployed', label: 'Done' }
    ];

    const getStepStatus = (stepId: string) => {
      if (deployStatus === 'failed') {
        if (stepId === 'deploying') return 'failed';
      }

      const order = ['packaging', 'uploading', 'deploying', 'deployed'];
      const currentIdx = order.indexOf(deployStatus);
      const stepIdx = order.indexOf(stepId);

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
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
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
                  <div className={`step-connector ${getStepStatus(steps[idx + 1].id) === 'done' || getStepStatus(steps[idx + 1].id) === 'active' ? 'active' : ''}`} />
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
      {/* 4-Step Deploy Progress Indicators */}
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
          return (
            <div key={idx} className={`diff-file ${isCollapsed ? 'collapsed' : ''}`}>
              <div className="diff-file-header" onClick={() => toggleFile(file.path)} style={{ cursor: 'pointer' }}>
                <span className="diff-file-path">
                  <span className="collapse-arrow">
                    {isCollapsed ? '▶' : '▼'}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style={{ color: 'var(--text-secondary)', marginRight: '6px' }} role="img" aria-label="File icon">
                    <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 8.75 4.25V1.5Zm6.75.103V4.25c0 .138.112.25.25.25h2.647Z"/>
                  </svg>
                  {file.path}
                </span>
                <span className={`diff-action-tag ${actionClass(file.action || 'update')}`}>
                  {file.action || 'update'}
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
                        dangerouslySetInnerHTML={highlightLine(line)}
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
                <span className="collapse-arrow">
                  {infraCollapsed ? '▶' : '▼'}
                </span>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style={{ color: 'var(--amber)', marginRight: '6px' }} role="img" aria-label="Infrastructure icon">
                  <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm7-3.25v2.992l2.028.812a.75.75 0 0 1-.557 1.392l-2.5-1A.751.751 0 0 1 7 8.25v-3.5a.75.75 0 0 1 1.5 0Z"/>
                </svg>
                zerops.yaml — Infrastructure Config
              </span>
            </div>
            {!infraCollapsed && (
              <pre className="infra-code">
                {infraDiff.zeropsYaml.split('\n').map((line, li) => {
                  return (
                    <span
                      key={li}
                      className="infra-line"
                      dangerouslySetInnerHTML={highlightLine(line)}
                    />
                  );
                })}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
