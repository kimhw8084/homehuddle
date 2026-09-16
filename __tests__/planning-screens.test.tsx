import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import ShoppingScreen from '../features/shopping/ShoppingScreen';
import { MealPlanner } from '../features/meals/MealPlanner';
import { planningApi } from '../features/planning/api';
import { useSharedData } from '../features/planning/use-shared-data';

jest.mock('../features/planning/use-shared-data', () => ({ useSharedData: jest.fn() }));
jest.mock('../features/planning/api', () => ({ planningApi: { saveItem: jest.fn(), saveMeal: jest.fn(), saveRecipe: jest.fn() } }));
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => 'draft-request-id') }));

describe('shared planning screens', () => {
  const refresh = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
    (useSharedData as jest.Mock).mockReturnValue({ householdId: 'household-a', data: [], loading: false, error: null, refresh });
  });

  it('validates quantity and retains a failed shopping draft for retry', async () => {
    const save = planningApi.saveItem as jest.Mock;
    save.mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValueOnce({ id: 'draft-request-id' });
    const screen = render(<ShoppingScreen />);
    fireEvent.changeText(screen.getByLabelText('Item name'), 'Rice');
    fireEvent.changeText(screen.getByLabelText('Quantity'), '0');
    fireEvent.press(screen.getByText('Add to shared list'));
    expect(save).not.toHaveBeenCalled();
    fireEvent.changeText(screen.getByLabelText('Quantity'), '0.5');
    fireEvent.press(screen.getByText('Add to shared list'));
    await waitFor(() => expect(screen.getByText('Connection lost')).toBeTruthy());
    expect(screen.getByLabelText('Item name').props.value).toBe('Rice');
    fireEvent.press(screen.getByText('Add to shared list'));
    await waitFor(() => expect(screen.getByText('Saved to your household list.')).toBeTruthy());
    expect(save.mock.calls[0]).toEqual(save.mock.calls[1]);
    expect(save).toHaveBeenCalledWith('household-a', expect.objectContaining({ id: 'draft-request-id', name: 'Rice', quantity: 0.5 }));
    expect(screen.getByLabelText('Item name').props.value).toBe('');
  });

  it('opens a dinner editor and preserves its draft on save failure', async () => {
    (useSharedData as jest.Mock).mockReturnValue({ householdId: 'household-a', data: { recipes: [], plans: [] }, loading: false, refresh });
    (planningApi.saveMeal as jest.Mock).mockRejectedValueOnce(new Error('Dinner changed elsewhere')).mockResolvedValueOnce({});
    const screen = render(<MealPlanner />);
    fireEvent.press(screen.getAllByText('Plan dinner')[0]);
    fireEvent.changeText(screen.getByLabelText('Dinner plan'), 'Takeout');
    fireEvent.press(screen.getByText('Save dinner'));
    await waitFor(() => expect(screen.getAllByText('Dinner changed elsewhere').length).toBeGreaterThan(0));
    expect(screen.getByLabelText('Dinner plan').props.value).toBe('Takeout');
    fireEvent.press(screen.getByText('Save dinner'));
    await waitFor(() => expect(screen.getByText('Dinner saved for everyone.')).toBeTruthy());
    expect(screen.queryByLabelText('Dinner plan')).toBeNull();
  });

  it('saves trimmed ingredient lines with a reusable recipe identity', async () => {
    (useSharedData as jest.Mock).mockReturnValue({ householdId: 'household-a', data: { recipes: [], plans: [] }, loading: false, refresh });
    (planningApi.saveRecipe as jest.Mock).mockResolvedValueOnce({});
    const screen = render(<MealPlanner />);
    fireEvent.press(screen.getByText('Add a recipe'));
    fireEvent.changeText(screen.getByLabelText('Recipe name'), 'Pasta');
    fireEvent.changeText(screen.getByLabelText('Ingredients (one per line, include amounts)'), '  500 g pasta\n\n2 tomatoes  ');
    fireEvent.press(screen.getByText('Save recipe'));
    await waitFor(() => expect(screen.getByText('Recipe saved to your household.')).toBeTruthy());
    expect(planningApi.saveRecipe).toHaveBeenCalledWith('household-a', expect.objectContaining({ id: 'draft-request-id', version: 0, ingredients: ['500 g pasta', '2 tomatoes'] }));
  });
});
