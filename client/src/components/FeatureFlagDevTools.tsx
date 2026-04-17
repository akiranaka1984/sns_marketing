import { useEffect, useRef, useState } from 'react';
import {
  clearFeatureFlags,
  setFeatureFlag,
  type FeatureFlag,
} from '@/lib/featureFlags';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

const FLAG_LABELS: Record<FeatureFlag, string> = {
  new_ui_enabled: 'Global v2 kill switch',
  new_dashboard: 'Command Center dashboard',
  new_command_palette: 'Enhanced Cmd+K',
  new_inbox: 'Unified inbox',
  copilot_readonly: 'AI Copilot (read-only)',
  copilot_mutation: 'AI Copilot (mutations)',
  new_brand_tokens: 'PULSE design tokens',
  pulse_green_primary: 'PULSE green primary',
  mobile_bottom_nav: 'Mobile bottom nav',
  swipe_review: 'Swipe-to-act review',
  generative_ui: 'Generative UI artifacts',
};

function isDebugUrl(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('ff_debug') === '1';
}

/**
 * Floating developer panel for toggling feature flags.
 * Only rendered in `import.meta.env.DEV` mode.
 * Visible when `?ff_debug=1` is in the URL, or via Ctrl+Shift+F keyboard shortcut.
 */
export function FeatureFlagDevTools() {
  const [visible, setVisible] = useState<boolean>(() => isDebugUrl());
  const [minimized, setMinimized] = useState(false);
  const flags = useFeatureFlags();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        setVisible(v => !v);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!visible) return null;

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        zIndex: 9999,
        width: minimized ? 'auto' : '280px',
        fontFamily: 'monospace',
        fontSize: '12px',
        background: '#0f172a',
        color: '#e2e8f0',
        borderRadius: '8px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        border: '1px solid #334155',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: '#1e293b',
          borderBottom: minimized ? 'none' : '1px solid #334155',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setMinimized(m => !m)}
      >
        <span style={{ fontWeight: 700, color: '#38bdf8', letterSpacing: '0.05em' }}>
          FF DevTools
        </span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ color: '#64748b', fontSize: '10px' }}>Ctrl+Shift+F</span>
          <span style={{ color: '#94a3b8' }}>{minimized ? '▲' : '▼'}</span>
          <button
            onClick={e => { e.stopPropagation(); setVisible(false); }}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              fontSize: '14px',
              lineHeight: 1,
              padding: '0 2px',
            }}
            title="Close"
          >
            ×
          </button>
        </div>
      </div>

      {/* Body */}
      {!minimized && (
        <div style={{ padding: '8px 0' }}>
          {(Object.keys(FLAG_LABELS) as FeatureFlag[]).map(flag => (
            <label
              key={flag}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 12px',
                cursor: 'pointer',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#1e293b')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ color: flags[flag] ? '#86efac' : '#94a3b8', flex: 1 }}>
                {FLAG_LABELS[flag]}
                <span style={{ display: 'block', color: '#475569', fontSize: '10px' }}>
                  {flag}
                </span>
              </span>
              <ToggleSwitch
                checked={flags[flag]}
                onChange={val => setFeatureFlag(flag, val)}
              />
            </label>
          ))}

          {/* Reset button */}
          <div style={{ padding: '8px 12px 4px', borderTop: '1px solid #1e293b', marginTop: '4px' }}>
            <button
              onClick={() => clearFeatureFlags()}
              style={{
                width: '100%',
                padding: '5px 0',
                background: '#7f1d1d',
                color: '#fca5a5',
                border: '1px solid #991b1b',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
                fontFamily: 'monospace',
                letterSpacing: '0.05em',
              }}
            >
              Reset all flags
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Minimal inline toggle switch — no external deps
function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={e => {
        e.preventDefault();
        onChange(!checked);
      }}
      style={{
        position: 'relative',
        display: 'inline-block',
        width: '32px',
        height: '18px',
        background: checked ? '#22c55e' : '#475569',
        borderRadius: '9px',
        border: 'none',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'background 0.2s',
        padding: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '2px',
          left: checked ? '16px' : '2px',
          width: '14px',
          height: '14px',
          background: '#fff',
          borderRadius: '50%',
          transition: 'left 0.2s',
        }}
      />
    </button>
  );
}
