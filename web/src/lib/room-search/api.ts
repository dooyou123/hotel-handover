import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { buildWorkHubHref } from '@/lib/work/work-hub';

export type GlobalSearchHitKind =
  | 'handover'
  | 'facility'
  | 'review'
  | 'transport'
  | 'notice'
  | 'todo'
  | 'contact'
  | 'guest_notice';

export type GlobalSearchHit = {
  kind: GlobalSearchHitKind;
  id: string;
  title: string;
  subtitle: string;
  href: string;
  at: string;
};

/** @deprecated use GlobalSearchHit */
export type RoomSearchHit = GlobalSearchHit;

function pattern(query: string): string {
  return `%${query.trim()}%`;
}

function cardStatusLabel(columnId: string): string {
  if (columnId === 'done') return '완료';
  if (columnId === 'hold') return '보류';
  if (columnId === 'progress') return '진행';
  return '긴급';
}

export async function searchGlobal(query: string): Promise<GlobalSearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const supabase = createClient();
  const like = pattern(q);
  const today = new Date().toISOString().slice(0, 10);

  const [
    cardsRes,
    reviewsRes,
    transportRes,
    noticesRes,
    todosRes,
    contactsRes,
    guestNoticesRes,
  ] = await Promise.all([
    supabase
      .from('cards')
      .select('id, title, room, category, column_id, details, author, updated_at, created_at, archived_at')
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .or(
        [
          `room.ilike.${like}`,
          `title.ilike.${like}`,
          `details.ilike.${like}`,
          `next_action.ilike.${like}`,
          `category.ilike.${like}`,
          `author.ilike.${like}`,
          `assignee_name.ilike.${like}`,
          `resolution.ilike.${like}`,
        ].join(','),
      )
      .order('updated_at', { ascending: false })
      .limit(40),
    supabase
      .from('guest_reviews')
      .select(
        'id, guest_name, room_number, sentiment, content_ko, reservation_number, updated_at, created_at, is_anonymous, check_in_date, check_out_date',
      )
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .eq('is_active', true)
      .or(
        [
          `guest_name.ilike.${like}`,
          `room_number.ilike.${like}`,
          `content_ko.ilike.${like}`,
          `content_original.ilike.${like}`,
          `reservation_number.ilike.${like}`,
        ].join(','),
      )
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('transport_bookings')
      .select('id, guest_name, room_number, pickup_time, booking_date, status, destination, notes')
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .or(
        [
          `guest_name.ilike.${like}`,
          `room_number.ilike.${like}`,
          `destination.ilike.${like}`,
          `notes.ilike.${like}`,
        ].join(','),
      )
      .order('booking_date', { ascending: false })
      .limit(20),
    supabase
      .from('notices')
      .select('id, content, author, type, updated_at, created_at')
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .or([`content.ilike.${like}`, `author.ilike.${like}`].join(','))
      .order('updated_at', { ascending: false })
      .limit(15),
    supabase
      .from('todos')
      .select('id, title, description, due_date, status, assignee_name, updated_at, created_at')
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .or([`title.ilike.${like}`, `description.ilike.${like}`, `assignee_name.ilike.${like}`].join(','))
      .order('updated_at', { ascending: false })
      .limit(20),
    supabase
      .from('contacts')
      .select('id, name, department, phone, note, updated_at, created_at')
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .or(
        [`name.ilike.${like}`, `department.ilike.${like}`, `phone.ilike.${like}`, `note.ilike.${like}`].join(','),
      )
      .order('name')
      .limit(15),
    supabase
      .from('guest_notices')
      .select('id, title, category, body_ko, status, updated_at, created_at')
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .eq('status', 'published')
      .or([`title.ilike.${like}`, `body_ko.ilike.${like}`, `category.ilike.${like}`].join(','))
      .order('updated_at', { ascending: false })
      .limit(15),
  ]);

  const hits: GlobalSearchHit[] = [];

  for (const card of cardsRes.data ?? []) {
    if (card.archived_at) continue;
    const isFacility = card.category === '시설' || card.category === '컴플레인';
    const roomPrefix = card.room?.trim() ? `${card.room}호 · ` : '';
    hits.push({
      kind: isFacility ? 'facility' : 'handover',
      id: card.id,
      title: card.title,
      subtitle: `${roomPrefix}${card.category} · ${cardStatusLabel(card.column_id)}`,
      href: `/handover?card=${card.id}`,
      at: card.updated_at || card.created_at,
    });
  }

  for (const review of reviewsRes.data ?? []) {
    hits.push({
      kind: 'review',
      id: review.id,
      title:
        review.is_anonymous ||
        (!review.guest_name?.trim() &&
          !review.reservation_number?.trim() &&
          !review.check_in_date &&
          !review.check_out_date)
          ? '익명 리뷰'
          : review.guest_name || review.content_ko?.slice(0, 40) || '리뷰',
      subtitle: `${review.sentiment === 'negative' ? '나쁜' : '좋은'} 리뷰${review.room_number ? ` · ${review.room_number}호` : ''}${review.reservation_number ? ` · ${review.reservation_number}` : ''}`,
      href: '/reviews',
      at: review.updated_at || review.created_at,
    });
  }

  for (const booking of transportRes.data ?? []) {
    const isToday = booking.booking_date >= today;
    hits.push({
      kind: 'transport',
      id: booking.id,
      title: booking.guest_name || booking.destination || '택시 예약',
      subtitle: `${isToday ? booking.pickup_time?.slice(0, 5) : booking.booking_date} · ${booking.room_number ? `${booking.room_number}호 · ` : ''}${booking.destination || '—'} (${booking.status})`,
      href: '/transport',
      at: `${booking.booking_date}T${booking.pickup_time || '00:00'}`,
    });
  }

  for (const notice of noticesRes.data ?? []) {
    const line = notice.content.split('\n')[0]?.trim() || '게시글';
    hits.push({
      kind: 'notice',
      id: notice.id,
      title: line,
      subtitle: `${notice.type === 'change' ? '업무 변경' : '업무 공지'} · ${notice.author || '—'}`,
      href: buildWorkHubHref('notices', { id: notice.id }),
      at: notice.updated_at || notice.created_at,
    });
  }

  for (const todo of todosRes.data ?? []) {
    hits.push({
      kind: 'todo',
      id: todo.id,
      title: todo.title,
      subtitle: `${todo.status === 'done' ? '완료' : '진행'}${todo.due_date ? ` · 마감 ${todo.due_date}` : ''}${todo.assignee_name ? ` · ${todo.assignee_name}` : ''}`,
      href: buildWorkHubHref('schedule'),
      at: todo.updated_at || todo.created_at,
    });
  }

  for (const contact of contactsRes.data ?? []) {
    hits.push({
      kind: 'contact',
      id: contact.id,
      title: contact.name,
      subtitle: `${contact.department || '연락처'}${contact.phone ? ` · ${contact.phone}` : ''}`,
      href: '/contacts',
      at: contact.updated_at || contact.created_at,
    });
  }

  for (const notice of guestNoticesRes.data ?? []) {
    hits.push({
      kind: 'guest_notice',
      id: notice.id,
      title: notice.title,
      subtitle: `고객 안내 · ${notice.category}`,
      href: '/guest-notices',
      at: notice.updated_at || notice.created_at,
    });
  }

  return hits.sort((a, b) => b.at.localeCompare(a.at));
}

/** @deprecated use searchGlobal */
export async function searchByRoom(roomQuery: string): Promise<GlobalSearchHit[]> {
  return searchGlobal(roomQuery);
}
