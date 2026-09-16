jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: jest.fn(),
      signInWithOtp: jest.fn(),
      verifyOtp: jest.fn(),
      exchangeCodeForSession: jest.fn(),
      setSession: jest.fn(),
    },
  },
}));

const { consumeAuthRedirect, readableAuthError, verifyEmailCode } = require('../lib/auth');
const { supabase } = require('../lib/supabase');
const mockExchangeCodeForSession = supabase.auth.exchangeCodeForSession as jest.Mock;
const mockSetSession = supabase.auth.setSession as jest.Mock;
const mockVerifyOtp = supabase.auth.verifyOtp as jest.Mock;

describe('consumeAuthRedirect', () => {
  beforeEach(() => jest.clearAllMocks());

  it('exchanges duplicate callback deliveries only once', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    const url = 'homehuddle://auth/callback?code=duplicate-delivery';
    await Promise.all([consumeAuthRedirect(url), consumeAuthRedirect(url)]);
    expect(mockExchangeCodeForSession).toHaveBeenCalledTimes(1);
  });

  it('ignores unrelated links', async () => {
    expect(await consumeAuthRedirect('homehuddle://onboarding/accept-invite?code=invite')).toBe(false);
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('surfaces provider failure without exchanging credentials', async () => {
    await expect(consumeAuthRedirect('homehuddle://auth/callback?error=access_denied')).rejects.toThrow('not completed');
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('exchanges a PKCE code from a deep link', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });

    await consumeAuthRedirect('homehuddle://auth/callback?code=one-time-code');

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('one-time-code');
  });

  it('stores implicit-flow tokens from a deep-link fragment', async () => {
    mockSetSession.mockResolvedValue({ error: null });

    await consumeAuthRedirect('homehuddle://auth/callback#access_token=access&refresh_token=refresh');

    expect(mockSetSession).toHaveBeenCalledWith({ access_token: 'access', refresh_token: 'refresh' });
  });
});

describe('readableAuthError', () => {
  it('does not expose an HTML parsing failure to the user', () => {
    expect(readableAuthError(new SyntaxError("Unexpected token '>', \"<html>\" is not valid JSON")))
      .toContain('temporarily unavailable');
  });

  it('explains the email rate limit without exposing the provider error', () => {
    expect(readableAuthError(new Error('Email rate limit exceeded')))
      .toContain('Too many sign-in emails');
  });
});

describe('verifyEmailCode', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects a successful response without a session', async () => {
    mockVerifyOtp.mockResolvedValue({ data: { session: null }, error: null });
    await expect(verifyEmailCode('test@example.com', '123456')).rejects.toThrow('did not complete');
  });

  it('verifies an email code with normalized input', async () => {
    mockVerifyOtp.mockResolvedValue({ data: { session: { access_token: 'verified' } }, error: null });

    await verifyEmailCode(' KimHW8084@Gmail.com ', ' 12345678 ');

    expect(mockVerifyOtp).toHaveBeenCalledWith({
      email: 'kimhw8084@gmail.com',
      token: '12345678',
      type: 'magiclink',
    });
  });

  it('falls back to the email OTP type when needed', async () => {
    mockVerifyOtp
      .mockResolvedValueOnce({ error: new Error('Invalid token type') })
      .mockResolvedValueOnce({ data: { session: { access_token: 'verified' } }, error: null });

    await verifyEmailCode('kimhw8084@gmail.com', '12345678');

    expect(mockVerifyOtp).toHaveBeenLastCalledWith({
      email: 'kimhw8084@gmail.com',
      token: '12345678',
      type: 'email',
    });
  });
});
