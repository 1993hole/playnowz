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
      // iOS Safari 이미지 long press 컨텍스트 메뉴 방지
      const img = btn.querySelector('img');
      if (img) {
        // 이미지 컨텍스트 메뉴 차단
        img.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          e.stopPropagation();
        });
        
        // 드래그 방지
        img.addEventListener('dragstart', (e) => {
          e.preventDefault();
        });
        
        // 이미지 선택 방지 (iOS Safari의 long press 대응)
        img.style.webkitUserSelect = 'none';
        img.style.userSelect = 'none';
        img.style.webkitTouchCallout = 'none';
        img.style.pointerEvents = 'none'; // 이미지는 클릭 이벤트를 받지 않고 버튼이 받도록
      }
      
      // 버튼의 컨텍스트 메뉴도 차단
      btn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      
      // 클릭 이벤트 (터치와 마우스 모두 처리)
      // 주의: touchstart에서 preventDefault()를 호출하면 click 이벤트가 발생하지 않으므로
      // CSS의 -webkit-touch-callout과 contextmenu 이벤트만으로 충분
      btn.addEventListener('click', (e) => {
        if (window.SoundManager) {
          window.SoundManager.playClickSound();
        }
        
        // 모바일/태블릿에서 클릭 애니메이션 추가
        if (window.innerWidth <= 1024) {
          btn.classList.add('clicked');
          setTimeout(() => {
            btn.classList.remove('clicked');
          }, 250); // 400ms → 250ms로 단축
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
      
      console.log(`Active ticket: ${this.currentIndex + 1}`); // 디버깅용
      
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
      
      // 즉시 active 클래스 업데이트 (클릭 반응성 향상)
      updateActiveTicket();
      
      // iOS Safari에서 더 안정적인 scrollIntoView 사용
      ticket.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
      
      // 네비게이션 완료 후 플래그 해제 (400ms로 단축)
      clearTimeout(this.navigationTimeout);
      this.navigationTimeout = setTimeout(() => {
        this.isNavigating = false;
        // 스크롤 완료 후 한 번 더 active 업데이트 (안정성)
        updateActiveTicket();
      }, 400);
    };
    
    /**
     * IntersectionObserver로 중앙 티켓 감지 (가장 정확함)
     */
    const observerOptions = {
      root: this.ticketsContainer,
      threshold: [0.5, 0.75, 1.0], // 임계값 단순화
      rootMargin: '0px'
    };
    
    // 각 티켓의 가시성 비율 추적
    const visibilityMap = new Map();
    
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const index = parseInt(entry.target.getAttribute('data-ticket-index'));
        visibilityMap.set(index, entry.intersectionRatio);
      });
      
      // 네비게이션 중이 아닐 때만 자동 업데이트 (사용자 스와이프만 감지)
      if (this.isNavigating) return;
      
      // 가장 많이 보이는 티켓 찾기
      let maxRatio = 0;
      let maxIndex = this.currentIndex;
      
      visibilityMap.forEach((ratio, index) => {
        if (ratio > maxRatio) {
          maxRatio = ratio;
          maxIndex = index;
        }
      });
      
      // 현재 인덱스와 다르고 충분히 보이면 업데이트
      if (maxIndex !== this.currentIndex && maxRatio >= 0.5) {
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
    // 즉시 첫 번째 티켓 활성화
    this.currentIndex = 0;
    updateActiveTicket();
    
    // DOM 안정화 후 스크롤
    setTimeout(() => {
      this.tickets[0].scrollIntoView({
        behavior: 'auto', // 초기화는 즉시
        block: 'nearest',
        inline: 'center'
      });
      // 다시 한 번 active 업데이트
      setTimeout(() => {
        updateActiveTicket();
      }, 50);
    }, 100);
    
    // 이미지 로드 완료 후 재정렬
    if (document.readyState === 'complete') {
      setTimeout(() => {
        this.tickets[0].scrollIntoView({
          behavior: 'auto',
          block: 'nearest',
          inline: 'center'
        });
        updateActiveTicket();
      }, 200);
    } else {
      window.addEventListener('load', () => {
        setTimeout(() => {
          this.tickets[0].scrollIntoView({
            behavior: 'auto',
            block: 'nearest',
            inline: 'center'
          });
          updateActiveTicket();
        }, 200);
      }, { once: true });
    }
  }
};
