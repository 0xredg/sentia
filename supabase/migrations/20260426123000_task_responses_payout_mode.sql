alter table public.task_responses
  add column if not exists payout_mode text not null default 'mock';

update public.task_responses
set payout_mode = 'mock'
where payout_mode is null;

alter table public.task_responses
  drop constraint if exists task_responses_task_id_user_id_key;

alter table public.task_responses
  drop constraint if exists task_responses_payout_mode_check;

alter table public.task_responses
  add constraint task_responses_payout_mode_check
    check (payout_mode in ('mock', 'real'));

create unique index if not exists task_responses_task_user_mode_unique
  on public.task_responses(task_id, user_id, payout_mode);

create index if not exists task_responses_user_mode_idx
  on public.task_responses(user_id, payout_mode);
