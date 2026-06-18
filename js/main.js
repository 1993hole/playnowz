/**
 * Main.js - SPA 페이지 전환 및 관리
 */

const PageManager = {
  currentPage: 'intro',
  transitionDuration: 300, // 화이트 디졸브 시간 (ms)
  
  /**
   * 페이지 전환
   * @param {string} pageId - 전환할 페이지 ID (intro, chapter-select, dialogue, ending)
   * @param {object} params - 추가 파라미터 (예: chapter 번호, ending ID)
   */
  async navigateTo(pageId, params = {}) {
    console.log(`Navigating to: ${pageId}`, params);
    
    const fromPage = this.currentPage;
    
    // BGM 제어 - 페이지 떠나기 전
    await this.handleBgmBeforeLeaving(fromPage, pageId);
    
    // 화이트 디졸브 시작
    this.showTransition();
    
    await new Promise(resolve => setTimeout(resolve, this.transitionDuration));
    
    // 이전 페이지 정리
    this.cleanupPage(this.currentPage);
    
    // 모든 페이지 숨기기
    document.querySelectorAll('.page').forEach(page => {
      page.style.display = 'none';
    });
    
    // 새 페이지 표시
    const newPage = document.getElementById(`page-${pageId}`);
    if (newPage) {
      newPage.style.display = 'block';
      this.currentPage = pageId;
      
      // URL 업데이트 (히스토리 관리)
      const url = new URL(window.location);
      url.searchParams.set('page', pageId);
      
      // params 추가
      if (params.chapter) {
        url.searchParams.set('chapter', params.chapter);
      }
      if (params.ending) {
        url.searchParams.set('ending', params.ending);
      }
      
      window.history.pushState({ page: pageId, params }, '', url);
      
      // 새 페이지 초기화 (async)
      await this.initPage(pageId, params);
      
      // BGM 제어 - 새 페이지 진입 후
      await this.handleBgmAfterEntering(fromPage, pageId);
    }
    
    // 화이트 디졸브 종료
    await new Promise(resolve => setTimeout(resolve, 50));
    this.hideTransition();
  },
  
  /**
   * BGM 제어 - 페이지 떠나기 전
   * @param {string} fromPage - 떠나는 페이지
   * @param {string} toPage - 도착 페이지
   */
  async handleBgmBeforeLeaving(fromPage, toPage) {
    if (!window.SoundManager) return;
    
    // chapter-select나 intro에서 dialogue로 갈 때: 페이드 아웃
    if ((fromPage === 'intro' || fromPage === 'chapter-select') && toPage === 'dialogue') {
      await window.SoundManager.pauseMenuBgm(true); // fade=true
    }
    // chapter-select나 intro에서 ending으로 갈 때: 페이드 아웃
    else if ((fromPage === 'intro' || fromPage === 'chapter-select') && toPage === 'ending') {
      await window.SoundManager.pauseMenuBgm(true); // fade=true
    }
  },
  
  /**
   * BGM 제어 - 새 페이지 진입 후
   * @param {string} fromPage - 이전 페이지
   * @param {string} toPage - 현재 페이지
   */
  async handleBgmAfterEntering(fromPage, toPage) {
    if (!window.SoundManager) return;
    
    // dialogue에서 intro나 chapter-select로 돌아올 때: 페이드 인
    if (fromPage === 'dialogue' && (toPage === 'intro' || toPage === 'chapter-select')) {
      await window.SoundManager.playMenuBgm(true); // fade=true
    }
    // ending에서 intro나 chapter-select로 돌아올 때: 페이드 인
    else if (fromPage === 'ending' && (toPage === 'intro' || toPage === 'chapter-select')) {
      await window.SoundManager.playMenuBgm(true); // fade=true
    }
    // intro나 chapter-select 간 이동: 페이드 없이 계속 재생 (이미 재생 중)
    else if ((fromPage === 'intro' && toPage === 'chapter-select') || 
             (fromPage === 'chapter-select' && toPage === 'intro')) {
      // BGM이 이미 재생 중이므로 아무것도 하지 않음
    }
  },
  
  /**
   * 화이트 디졸브 표시
   */
  showTransition() {
    const overlay = document.getElementById('transitionOverlay');
    if (overlay) {
      overlay.classList.add('active');
    }
  },
  
  /**
   * 화이트 디졸브 숨김
   */
  hideTransition() {
    const overlay = document.getElementById('transitionOverlay');
    if (overlay) {
      overlay.classList.remove('active');
    }
  },
  
  /**
   * 페이지 초기화
   * @param {string} pageId - 초기화할 페이지 ID
   * @param {object} params - 추가 파라미터
   */
  async initPage(pageId, params = {}) {
    console.log(`Initializing page: ${pageId}`, params);
    
    switch(pageId) {
      case 'intro':
        if (window.IntroPage) {
          window.IntroPage.init();
        }
        break;
        
      case 'chapter-select':
        if (window.ChapterSelectPage) {
          window.ChapterSelectPage.init();
        }
        break;
        
      case 'dialogue':
        if (window.DialoguePage) {
          const chapter = params.chapter || 1;
          window.DialoguePage.init(chapter);
        }
        break;
        
      case 'ending':
        if (window.EndingPage) {
          const endingId = params.ending || 'ending1';
          console.log('Calling EndingPage.init with:', endingId);
          await window.EndingPage.init(endingId);
        }
        break;
    }
    
    // 사운드 아이콘 업데이트
    if (window.SoundManager) {
      window.SoundManager.updateAllIcons();
      window.SoundManager.applyToAllAudio();
    }
  },
  
  /**
   * 페이지 정리
   * @param {string} pageId - 정리할 페이지 ID
   */
  cleanupPage(pageId) {
    console.log(`Cleaning up page: ${pageId}`);
    
    switch(pageId) {
      case 'intro':
        if (window.IntroPage) {
          window.IntroPage.cleanup();
        }
        break;
        
      case 'chapter-select':
        if (window.ChapterSelectPage) {
          window.ChapterSelectPage.cleanup();
        }
        break;
        
      case 'dialogue':
        if (window.DialoguePage) {
          window.DialoguePage.cleanup();
        }
        break;
        
      case 'ending':
        if (window.EndingPage) {
          window.EndingPage.cleanup();
        }
        break;
    }
  }
};

// 뒤로가기/앞으로가기 처리
window.addEventListener('popstate', async (e) => {
  const state = e.state;
  if (state && state.page) {
    const fromPage = PageManager.currentPage;
    const toPage = state.page;
    
    // BGM 제어 - 뒤로가기/앞으로가기 시
    await PageManager.handleBgmBeforeLeaving(fromPage, toPage);
    
    // 전환 애니메이션 없이 페이지 변경 (히스토리 이동이므로)
    PageManager.cleanupPage(PageManager.currentPage);
    
    document.querySelectorAll('.page').forEach(page => {
      page.style.display = 'none';
    });
    
    const page = document.getElementById(`page-${state.page}`);
    if (page) {
      page.style.display = 'block';
      PageManager.currentPage = state.page;
      await PageManager.initPage(state.page, state.params || {});
      
      // BGM 제어
      await PageManager.handleBgmAfterEntering(fromPage, toPage);
    }
  } else {
    // state가 없으면 intro로
    await PageManager.navigateTo('intro');
  }
});

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', async () => {
  console.log('PageManager initializing...');
  console.log('Current URL:', window.location.href);
  
  // URL 파라미터 확인
  const params = new URLSearchParams(window.location.search);
  const page = params.get('page') || 'intro';
  const chapter = params.get('chapter');
  const ending = params.get('ending');
  
  console.log('URL Parameters:', { page, chapter, ending });
  
  const pageParams = {};
  if (chapter) pageParams.chapter = chapter;
  if (ending) pageParams.ending = ending;
  
  // 초기 페이지 표시 (전환 애니메이션 없이)
  document.querySelectorAll('.page').forEach(p => {
    p.style.display = 'none';
  });
  
  const initialPage = document.getElementById(`page-${page}`);
  console.log('Target page element:', initialPage ? `#page-${page} found` : `#page-${page} NOT FOUND`);
  
  if (initialPage) {
    initialPage.style.display = 'block';
    PageManager.currentPage = page;
    console.log('Initializing page:', page, 'with params:', pageParams);
    await PageManager.initPage(page, pageParams);
    
    // 초기 페이지 BGM 시작 (페이드 없이)
    // 브라우저가 차단하면 실패하고, intro 클릭 시 재생됨 (fallback)
    if (page === 'intro' || page === 'chapter-select') {
      await window.SoundManager.playMenuBgm(false); // fade=false
    }
    
    console.log('Page initialized successfully');
  } else {
    console.error('Page element not found:', `page-${page}`);
  }
});

// 전역으로 노출
window.PageManager = PageManager;
