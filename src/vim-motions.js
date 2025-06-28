// vim-motions.js - Vim motion utilities and functions
// This file is loaded before content.js and makes functions available globally

(function () {
  'use strict';

  // --- Word boundary utilities ---
  
  // Vim-like character classification
  const isWordChar = (char) => /[a-zA-Z0-9_]/.test(char);
  const isPunctuation = (char) => /[^a-zA-Z0-9_\s]/.test(char);
  const isWhitespace = (char) => /\s/.test(char);
  
  // Get character type for vim word motions
  const getCharType = (char) => {
    if (isWhitespace(char)) return 'whitespace';
    if (isWordChar(char)) return 'word';
    if (isPunctuation(char)) return 'punctuation';
    return 'other';
  };

  // --- Element & Cursor Abstraction ---

  const isEditable = (element) => {
    if (!element) return false;
    const tagName = element.tagName;
    const isEditable =
      tagName === "TEXTAREA" || tagName === "INPUT" || element.isContentEditable;
    console.log(
      `[Vim-Extension] Checking if element is editable: <${element.tagName}>, result: ${isEditable}`,
    );
    return isEditable;
  };

  const getText = (element) => {
    if (element.tagName === "TEXTAREA" || element.tagName === "INPUT")
      return element.value;
    if (element.isContentEditable) {
      // For contentEditable, we need to preserve line breaks and handle complex DOM structures
      // Clone the element to avoid modifying the original
      const clone = element.cloneNode(true);
      
      // Handle various line break patterns
      clone.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
      
      // Handle block elements - add newlines appropriately
      clone.querySelectorAll('div, p, li, h1, h2, h3, h4, h5, h6').forEach(block => {
        // Only add newline if this block has a next sibling or isn't the last element
        if (block.nextSibling || block.parentNode.lastChild !== block) {
          block.after('\n');
        }
      });
      
      // Handle list elements
      clone.querySelectorAll('ul, ol').forEach(list => {
        if (list.nextSibling) {
          list.after('\n');
        }
      });
      
      // Get text content, fallback to innerText for better compatibility
      let text = clone.textContent || clone.innerText || '';
      
      // Normalize multiple consecutive newlines to single newlines (but preserve intentional spacing)
      text = text.replace(/\n{3,}/g, '\n\n');
      
      return text;
    }
    return "";
  };

  const getCursorPosition = (element) => {
    if (element.tagName === "TEXTAREA" || element.tagName === "INPUT")
      return element.selectionStart;
    if (element.isContentEditable) {
      const selection = window.getSelection();
      if (selection.rangeCount === 0) return 0;
      const range = selection.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(element);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      return preCaretRange.toString().length;
    }
    return 0;
  };

  const setCursorPosition = (element, position) => {
    if (element.tagName === "TEXTAREA" || element.tagName === "INPUT") {
      element.focus();
      element.setSelectionRange(position, position);
    } else if (element.isContentEditable) {
      element.focus();
      let charIndex = 0;
      const range = document.createRange();
      range.setStart(element, 0);
      range.collapse(true);
      const nodeStack = [element];
      let node,
        foundStart = false;
      while (!foundStart && (node = nodeStack.pop())) {
        if (node.nodeType === Node.TEXT_NODE) {
          const nextCharIndex = charIndex + node.length;
          if (position >= charIndex && position <= nextCharIndex) {
            range.setStart(node, position - charIndex);
            foundStart = true;
          }
          charIndex = nextCharIndex;
        } else {
          let i = node.childNodes.length;
          while (i--) nodeStack.push(node.childNodes[i]);
        }
      }
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  const getLineInfo = (text, cursor) => {
    const lines = text.split("\n");

    let lineIndex = 0,
      lineStart = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (cursor <= lineStart + line.length) {
        lineIndex = i;
        break;
      }
      lineStart += line.length + 1;
    }

    return { lines, lineIndex, lineStart };
  };

  // --- Universal Movement Functions ---

  const moveLeft = (element) => {
    const cursor = getCursorPosition(element);
    if (cursor > 0) {
      setCursorPosition(element, cursor - 1);
      return true;
    }
    return false;
  };

  const moveRight = (element) => {
    const cursor = getCursorPosition(element);
    const text = getText(element);
    if (cursor < text.length) {
      setCursorPosition(element, cursor + 1);
      return true;
    }
    return false;
  };

  const moveUp = (element) => {
    const cursor = getCursorPosition(element);
    const text = getText(element);
    const { lines, lineIndex, lineStart } = getLineInfo(text, cursor);

    if (lineIndex > 0) {
      const cursorInLine = cursor - lineStart;
      let prevLineStart = 0;
      for (let i = 0; i < lineIndex - 1; i++) {
        prevLineStart += lines[i].length + 1;
      }
      const newCursor = prevLineStart + Math.min(cursorInLine, lines[lineIndex - 1].length);
      setCursorPosition(element, newCursor);
      return true;
    }
    return false;
  };

  const moveDown = (element) => {
    const cursor = getCursorPosition(element);
    const text = getText(element);
    const { lines, lineIndex, lineStart } = getLineInfo(text, cursor);

    if (lineIndex < lines.length - 1) {
      const cursorInLine = cursor - lineStart;
      const nextLineStart = lineStart + lines[lineIndex].length + 1;
      const newCursor = nextLineStart + Math.min(cursorInLine, lines[lineIndex + 1].length);
      setCursorPosition(element, newCursor);
      return true;
    }
    return false;
  };

  const moveWordForward = (element) => {
    const cursor = getCursorPosition(element);
    const text = getText(element);
    let pos = cursor;

    if (pos >= text.length) return false;

    const currentCharType = getCharType(text[pos]);

    // Skip over current group (word, punctuation, or whitespace)
    if (currentCharType === 'word') {
      // Skip word characters
      while (pos < text.length && isWordChar(text[pos])) pos++;
    } else if (currentCharType === 'punctuation') {
      // Skip punctuation characters
      while (pos < text.length && isPunctuation(text[pos])) pos++;
    } else if (currentCharType === 'whitespace') {
      // Skip whitespace
      while (pos < text.length && isWhitespace(text[pos])) pos++;
    }

    // Skip any additional whitespace to get to the start of the next word/punctuation
    while (pos < text.length && isWhitespace(text[pos])) pos++;

    setCursorPosition(element, pos);
    return true;
  };

  const moveWordBackward = (element) => {
    const cursor = getCursorPosition(element);
    const text = getText(element);
    let pos = cursor;

    if (pos <= 0) return false;

    pos--; // Move back one character to start

    // Skip over whitespace first
    while (pos > 0 && isWhitespace(text[pos])) pos--;

    if (pos <= 0) {
      setCursorPosition(element, 0);
      return true;
    }

    const targetCharType = getCharType(text[pos]);

    // Move to the beginning of the current group
    if (targetCharType === 'word') {
      // Skip back to start of word
      while (pos > 0 && isWordChar(text[pos - 1])) pos--;
    } else if (targetCharType === 'punctuation') {
      // Skip back to start of punctuation group
      while (pos > 0 && isPunctuation(text[pos - 1])) pos--;
    }

    setCursorPosition(element, pos);
    return true;
  };

  // --- Text Modification Functions ---

  /**
   * Deletes text between the specified start and end positions in an editable element.
   * 
   * This function handles different types of editable elements (textarea, input, contentEditable)
   * and ensures proper event firing for compatibility with modern web frameworks like React.
   * After deletion, the cursor is positioned at the start position.
   * 
   * @param {HTMLElement} element - The editable element (textarea, input, or contentEditable)
   * @param {number} startPos - The starting position (inclusive) of text to delete
   * @param {number} endPos - The ending position (exclusive) of text to delete
   * 
   * @example
   * // Delete characters 5-10 in a textarea
   * deleteText(textareaElement, 5, 10);
   * 
   * @example
   * // Delete a single character at position 3
   * deleteText(inputElement, 3, 4);
   * 
   * @throws {Error} Implicitly - if element is not editable or positions are invalid
   */
  const deleteText = (element, startPos, endPos) => {
    console.log(`[Vim-Extension] deleteText called: startPos=${startPos}, endPos=${endPos}`);

    if (element.tagName === "TEXTAREA" || element.tagName === "INPUT") {
      const text = element.value;
      console.log(`[Vim-Extension] Original text: "${text}"`);

      // Focus and select the text to delete
      element.focus();
      element.setSelectionRange(startPos, endPos);

      // Method 1: Try using insertText (most modern and compatible)
      if (typeof element.setRangeText === 'function') {
        console.log(`[Vim-Extension] Using setRangeText method`);
        element.setRangeText('', startPos, endPos, 'end');

        // Fire input event manually
        const inputEvent = new InputEvent('input', {
          bubbles: true,
          cancelable: true,
          inputType: 'deleteContentBackward'
        });
        element.dispatchEvent(inputEvent);

      } else {
        // Method 2: Direct value manipulation with proper events
        console.log(`[Vim-Extension] Using direct value manipulation`);
        const newValue = text.slice(0, startPos) + text.slice(endPos);

        // Create a property descriptor to bypass React's value tracking
        const descriptor = Object.getOwnPropertyDescriptor(element, 'value') ||
          Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value');

        if (descriptor && descriptor.set) {
          descriptor.set.call(element, newValue);
        } else {
          element.value = newValue;
        }

        // Fire comprehensive events
        element.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
        element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      }

      console.log(`[Vim-Extension] New text: "${element.value}"`);
      setCursorPosition(element, startPos);

    } else if (element.isContentEditable) {
      const text = getText(element);
      console.log(`[Vim-Extension] Original contentEditable text: "${text}"`);

      // Simple and reliable approach for all contentEditable elements
      element.focus();
      const newText = text.slice(0, startPos) + text.slice(endPos);
      element.textContent = newText;

      // Fire input events for contentEditable
      element.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'deleteContentBackward'
      }));

      setCursorPosition(element, startPos);
    }
  };

  /**
   * Deletes a word including any trailing whitespace (for 'dw' motion).
   * This matches Vim's behavior where 'dw' deletes from cursor to the beginning of the next word.
   */
  const deleteWord = (element) => {
    const cursor = getCursorPosition(element);
    const text = getText(element);
    let endPos = cursor;

    console.log(`[Vim-Extension] deleteWord (dw): cursor=${cursor}, text="${text}", char at cursor="${text[cursor]}"`);

    if (cursor >= text.length) {
      console.log(`[Vim-Extension] deleteWord (dw): cursor at end, nothing to delete`);
      return false;
    }

    const currentCharType = getCharType(text[cursor]);

    // Delete current group and trailing whitespace
    if (currentCharType === 'word') {
      // Delete word characters
      while (endPos < text.length && isWordChar(text[endPos])) endPos++;
    } else if (currentCharType === 'punctuation') {
      // Delete punctuation characters
      while (endPos < text.length && isPunctuation(text[endPos])) endPos++;
    } else if (currentCharType === 'whitespace') {
      // If on whitespace, skip to next word/punctuation and delete that
      while (endPos < text.length && isWhitespace(text[endPos])) endPos++;
      
      if (endPos < text.length) {
        const nextCharType = getCharType(text[endPos]);
        if (nextCharType === 'word') {
          while (endPos < text.length && isWordChar(text[endPos])) endPos++;
        } else if (nextCharType === 'punctuation') {
          while (endPos < text.length && isPunctuation(text[endPos])) endPos++;
        }
      }
    }

    // For 'dw', also include trailing whitespace
    while (endPos < text.length && isWhitespace(text[endPos])) endPos++;

    console.log(`[Vim-Extension] deleteWord (dw): will delete from ${cursor} to ${endPos}, text to delete: "${text.slice(cursor, endPos)}"`);

    if (endPos > cursor) {
      deleteText(element, cursor, endPos);
      return true;
    }
    console.log(`[Vim-Extension] deleteWord (dw): nothing to delete`);
    return false;
  };

  /**
   * Deletes a word without trailing whitespace (for 'cw' motion).
   * This matches Vim's behavior where 'cw' changes only the word itself.
   */
  const changeWord = (element) => {
    const cursor = getCursorPosition(element);
    const text = getText(element);
    let endPos = cursor;

    console.log(`[Vim-Extension] changeWord (cw): cursor=${cursor}, text="${text}", char at cursor="${text[cursor]}"`);

    if (cursor >= text.length) {
      console.log(`[Vim-Extension] changeWord (cw): cursor at end, nothing to change`);
      return false;
    }

    const currentCharType = getCharType(text[cursor]);

    // Delete current group (but NOT trailing whitespace for cw)
    if (currentCharType === 'word') {
      // Delete word characters only
      while (endPos < text.length && isWordChar(text[endPos])) endPos++;
    } else if (currentCharType === 'punctuation') {
      // Delete punctuation characters only
      while (endPos < text.length && isPunctuation(text[endPos])) endPos++;
    } else if (currentCharType === 'whitespace') {
      // If on whitespace, skip to next word/punctuation and delete that (no trailing space)
      while (endPos < text.length && isWhitespace(text[endPos])) endPos++;
      
      if (endPos < text.length) {
        const nextCharType = getCharType(text[endPos]);
        if (nextCharType === 'word') {
          while (endPos < text.length && isWordChar(text[endPos])) endPos++;
        } else if (nextCharType === 'punctuation') {
          while (endPos < text.length && isPunctuation(text[endPos])) endPos++;
        }
      }
    }

    console.log(`[Vim-Extension] changeWord (cw): will delete from ${cursor} to ${endPos}, text to delete: "${text.slice(cursor, endPos)}"`);

    if (endPos > cursor) {
      deleteText(element, cursor, endPos);
      return true;
    }
    console.log(`[Vim-Extension] changeWord (cw): nothing to delete`);
    return false;
  };

  // --- Future vim motions can be added here ---

  // Example of additional motions you might want to add:
  /*
  const moveToLineStart = (element) => {
    const cursor = getCursorPosition(element);
    const text = getText(element);
    const { lines, lineIndex, lineStart } = getLineInfo(text, cursor);
    setCursorPosition(element, lineStart);
    return true;
  };

  const moveToLineEnd = (element) => {
    const cursor = getCursorPosition(element);
    const text = getText(element);
    const { lines, lineIndex, lineStart } = getLineInfo(text, cursor);
    setCursorPosition(element, lineStart + lines[lineIndex].length);
    return true;
  };
  */

  // Attach to global scope for content.js to use
  window.VimMotions = {
    isEditable,
    getText,
    getCursorPosition,
    setCursorPosition,
    getLineInfo,
    moveLeft,
    moveRight,
    moveUp,
    moveDown,
    moveWordForward,
    moveWordBackward,
    deleteText,
    deleteWord,
    changeWord
  };

  console.log("[Vim-Extension] VimMotions loaded and ready");

})(); 