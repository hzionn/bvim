// vim-state-machine.js - Formal Finite State Machine for Vim modes

(function () {
  'use strict';

  class VimStateMachine {
    constructor() {
      this.state = 'INSERT';
      this.previousState = null;
      this.listeners = [];

      // Define all possible states
      this.states = {
        INSERT: {
          name: 'insert',
          displayName: 'INSERT',
          cursorClass: 'vim-insert-mode',
          color: '#28a745', // Green
          transitions: {
            'Escape': 'NORMAL'
          }
        },

        NORMAL: {
          name: 'normal',
          displayName: 'NORMAL',
          cursorClass: 'vim-normal-mode',
          color: '#dc3545', // Red
          transitions: {
            'i': 'INSERT',
            'd': 'NORMAL_PENDING_DELETE',
            'c': 'NORMAL_PENDING_CHANGE'
            // h/j/k/l/w/b are handled as actions, not transitions
          },
          actions: {
            'h': 'moveLeft',
            'j': 'moveDown',
            'k': 'moveUp',
            'l': 'moveRight',
            'w': 'moveWordForward',
            'b': 'moveWordBackward',
            'arrowleft': 'moveLeft',
            'arrowdown': 'moveDown',
            'arrowup': 'moveUp',
            'arrowright': 'moveRight'
          }
        },

        NORMAL_PENDING_DELETE: {
          name: 'normal',
          displayName: 'DELETE',
          cursorClass: 'vim-normal-mode',
          color: '#dc3545', // Red
          transitions: {
            'w': { state: 'NORMAL', action: 'deleteWord' },
            'Escape': 'NORMAL',
            'default': 'NORMAL' // Any other key cancels
          }
        },

        NORMAL_PENDING_CHANGE: {
          name: 'normal',
          displayName: 'CHANGE',
          cursorClass: 'vim-normal-mode',
          color: '#dc3545', // Red
          transitions: {
            'w': { state: 'INSERT', action: 'changeWord' },
            'Escape': 'NORMAL',
            'default': 'NORMAL' // Any other key cancels
          }
        }
      };

      console.log('[Vim-FSM] State machine initialized in INSERT state');
    }

    // Add listener for state changes
    addListener(callback) {
      this.listeners.push(callback);
    }

    // Remove listener
    removeListener(callback) {
      this.listeners = this.listeners.filter(l => l !== callback);
    }

    // Notify all listeners of state change
    notifyListeners(oldState, newState, data = {}) {
      this.listeners.forEach(callback => {
        try {
          callback({
            oldState,
            newState,
            stateName: this.getStateName(),
            displayName: this.getDisplayName(),
            cursorClass: this.getCursorClass(),
            ...data
          });
        } catch (error) {
          console.error('[Vim-FSM] Error in state change listener:', error);
        }
      });
    }

    // Process input and return action to execute
    processInput(key, element) {
      const currentStateConfig = this.states[this.state];
      const oldState = this.state;
      let action = null;
      let result = {
        stateChanged: false,
        action: null,
        actionData: null
      };

      console.log(`[Vim-FSM] Processing input '${key}' in state '${this.state}'`);

      // Check for state transitions first
      if (currentStateConfig.transitions) {
        let transition = currentStateConfig.transitions[key];

        // If no direct match, check for default transition
        if (!transition && currentStateConfig.transitions.default) {
          transition = currentStateConfig.transitions.default;
        }

        if (transition) {
          if (typeof transition === 'string') {
            // Simple state transition
            this.setState(transition);
            result.stateChanged = true;
          } else if (typeof transition === 'object') {
            // Transition with action
            result.action = transition.action;
            result.actionData = { element, key };
            this.setState(transition.state);
            result.stateChanged = true;
          }
        }
      }

      // If no transition occurred, check for actions
      if (!result.stateChanged && currentStateConfig.actions) {
        const actionName = currentStateConfig.actions[key];
        if (actionName) {
          result.action = actionName;
          result.actionData = { element, key };
        }
      }

      // Notify listeners if state changed
      if (result.stateChanged) {
        this.notifyListeners(oldState, this.state, result);
      }

      console.log(`[Vim-FSM] Result:`, result);
      return result;
    }

    // Set new state
    setState(newState) {
      if (this.states[newState]) {
        this.previousState = this.state;
        this.state = newState;
        console.log(`[Vim-FSM] State changed: ${this.previousState} → ${this.state}`);
      } else {
        console.error(`[Vim-FSM] Invalid state: ${newState}`);
      }
    }

    // Get current state name (for mode indicator)
    getStateName() {
      return this.states[this.state]?.name || 'unknown';
    }

    // Get display name (for mode indicator)
    getDisplayName() {
      return this.states[this.state]?.displayName || 'UNKNOWN';
    }

    // Get cursor class
    getCursorClass() {
      return this.states[this.state]?.cursorClass || '';
    }

    // Get current state color
    getColor() {
      return this.states[this.state]?.color || '#000';
    }

    // Check if in insert mode
    isInsertMode() {
      return this.state === 'INSERT';
    }

    // Check if in normal mode (any variant)
    isNormalMode() {
      return this.state.startsWith('NORMAL');
    }

    // Check if in pending command state
    isPendingCommand() {
      return this.state === 'NORMAL_PENDING_DELETE' || this.state === 'NORMAL_PENDING_CHANGE';
    }

    // Reset to insert mode (used on focus loss, etc.)
    reset() {
      this.setState('INSERT');
    }

    // Get all available transitions from current state
    getAvailableTransitions() {
      return Object.keys(this.states[this.state]?.transitions || {});
    }

    // Get all available actions from current state
    getAvailableActions() {
      return Object.keys(this.states[this.state]?.actions || {});
    }
  }

  // Export to global scope
  window.VimStateMachine = VimStateMachine;
  console.log('[Vim-FSM] VimStateMachine class loaded');

})(); 