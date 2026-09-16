const mockUpload = jest.fn();
const mockCreateSignedUrl = jest.fn();

jest.mock('../lib/supabase', () => ({
  supabase: { storage: { from: jest.fn(() => ({ upload: mockUpload, createSignedUrl: mockCreateSignedUrl })) } },
}));

const { householdProofs } = require('../lib/household-proofs');

describe('household proofs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'image/jpeg' },
      arrayBuffer: async () => new ArrayBuffer(4),
    });
  });

  it('stores proof in a household-scoped private path', async () => {
    mockUpload.mockResolvedValue({ error: null });

    const path = await householdProofs.upload({
      householdId: 'household-1', choreId: 'chore-1', slot: 'after', uri: 'file:///proof.jpg',
    });

    expect(path).toMatch(/^household-1\/chore-1\/\d+-after\.jpg$/);
    expect(mockUpload).toHaveBeenCalledWith(path, expect.any(ArrayBuffer), {
      contentType: 'image/jpeg', upsert: false,
    });
  });

  it('creates a time-limited URL only for an existing private proof', async () => {
    mockCreateSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://proof.example/signed' }, error: null });

    await expect(householdProofs.signedUrl('household-1/chore-1/proof.jpg')).resolves.toBe('https://proof.example/signed');
    await expect(householdProofs.signedUrl(null)).resolves.toBeNull();
    expect(mockCreateSignedUrl).toHaveBeenCalledWith('household-1/chore-1/proof.jpg', 600);
  });
});
