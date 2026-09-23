import { act, renderHook } from '@testing-library/react-native';
import { useOperationScope } from '../hooks/use-operation-scope';
import { useHuddleStore } from '../store/huddleStore';
import { useAuthStore } from '../store/authStore';

beforeEach(() => {
  useAuthStore.setState({ user: { id: 'user-a' } as any });
  useHuddleStore.setState({ householdId: 'a', currentMemberId: 'member-a', familyMembers: [] });
});
test('late work is invalid after a batched A→B→A household transition', () => {
  const { result } = renderHook(() => useOperationScope());
  const current = result.current();
  expect(current()).toBe(true);
  act(() => { useHuddleStore.setState({ householdId: 'b' }); useHuddleStore.setState({ householdId: 'a' }); });
  expect(current()).toBe(false);
  expect(result.current()()).toBe(true);
});
test('unmounted editor work cannot continue', () => {
  const { result, unmount } = renderHook(() => useOperationScope());
  const current = result.current();
  unmount();
  expect(current()).toBe(false);
});
test('account changes revoke an in-flight operation', () => {
  const { result } = renderHook(() => useOperationScope());
  const current = result.current();
  act(() => { useAuthStore.setState({ user: { id: 'user-b' } as any }); });
  expect(current()).toBe(false);
});
