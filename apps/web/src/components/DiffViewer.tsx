import type { CodeDiffPayload, InfraDiffPayload } from '@playground/types';

interface DiffViewerProps {
  codeDiffStr: string | null;
  infraDiffStr: string | null;
}

export function DiffViewer({ codeDiffStr, infraDiffStr }: DiffViewerProps) {
  const codeDiff: CodeDiffPayload | null = codeDiffStr ? JSON.parse(codeDiffStr) : null;
  const infraDiff: InfraDiffPayload | null = infraDiffStr ? JSON.parse(infraDiffStr) : null;

  const actionClass = (act: string) => {
    if (act === 'create') return 'diff-act-create';
    if (act === 'delete') return 'diff-act-delete';
    return 'diff-act-update';
  };

  return (
    <div className="diff-container">
      {codeDiff?.files?.map((file, idx) => (
        <div key={idx} className="diff-file">
          <div className="diff-file-header">
            <span className="diff-file-path">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style={{ color: 'var(--text-muted)' }} role="img" aria-label="File icon">
                <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 8.75 4.25V1.5Zm6.75.103V4.25c0 .138.112.25.25.25h2.647Z"/>
              </svg>
              {file.path}
            </span>
            <span className={`diff-action-tag ${actionClass(file.action || 'update')}`}>
              {file.action || 'update'}
            </span>
          </div>
          <pre className="diff-code">
            {file.diff?.split('\n').map((line, li) => {
              const cls = line.startsWith('+') ? 'diff-line-add'
                        : line.startsWith('-') ? 'diff-line-del'
                        : 'diff-line-ctx';
              return <span key={li} className={cls}>{line || ' '}</span>;
            })}
          </pre>
        </div>
      ))}

      {infraDiff?.zeropsYaml && (
        <div className="infra-block">
          <div className="infra-header">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style={{ color: 'var(--amber)' }} role="img" aria-label="Infrastructure icon">
              <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm7-3.25v2.992l2.028.812a.75.75 0 0 1-.557 1.392l-2.5-1A.751.751 0 0 1 7 8.25v-3.5a.75.75 0 0 1 1.5 0Z"/>
            </svg>
            zerops.yaml — Infrastructure Config
          </div>
          <pre className="infra-code">{infraDiff.zeropsYaml}</pre>
        </div>
      )}
    </div>
  );
}
