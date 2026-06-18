/**
 * Chapter Select Page - 챕터 선택 화면 관리
 * iOS Safari 완벽 호환 버전
 */

window.ChapterSelectPage = {
  currentIndex: 0,
  ticketsContainer: null,
  tickets: null,
  observer: null,
  isNavigating: false,
  navigationTimeout: null,
  
  /**
   * 초기화
   */
  init() {
    console.log('ChapterSelectPage initialized');
    this.bindEvents();
    this.initCarousel();
  },
  
  /**
   * 정리
   */
  cleanup() {
    console.log('ChapterSelectPage cleanup');
    
    // IntersectionObserver 정리
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    // 타임아웃 정리
    if (this.navigationTimeout) {
      clearTimeout(this.navigationTimeout);
      this.navigationTimeout = null;
    }
    
    // 참조 초기화
    this.currentIndex = 0;
    this.ticketsContainer = null;
    this.tickets = null;
    this.isNavigating = false;
  },
  
  /**
   * 이벤트 리스너 바인딩
   */
  bindEvents() {
    // Back 버튼
    const backBtn = document.getElementById('btnBackToIntro');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (window.SoundManager) {
          window.SoundManager.playClickSound();
        }
        if (window.PageManager) {
          window.PageManager.navigateTo('intro');
        }
      });
    }
    
    // 챕터 선택 버튼들
    document.querySelectorAll('#page-chapter-select .ticket').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (window.SoundManager) {
          window.SoundManager.playClickSound();
        }
        
        // 모바일/태블릿에서 클릭 애니메이션 추가
        if (window.innerWidth <= 1024) {
          btn.classList.add('clicked');
          setTimeout(() => {
            btn.classList.remove('clicked');
          }, 400);
        }
        
        const chapter = btn.getAttribute('data-ch');
        if (window.PageManager) {
          window.PageManager.navigateTo('dialogue', { chapter });
        }
      });
    });
  },
  
  /**
   * 캐러셀 초기화 (모바일/태블릿) - 완전히 새로운 접근
   */
  initCarousel() {
    if (window.innerWidth > 1024) return; // PC는 캐러셀 불필요
    
    this.ticketsContainer = document.querySelector('#page-chapter-select .tickets');
    this.tickets = document.querySelectorAll('#page-chapter-select .ticket');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (!this.ticketsContainer || this.tickets.length === 0) return;
    
    // 각 티켓에 인덱스 데이터 속성 추가
    this.tickets.forEach((ticket, index) => {
      ticket.setAttribute('data-ticket-index', index);
    });
    
    // 초기 상태 설정
    this.currentIndex = 0;
    this.isNavigating = false;
    
    /**
     * 중앙 티켓 활성화 업데이트
     */
    const updateActiveTicket = () => {
      this.tickets.forEach((ticket, index) => {
        if (index === this.currentIndex) {
          ticket.classList.add('active');
        } else {
          ticket.classList.remove('active');
        }
      });
      
      // 버튼 상태 업데이트
      if (prevBtn) {
        prevBtn.style.opacity = this.currentIndex === 0 ? '0.3' : '1';
        prevBtn.style.pointerEvents = this.currentIndex === 0 ? 'none' : 'auto';
      }
      if (nextBtn) {
        nextBtn.style.opacity = this.currentIndex === this.tickets.length - 1 ? '0.3' : '1';
        nextBtn.style.pointerEvents = this.currentIndex === this.tickets.length - 1 ? 'none' : 'auto';
      }
    };
    
    /**
     * 특정 인덱스 티켓으로 스크롤
     */
    const scrollToIndex = (index) => {
      if (index < 0 || index >= this.tickets.length) return;
      if (this.isNavigating) return; // 이동 중에는 무시
      
      this.isNavigating = true;
      this.currentIndex = index;
      
      const ticket = this.tickets[index];
      
      // iOS Safari에서 더 안정적인 scrollIntoView 사용
      ticket.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
      
      updateActiveTicket();
      
      // 네비게이션 완료 후 플래그 해제
      clearTimeout(this.navigationTimeout);
      this.navigationTimeout = setTimeout(() => {
        this.isNavigating = false;
      }, 600); // 스크롤 애니메이션 완료 대기
    };
    
    /**
     * IntersectionObserver로 중앙 티켓 감지 (가장 정확함)
     */
    const observerOptions = {
      root: this.ticketsContainer,
      threshold: [0.5, 0.6, 0.7, 0.8, 0.9, 1.0], // 여러 임계값으로 정확도 향상
      rootMargin: '0px'
    };
    
    // 각 티켓의 가시성 비율 추적
    const visibilityMap = new Map();
    
    this.observer = new IntersectionObserver((entries) => {
      // 네비게이션 중에는 Observer 무시
      if (this.isNavigating) return;
      
      entries.forEach(entry => {
        const index = parseInt(entry.target.getAttribute('data-ticket-index'));
        visibilityMap.set(index, entry.intersectionRatio);
      });
      
      // 가장 많이 보이는 티켓 찾기
      let maxRatio = 0;
      let maxIndex = this.currentIndex;
      
      visibilityMap.forEach((ratio, index) => {
        if (ratio > maxRatio) {
          maxRatio = ratio;
          maxIndex = index;
        }
      });
      
      // 현재 인덱스와 다르면 업데이트
      if (maxIndex !== this.currentIndex && maxRatio > 0.5) {
        this.currentIndex = maxIndex;
        updateActiveTicket();
      }
    }, observerOptions);
    
    // 모든 티켓 관찰 시작
    this.tickets.forEach(ticket => {
      this.observer.observe(ticket);
    });
    
    /**
     * 화살표 버튼 이벤트
     */
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (window.SoundManager) {
          window.SoundManager.playClickSound();
        }
        if (!this.isNavigating && this.currentIndex > 0) {
          scrollToIndex(this.currentIndex - 1);
        }
      });
    }
    
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (window.SoundManager) {
          window.SoundManager.playClickSound();
        }
        if (!this.isNavigating && this.currentIndex < this.tickets.length - 1) {
          scrollToIndex(this.currentIndex + 1);
        }
      });
    }
    
    /**
     * 초기화 - 첫 번째 티켓으로 스크롤
     */
    setTimeout(() => {
      scrollToIndex(0);
    }, 100);
    
    // 이미지 로드 완료 후 재정렬
    if (document.readyState === 'complete') {
      setTimeout(() => scrollToIndex(0), 150);
    } else {
      window.addEventListener('load', () => {
        setTimeout(() => scrollToIndex(0), 150);
      }, { once: true });
    }
  }
};
