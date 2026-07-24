import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useRefresh } from '../hooks/useRefresh';

describe('useRefresh', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('prevents duplicate refresh requests while already refreshing', async () => {
    const fetchFn = jest.fn(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    );

    const { result } = renderHook(() => useRefresh(fetchFn));

    act(() => {
      result.current.onRefresh();
      result.current.onRefresh();
    });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(result.current.refreshing).toBe(true);

    act(() => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(result.current.refreshing).toBe(false);
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
