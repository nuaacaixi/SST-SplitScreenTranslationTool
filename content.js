(function() {
  // ============================================================
  // 主框架逻辑：管理分屏 overlay
  // ============================================================
  if (window.self === window.top) {
    initMainFrame();
    return;
  }

  // ============================================================
  // 子框架逻辑：滚动跟踪与同步
  // ============================================================
  initChildFrame();

  // ============================================================
  // 主框架实现
  // ============================================================
  function initMainFrame() {
    let overlay = null;
    let leftIframe = null;
    let rightIframe = null;
    let isSplitActive = false;
    let syncLock = false;
    let syncTimer = null;

    let prefs = {
      targetLang: 'zh-CN',
      layout: 'horizontal',
      translatedFirst: true,
      splitRatio: 50
    };

    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === 'toggle-split') {
        if (isSplitActive) {
          closeSplitView();
        } else {
          prefs = { ...prefs, ...msg.preferences };
          openSplitView();
        }
      }
    });

    window.addEventListener('message', handleScrollMessage);

    function handleScrollMessage(event) {
      if (event.data.type !== '__tsv_scroll') return;
      if (syncLock) return;

      const sourceWindow = event.source;
      const otherIframe = (sourceWindow === leftIframe?.contentWindow) ? rightIframe : leftIframe;

      if (otherIframe?.contentWindow) {
        syncLock = true;
        otherIframe.contentWindow.postMessage(
          { type: '__tsv_setScroll', pct: event.data.pct },
          '*'
        );
        clearTimeout(syncTimer);
        syncTimer = setTimeout(() => { syncLock = false; }, 150);
      }
    }

    function openSplitView() {
      if (document.contentType && document.contentType !== 'text/html') {
        showToast('This page does not support split view');
        return;
      }

      const currentUrl = window.location.href;
      const translateUrl = 'https://translate.google.com/translate?hl=' +
        prefs.targetLang + '&sl=auto&tl=' + prefs.targetLang +
        '&u=' + encodeURIComponent(currentUrl);

      overlay = document.createElement('div');
      overlay.className = '__tsv-overlay';
      overlay.setAttribute('data-layout', prefs.layout);

      const pane1 = document.createElement('div');
      pane1.className = '__tsv-pane';
      const pane2 = document.createElement('div');
      pane2.className = '__tsv-pane';

      const translatePane = prefs.translatedFirst ? pane1 : pane2;
      const originalPane = prefs.translatedFirst ? pane2 : pane1;

      leftIframe = document.createElement('iframe');
      leftIframe.src = translateUrl;
      leftIframe.id = '__tsv-translate-frame';
      translatePane.appendChild(leftIframe);

      rightIframe = document.createElement('iframe');
      rightIframe.src = currentUrl;
      rightIframe.id = '__tsv-original-frame';
      originalPane.appendChild(rightIframe);

      const divider = createDivider();

      overlay.appendChild(pane1);
      overlay.appendChild(divider);
      overlay.appendChild(pane2);

      document.documentElement.style.overflow = 'hidden';
      document.body.appendChild(overlay);

      updatePaneSizes();

      document.addEventListener('keydown', onKeyDown);
      window.addEventListener('resize', onResize);

      isSplitActive = true;
    }

    function createDivider() {
      const divider = document.createElement('div');
      divider.className = '__tsv-divider';

      const controls = document.createElement('div');
      controls.className = '__tsv-controls';

      // Layout toggle
      const layoutBtn = document.createElement('button');
      layoutBtn.className = '__tsv-btn';
      layoutBtn.innerHTML = '&#8644;';
      layoutBtn.title = 'Toggle layout (horizontal/vertical)';
      layoutBtn.addEventListener('click', toggleLayout);
      controls.appendChild(layoutBtn);

      // Swap panes
      const swapBtn = document.createElement('button');
      swapBtn.className = '__tsv-btn';
      swapBtn.innerHTML = '&#8596;';
      swapBtn.title = 'Swap translation/original position';
      swapBtn.addEventListener('click', swapPanes);
      controls.appendChild(swapBtn);

      // Close
      const closeBtn = document.createElement('button');
      closeBtn.className = '__tsv-btn __tsv-btn-close';
      closeBtn.innerHTML = '&#10005;';
      closeBtn.title = 'Close split view (Esc)';
      closeBtn.addEventListener('click', closeSplitView);
      controls.appendChild(closeBtn);

      divider.appendChild(controls);

      // Drag to resize
      let dragging = false;
      divider.addEventListener('mousedown', (e) => {
        dragging = true;
        e.preventDefault();
      });

      document.addEventListener('mousemove', (e) => {
        if (!dragging || !overlay) return;
        const rect = overlay.getBoundingClientRect();
        let ratio;
        if (prefs.layout === 'horizontal') {
          ratio = ((e.clientX - rect.left) / rect.width) * 100;
        } else {
          ratio = ((e.clientY - rect.top) / rect.height) * 100;
        }
        ratio = Math.max(30, Math.min(70, ratio));
        prefs.splitRatio = Math.round(ratio);
        updatePaneSizes();
      });

      document.addEventListener('mouseup', () => { dragging = false; });

      return divider;
    }

    function updatePaneSizes() {
      if (!overlay) return;
      const panes = overlay.querySelectorAll(':scope > .__tsv-pane');
      if (panes.length !== 2) return;
      panes[0].style.flex = '' + prefs.splitRatio;
      panes[1].style.flex = '' + (100 - prefs.splitRatio);
    }

    function toggleLayout() {
      prefs.layout = prefs.layout === 'horizontal' ? 'vertical' : 'horizontal';
      overlay.setAttribute('data-layout', prefs.layout);
      updatePaneSizes();
    }

    function swapPanes() {
      if (!overlay) return;
      const panes = overlay.querySelectorAll(':scope > .__tsv-pane');
      if (panes.length !== 2) return;
      overlay.insertBefore(panes[1], panes[0]);
      prefs.translatedFirst = !prefs.translatedFirst;
      const tmp = leftIframe;
      leftIframe = rightIframe;
      rightIframe = tmp;
    }

    function closeSplitView() {
      if (overlay) {
        overlay.remove();
        overlay = null;
      }
      leftIframe = null;
      rightIframe = null;
      isSplitActive = false;
      document.documentElement.style.overflow = '';
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') closeSplitView();
    }

    function onResize() {
      updatePaneSizes();
    }

    function showToast(msg) {
      const toast = document.createElement('div');
      toast.textContent = msg;
      toast.style.cssText =
        'position:fixed;top:16px;left:50%;transform:translateX(-50%);' +
        'background:#333;color:#fff;padding:10px 20px;border-radius:6px;' +
        'z-index:2147483647;font-size:14px;pointer-events:none;';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2500);
    }
  }

  // ============================================================
  // 子框架实现
  // ============================================================
  function initChildFrame() {
    let lastPct = -1;
    let scrollTimer = null;
    let setScrollLock = false;

    // 查找当前帧中实际的可滚动元素
    function getScrollable() {
      const winScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (winScroll > 10) {
        return { el: null, maxScroll: winScroll, type: 'window' };
      }
      // 查找内部最大的可滚动元素
      let best = null;
      let bestScroll = 0;
      const candidates = document.querySelectorAll('div, section, main, article, [role="main"]');
      for (const el of candidates) {
        const s = el.scrollHeight - el.clientHeight;
        if (s > bestScroll) {
          bestScroll = s;
          best = el;
        }
      }
      if (best && bestScroll > 10) {
        return { el: best, maxScroll: bestScroll, type: 'element' };
      }
      return null;
    }

    function getScrollPercentage() {
      const s = getScrollable();
      if (!s) return -1;
      if (s.type === 'window') {
        return window.scrollY / s.maxScroll;
      }
      return s.el.scrollTop / s.maxScroll;
    }

    function setScrollPercentage(pct) {
      const s = getScrollable();
      if (!s) {
        // 当前帧不可滚动，转发给子 iframe
        forwardToChildFrames(pct);
        return;
      }
      setScrollLock = true;
      if (s.type === 'window') {
        window.scrollTo({ top: pct * s.maxScroll, behavior: 'instant' });
      } else {
        s.el.scrollTop = pct * s.maxScroll;
      }
      setTimeout(() => { setScrollLock = false; }, 100);
    }

    function forwardToChildFrames(pct) {
      const iframes = document.querySelectorAll('iframe');
      for (const iframe of iframes) {
        try {
          iframe.contentWindow.postMessage({ type: '__tsv_setScroll', pct }, '*');
        } catch (e) { /* ignore */ }
      }
    }

    // 上报滚动
    function reportScroll() {
      if (setScrollLock) return;
      scrollTimer = null;
      const pct = getScrollPercentage();
      if (pct < 0) return;
      if (Math.abs(pct - lastPct) < 0.002) return;
      lastPct = pct;
      window.top.postMessage({ type: '__tsv_scroll', pct }, '*');
    }

    // 监听 window 滚动
    window.addEventListener('scroll', () => {
      if (scrollTimer) return;
      scrollTimer = setTimeout(reportScroll, 50);
    }, { passive: true });

    // 也监听可能存在的内部可滚动元素的滚动
    document.addEventListener('scroll', (e) => {
      const el = e.target;
      if (el === document || el === document.documentElement) return;
      const scrollHeight = el.scrollHeight - el.clientHeight;
      if (scrollHeight <= 10) return;
      if (scrollTimer) return;
      scrollTimer = setTimeout(reportScroll, 50);
    }, { passive: true, capture: true });

    // 接收 setScroll 命令
    window.addEventListener('message', (event) => {
      if (event.data.type !== '__tsv_setScroll') return;
      lastPct = event.data.pct;
      setScrollPercentage(event.data.pct);
    });
  }
})();
