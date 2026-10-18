'use client';

import { useEffect } from 'react';

// Asks before leaving the page while `active`, for work that only lives in the page, such as an
// import queue. The browser asks before a refresh or closing the tab. The App Router has no
// navigation guard, so clicks on links within the app are checked here instead. The browser's
// own Back button can't be stopped this way
export function useLeaveGuard(active: boolean, message: string) {
  useEffect(() => {
    if (!active) {
      return undefined;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Browsers show their own wording, not ours
      event.preventDefault();
      event.returnValue = '';
    };

    // Runs before Next's Link handles the click, since it listens on the whole document
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) {
        return;
      }
      // Opening in a new tab or window leaves this page alone
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const link = (event.target as Element | null)?.closest?.('a[href]');
      if (!(link instanceof HTMLAnchorElement) || link.target === '_blank' || link.download) {
        return;
      }
      const url = new URL(link.href, window.location.href);
      const samePage =
        url.pathname === window.location.pathname && url.search === window.location.search;
      if (url.origin !== window.location.origin || samePage) {
        return;
      }
      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleClick, true);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleClick, true);
    };
  }, [active, message]);
}
