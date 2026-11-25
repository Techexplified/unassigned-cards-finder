/**
 * Lightweight state store (plain object + subscribe)
 *
 * @param {Object} initialState
 * @returns {{ getState: () => Object, setState: (partial: Object | Function) => void, subscribe: (listener: Function) => Function }}
 */
export function createStore(initialState = {}) {
  let state = { ...initialState };
  const listeners = new Set();

  return {
    getState() {
      return state;
    },

    setState(partial) {
      const nextState = typeof partial === 'function' ? partial(state) : { ...state, ...partial };
      if (nextState !== state) {
        state = nextState;
        listeners.forEach((listener) => {
          try {
            listener(state);
          } catch (err) {
            console.error('State store listener error:', err);
          }
        });
      }
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
