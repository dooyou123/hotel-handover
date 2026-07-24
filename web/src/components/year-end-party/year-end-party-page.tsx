'use client';

import { useEffect, useMemo, useState } from 'react';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { getNavPageMeta } from '@/lib/nav/page-meta';
import {
  attendingCount,
  budgetTotals,
  budgetFitLabel,
  buildInvitationText,
  categoryDistribution,
  downloadPartyWorkbook,
  formatDeadlineLabel,
  fromDatetimeLocalValue,
  getVoteDeadlineState,
  toDatetimeLocalValue,
  topVenueId,
  venueAccentIndex,
  venueBarData,
  venueScore,
  venueVoteCount,
  slotCounts,
  assignTables,
  shuffleInPlace,
} from '@/lib/year-end-party/helpers';
import {
  PARTY_AVAILABILITY,
  PARTY_PREFERENCES,
  PARTY_SUBSIDY_OPTIONS,
  PARTY_VENUE_CATEGORIES,
  type EmployeeSortMode,
  type PartyAvailability,
  type PartyEmployee,
  type PartyPreference,
  type PartyVenue,
  type PartyVenueInput,
} from '@/lib/year-end-party/types';
import {
  usePartyDietary,
  usePartyEmployees,
  usePartySchedule,
  usePartySettings,
  usePartyVenues,
} from '@/lib/year-end-party/use-year-end-party';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type TabId = 'home' | 'prepare' | 'tools';
type PrepareSubId = 'employees' | 'schedule' | 'dietary' | 'budget' | 'deadline';
type ToolsSubId = 'games' | 'invite' | 'charts';

const TABS: Array<{ id: TabId; label: string; hint: string }> = [
  { id: 'home', label: '투표', hint: '일정·장소 투표' },
  { id: 'prepare', label: '준비', hint: '명단·설정' },
  { id: 'tools', label: '도구', hint: '게임·초청·차트' },
];

const PREPARE_SUBS: Array<{ id: PrepareSubId; label: string }> = [
  { id: 'employees', label: '직원' },
  { id: 'schedule', label: '일정 후보' },
  { id: 'dietary', label: '식성' },
  { id: 'budget', label: '예산' },
  { id: 'deadline', label: '투표 기한' },
];

const TOOLS_SUBS: Array<{ id: ToolsSubId; label: string }> = [
  { id: 'games', label: '게임' },
  { id: 'invite', label: '초청장' },
  { id: 'charts', label: '차트' },
];

const PIE_COLORS = ['#0f766e', '#b45309', '#1d4ed8', '#be123c', '#7c3aed', '#047857', '#475569'];

const emptyVenueForm = (): PartyVenueInput => ({
  name: '',
  category: '한식',
  signature_menu: '',
  price_per_person: 50000,
  map_url: '',
  address: '',
  has_room: false,
  has_parking: false,
  rating: 4,
  features: '',
});

export function YearEndPartyPageClient() {
  const pageMeta = getNavPageMeta('/year-end-party');
  const { confirm } = useConfirmDialog();
  const [tab, setTab] = useState<TabId>('home');
  const [prepareSub, setPrepareSub] = useState<PrepareSubId>('employees');
  const [toolsSub, setToolsSub] = useState<ToolsSubId>('games');
  const [toast, setToast] = useState<string | null>(null);

  const { settings, saveSettings } = usePartySettings();
  const {
    employees,
    saveEmployee,
    bulkAddEmployees,
    deleteEmployee,
    deleteAllEmployees,
    moveEmployee,
  } = usePartyEmployees();
  const { venues, votes, saveVenue, deleteVenue, upsertVote, deleteVote } = usePartyVenues();
  const { slots, votes: dateVotes, saveSlot, deleteSlot, upsertDateVote, deleteDateVote } =
    usePartySchedule();
  const { dietary, saveDietary, deleteDietary } = usePartyDietary();

  const [employeeSort, setEmployeeSort] = useState<EmployeeSortMode>('manual');
  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    department: '',
    title: '',
    attending: true,
    memo: '',
  });
  const [bulkNames, setBulkNames] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);

  const [venueQuery, setVenueQuery] = useState('');
  const [venueCategory, setVenueCategory] = useState('all');
  const [venueModalOpen, setVenueModalOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<PartyVenue | null>(null);
  const [venueForm, setVenueForm] = useState<PartyVenueInput>(emptyVenueForm());
  const [voteModalVenue, setVoteModalVenue] = useState<PartyVenue | null>(null);
  const [voteForm, setVoteForm] = useState<{
    voter_name: string;
    preference: PartyPreference;
    comment: string;
  }>({ voter_name: '', preference: 'love', comment: '' });

  const [slotForm, setSlotForm] = useState({ slot_date: '', slot_time: '19:00', label: '' });
  const [scheduleVoter, setScheduleVoter] = useState('');

  const [dietaryForm, setDietaryForm] = useState({
    employee_name: '',
    restricted_foods: '',
    allergies: '',
    drinks_alcohol: true,
    notes: '',
  });

  const [tables, setTables] = useState<string[][]>([]);
  const [luckyPool, setLuckyPool] = useState('');
  const [luckyWinner, setLuckyWinner] = useState<string | null>(null);
  const [luckySpinning, setLuckySpinning] = useState(false);

  const [inviteText, setInviteText] = useState('');
  const [polishing, setPolishing] = useState(false);
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('18:00');
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const local = toDatetimeLocalValue(settings?.vote_deadline_at);
    if (!local) {
      setDeadlineDate('');
      setDeadlineTime('18:00');
      return;
    }
    const [datePart, timePart] = local.split('T');
    setDeadlineDate(datePart ?? '');
    setDeadlineTime((timePart ?? '18:00').slice(0, 5));
  }, [settings?.vote_deadline_at]);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  }

  const sortedEmployees = useMemo(() => {
    const list = [...employees];
    if (employeeSort === 'name') return list.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    if (employeeSort === 'department') {
      return list.sort(
        (a, b) =>
          a.department.localeCompare(b.department, 'ko') || a.name.localeCompare(b.name, 'ko'),
      );
    }
    if (employeeSort === 'attending') {
      return list.sort(
        (a, b) => Number(b.attending) - Number(a.attending) || a.name.localeCompare(b.name, 'ko'),
      );
    }
    return list.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'ko'));
  }, [employees, employeeSort]);

  const headcount = attendingCount(employees, settings?.headcount_override);
  const crownId = topVenueId(venues, votes);
  const confirmedVenue = venues.find((v) => v.id === settings?.confirmed_venue_id) ?? null;
  const confirmedSlot = slots.find((s) => s.id === settings?.confirmed_slot_id) ?? null;
  const leadingSlot = useMemo(() => {
    if (!slots.length) return null;
    let best = slots[0]!;
    let bestScore = -1;
    for (const slot of slots) {
      const score = slotCounts(dateVotes.filter((v) => v.slot_id === slot.id)).score;
      if (score > bestScore) {
        best = slot;
        bestScore = score;
      }
    }
    return bestScore > 0 ? best : null;
  }, [slots, dateVotes]);
  const budget = budgetTotals({
    headcount,
    subsidy: settings?.subsidy_per_person ?? 100000,
    pricePerPerson: confirmedVenue?.price_per_person ?? venues[0]?.price_per_person ?? null,
  });
  const displayVenue = confirmedVenue ?? venues.find((v) => v.id === crownId) ?? null;
  const displaySlot = confirmedSlot ?? leadingSlot;
  const deadlineState = getVoteDeadlineState(settings?.vote_deadline_at, nowMs);
  const votingClosed = deadlineState.status === 'closed';

  const filteredVenues = useMemo(() => {
    const q = venueQuery.trim().toLowerCase();
    return venues.filter((venue) => {
      if (venueCategory !== 'all' && venue.category !== venueCategory) return false;
      if (!q) return true;
      return (
        venue.name.toLowerCase().includes(q) ||
        venue.signature_menu.toLowerCase().includes(q) ||
        venue.address.toLowerCase().includes(q) ||
        venue.features.toLowerCase().includes(q)
      );
    });
  }, [venues, venueCategory, venueQuery]);

  const barData = venueBarData(venues, votes);
  const pieData = categoryDistribution(venues, votes);

  async function handleAddEmployee() {
    if (!employeeForm.name.trim()) {
      showToast('이름을 입력해 주세요.');
      return;
    }
    await saveEmployee.mutateAsync({ input: employeeForm });
    setEmployeeForm({ name: '', department: '', title: '', attending: true, memo: '' });
    showToast('직원을 등록했습니다.');
  }

  async function handleBulkAdd() {
    const names = bulkNames.split(/[,\n]/).map((part) => part.trim()).filter(Boolean);
    const count = await bulkAddEmployees.mutateAsync(names);
    setBulkNames('');
    showToast(count ? `${count}명을 일괄 등록했습니다.` : '새로 등록할 이름이 없습니다.');
  }

  async function handleDeleteAll() {
    try {
      await deleteAllEmployees.mutateAsync(adminPassword);
      setDeleteAllOpen(false);
      setAdminPassword('');
      showToast('직원 명단을 모두 삭제했습니다.');
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : '삭제에 실패했습니다.');
    }
  }

  async function applyHeadcountToBudget() {
    await saveSettings.mutateAsync({ headcount_override: employees.filter((e) => e.attending).length });
    showToast('참석 예정 인원을 예산 계산기에 반영했습니다.');
  }

  function openVenueModal(venue?: PartyVenue) {
    setEditingVenue(venue ?? null);
    setVenueForm(
      venue
        ? {
            name: venue.name,
            category: venue.category,
            signature_menu: venue.signature_menu,
            price_per_person: venue.price_per_person,
            map_url: venue.map_url,
            address: venue.address,
            has_room: venue.has_room,
            has_parking: venue.has_parking,
            rating: Number(venue.rating),
            features: venue.features,
          }
        : emptyVenueForm(),
    );
    setVenueModalOpen(true);
  }

  async function handleSaveVenue() {
    if (!venueForm.name.trim()) {
      showToast('상호명을 입력해 주세요.');
      return;
    }
    await saveVenue.mutateAsync({ id: editingVenue?.id, input: venueForm });
    setVenueModalOpen(false);
    showToast(editingVenue ? '장소를 수정했습니다.' : '장소를 등록했습니다.');
  }

  async function handleDeleteVenue(venue: PartyVenue) {
    const ok = await confirm({
      title: '장소 삭제',
      message: `${venue.name}을(를) 삭제할까요? 투표도 함께 삭제됩니다.`,
      confirmLabel: '삭제',
      tone: 'danger',
    });
    if (!ok) return;
    await deleteVenue.mutateAsync(venue.id);
    showToast('장소를 삭제했습니다.');
  }

  async function handleVoteSubmit() {
    if (votingClosed) {
      showToast('투표 기한이 마감되었습니다.');
      return;
    }
    if (!voteModalVenue || !voteForm.voter_name.trim()) {
      showToast('투표자를 선택해 주세요.');
      return;
    }
    await upsertVote.mutateAsync({
      venue_id: voteModalVenue.id,
      voter_name: voteForm.voter_name,
      preference: voteForm.preference,
      comment: voteForm.comment,
    });
    setVoteModalVenue(null);
    setVoteForm({ voter_name: '', preference: 'love', comment: '' });
    showToast('투표를 반영했습니다.');
  }

  async function handleWithdrawVenueVote(venueId: string, voterName: string, opts?: { closeModal?: boolean }) {
    if (votingClosed) {
      showToast('투표 기한이 마감되어 철회할 수 없습니다.');
      return;
    }
    const ok = await confirm({
      title: '투표 철회',
      message: `${voterName}님의 장소 투표를 철회할까요?`,
      confirmLabel: '철회',
      tone: 'danger',
    });
    if (!ok) return;
    await deleteVote.mutateAsync({ venue_id: venueId, voter_name: voterName });
    if (opts?.closeModal) {
      setVoteModalVenue(null);
      setVoteForm({ voter_name: '', preference: 'love', comment: '' });
    }
    showToast('장소 투표를 철회했습니다.');
  }

  async function handleAddSlot() {
    if (!slotForm.slot_date) {
      showToast('날짜를 선택해 주세요.');
      return;
    }
    await saveSlot.mutateAsync(slotForm);
    setSlotForm({ slot_date: '', slot_time: '19:00', label: '' });
    showToast('일정 후보를 추가했습니다.');
  }

  async function handleDateVote(slotId: string, availability: PartyAvailability) {
    if (votingClosed) {
      showToast('투표 기한이 마감되었습니다.');
      return;
    }
    if (!scheduleVoter.trim()) {
      showToast('투표자 이름을 선택해 주세요.');
      return;
    }
    const existing = dateVotes.find(
      (vote) => vote.slot_id === slotId && vote.voter_name === scheduleVoter,
    );
    if (existing?.availability === availability) {
      await deleteDateVote.mutateAsync({ slot_id: slotId, voter_name: scheduleVoter });
      showToast('일정 투표를 철회했습니다.');
      return;
    }
    await upsertDateVote.mutateAsync({
      slot_id: slotId,
      voter_name: scheduleVoter,
      availability,
    });
    showToast('일정 투표를 반영했습니다.');
  }

  async function handleWithdrawDateVote(slotId: string) {
    if (votingClosed) {
      showToast('투표 기한이 마감되어 철회할 수 없습니다.');
      return;
    }
    if (!scheduleVoter.trim()) {
      showToast('투표자 이름을 선택해 주세요.');
      return;
    }
    await deleteDateVote.mutateAsync({ slot_id: slotId, voter_name: scheduleVoter });
    showToast('일정 투표를 철회했습니다.');
  }

  async function handleSaveDeadline() {
    if (!deadlineDate.trim()) {
      showToast('마감 날짜를 선택해 주세요.');
      return;
    }
    const time = deadlineTime.trim() || '18:00';
    const iso = fromDatetimeLocalValue(`${deadlineDate}T${time}`);
    if (!iso) {
      showToast('올바른 날짜·시간을 선택해 주세요.');
      return;
    }
    try {
      await saveSettings.mutateAsync({ vote_deadline_at: iso });
      showToast('투표 기한을 저장했습니다.');
    } catch (caught) {
      showToast(
        caught instanceof Error
          ? caught.message
          : '저장에 실패했습니다. DB 마이그레이션(078)을 확인하세요.',
      );
    }
  }

  async function handleClearDeadline() {
    try {
      setDeadlineDate('');
      setDeadlineTime('18:00');
      await saveSettings.mutateAsync({ vote_deadline_at: null });
      showToast('투표 기한을 해제했습니다.');
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : '해제에 실패했습니다.');
    }
  }

  async function handleSaveDietary() {
    if (!dietaryForm.employee_name.trim()) {
      showToast('이름을 선택해 주세요.');
      return;
    }
    await saveDietary.mutateAsync(dietaryForm);
    showToast('식성 정보를 저장했습니다.');
  }

  async function handleDeleteDietary(id: string, name: string) {
    const ok = await confirm({
      title: '식성 정보 삭제',
      message: `${name}의 식성·알레르기 기록을 삭제할까요?`,
      confirmLabel: '삭제',
      tone: 'danger',
    });
    if (!ok) return;
    await deleteDietary.mutateAsync(id);
    if (dietaryForm.employee_name === name) {
      setDietaryForm({
        employee_name: '',
        restricted_foods: '',
        allergies: '',
        drinks_alcohol: true,
        notes: '',
      });
    }
    showToast('식성 정보를 삭제했습니다.');
  }

  function runSeatLottery(round: 1 | 2) {
    const names = employees.filter((e) => e.attending).map((e) => e.name);
    if (!names.length) {
      showToast('참석 예정 직원이 없습니다.');
      return;
    }
    const size = round === 1 ? 6 : 4;
    setTables(assignTables(names, size));
    showToast(`${round}차 테이블을 추첨했습니다.`);
  }

  function runLuckyDraw() {
    const pool = (luckyPool.trim()
      ? luckyPool.split(/[,\n]/).map((s) => s.trim()).filter(Boolean)
      : employees.filter((e) => e.attending).map((e) => e.name));
    if (!pool.length) {
      showToast('추첨 대상이 없습니다.');
      return;
    }
    setLuckySpinning(true);
    setLuckyWinner(null);
    let ticks = 0;
    const timer = window.setInterval(() => {
      const shuffled = shuffleInPlace(pool);
      setLuckyWinner(shuffled[0] ?? null);
      ticks += 1;
      if (ticks >= 18) {
        window.clearInterval(timer);
        setLuckySpinning(false);
        showToast(`당첨: ${shuffled[0]}`);
      }
    }, 90);
  }

  function ensureInviteDraft() {
    const draft = buildInvitationText({
      venue: confirmedVenue,
      slot: confirmedSlot,
      headcount,
      subsidy: settings?.subsidy_per_person ?? 100000,
    });
    setInviteText(draft);
    return draft;
  }

  async function polishInvite() {
    const base = inviteText.trim() || ensureInviteDraft();
    setPolishing(true);
    try {
      const res = await fetch('/api/year-end-party/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: base }),
      });
      const json = (await res.json()) as { text?: string; error?: string };
      if (!res.ok || !json.text) throw new Error(json.error || '다듬기에 실패했습니다.');
      setInviteText(json.text);
      await saveSettings.mutateAsync({ invitation_draft: json.text });
      showToast('초청 문구를 다듬었습니다.');
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : '다듬기에 실패했습니다.');
    } finally {
      setPolishing(false);
    }
  }

  async function copyInvite() {
    const text = inviteText.trim() || ensureInviteDraft();
    await navigator.clipboard.writeText(text);
    showToast('클립보드에 복사했습니다.');
  }

  async function exportExcel() {
    await downloadPartyWorkbook({
      employees,
      venues,
      venueVotes: votes,
      slots,
      dateVotes,
      dietary,
      settings,
    });
    showToast('엑셀 파일을 내려받았습니다.');
  }

  return (
    <section className="yp-page">
      <header className="yp-page__hero">
        <div>
          <p className="yp-page__eyebrow">Year-end Party</p>
          <h1>{pageMeta.label}</h1>
          <p>일정과 장소를 고르고, 준비·도구는 필요할 때만 엽니다.</p>
        </div>
        <div className="yp-page__hero-actions">
          <button type="button" className="btn btn--outline btn--small" onClick={() => void exportExcel()}>
            Excel 내보내기
          </button>
        </div>
      </header>

      <div className="yp-tabs" role="tablist" aria-label="연말 회식">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`yp-tabs__btn${tab === item.id ? ' is-active' : ''}`}
            onClick={() => setTab(item.id)}
          >
            <strong>{item.label}</strong>
            <span>{item.hint}</span>
          </button>
        ))}
      </div>

      {tab === 'home' ? (
        <div className="yp-panel">
          <div
            className={`yp-countdown${deadlineState.status === 'closed' ? ' is-closed' : ''}${deadlineState.status === 'unset' ? ' is-unset' : ''}`}
          >
            <div className="yp-countdown__copy">
              <span>투표 기한</span>
              {deadlineState.status === 'unset' ? (
                <>
                  <strong>아직 설정되지 않음</strong>
                  <em>준비 → 투표 기한에서 마감 시각을 정하세요.</em>
                </>
              ) : deadlineState.status === 'closed' ? (
                <>
                  <strong>투표가 마감되었습니다</strong>
                  <em>{formatDeadlineLabel(settings?.vote_deadline_at)} 까지</em>
                </>
              ) : (
                <>
                  <strong>마감까지 남은 시간</strong>
                  <em>{formatDeadlineLabel(settings?.vote_deadline_at)} 까지</em>
                </>
              )}
            </div>
            {deadlineState.status === 'open' ? (
              <div className="yp-countdown__units" aria-live="polite">
                <div>
                  <strong>{String(deadlineState.days).padStart(2, '0')}</strong>
                  <span>일</span>
                </div>
                <div>
                  <strong>{String(deadlineState.hours).padStart(2, '0')}</strong>
                  <span>시간</span>
                </div>
                <div>
                  <strong>{String(deadlineState.minutes).padStart(2, '0')}</strong>
                  <span>분</span>
                </div>
                <div>
                  <strong>{String(deadlineState.seconds).padStart(2, '0')}</strong>
                  <span>초</span>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn--outline btn--small"
                onClick={() => {
                  setTab('prepare');
                  setPrepareSub('deadline');
                }}
              >
                기한 설정
              </button>
            )}
          </div>

          <div className="yp-home-summary">
            <div className="yp-home-summary__card">
              <span>일정</span>
              <strong>
                {displaySlot
                  ? `${displaySlot.slot_date} ${displaySlot.slot_time}`
                  : '아직 없음'}
              </strong>
              <em>{confirmedSlot ? '확정' : leadingSlot ? '유력' : '준비 탭에서 후보 추가'}</em>
            </div>
            <div className="yp-home-summary__card">
              <span>장소</span>
              <strong>{displayVenue?.name ?? '아직 없음'}</strong>
              <em>{confirmedVenue ? '확정' : crownId ? '최다 득표' : '아래에서 투표'}</em>
            </div>
            <div className="yp-home-summary__card">
              <span>참석</span>
              <strong>{headcount}명</strong>
              <em>예산 {(budget.totalBudget || 0).toLocaleString('ko-KR')}원</em>
            </div>
          </div>

          <section className="yp-home-section">
            <div className="yp-home-section__head">
              <div>
                <h2>일정 투표</h2>
                <p className="yp-muted">이름을 고른 뒤 ⭕ / 🔺 / ❌ 로 응답하세요. 같은 버튼을 다시 누르면 철회됩니다.</p>
              </div>
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={() => {
                  setTab('prepare');
                  setPrepareSub('schedule');
                }}
              >
                후보 일정 관리
              </button>
            </div>

            <div className="yp-toolbar">
              <span className="yp-muted">투표자</span>
              <div className="yp-name-chips">
                {employees.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    className={`yp-name-chip${scheduleVoter === row.name ? ' is-active' : ''}`}
                    onClick={() => setScheduleVoter(row.name)}
                  >
                    {row.name}
                  </button>
                ))}
              </div>
            </div>

            {slots.length ? (
              <div className="yp-table-wrap">
                <table className="yp-table">
                  <thead>
                    <tr>
                      <th>일정</th>
                      <th>가능 ⭕</th>
                      <th>세모 🔺</th>
                      <th>불가 ❌</th>
                      <th>투표</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {slots.map((slot) => {
                      const counts = slotCounts(dateVotes.filter((v) => v.slot_id === slot.id));
                      const myVote = scheduleVoter
                        ? dateVotes.find(
                            (vote) => vote.slot_id === slot.id && vote.voter_name === scheduleVoter,
                          )
                        : undefined;
                      return (
                        <tr key={slot.id}>
                          <td>
                            <strong>
                              {slot.slot_date} {slot.slot_time}
                            </strong>
                            {slot.label ? <div className="yp-muted">{slot.label}</div> : null}
                          </td>
                          <td>{counts.yes}</td>
                          <td>{counts.maybe}</td>
                          <td>{counts.no}</td>
                          <td>
                            <div className="yp-inline-actions">
                              {(Object.keys(PARTY_AVAILABILITY) as PartyAvailability[]).map((key) => (
                                <button
                                  key={key}
                                  type="button"
                                  className={`btn btn--ghost btn--small${myVote?.availability === key ? ' is-active' : ''}`}
                                  aria-pressed={myVote?.availability === key}
                                  title={
                                    myVote?.availability === key
                                      ? '다시 누르면 철회'
                                      : PARTY_AVAILABILITY[key].label
                                  }
                                  onClick={() => void handleDateVote(slot.id, key)}
                                  disabled={votingClosed}
                                >
                                  {PARTY_AVAILABILITY[key].emoji}
                                </button>
                              ))}
                              {myVote && !votingClosed ? (
                                <button
                                  type="button"
                                  className="btn btn--ghost btn--danger btn--small"
                                  onClick={() => void handleWithdrawDateVote(slot.id)}
                                >
                                  철회
                                </button>
                              ) : null}
                            </div>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn btn--outline btn--small"
                              onClick={() => void saveSettings.mutateAsync({ confirmed_slot_id: slot.id })}
                            >
                              {settings?.confirmed_slot_id === slot.id ? '확정됨' : '확정'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="yp-empty">
                등록된 일정이 없습니다.{' '}
                <button
                  type="button"
                  className="yp-text-link"
                  onClick={() => {
                    setTab('prepare');
                    setPrepareSub('schedule');
                  }}
                >
                  준비 → 일정 후보
                </button>
                에서 추가하세요.
              </p>
            )}
          </section>

          <section className="yp-home-section">
            <div className="yp-home-section__head">
              <div>
                <h2>장소 투표</h2>
                <p className="yp-muted">카드를 보고 투표하세요. 1위는 배너로 표시됩니다.</p>
              </div>
            </div>

            <div className="yp-toolbar">
              <input
                type="search"
                className="yp-search"
                placeholder="상호·메뉴·주소 검색"
                value={venueQuery}
                onChange={(e) => setVenueQuery(e.target.value)}
              />
              <button type="button" className="btn btn--primary btn--small" onClick={() => openVenueModal()}>
                + 장소 등록
              </button>
            </div>
            <div className="yp-filter-chips" role="group" aria-label="카테고리 필터">
              <button
                type="button"
                className={`yp-filter-chip${venueCategory === 'all' ? ' is-active' : ''}`}
                onClick={() => setVenueCategory('all')}
              >
                전체
              </button>
              {PARTY_VENUE_CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={`yp-filter-chip${venueCategory === category ? ' is-active' : ''}`}
                  onClick={() => setVenueCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>

            {filteredVenues.length ? (
              <div className="yp-venue-grid">
                {[...filteredVenues]
                  .sort((a, b) => {
                    const scoreDiff =
                      venueScore(votes.filter((v) => v.venue_id === b.id)) -
                      venueScore(votes.filter((v) => v.venue_id === a.id));
                    if (scoreDiff !== 0) return scoreDiff;
                    return a.name.localeCompare(b.name, 'ko');
                  })
                  .map((venue) => {
                const venueVotes = votes.filter((v) => v.venue_id === venue.id);
                const isCrown = venue.id === crownId;
                const score = venueScore(venueVotes);
                const count = venueVoteCount(venueVotes);
                const subsidy = settings?.subsidy_per_person ?? 100000;
                const estimated = venue.price_per_person * Math.max(headcount, 1);
                const fit = budgetFitLabel(venue.price_per_person, subsidy);
                const accent = venueAccentIndex(venue.id || venue.name);
                const comments = venueVotes.filter((vote) => vote.comment.trim());

                return (
                  <article
                    key={venue.id}
                    className={[
                      'yp-venue-card',
                      `yp-venue-card--accent-${accent}`,
                      isCrown ? 'is-crown' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {isCrown ? (
                      <div className="yp-venue-card__banner">
                        🔥 {count}표 · 득점 {score} · 현재 1위
                      </div>
                    ) : null}

                    <div className="yp-venue-card__head">
                      <div className="yp-venue-card__top">
                        <div className="yp-venue-card__tags">
                          <span className="yp-venue-tag">{venue.category}</span>
                          {venue.has_room ? <span className="yp-venue-tag">룸</span> : null}
                          {venue.has_parking ? <span className="yp-venue-tag">주차</span> : null}
                          {Number(venue.rating) > 0 ? (
                            <span className="yp-venue-tag">★ {Number(venue.rating).toFixed(1)}</span>
                          ) : null}
                        </div>
                        <div className="yp-venue-card__icon-actions">
                          <button
                            type="button"
                            className="yp-icon-btn"
                            title="수정"
                            aria-label="수정"
                            onClick={() => openVenueModal(venue)}
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            className="yp-icon-btn yp-icon-btn--danger"
                            title="삭제"
                            aria-label="삭제"
                            onClick={() => void handleDeleteVenue(venue)}
                          >
                            ⌫
                          </button>
                        </div>
                      </div>
                      <h3 className="yp-venue-card__title">{venue.name}</h3>
                    </div>

                    <div className="yp-venue-card__menu">
                      <p className="yp-venue-card__menu-label">🍴 대표 메뉴</p>
                      <strong>{venue.signature_menu || '미입력'}</strong>
                    </div>

                    <div className="yp-venue-card__features">
                      <p className="yp-venue-card__menu-label">📝 특징 메모</p>
                      <p className={venue.features.trim() ? undefined : 'yp-muted'}>
                        {venue.features.trim() || '미입력'}
                      </p>
                    </div>

                    <div className="yp-venue-card__price-grid">
                      <div>
                        <span>1인당</span>
                        <strong>{venue.price_per_person.toLocaleString('ko-KR')}원</strong>
                      </div>
                      <div>
                        <span>예상 총액 ({headcount || 0}명)</span>
                        <strong>{estimated.toLocaleString('ko-KR')}원</strong>
                      </div>
                    </div>

                    <div className={`yp-venue-card__budget yp-venue-card__budget--${fit.tone}`}>
                      {fit.tone === 'ok' ? '✅ ' : fit.tone === 'over' ? '⚠️ ' : ''}
                      {fit.text}
                    </div>

                    <div className="yp-venue-card__location">
                      <span>📍 {venue.address || '주소 미입력'}</span>
                      {venue.map_url ? (
                        <a href={venue.map_url} target="_blank" rel="noreferrer">
                          지도 보기 ↗
                        </a>
                      ) : null}
                    </div>

                    <div className="yp-venue-card__voters">
                      <p>👥 투표자 ({count}표 · {score}점)</p>
                      {venueVotes.length ? (
                        <div className="yp-voter-chips">
                          {venueVotes.map((vote) => (
                            <button
                              key={vote.id}
                              type="button"
                              className="yp-voter-chip yp-voter-chip--action"
                              title={
                                votingClosed
                                  ? `${vote.voter_name} (마감됨)`
                                  : `${vote.voter_name} 투표 철회`
                              }
                              disabled={votingClosed}
                              onClick={() => void handleWithdrawVenueVote(venue.id, vote.voter_name)}
                            >
                              <span>
                                {vote.voter_name} {PARTY_PREFERENCES[vote.preference].emoji}
                              </span>
                              <span className="yp-voter-chip__x" aria-hidden>
                                ×
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="yp-muted">아직 투표한 사람이 없습니다.</p>
                      )}
                      {comments.slice(0, 2).map((vote) => (
                        <blockquote key={`${vote.id}-comment`} className="yp-venue-card__quote">
                          {vote.voter_name}: “{vote.comment}”
                        </blockquote>
                      ))}
                    </div>

                    <div className="yp-venue-card__footer">
                      <button
                        type="button"
                        className="yp-venue-card__vote-btn"
                        disabled={votingClosed}
                        onClick={() => {
                          if (votingClosed) {
                            showToast('투표 기한이 마감되었습니다.');
                            return;
                          }
                          setVoteModalVenue(venue);
                          setVoteForm({ voter_name: '', preference: 'love', comment: '' });
                        }}
                      >
                        {votingClosed ? '투표 마감' : '🗳 이 장소에 투표하기'}
                      </button>
                      <button
                        type="button"
                        className="btn btn--outline btn--small"
                        onClick={() => void saveSettings.mutateAsync({ confirmed_venue_id: venue.id })}
                      >
                        {settings?.confirmed_venue_id === venue.id ? '확정됨' : '확정'}
                      </button>
                    </div>
                  </article>
                );
              })}
          </div>
            ) : (
              <p className="yp-empty">등록된 장소가 없습니다. 위에서 장소를 등록해 주세요.</p>
            )}
          </section>
        </div>
      ) : null}

      {tab === 'prepare' ? (
        <div className="yp-panel">
          <div className="yp-subtabs" role="tablist" aria-label="준비">
            {PREPARE_SUBS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`yp-subtabs__btn${prepareSub === item.id ? ' is-active' : ''}`}
                onClick={() => setPrepareSub(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {prepareSub === 'employees' ? (
            <div className="yp-prepare-block">
          <div className="yp-panel__grid">
            <article className="yp-card">
              <h3>개별 등록</h3>
              <div className="yp-form-grid">
                <label className="field">
                  <span>이름 *</span>
                  <input
                    value={employeeForm.name}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span>부서/팀</span>
                  <input
                    value={employeeForm.department}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, department: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span>직급/직책</span>
                  <input
                    value={employeeForm.title}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, title: e.target.value })}
                  />
                </label>
                <label className="field field--checkbox">
                  <span>참석</span>
                  <input
                    type="checkbox"
                    checked={employeeForm.attending}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, attending: e.target.checked })}
                  />
                </label>
                <label className="field field--full">
                  <span>메모</span>
                  <input
                    value={employeeForm.memo}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, memo: e.target.value })}
                  />
                </label>
              </div>
              <button type="button" className="btn btn--primary" onClick={() => void handleAddEmployee()}>
                등록
              </button>
            </article>

            <article className="yp-card">
              <h3>일괄 등록</h3>
              <p className="yp-muted">쉼표 또는 줄바꿈으로 여러 이름을 입력하세요.</p>
              <textarea
                rows={4}
                value={bulkNames}
                onChange={(e) => setBulkNames(e.target.value)}
                placeholder="김철수, 이영희, 박민수"
              />
              <button type="button" className="btn btn--primary" onClick={() => void handleBulkAdd()}>
                일괄 추가
              </button>
            </article>
          </div>

          <div className="yp-toolbar">
            <label className="field">
              <span>정렬</span>
              <select
                value={employeeSort}
                onChange={(e) => setEmployeeSort(e.target.value as EmployeeSortMode)}
              >
                <option value="manual">수동 순서</option>
                <option value="name">가나다순</option>
                <option value="department">부서순</option>
                <option value="attending">참석 상태순</option>
              </select>
            </label>
            <button type="button" className="btn btn--outline btn--small" onClick={() => void applyHeadcountToBudget()}>
              참석 인원 → 예산 반영
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--danger btn--small"
              onClick={() => setDeleteAllOpen(true)}
            >
              전체 삭제
            </button>
            <span className="yp-muted">참석 예정 {employees.filter((e) => e.attending).length}명 / 전체 {employees.length}명</span>
          </div>

          <div className="yp-table-wrap">
            <table className="yp-table">
              <thead>
                <tr>
                  <th>이름</th>
                  <th>부서</th>
                  <th>직급</th>
                  <th>참석</th>
                  <th>메모</th>
                  <th>순서</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sortedEmployees.map((row) => (
                  <EmployeeRow
                    key={row.id}
                    employee={row}
                    canMove={employeeSort === 'manual'}
                    onToggle={async () => {
                      await saveEmployee.mutateAsync({
                        id: row.id,
                        input: {
                          name: row.name,
                          department: row.department,
                          title: row.title,
                          attending: !row.attending,
                          memo: row.memo,
                        },
                      });
                    }}
                    onMove={(direction) => void moveEmployee.mutateAsync({ id: row.id, direction })}
                    onDelete={async () => {
                      const ok = await confirm({
                        title: '직원 삭제',
                        message: `${row.name}을(를) 삭제할까요?`,
                        confirmLabel: '삭제',
                        tone: 'danger',
                      });
                      if (!ok) return;
                      await deleteEmployee.mutateAsync(row.id);
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
            </div>
          ) : null}

          {prepareSub === 'schedule' ? (
            <div className="yp-prepare-block">
          <article className="yp-card">
            <h3>후보 일정 추가</h3>
            <div className="yp-form-grid">
              <label className="field">
                <span>날짜</span>
                <input
                  type="date"
                  value={slotForm.slot_date}
                  onChange={(e) => setSlotForm({ ...slotForm, slot_date: e.target.value })}
                />
              </label>
              <label className="field">
                <span>시간</span>
                <input
                  type="time"
                  value={slotForm.slot_time}
                  onChange={(e) => setSlotForm({ ...slotForm, slot_time: e.target.value })}
                />
              </label>
              <label className="field field--full">
                <span>라벨</span>
                <input
                  value={slotForm.label}
                  onChange={(e) => setSlotForm({ ...slotForm, label: e.target.value })}
                  placeholder="1차 / 본회식 등"
                />
              </label>
            </div>
            <button type="button" className="btn btn--primary" onClick={() => void handleAddSlot()}>
              일정 추가
            </button>
          </article>

          <div className="yp-table-wrap">
            <table className="yp-table">
              <thead>
                <tr>
                  <th>일정</th>
                  <th>가능 ⭕</th>
                  <th>세모 🔺</th>
                  <th>불가 ❌</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {slots.map((slot) => {
                  const counts = slotCounts(dateVotes.filter((v) => v.slot_id === slot.id));
                  return (
                    <tr key={slot.id}>
                      <td>
                        <strong>
                          {slot.slot_date} {slot.slot_time}
                        </strong>
                        {slot.label ? <div className="yp-muted">{slot.label}</div> : null}
                      </td>
                      <td>{counts.yes}</td>
                      <td>{counts.maybe}</td>
                      <td>{counts.no}</td>
                      <td>
                        <div className="yp-inline-actions">
                          <button
                            type="button"
                            className="btn btn--outline btn--small"
                            onClick={() => void saveSettings.mutateAsync({ confirmed_slot_id: slot.id })}
                          >
                            {settings?.confirmed_slot_id === slot.id ? '확정됨' : '확정'}
                          </button>
                          <button
                            type="button"
                            className="btn btn--ghost btn--danger btn--small"
                            onClick={() => void deleteSlot.mutateAsync(slot.id)}
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
            </div>
          ) : null}

          {prepareSub === 'dietary' ? (
            <div className="yp-prepare-block">
          <article className="yp-card">
            <h3>식성 · 알레르기 등록</h3>
            <div className="yp-name-chips">
              {employees.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className={`yp-name-chip${dietaryForm.employee_name === row.name ? ' is-active' : ''}`}
                  onClick={() => {
                    const existing = dietary.find((d) => d.employee_name === row.name);
                    setDietaryForm({
                      employee_name: row.name,
                      restricted_foods: existing?.restricted_foods ?? '',
                      allergies: existing?.allergies ?? '',
                      drinks_alcohol: existing?.drinks_alcohol ?? true,
                      notes: existing?.notes ?? '',
                    });
                  }}
                >
                  {row.name}
                </button>
              ))}
            </div>
            <div className="yp-form-grid">
              <label className="field field--full">
                <span>못 먹는 음식</span>
                <input
                  value={dietaryForm.restricted_foods}
                  onChange={(e) => setDietaryForm({ ...dietaryForm, restricted_foods: e.target.value })}
                />
              </label>
              <label className="field field--full">
                <span>알레르기</span>
                <input
                  value={dietaryForm.allergies}
                  onChange={(e) => setDietaryForm({ ...dietaryForm, allergies: e.target.value })}
                />
              </label>
              <div className="field field--full yp-toggle-field">
                <span>음주</span>
                <div className="yp-toggle-row">
                  <button
                    type="button"
                    className={`yp-toggle${dietaryForm.drinks_alcohol ? ' is-on' : ''}`}
                    aria-pressed={dietaryForm.drinks_alcohol}
                    onClick={() => setDietaryForm({ ...dietaryForm, drinks_alcohol: true })}
                  >
                    가능
                  </button>
                  <button
                    type="button"
                    className={`yp-toggle${!dietaryForm.drinks_alcohol ? ' is-on' : ''}`}
                    aria-pressed={!dietaryForm.drinks_alcohol}
                    onClick={() => setDietaryForm({ ...dietaryForm, drinks_alcohol: false })}
                  >
                    불가
                  </button>
                </div>
              </div>
              <label className="field field--full">
                <span>세부 요구사항</span>
                <textarea
                  rows={3}
                  value={dietaryForm.notes}
                  onChange={(e) => setDietaryForm({ ...dietaryForm, notes: e.target.value })}
                />
              </label>
            </div>
            <button type="button" className="btn btn--primary" onClick={() => void handleSaveDietary()}>
              저장
            </button>
          </article>

          <div className="yp-table-wrap">
            <table className="yp-table">
              <thead>
                <tr>
                  <th>이름</th>
                  <th>못 먹는 음식</th>
                  <th>알레르기</th>
                  <th>음주</th>
                  <th>메모</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {dietary.map((row) => (
                  <tr key={row.id}>
                    <td>{row.employee_name}</td>
                    <td>{row.restricted_foods || '—'}</td>
                    <td>{row.allergies || '—'}</td>
                    <td>{row.drinks_alcohol ? 'O' : 'X'}</td>
                    <td>{row.notes || '—'}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn--ghost btn--danger btn--small"
                        onClick={() => void handleDeleteDietary(row.id, row.employee_name)}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
            </div>
          ) : null}

          {prepareSub === 'budget' ? (
            <div className="yp-prepare-block">
          <article className="yp-card">
            <h3>예산 계산기</h3>
            <div className="yp-form-grid">
              <label className="field">
                <span>1인 지원금</span>
                <select
                  value={settings?.subsidy_per_person ?? 100000}
                  onChange={(e) =>
                    void saveSettings.mutateAsync({ subsidy_per_person: Number(e.target.value) })
                  }
                >
                  {PARTY_SUBSIDY_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {value.toLocaleString('ko-KR')}원
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>인원수</span>
                <input
                  type="number"
                  min={0}
                  value={headcount}
                  onChange={(e) =>
                    void saveSettings.mutateAsync({ headcount_override: Number(e.target.value) || 0 })
                  }
                />
              </label>
            </div>
            <div className="yp-budget-metrics">
              <div>
                <span>총 예산</span>
                <strong>{budget.totalBudget.toLocaleString('ko-KR')}원</strong>
              </div>
              <div>
                <span>예상 지출</span>
                <strong>
                  {budget.expectedSpend != null
                    ? `${budget.expectedSpend.toLocaleString('ko-KR')}원`
                    : '—'}
                </strong>
              </div>
              <div>
                <span>잔액</span>
                <strong className={budget.remaining != null && budget.remaining < 0 ? 'is-bad' : ''}>
                  {budget.remaining != null ? `${budget.remaining.toLocaleString('ko-KR')}원` : '—'}
                </strong>
              </div>
            </div>
            <p className="yp-muted">
              지출 기준 장소: {confirmedVenue?.name ?? venues[0]?.name ?? '등록된 장소 없음'}
              {confirmedVenue || venues[0]
                ? ` (${(confirmedVenue ?? venues[0])!.price_per_person.toLocaleString('ko-KR')}원/인)`
                : ''}
            </p>
          </article>
            </div>
          ) : null}

          {prepareSub === 'deadline' ? (
            <div className="yp-prepare-block">
              <article className="yp-card">
                <h3>투표 기한</h3>
                <p className="yp-muted">
                  마감 시각이 지나면 일정·장소 투표와 철회가 잠깁니다. 메인 투표 화면에 카운트다운이 표시됩니다.
                </p>
                <div className="yp-form-grid">
                  <label className="field">
                    <span>마감 날짜</span>
                    <input
                      type="date"
                      value={deadlineDate}
                      onChange={(e) => setDeadlineDate(e.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>마감 시간</span>
                    <input
                      type="time"
                      value={deadlineTime}
                      onChange={(e) => setDeadlineTime(e.target.value)}
                    />
                  </label>
                </div>
                <div className="yp-inline-actions">
                  <button type="button" className="btn btn--primary" onClick={() => void handleSaveDeadline()}>
                    저장
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    disabled={!settings?.vote_deadline_at && !deadlineDate}
                    onClick={() => void handleClearDeadline()}
                  >
                    기한 해제
                  </button>
                </div>
                <p className="yp-muted">
                  현재 설정: {formatDeadlineLabel(settings?.vote_deadline_at)}
                  {deadlineState.status === 'open'
                    ? ` · 남은 시간 ${deadlineState.days}일 ${deadlineState.hours}시간 ${deadlineState.minutes}분`
                    : deadlineState.status === 'closed'
                      ? ' · 마감됨'
                      : ''}
                </p>
              </article>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === 'tools' ? (
        <div className="yp-panel">
          <div className="yp-subtabs" role="tablist" aria-label="도구">
            {TOOLS_SUBS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`yp-subtabs__btn${toolsSub === item.id ? ' is-active' : ''}`}
                onClick={() => setToolsSub(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {toolsSub === 'games' ? (
            <div className="yp-panel__grid">
              <article className="yp-card">
                <h3>테이블 자리 추첨</h3>
                <div className="yp-inline-actions">
                  <button type="button" className="btn btn--primary" onClick={() => runSeatLottery(1)}>
                    1차 (6인 테이블)
                  </button>
                  <button type="button" className="btn btn--outline" onClick={() => runSeatLottery(2)}>
                    2차 (4인 테이블)
                  </button>
                </div>
                <div className="yp-tables">
                  {tables.map((table, index) => (
                    <div key={`table-${index}`} className="yp-table-box">
                      <strong>테이블 {index + 1}</strong>
                      <p>{table.join(', ')}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="yp-card">
                <h3>럭키드로우</h3>
                <textarea
                  rows={3}
                  value={luckyPool}
                  onChange={(e) => setLuckyPool(e.target.value)}
                  placeholder="비우면 참석 예정 직원으로 추첨합니다. 쉼표/줄바꿈 구분"
                />
                <button type="button" className="btn btn--primary" onClick={runLuckyDraw} disabled={luckySpinning}>
                  {luckySpinning ? '추첨 중…' : '경품 당첨자 추첨'}
                </button>
                <div className={`yp-lucky${luckySpinning ? ' is-spinning' : ''}`}>
                  {luckyWinner ?? '당첨자를 추첨해 보세요'}
                </div>
              </article>
            </div>
          ) : null}

          {toolsSub === 'invite' ? (
            <div className="yp-prepare-block">
          <article className="yp-card">
            <h3>모바일 안내장 / 초청 카드</h3>
            <p className="yp-muted">
              확정 장소: {confirmedVenue?.name ?? '미정'} · 확정 일정:{' '}
              {confirmedSlot ? `${confirmedSlot.slot_date} ${confirmedSlot.slot_time}` : '미정'}
            </p>
            <div className="yp-inline-actions">
              <button type="button" className="btn btn--outline" onClick={() => ensureInviteDraft()}>
                초안 생성
              </button>
              <button
                type="button"
                className="btn btn--primary"
                disabled={polishing}
                onClick={() => void polishInvite()}
              >
                {polishing ? '다듬는 중…' : 'Gemini로 다듬기'}
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => void copyInvite()}>
                복사
              </button>
            </div>
            <textarea
              rows={12}
              value={inviteText || settings?.invitation_draft || ''}
              onChange={(e) => setInviteText(e.target.value)}
              placeholder="초청 문구가 여기 표시됩니다."
            />
            <p className="yp-muted">API 키(`GEMINI_API_KEY`)가 없으면 로컬 문장 다듬기로 대체합니다.</p>
          </article>
            </div>
          ) : null}

          {toolsSub === 'charts' ? (
            <div className="yp-panel__grid">
          <article className="yp-card yp-card--chart">
            <h3>장소별 득표</h3>
            <div className="yp-chart">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="score" name="득점" fill="#0f766e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>
          <article className="yp-card yp-card--chart">
            <h3>카테고리 분포</h3>
            <div className="yp-chart">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={95} label>
                    {pieData.map((entry, index) => (
                      <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </article>
            </div>
          ) : null}
        </div>
      ) : null}

      {venueModalOpen ? (
        <div className="modal-overlay" onClick={() => setVenueModalOpen(false)}>
          <div className="modal modal--wide yp-venue-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <div>
                <p className="yp-venue-modal__eyebrow">장소 투표</p>
                <h2>{editingVenue ? '장소 수정' : '장소 등록'}</h2>
              </div>
              <button type="button" className="icon-btn" onClick={() => setVenueModalOpen(false)} aria-label="닫기">
                ✕
              </button>
            </div>

            <div className="yp-venue-modal__body">
              <section className="yp-venue-modal__section">
                <h3>기본 정보</h3>
                <div className="yp-venue-modal__grid">
                  <label className="field">
                    <span>상호명 *</span>
                    <input
                      value={venueForm.name}
                      onChange={(e) => setVenueForm({ ...venueForm, name: e.target.value })}
                      placeholder="예: OO 고깃집"
                    />
                  </label>
                  <label className="field">
                    <span>카테고리</span>
                    <select
                      value={venueForm.category}
                      onChange={(e) => setVenueForm({ ...venueForm, category: e.target.value })}
                    >
                      {PARTY_VENUE_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field yp-venue-modal__span-2">
                    <span>대표 메뉴</span>
                    <input
                      value={venueForm.signature_menu}
                      onChange={(e) => setVenueForm({ ...venueForm, signature_menu: e.target.value })}
                      placeholder="예: 삼겹살, 된장찌개"
                    />
                  </label>
                  <label className="field">
                    <span>1인당 금액 (원)</span>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={venueForm.price_per_person}
                      onChange={(e) =>
                        setVenueForm({ ...venueForm, price_per_person: Number(e.target.value) || 0 })
                      }
                    />
                  </label>
                  <label className="field">
                    <span>별점 (0~5)</span>
                    <input
                      type="number"
                      min={0}
                      max={5}
                      step={0.1}
                      value={venueForm.rating}
                      onChange={(e) => setVenueForm({ ...venueForm, rating: Number(e.target.value) || 0 })}
                    />
                  </label>
                </div>
              </section>

              <section className="yp-venue-modal__section">
                <h3>위치 · 예약</h3>
                <div className="yp-venue-modal__grid">
                  <label className="field yp-venue-modal__span-2">
                    <span>지도 / 예약 링크</span>
                    <input
                      value={venueForm.map_url}
                      onChange={(e) => setVenueForm({ ...venueForm, map_url: e.target.value })}
                      placeholder="https://"
                    />
                  </label>
                  <label className="field yp-venue-modal__span-2">
                    <span>위치 / 주소</span>
                    <input
                      value={venueForm.address}
                      onChange={(e) => setVenueForm({ ...venueForm, address: e.target.value })}
                      placeholder="서울시 …"
                    />
                  </label>
                </div>
              </section>

              <section className="yp-venue-modal__section">
                <h3>옵션 · 메모</h3>
                <div className="yp-toggle-row">
                  <button
                    type="button"
                    className={`yp-toggle${venueForm.has_room ? ' is-on' : ''}`}
                    aria-pressed={venueForm.has_room}
                    onClick={() => setVenueForm({ ...venueForm, has_room: !venueForm.has_room })}
                  >
                    룸 {venueForm.has_room ? '있음' : '없음'}
                  </button>
                  <button
                    type="button"
                    className={`yp-toggle${venueForm.has_parking ? ' is-on' : ''}`}
                    aria-pressed={venueForm.has_parking}
                    onClick={() => setVenueForm({ ...venueForm, has_parking: !venueForm.has_parking })}
                  >
                    주차 {venueForm.has_parking ? '가능' : '불가'}
                  </button>
                </div>
                <label className="field">
                  <span>특징 메모</span>
                  <textarea
                    rows={3}
                    value={venueForm.features}
                    onChange={(e) => setVenueForm({ ...venueForm, features: e.target.value })}
                    placeholder="분위기, 룸 크기, 주의사항 등"
                  />
                </label>
              </section>
            </div>

            <div className="modal__footer">
              <span />
              <div className="modal__footer-actions">
                <button type="button" className="btn btn--ghost" onClick={() => setVenueModalOpen(false)}>
                  취소
                </button>
                <button type="button" className="btn btn--primary" onClick={() => void handleSaveVenue()}>
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {voteModalVenue ? (
        <div className="modal-overlay" onClick={() => setVoteModalVenue(null)}>
          <div className="modal yp-vote-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <div>
                <p className="yp-vote-modal__eyebrow">장소 투표</p>
                <h2>{voteModalVenue.name}</h2>
              </div>
              <button type="button" className="icon-btn" onClick={() => setVoteModalVenue(null)} aria-label="닫기">
                ✕
              </button>
            </div>

            <div className="yp-vote-modal__body">
              <section className="yp-vote-modal__section">
                <h3>투표자</h3>
                <p className="yp-muted">이름을 눌러 선택하세요. 이미 투표한 사람은 수정·철회할 수 있습니다.</p>
                <div className="yp-name-chips">
                  {employees.map((row) => {
                    const existing = votes.find(
                      (vote) => vote.venue_id === voteModalVenue.id && vote.voter_name === row.name,
                    );
                    return (
                      <button
                        key={row.id}
                        type="button"
                        className={`yp-name-chip${voteForm.voter_name === row.name ? ' is-active' : ''}${existing ? ' has-vote' : ''}`}
                        onClick={() =>
                          setVoteForm({
                            voter_name: row.name,
                            preference: existing?.preference ?? 'love',
                            comment: existing?.comment ?? '',
                          })
                        }
                      >
                        {row.name}
                        {existing ? ` ${PARTY_PREFERENCES[existing.preference].emoji}` : ''}
                      </button>
                    );
                  })}
                </div>
                {!employees.length ? <p className="yp-muted">준비 → 직원에서 명단을 먼저 등록해 주세요.</p> : null}
              </section>

              <section className="yp-vote-modal__section">
                <h3>선호도</h3>
                <div className="yp-vote-prefs" role="group" aria-label="선호도">
                  {(Object.keys(PARTY_PREFERENCES) as PartyPreference[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      className={`yp-vote-pref${voteForm.preference === key ? ' is-active' : ''}`}
                      aria-pressed={voteForm.preference === key}
                      onClick={() => setVoteForm({ ...voteForm, preference: key })}
                    >
                      <span className="yp-vote-pref__emoji" aria-hidden>
                        {PARTY_PREFERENCES[key].emoji}
                      </span>
                      <span className="yp-vote-pref__label">{PARTY_PREFERENCES[key].label}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="yp-vote-modal__section">
                <label className="field">
                  <span>한줄평 (선택)</span>
                  <input
                    value={voteForm.comment}
                    onChange={(e) => setVoteForm({ ...voteForm, comment: e.target.value })}
                    placeholder="분위기가 좋아요 등"
                  />
                </label>
              </section>
            </div>

            <div className="modal__footer">
              {voteForm.voter_name &&
              votes.some(
                (vote) => vote.venue_id === voteModalVenue.id && vote.voter_name === voteForm.voter_name,
              ) ? (
                <button
                  type="button"
                  className="btn btn--ghost btn--danger"
                  onClick={() =>
                    void handleWithdrawVenueVote(voteModalVenue.id, voteForm.voter_name, {
                      closeModal: true,
                    })
                  }
                >
                  투표 철회
                </button>
              ) : (
                <span />
              )}
              <div className="modal__footer-actions">
                <button type="button" className="btn btn--ghost" onClick={() => setVoteModalVenue(null)}>
                  취소
                </button>
                <button type="button" className="btn btn--primary" onClick={() => void handleVoteSubmit()}>
                  {votes.some(
                    (vote) => vote.venue_id === voteModalVenue.id && vote.voter_name === voteForm.voter_name,
                  )
                    ? '다시 투표하기'
                    : '투표하기'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {deleteAllOpen ? (
        <div className="modal-overlay" onClick={() => setDeleteAllOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>직원 전체 삭제</h2>
              <button type="button" className="icon-btn" onClick={() => setDeleteAllOpen(false)}>
                ✕
              </button>
            </div>
            <p className="yp-muted">관리자 비밀번호를 입력해야 전체 삭제할 수 있습니다. (기본: party2026)</p>
            <label className="field field--full">
              <span>관리자 비밀번호</span>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
            </label>
            <div className="modal__footer">
              <span />
              <div className="modal__footer-actions">
                <button type="button" className="btn btn--ghost" onClick={() => setDeleteAllOpen(false)}>
                  취소
                </button>
                <button type="button" className="btn btn--ghost btn--danger" onClick={() => void handleDeleteAll()}>
                  전체 삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? <div className="toast">{toast}</div> : null}
    </section>
  );
}

function EmployeeRow({
  employee,
  canMove,
  onToggle,
  onMove,
  onDelete,
}: {
  employee: PartyEmployee;
  canMove: boolean;
  onToggle: () => void;
  onMove: (direction: 'up' | 'down') => void;
  onDelete: () => void;
}) {
  return (
    <tr>
      <td>{employee.name}</td>
      <td>{employee.department || '—'}</td>
      <td>{employee.title || '—'}</td>
      <td>
        <button type="button" className="btn btn--ghost btn--small" onClick={onToggle}>
          {employee.attending ? '참석' : '불참'}
        </button>
      </td>
      <td>{employee.memo || '—'}</td>
      <td>
        {canMove ? (
          <div className="yp-inline-actions">
            <button type="button" className="btn btn--ghost btn--small" onClick={() => onMove('up')}>
              ↑
            </button>
            <button type="button" className="btn btn--ghost btn--small" onClick={() => onMove('down')}>
              ↓
            </button>
          </div>
        ) : (
          '—'
        )}
      </td>
      <td>
        <button type="button" className="btn btn--ghost btn--danger btn--small" onClick={onDelete}>
          삭제
        </button>
      </td>
    </tr>
  );
}
