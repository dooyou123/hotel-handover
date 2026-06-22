'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import {
  EMERGENCY_SCENARIOS,
  buildEmergencyHandoverText,
  formatEmergencySeverity,
  getEmergencyScenario,
  type EmergencyScenario,
} from '@/lib/training/emergency-guide';

function SeverityBadge({ severity }: { severity: EmergencyScenario['severity'] }) {
  const className =
    severity === 'critical'
      ? 'training-badge training-badge--critical'
      : severity === 'high'
        ? 'training-badge training-badge--high'
        : 'training-badge';
  return <span className={className}>{formatEmergencySeverity(severity)}</span>;
}

export function EmergencyGuidePage() {
  const [scenarioId, setScenarioId] = useState(EMERGENCY_SCENARIOS[0]?.id ?? '');
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [handoverFields, setHandoverFields] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  const scenario = useMemo(() => getEmergencyScenario(scenarioId), [scenarioId]);

  const toggleCheck = useCallback((index: number) => {
    const key = `${scenarioId}:${index}`;
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  }, [scenarioId]);

  const checkedCount = useMemo(() => {
    if (!scenario) return 0;
    return scenario.checklist.reduce((sum, _, i) => {
      return sum + (checked[`${scenarioId}:${i}`] ? 1 : 0);
    }, 0);
  }, [scenario, scenarioId, checked]);

  const handoverText = useMemo(() => {
    if (!scenario) return '';
    return buildEmergencyHandoverText(scenario, handoverFields);
  }, [scenario, handoverFields]);

  const templatePlaceholders = useMemo(() => {
    if (!scenario) return [];
    const matches = scenario.handoverTemplate.match(/\{([^}]+)\}/g) ?? [];
    return [...new Set(matches.map((m) => m.slice(1, -1)))];
  }, [scenario]);

  const copyHandover = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(handoverText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [handoverText]);

  const selectScenario = useCallback((id: string) => {
    setScenarioId(id);
    setHandoverFields({});
    setCopied(false);
  }, []);

  if (!scenario) return null;

  return (
    <section className="project-board training-page training-emergency">
      <header className="project-board__head">
        <div>
          <p className="training-page__crumb">
            <Link href="/training">프런트 교육</Link>
            <span aria-hidden> / </span>
            <span>긴급 상황 대응</span>
          </p>
          <h1>긴급 상황 대응 가이드</h1>
          <p>화재·응급·누수 등 7가지 시나리오별 체크리스트·연락처·인수인계 템플릿입니다.</p>
        </div>
      </header>

      <div className="training-scenario-tabs" role="tablist" aria-label="긴급 시나리오">
        {EMERGENCY_SCENARIOS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={item.id === scenarioId}
            className={`training-scenario-tab${item.id === scenarioId ? ' is-active' : ''}`}
            onClick={() => selectScenario(item.id)}
          >
            <span aria-hidden>{item.icon}</span>
            {item.title}
          </button>
        ))}
      </div>

      <article className="training-panel training-panel--hero">
        <div className="training-panel__head">
          <span className="training-panel__icon" aria-hidden>
            {scenario.icon}
          </span>
          <div>
            <h2>
              {scenario.title}
              <SeverityBadge severity={scenario.severity} />
            </h2>
            <p>{scenario.summary}</p>
          </div>
        </div>
      </article>

      <div className="training-grid training-grid--2">
        <article className="training-panel">
          <header className="training-panel__section-head">
            <h3>체크리스트</h3>
            <span className="training-progress">
              {checkedCount}/{scenario.checklist.length}
            </span>
          </header>
          <ol className="training-checklist">
            {scenario.checklist.map((step, index) => {
              const key = `${scenarioId}:${index}`;
              const isChecked = Boolean(checked[key]);
              return (
                <li key={step} className={isChecked ? 'is-done' : ''}>
                  <label className="training-checklist__label">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleCheck(index)}
                    />
                    <span>{step}</span>
                  </label>
                </li>
              );
            })}
          </ol>
        </article>

        <div className="training-stack">
          <article className="training-panel">
            <header className="training-panel__section-head">
              <h3>긴급 연락처</h3>
            </header>
            <ul className="training-contacts">
              {scenario.contacts.map((contact) => (
                <li key={`${contact.role}-${contact.phone}`} className="training-contact">
                  <span className="training-contact__role">{contact.role}</span>
                  <strong className="training-contact__phone">{contact.phone}</strong>
                  <span className="training-contact__name">{contact.name}</span>
                  {contact.note ? (
                    <span className="training-contact__note">{contact.note}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </article>

          <article className="training-panel training-panel--warn">
            <header className="training-panel__section-head">
              <h3>하지 말 것</h3>
            </header>
            <ul className="training-donts">
              {scenario.donts.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </div>

      <article className="training-panel">
        <header className="training-panel__section-head">
          <h3>인수인계 템플릿</h3>
          <button type="button" className="btn btn--small btn--secondary" onClick={copyHandover}>
            {copied ? '복사됨' : '텍스트 복사'}
          </button>
        </header>
        {templatePlaceholders.length > 0 ? (
          <div className="training-handover-fields">
            {templatePlaceholders.map((field) => (
              <label key={field} className="training-handover-field">
                <span>{field}</span>
                <input
                  type="text"
                  value={handoverFields[field] ?? ''}
                  placeholder={`{${field}}`}
                  onChange={(e) =>
                    setHandoverFields((prev) => ({ ...prev, [field]: e.target.value }))
                  }
                />
              </label>
            ))}
          </div>
        ) : null}
        <pre className="training-handover-preview">{handoverText}</pre>
        <p className="training-hint">
          복사 후 <Link href="/handover">인수인계</Link>에서 긴급 카드로 등록하세요.
        </p>
      </article>
    </section>
  );
}
