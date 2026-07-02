-- card-attachments: signed URL 대신 getPublicUrl 사용 (API egress 절감)
-- 경로에 hotel_id/uuid가 포함되어 URL 추측 난이도는 높음. 업로드/삭제 RLS는 유지.

update storage.buckets
set public = true
where id = 'card-attachments';
