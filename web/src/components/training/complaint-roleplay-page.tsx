'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { formatComplaintRemedies } from '@/lib/handover/complaint-remedies';
import {
  COMPLAINT_SLA_TRAINING_NOTE,
  COMPLAINT_ROLEPLAY_SCENARIOS,
  buildHandoverSuggestion,
  computeRoleplayResult,
  formatRoleplayScoreBadge,
  getRoleplayNode,
  getRoleplayScenario,
  type RoleplayChoice,
  type RoleplayScenario,
} from '@/lib/training/complaint-roleplay';

type Phase = 'pick' | 'play' | 'result';

function ScenarioCard({
  scenario,
  active,
  onSelect,
}: {
  scenario: RoleplayScenario;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`training-scenario-card${active ? ' is-active' : ''}`}
      onClick={onSelect}
    >
      <span className="training-scenario-card__icon" aria-hidden>
        {scenario.icon}
      </span>
      <strong>{scenario.title}</strong>
      <span className="training-scenario-card__room">{scenario.room}호</span>
      <p>{scenario.summary}</p>
    </button>
  );
}

export function ComplaintRoleplayPage() {
  const [phase, setPhase] = useState<Phase>('pick');
  const [scenarioId, setScenarioId] = useState(COMPLAINT_ROLEPLAY_SCENARIOS[0]?.id ?? '');
  const [nodeId, setNodeId] = useState('');
  const [choiceIds, setChoiceIds] = useState<string[]>([]);
  const [lastFeedback, setLastFeedback] = useState('');
  const [copied, setCopied] = useState(false);

  const scenario = useMemo(() => getRoleplayScenario(scenarioId), [scenarioId]);
  const node = useMemo(
    () => (scenario && nodeId ? getRoleplayNode(scenario, nodeId) : undefined),
    [scenario, nodeId],
  );

  const result = useMemo(() => {
    if (!scenario || phase !== 'result') return null;
    return computeRoleplayResult(scenario, choiceIds);
  }, [scenario, choiceIds, phase]);

  const handover = useMemo(() => {
    if (!scenario || !result) return null;
    return buildHandoverSuggestion(scenario, result);
  }, [scenario, result]);

  const startScenario = useCallback((id: string) => {
    const picked = getRoleplayScenario(id);
    if (!picked) return;
    setScenarioId(id);
    setNodeId(picked.startNodeId);
    setChoiceIds([]);
    setLastFeedback('');
    setPhase('play');
  }, []);

  const pickChoice = useCallback(
    (choice: RoleplayChoice) => {
      if (!scenario) return;
      setChoiceIds((prev) => [...prev, choice.id]);
      setLastFeedback(choice.feedback);

      if (choice.nextNodeId) {
        window.setTimeout(() => setNodeId(choice.nextNodeId!), 400);
      } else {
        window.setTimeout(() => setPhase('result'), 400);
      }
    },
    [scenario],
  );

  const restart = useCallback(() => {
    if (scenario) {
      setNodeId(scenario.startNodeId);
      setChoiceIds([]);
      setLastFeedback('');
      setPhase('play');
    }
  }, [scenario]);

  const copyHandover = useCallback(async () => {
    if (!handover) return;
    const text = [
      `[${handover.priority}] ${handover.title}`,
      handover.details,
      `다음 조치: ${handover.next_action}`,
      `보상: ${formatComplaintRemedies(handover.complaint_remedies, handover.complaint_remedy_other)}`,
    ].join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [handover]);

  return (
    <section className="project-board training-page training-complaint">
      <header className="project-board__head">
        <div>
          <p className="training-page__crumb">
            <Link href="/training">프런트 교육</Link>
            <span aria-hidden> / </span>
            <span>컴플레인 롤플레이</span>
          </p>
          <h1>컴플레인 롤플레이 트레이너</h1>
          <p>{COMPLAINT_SLA_TRAINING_NOTE}</p>
        </div>
      </header>

      {phase === 'pick' ? (
        <>
          <div className="training-scenario-grid">
            {COMPLAINT_ROLEPLAY_SCENARIOS.map((item) => (
              <ScenarioCard
                key={item.id}
                scenario={item}
                active={item.id === scenarioId}
                onSelect={() => setScenarioId(item.id)}
              />
            ))}
          </div>
          <div className="training-actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => startScenario(scenarioId)}
            >
              시나리오 시작
            </button>
          </div>
        </>
      ) : null}

      {phase === 'play' && scenario && node ? (
        <div className="training-roleplay">
          <div className="training-roleplay__meta">
            <span>
              {scenario.icon} {scenario.title} · {scenario.room}호
            </span>
            <button type="button" className="btn btn--small btn--ghost" onClick={() => setPhase('pick')}>
              다른 시나리오
            </button>
          </div>

          <article className="training-panel training-panel--guest">
            <p className="training-guest-line">&ldquo;{node.guestLine}&rdquo;</p>
            <p className="training-situation">{node.situation}</p>
          </article>

          {lastFeedback ? (
            <aside className="training-feedback" role="status">
              {lastFeedback}
            </aside>
          ) : null}

          <div className="training-choices">
            {node.choices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                className="training-choice"
                onClick={() => pickChoice(choice)}
              >
                {choice.text}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {phase === 'result' && scenario && result && handover ? (
        <div className="training-result">
          <article className="training-panel training-panel--score">
            <header className="training-panel__section-head">
              <h2>결과</h2>
              <span className={`training-score training-score--${result.grade}`}>
                {result.percent}점 · {formatRoleplayScoreBadge(result.percent)}
              </span>
            </header>
            <p className="training-grade-label">{result.gradeLabel}</p>
            <p className="training-score-detail">
              획득 {result.totalScore} / 최대 {result.maxScore}
            </p>
            {result.remedyHints.length > 0 ? (
              <p className="training-remedy-hint">
                권장 보상:{' '}
                {formatComplaintRemedies(result.remedyHints, '')}
              </p>
            ) : null}
          </article>

          <article className="training-panel">
            <header className="training-panel__section-head">
              <h3>인수인계 카드 제안</h3>
              <button type="button" className="btn btn--small btn--secondary" onClick={copyHandover}>
                {copied ? '복사됨' : '카드 내용 복사'}
              </button>
            </header>
            <dl className="training-handover-card">
              <div>
                <dt>우선순위</dt>
                <dd>{handover.priority}</dd>
              </div>
              <div>
                <dt>제목</dt>
                <dd>{handover.title}</dd>
              </div>
              <div>
                <dt>상세</dt>
                <dd className="training-handover-card__details">{handover.details}</dd>
              </div>
              <div>
                <dt>다음 조치</dt>
                <dd>{handover.next_action}</dd>
              </div>
              <div>
                <dt>보상 (remedies)</dt>
                <dd>
                  {formatComplaintRemedies(
                    handover.complaint_remedies,
                    handover.complaint_remedy_other,
                  )}
                </dd>
              </div>
            </dl>
            <p className="training-hint">
              <Link href="/handover">인수인계</Link>에서 카테고리 &ldquo;컴플레인&rdquo;으로 등록하세요.
            </p>
          </article>

          <div className="training-actions">
            <button type="button" className="btn btn--primary" onClick={restart}>
              같은 시나리오 재도전
            </button>
            <button type="button" className="btn btn--secondary" onClick={() => setPhase('pick')}>
              다른 시나리오
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
