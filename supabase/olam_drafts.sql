-- טיוטות של גילויים חדשים (נשמרות מהממשק ב-olam_records כ-kind='discovery', id='draft-…', verified=false).
-- RLS קיים: הוספה וקריאה של רשומות לא מאומתות רק למנהלת. הפונקציה מאפשרת לסקריפט pull-drafts לקרוא אותן עם אסימון זמני.
-- הוחל ב-31.10.2026 בפרויקט cultura-GH. רק אובייקטים עם הקידומת olam_, בלי drop.
create or replace function public.olam_drafts(p_token text)
returns table (id text, data jsonb)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.olam_import_tokens t where t.token = p_token and t.expires_at > now()) then
    raise exception 'olam_drafts: invalid or expired token';
  end if;
  return query select r.id, r.data from public.olam_records r where r.kind = 'discovery' and r.id like 'draft-%' and r.verified = false order by r.id;
end $$;
revoke all on function public.olam_drafts(text) from public;
grant execute on function public.olam_drafts(text) to anon, authenticated;
