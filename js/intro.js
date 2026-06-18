/**
 * Intro Page - 인트로 화면 관리
 */

window.IntroPage = {
  particlesAnimationId: null,
  canvas: null,
  ctx: null,
  particles: [],
  lastInteractionTime: 0, // 마지막 인터랙션 시간 (중복 방지)
  interactionDebounce: 300, // 인터랙션 디바운스 시간 (ms)
  
  /**
   * 초기화
   */
  init() {
    console.log('IntroPage initialized');
    this.canvas = document.getElementById('particlesCanvas');
    
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
      this.startParticles();
    }
    
    this.bindEvents();
  },
  
  /**
   * 정리
   */
  cleanup() {
    console.log('IntroPage cleanup');
    this.stopParticles();
  },
  
  /**
   * 인트로 클릭 핸들러 (중복 방지)
   */
  handleIntroClick(e) {
    // 디바운싱: 너무 빠른 연속 클릭 방지
    const now = Date.now();
    if (now - this.lastInteractionTime < this.interactionDebounce) {
      console.log('Intro click debounced (too fast)');
      return;
    }
    this.lastInteractionTime = now;
    
    // 기본 동작 방지 및 이벤트 전파 완전 차단 (iOS Safari에서 페이지 전환 시 이벤트가 다음 페이지로 전파되는 것 방지)
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
    
    // Fallback: BGM이 자동재생에 실패했으면 클릭 시 재생 시도
    if (window.SoundManager && !window.SoundManager.menuBgmStarted) {
      window.SoundManager.playMenuBgm(false); // 페이드 없이 바로 시작
      console.log('BGM started on user click (autoplay fallback)');
    }
    
    // 인트로 보이스 재생
    if (window.SoundManager) {
      window.SoundManager.playIntroVoice();
    }
    
    // 챕터 선택 페이지로 이동
    if (window.PageManager) {
      window.PageManager.navigateTo('chapter-select');
    }
  },
  
  /**
   * 이벤트 리스너 바인딩
   */
  bindEvents() {
    // 화면 전체 클릭 이벤트 (intro-screen)
    const introScreen = document.querySelector('#page-intro .intro-screen');
    if (introScreen) {
      // 터치 이벤트 (모바일)
      introScreen.addEventListener('touchend', (e) => {
        this.handleIntroClick(e);
      }, { passive: false });
      
      // 클릭 이벤트 (데스크톱)
      introScreen.addEventListener('click', (e) => {
        this.handleIntroClick(e);
      });
      
      // 커서를 포인터로 변경 (클릭 가능함을 표시)
      introScreen.style.cursor = 'pointer';
    }
    
    // 기존 touchCta 버튼 (중복 방지를 위해 이벤트 버블링 중단)
    const ctaBtn = document.getElementById('touchCta');
    if (ctaBtn) {
      // 터치 이벤트 (모바일)
      ctaBtn.addEventListener('touchend', (e) => {
        e.stopPropagation(); // 버블링 중단 (introScreen 이벤트와 중복 방지)
        this.handleIntroClick(e);
      }, { passive: false });
      
      // 클릭 이벤트 (데스크톱)
      ctaBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // 버블링 중단 (introScreen 이벤트와 중복 방지)
        this.handleIntroClick(e);
      });
    }
    
    // ✨ 로고 클릭 이벤트 (클릭 애니메이션 추가)
    const logo = document.querySelector('#page-intro .logo');
    if (logo) {
      // 로고 페이드인 애니메이션 완료 후 둥둥 떠다니는 애니메이션 시작
      logo.addEventListener('animationend', (e) => {
        // logoFadeInUp 애니메이션이 끝났을 때만 실행
        if (e.animationName === 'logoFadeInUp') {
          logo.classList.add('animation-complete');
          console.log('Logo float animation started');
        }
      }, { once: true });
      
      // 로고 클릭 시 애니메이션 추가
      const handleLogoClick = (e) => {
        e.stopPropagation(); // 버블링 중단
        
        // 클릭 애니메이션 추가
        logo.classList.add('clicking');
        setTimeout(() => {
          logo.classList.remove('clicking');
        }, 400);
        
        // 인트로 클릭 처리
        this.handleIntroClick(e);
      };
      
      // 터치 이벤트 (모바일)
      logo.addEventListener('touchend', handleLogoClick, { passive: false });
      
      // 클릭 이벤트 (데스크톱)
      logo.addEventListener('click', handleLogoClick);
    }
  },
  
  /**
   * 파티클 시스템 시작
   */
  startParticles() {
    if (!this.canvas || !this.ctx) return;
    
    // Canvas 크기 설정
    const resizeCanvas = () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    };
    
    // 파티클 클래스
    class Particle {
      constructor(canvas) {
        this.canvas = canvas;
        this.reset();
        this.y = Math.random() * canvas.height;
        this.opacity = Math.random() * 0.5 + 0.2;
      }
      
      reset() {
        this.x = Math.random() * this.canvas.width;
        this.y = -10;
        this.size = Math.random() * 3 + 0.5;
        this.speedY = Math.random() * 0.5 + 0.3;
        this.speedX = (Math.random() - 0.5) * 0.3;
        this.opacity = Math.random() * 0.5 + 0.2;
        this.wobble = Math.random() * Math.PI * 2;
        this.wobbleSpeed = Math.random() * 0.02 + 0.01;
      }
      
      update() {
        this.y -= this.speedY;
        this.wobble += this.wobbleSpeed;
        this.x += Math.sin(this.wobble) * 0.5 + this.speedX;
        this.opacity += (Math.random() - 0.5) * 0.01;
        this.opacity = Math.max(0.1, Math.min(0.7, this.opacity));
        
        if (this.y < -10 || this.x < -10 || this.x > this.canvas.width + 10) {
          this.reset();
          this.y = this.canvas.height + 10;
        }
      }
      
      draw(ctx) {
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // 파티클 생성
    const createParticles = () => {
      const particleCount = window.innerWidth < 768 ? 30 : 50;
      this.particles = [];
      for (let i = 0; i < particleCount; i++) {
        this.particles.push(new Particle(this.canvas));
      }
    };
    
    // 애니메이션 루프
    const animate = () => {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      this.particles.forEach(particle => {
        particle.update();
        particle.draw(this.ctx);
      });
      
      this.particlesAnimationId = requestAnimationFrame(animate);
    };
    
    // 리사이즈 이벤트
    const handleResize = () => {
      resizeCanvas();
      createParticles();
    };
    
    window.addEventListener('resize', handleResize);
    
    // 시작
    resizeCanvas();
    createParticles();
    animate();
  },
  
  /**
   * 파티클 시스템 정지
   */
  stopParticles() {
    if (this.particlesAnimationId) {
      cancelAnimationFrame(this.particlesAnimationId);
      this.particlesAnimationId = null;
    }
  }
};
