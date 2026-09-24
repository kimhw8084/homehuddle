-- Cover the composite tenant-consistency FK, not only its fund_id prefix.
create index wallet_contributions_fund_household_idx on public.wallet_fund_contributions(fund_id,household_id);
