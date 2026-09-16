-- SECURITY DEFINER functions inherit PUBLIC EXECUTE unless explicitly revoked.
-- The app may only call the authenticated RPC surface below.
revoke all on all functions in schema public from public, anon;

grant execute on function
  public.create_household(text, text, text),
  public.create_chore(uuid, text, integer, uuid, timestamptz, text, boolean),
  public.create_reward(uuid, text, integer, text),
  public.submit_chore_completion(uuid, uuid, date, text, text, text),
  public.approve_chore_completion(uuid),
  public.reject_chore_completion(uuid, text),
  public.purchase_reward(uuid, uuid),
  public.redeem_reward(uuid),
  public.update_household_name(uuid, text),
  public.create_household_invite(uuid, text, public.invite_role, integer),
  public.accept_household_invite(uuid, text, text, boolean),
  public.add_household_member(uuid, text, public.household_role, text),
  public.update_my_member_profile(text, text),
  public.change_household_member_role(uuid, public.household_role),
  public.update_child_profile(uuid, text, text),
  public.remove_household_member(uuid),
  public.transfer_household_ownership(uuid),
  public.close_household(),
  public.save_notification_preferences(boolean, boolean, boolean),
  public.register_device_token(text, text),
  public.export_my_data(),
  public.export_household_data(),
  public.delete_my_account()
to authenticated;
