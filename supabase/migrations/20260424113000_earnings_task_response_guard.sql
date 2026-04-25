create unique index if not exists earnings_ledger_task_response_unique
  on public.earnings_ledger(task_response_id)
  where task_response_id is not null;
