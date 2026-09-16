const mockRpc = jest.fn();

jest.mock('../lib/supabase', () => ({
  supabase: { rpc: mockRpc },
}));

const { householdApi } = require('../lib/household');

describe('household API', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sends only the server contract when a parent creates a chore', async () => {
    mockRpc.mockResolvedValue({ data: 'chore-1', error: null });

    await expect(householdApi.createChore({
      householdId: 'household-1',
      title: 'Unload dishwasher',
      points: 20,
      assigneeId: 'member-1',
      dueAt: '2030-01-15T12:00:00.000Z',
      recurrenceRule: 'weekly',
      photoRequired: true,
    })).resolves.toBe('chore-1');

    expect(mockRpc).toHaveBeenCalledWith('create_chore', {
      target_household_id: 'household-1',
      chore_title: 'Unload dishwasher',
      chore_points: 20,
      assignee_id: 'member-1',
      due_at_value: '2030-01-15T12:00:00.000Z',
      recurrence_value: 'weekly',
      requires_photo: true,
    });
  });

  it('does not hide a rejected server mutation', async () => {
    const error = new Error('Parent access required');
    mockRpc.mockResolvedValue({ data: null, error });

    await expect(householdApi.createChore({
      householdId: 'household-1', title: 'Laundry', points: 10,
    })).rejects.toThrow('Parent access required');
  });

  it('passes parent feedback to the server rejection operation', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    await householdApi.rejectCompletion('completion-1', 'Please retake the photo.');

    expect(mockRpc).toHaveBeenCalledWith('reject_chore_completion', {
      target_completion_id: 'completion-1',
      feedback: 'Please retake the photo.',
    });
  });
});
