const STREAM_SELECTOR = 'video[data-stream-video="true"]';
const LQIP_SELECTOR = '[data-lqip="true"]';
const LQIP_OVERLAY_SELECTOR = '[data-lqip-overlay="true"]';
const LQIP_READY_CLASS = 'lqip-ready';
const LQIP_BLUR_CLASS = 'lqip-blur';

let hlsModulePromise = null;

function parseNumber(value) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : null;
}

function attachPreviewLoop(video) {
  if (!video || video.dataset.previewInit === 'true') {
    return;
  }

  const duration = parseNumber(video.dataset.previewDuration);
  if (!duration || duration <= 0) {
    return;
  }

  let start = parseNumber(video.dataset.previewStart);
  const loop = video.dataset.previewLoop !== 'false';
  let intervalId = null;

  if (video.loop) {
    video.loop = false;
    video.removeAttribute('loop');
  }

  const getWindow = () => {
    const hasDuration = Number.isFinite(video.duration) && video.duration > 0;
    const windowDuration = hasDuration ? Math.min(duration, video.duration) : duration;
    let windowStart = start;

    if (windowStart === null) {
      if (hasDuration) {
        const remaining = Math.max(0, video.duration - windowDuration);
        windowStart = remaining / 2;
      } else {
        windowStart = 0;
      }
    }

    const maxStart = hasDuration ? Math.max(0, video.duration - windowDuration) : windowStart;
    const safeStart = Math.max(0, Math.min(windowStart, maxStart));

    return {
      start: safeStart,
      end: safeStart + windowDuration,
    };
  };

  const jumpToStart = () => {
    const window = getWindow();
    if (Number.isFinite(window.start)) {
      video.currentTime = window.start;
    }
  };

  const enforceWindow = () => {
    if (!Number.isFinite(video.currentTime)) {
      return;
    }

    const window = getWindow();
    if (video.currentTime < window.start || video.currentTime >= window.end) {
      if (loop) {
        jumpToStart();
        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {});
        }
      } else {
        video.pause();
      }
    }
  };

  const onLoaded = () => {
    if (start === null) {
      start = getWindow().start;
    }
    jumpToStart();
    enforceWindow();
  };

  const onPlay = () => {
    if (intervalId) {
      return;
    }
    intervalId = window.setInterval(enforceWindow, 250);
  };

  const onPause = () => {
    if (intervalId) {
      window.clearInterval(intervalId);
      intervalId = null;
    }
  };

  video.dataset.previewInit = 'true';
  video.addEventListener('loadedmetadata', onLoaded);
  video.addEventListener('timeupdate', enforceWindow);
  video.addEventListener('seeked', enforceWindow);
  video.addEventListener('play', onPlay);
  video.addEventListener('pause', onPause);
}

function markLqipReady(element) {
  element.classList.remove(LQIP_BLUR_CLASS);
  element.classList.add(LQIP_READY_CLASS);
}

function getLqipOverlay(video) {
  if (!video) {
    return null;
  }

  const wrapper = video.closest('.stream-video-wrap');
  if (!wrapper) {
    return null;
  }

  return wrapper.querySelector(LQIP_OVERLAY_SELECTOR);
}

async function loadHlsClass() {
  if (!hlsModulePromise) {
    hlsModulePromise = import(/* webpackChunkName: "hls" */ 'hls.js')
      .then((module) => module.default || module)
      .catch((error) => {
        console.warn('Failed to load hls.js', error);
        return null;
      });
  }

  return hlsModulePromise;
}

async function ensureHls(video) {
  if (!video || video.dataset.hlsInit === 'true') {
    return true;
  }

  const src = video.dataset.hlsSrc;
  if (!src) {
    return false;
  }

  if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = src;
    video.dataset.hlsInit = 'true';
    return true;
  }

  const Hls = await loadHlsClass();
  if (Hls && Hls.isSupported()) {
    const hls = new Hls();
    hls.loadSource(src);
    hls.attachMedia(video);
    video.dataset.hlsInit = 'true';
    video._hls = hls;
    return true;
  }

  console.warn('HLS is not supported in this browser for', video);
  return false;
}

async function activateVideo(video) {
  const hlsAttached = await ensureHls(video);
  const hasSource = hlsAttached || Boolean(video.querySelector('source[src]'));
  const lqipOverlay = getLqipOverlay(video);
  const isAutoplay = video.dataset.autoplay === 'true';

  attachPreviewLoop(video);

  if (lqipOverlay) {
    let fallbackTimer = null;
    let isRevealed = false;

    const revealLqip = () => {
      if (isRevealed) {
        return;
      }
      isRevealed = true;
      clearFallback();
      markLqipReady(lqipOverlay);
    };

    const scheduleFallback = (delay = 1200) => {
      if (fallbackTimer) {
        return;
      }
      fallbackTimer = window.setTimeout(() => {
        revealLqip();
      }, delay);
    };

    const clearFallback = () => {
      if (fallbackTimer) {
        window.clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
    };

    if (!hasSource) {
      revealLqip();
    } else if (isAutoplay) {
      const revealOnPlaying = () => {
        if (typeof video.requestVideoFrameCallback === 'function') {
          video.requestVideoFrameCallback(() => revealLqip());
          return;
        }
        revealLqip();
      };

      const revealOnReady = () => {
        if (video.readyState >= 2) {
          revealOnPlaying();
        }
      };

      if (video.readyState >= 2) {
        revealOnPlaying();
      } else {
        video.addEventListener('loadedmetadata', revealOnReady, { once: true });
        video.addEventListener('loadeddata', revealOnReady, { once: true });
        video.addEventListener('canplay', revealOnReady, { once: true });
        video.addEventListener('canplaythrough', revealOnReady, { once: true });
        video.addEventListener('playing', revealOnPlaying, { once: true });
        video.addEventListener('timeupdate', revealOnPlaying, { once: true });
        scheduleFallback(3000);
      }
    } else if (video.readyState >= 2) {
      revealLqip();
    } else {
      video.addEventListener('loadeddata', revealLqip, { once: true });
      video.addEventListener('canplay', revealLqip, { once: true });
      window.setTimeout(revealLqip, 600);
      scheduleFallback();
    }
  }

  if (isAutoplay && hasSource) {
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {});
    }
  }
}

function shouldAutoManagePlayback(video) {
  if (!video || video.dataset.pauseOffscreen === 'false') {
    return false;
  }

  return video.dataset.autoplay === 'true' || parseNumber(video.dataset.previewDuration) !== null;
}

function playManagedVideo(video) {
  if (!shouldAutoManagePlayback(video) || !video.paused) {
    return;
  }

  const playPromise = video.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(() => {});
  }
}

function pauseManagedVideo(video) {
  if (!shouldAutoManagePlayback(video) || video.paused) {
    return;
  }

  video.pause();
}

function isInViewport(element, margin = 200) {
  const rect = element.getBoundingClientRect();
  const viewHeight = window.innerHeight || document.documentElement.clientHeight;
  return rect.bottom >= -margin && rect.top <= viewHeight + margin;
}

async function activateElement(element) {
  if (element.tagName === 'VIDEO') {
    await activateVideo(element);
    return;
  }

  markLqipReady(element);
}

export function initStreamingVideo(container = document) {
  if (window.__streamingVideoCleanup) {
    window.__streamingVideoCleanup();
  }

  const root = container && typeof container.querySelectorAll === 'function' ? container : document;
  const streamVideos = Array.from(root.querySelectorAll(STREAM_SELECTOR));
  const lqipElements = Array.from(root.querySelectorAll(LQIP_SELECTOR)).filter((element) => element.tagName !== 'VIDEO');
  const observedElements = [...streamVideos, ...lqipElements];

  if (!observedElements.length) {
    return;
  }

  if (typeof IntersectionObserver === 'undefined') {
    observedElements.forEach((element) => {
      void activateElement(element);
    });
    streamVideos.forEach((video) => playManagedVideo(video));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const element = entry.target;

      if (element.tagName === 'VIDEO') {
        const video = element;
        if (entry.isIntersecting) {
          if (video.dataset.streamInit !== 'true') {
            video.dataset.streamInit = 'true';
            void activateVideo(video);
          } else {
            playManagedVideo(video);
          }
        } else {
          pauseManagedVideo(video);
        }
        return;
      }

      if (!entry.isIntersecting) {
        return;
      }

      observer.unobserve(element);
      void activateElement(element);
    });
  }, {
    rootMargin: '300px 0px 300px 0px',
    threshold: 0.01,
  });

  observedElements.forEach((element) => {
    if (element.dataset.lqipInit === 'true') {
      return;
    }
    element.dataset.lqipInit = 'true';
    observer.observe(element);
  });

  const onVisibilityChange = () => {
    if (document.hidden) {
      streamVideos.forEach((video) => pauseManagedVideo(video));
      return;
    }

    streamVideos.forEach((video) => {
      if (isInViewport(video, 300)) {
        playManagedVideo(video);
      }
    });
  };

  document.addEventListener('visibilitychange', onVisibilityChange);

  window.__streamingVideoCleanup = () => {
    observer.disconnect();
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
}
