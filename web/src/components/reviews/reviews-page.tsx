'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { useWorkSession } from '@/lib/handover/use-work-session';
import { createFollowUpCardFromReview } from '@/lib/reviews/follow-up-card';
import { formatReviewDate, formatStayRange } from '@/lib/reviews/format';
import {
  REVIEW_FILTER_OPTIONS,
  REVIEW_SENTIMENT_LABELS,
  REVIEW_SENTIMENTS,
  type GuestReview,
  type GuestReviewInput,
  type ReviewFilter,
  type ReviewSentiment,
} from '@/lib/reviews/types';
import { useReviews } from '@/lib/reviews/use-reviews';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';

type ReviewModalProps = {
  open: boolean;
  review: GuestReview | null;
  authorLabel: string;
  onClose: () => void;
  onSave: (input: GuestReviewInput, id?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

const emptyForm = (authorLabel: string): GuestReviewInput => ({
  sentiment: 'positive',
  content_original: '',
  content_ko: '',
  guest_name: '',
  check_in_date: null,
  check_out_date: null,
  reservation_number: '',
  author: authorLabel,
});

function ReviewModal({ open, review, authorLabel, onClose, onSave, onDelete }: ReviewModalProps) {
  const [form, setForm] = useState<GuestReviewInput>(emptyForm(authorLabel));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm } = useConfirmDialog();

  useEffect(() => {
    if (!open) return;
    if (review) {
      setForm({
        sentiment: review.sentiment,
        content_original: review.content_original,
        content_ko: review.content_ko,
        guest_name: review.guest_name,
        check_in_date: review.check_in_date,
        check_out_date: review.check_out_date,
        reservation_number: review.reservation_number,
        author: review.author || authorLabel,
      });
    } else {
      setForm(emptyForm(authorLabel));
    }
    setError(null);
  }, [open, review, authorLabel]);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.content_ko.trim()) {
      setError('한국어 번역 내용을 입력해 주세요.');
      return;
    }
    if (!form.content_original.trim()) {
      setError('리뷰 원문을 입력해 주세요.');
      return;
    }

    setSaving(true);
    try {
      await onSave(
        {
          ...form,
          content_original: form.content_original.trim(),
          content_ko: form.content_ko.trim(),
          guest_name: form.guest_name.trim(),
          reservation_number: form.reservation_number.trim(),
          author: form.author.trim() || authorLabel,
        },
        review?.id,
      );
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--review" onClick={(e) => e.stopPropagation()}>
        <form noValidate onSubmit={handleSubmit} className="modal__form">
          <div className="modal__header">
            <h2>{review ? '리뷰 수정' : '리뷰 추가'}</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
              ✕
            </button>
          </div>

          <div className="form-grid">
            <label className="field field--full">
              <span>구분 *</span>
              <div className="review-sentiment-toggle" role="radiogroup" aria-label="리뷰 구분">
                {REVIEW_SENTIMENTS.map((sentiment) => (
                  <button
                    key={sentiment}
                    type="button"
                    role="radio"
                    aria-checked={form.sentiment === sentiment}
                    className={`review-sentiment-toggle__btn review-sentiment-toggle__btn--${sentiment}${form.sentiment === sentiment ? ' is-active' : ''}`}
                    onClick={() => setForm({ ...form, sentiment })}
                  >
                    {REVIEW_SENTIMENT_LABELS[sentiment]}
                  </button>
                ))}
              </div>
            </label>

            <label className="field">
              <span>고객 이름</span>
              <input
                value={form.guest_name}
                onChange={(e) => setForm({ ...form, guest_name: e.target.value })}
                placeholder="예: Kim / 田中"
              />
            </label>
            <label className="field">
              <span>예약 번호</span>
              <input
                value={form.reservation_number}
                onChange={(e) => setForm({ ...form, reservation_number: e.target.value })}
                placeholder="예: BK-20260315-001"
              />
            </label>
            <label className="field">
              <span>체크인</span>
              <input
                type="date"
                value={form.check_in_date ?? ''}
                onChange={(e) => setForm({ ...form, check_in_date: e.target.value || null })}
              />
            </label>
            <label className="field">
              <span>체크아웃</span>
              <input
                type="date"
                value={form.check_out_date ?? ''}
                onChange={(e) => setForm({ ...form, check_out_date: e.target.value || null })}
              />
            </label>

            <label className="field field--full">
              <span>리뷰 원문 *</span>
              <textarea
                rows={4}
                value={form.content_original}
                onChange={(e) => setForm({ ...form, content_original: e.target.value })}
                placeholder="Booking·Google 등에서 받은 원문 리뷰"
              />
            </label>
            <label className="field field--full">
              <span>한국어 번역 *</span>
              <textarea
                rows={4}
                value={form.content_ko}
                onChange={(e) => setForm({ ...form, content_ko: e.target.value })}
                placeholder="직원이 확인·공유할 수 있도록 한국어로 번역"
              />
            </label>
            <label className="field field--full">
              <span>등록자</span>
              <input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
            </label>
          </div>

          {error ? <p className="amenity-alert" style={{ marginTop: '0.75rem' }}>{error}</p> : null}

          <div className="modal__footer">
            <div className="modal__footer-left">
              {review ? (
                <button
                  type="button"
                  className="btn btn--danger"
                  onClick={async () => {
                    const ok = await confirm({
                      title: '리뷰 삭제',
                      message: '이 리뷰 기록을 삭제합니다.',
                      tone: 'danger',
                      confirmLabel: '삭제',
                    });
                    if (!ok) return;
                    await onDelete(review.id);
                    onClose();
                  }}
                >
                  삭제
                </button>
              ) : null}
            </div>
            <div className="modal__footer-right">
              <button type="button" onClick={onClose} className="btn btn--ghost">
                취소
              </button>
              <button type="submit" disabled={saving} className="btn btn--primary">
                저장
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function matchesFilter(review: GuestReview, filter: ReviewFilter): boolean {
  if (filter === '전체') return true;
  if (filter === '좋은 리뷰') return review.sentiment === 'positive';
  return review.sentiment === 'negative';
}

export function ReviewsPageClient() {
  const queryClient = useQueryClient();
  const { session, requireSession, authorLabel } = useWorkSession();
  const { reviews, isLoading, error, createReview, updateReview, deleteReview } = useReviews();
  const [filter, setFilter] = useState<ReviewFilter>('전체');
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<GuestReview | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [followUpBusyId, setFollowUpBusyId] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reviews.filter((review) => {
      if (!matchesFilter(review, filter)) return false;
      if (!q) return true;
      return [
        review.guest_name,
        review.reservation_number,
        review.content_original,
        review.content_ko,
        review.author,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [reviews, filter, query]);

  const counts = useMemo(
    () => ({
      positive: reviews.filter((review) => review.sentiment === 'positive').length,
      negative: reviews.filter((review) => review.sentiment === 'negative').length,
    }),
    [reviews],
  );

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2500);
  }

  async function handleFollowUp(review: GuestReview) {
    if (!requireSession('인수인계 카드 만들기')) return;
    setFollowUpBusyId(review.id);
    try {
      await createFollowUpCardFromReview({
        review,
        author: authorLabel,
        shift: session.shift,
        name: session.name,
      });
      await queryClient.invalidateQueries({ queryKey: ['guest-reviews', DEFAULT_HOTEL_ID] });
      await queryClient.invalidateQueries({ queryKey: ['cards'] });
      showToast('인수인계 카드가 생성되었습니다.');
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : '카드 생성에 실패했습니다.');
    } finally {
      setFollowUpBusyId(null);
    }
  }

  return (
    <>
      <section className="reviews-page">
        <div className="reviews-page__header">
          <div>
            <h2>고객 리뷰 보관</h2>
            <p>좋은·나쁜 리뷰를 모아 두고, 다국어 원문과 한국어 번역을 함께 관리합니다.</p>
          </div>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            + 리뷰 추가
          </button>
        </div>

        <div className="reviews-summary">
          <span className="reviews-summary__chip reviews-summary__chip--positive">
            좋은 리뷰 <strong>{counts.positive}</strong>건
          </span>
          <span className="reviews-summary__chip reviews-summary__chip--negative">
            나쁜 리뷰 <strong>{counts.negative}</strong>건
          </span>
        </div>

        <div className="reviews-toolbar">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름·예약번호·리뷰 내용 검색…"
            aria-label="리뷰 검색"
          />
          <div className="segmented-control segmented-control--wrap" aria-label="리뷰 구분 필터">
            {REVIEW_FILTER_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFilter(option)}
                className={`segmented-control__btn${filter === option ? ' is-active' : ''}${option === '좋은 리뷰' ? ' segmented-control__btn--positive' : ''}${option === '나쁜 리뷰' ? ' segmented-control__btn--negative' : ''}`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <p className="empty-state">불러오는 중…</p>
        ) : error ? (
          <p className="empty-state" style={{ color: '#b91c1c' }}>
            리뷰를 불러오지 못했습니다. Supabase에 009_guest_reviews.sql 마이그레이션을 적용했는지 확인해 주세요.
          </p>
        ) : !visible.length ? (
          <p className="empty-state">등록된 리뷰가 없습니다.</p>
        ) : (
          <div className="reviews-list">
            {visible.map((review) => (
              <article
                key={review.id}
                className={`review-card review-card--${review.sentiment}`}
                onClick={() => {
                  setEditing(review);
                  setModalOpen(true);
                }}
              >
                <div className="review-card__top">
                  <span className={`review-card__badge review-card__badge--${review.sentiment}`}>
                    {REVIEW_SENTIMENT_LABELS[review.sentiment as ReviewSentiment]}
                  </span>
                  <button
                    type="button"
                    className="review-card__edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditing(review);
                      setModalOpen(true);
                    }}
                  >
                    수정
                  </button>
                </div>

                <div className="review-card__meta">
                  <span className="review-card__guest">{review.guest_name || '고객명 미입력'}</span>
                  {review.reservation_number ? (
                    <span className="review-card__reservation">예약 {review.reservation_number}</span>
                  ) : null}
                </div>
                <p className="review-card__stay">{formatStayRange(review.check_in_date, review.check_out_date)}</p>

                <div className="review-card__body">
                  <div className="review-card__section">
                    <span className="review-card__label">한국어</span>
                    <p className="review-card__text">{review.content_ko}</p>
                  </div>
                  <div className="review-card__section review-card__section--muted">
                    <span className="review-card__label">원문</span>
                    <p className="review-card__text review-card__text--original">{review.content_original}</p>
                  </div>
                </div>

                <div className="review-card__footer">
                  <p>
                    {review.author || '등록자 미입력'} · {formatReviewDate(review.updated_at || review.created_at)}
                  </p>
                  {review.sentiment === 'negative' ? (
                    review.follow_up_card_id ? (
                      <Link href="/handover" className="btn btn--ghost btn--xs">
                        인수인계 카드 보기
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="btn btn--outline btn--xs"
                        disabled={followUpBusyId === review.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleFollowUp(review);
                        }}
                      >
                        {followUpBusyId === review.id ? '…' : '인수인계 카드 만들기'}
                      </button>
                    )
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <ReviewModal
        open={modalOpen}
        review={editing}
        authorLabel={authorLabel}
        onClose={() => setModalOpen(false)}
        onSave={async (input, id) => {
          if (id) await updateReview.mutateAsync({ id, input });
          else await createReview.mutateAsync(input);
          showToast(id ? '리뷰가 수정되었습니다.' : '리뷰가 추가되었습니다.');
        }}
        onDelete={async (id) => {
          await deleteReview.mutateAsync(id);
          showToast('리뷰가 삭제되었습니다.');
        }}
      />

      {toast ? <div className="toast">{toast}</div> : null}
    </>
  );
}
