/**
 * Sound Manager - 전역 사운드 관리 시스템
 * 모든 페이지의 사운드 on/off를 관리
 */

const SoundManager = {
  isSoundOn: true,
  clickSoundPool: [], // Audio Pool (딜레이 제거)
  clickSoundPoolSize: 5, // 동시 재생 가능 개수
  clickSoundIndex: 0, // 현재 사용할 인덱스
  lastClickTime: 0, // 마지막 클릭 시간 (모바일 중복 방지)
  clickDebounceDelay: 50, // 디바운스 딜레이 (ms)
  
  // 메뉴 BGM (intro, chapter-select에서 공유)
  menuBgm: null,
  menuBgmPath: './assets/audio/bgm/main_bgm.mp3',
  menuBgmStarted: false, // BGM 재생 성공 여부
  
  // 인트로 클릭 보이스 (Pool 시스템으로 변경 - 딜레이 제거)
  introVoicePool: [],
  introVoicePoolSize: 3,
  introVoiceIndex: 0,
  introVoicePath: './assets/audio/voice/0_voice_playnowz.mp3',
  lastIntroVoiceTime: 0, // 마지막 인트로 보이스 재생 시간 (중복 방지)
  introVoiceDebounceDelay: 300, // 인트로 보이스 디바운스 딜레이 (ms)
  
  // 페이드 관련
  fadeIntervalId: null,
  targetVolume: 0.4, // BGM 기본 볼륨
  fadeDuration: 1000, // 페이드 시간 (ms)
  
  /**
   * 초기화
   */
  init() {
    // localStorage에서 설정 로드
    this.isSoundOn = localStorage.getItem('soundOn') !== 'false';
    
    // 클릭 사운드 Pool 생성 (모바일 딜레이 제거!)
    this.initClickSoundPool('./assets/audio/sfx/01_ui-button-click.mp3');
    
    // 메뉴 BGM 초기화
    this.initMenuBgm();
    
    // 인트로 보이스 Pool 초기화
    this.initIntroVoicePool();
    
    // 초기 아이콘 상태 업데이트
    this.updateAllIcons();
    
    // 이벤트 리스너 바인딩
    this.bindEvents();
    
    console.log('SoundManager initialized, sound:', this.isSoundOn ? 'ON' : 'OFF');
  },
  
  /**
   * 메뉴 BGM 초기화
   */
  initMenuBgm() {
    this.menuBgm = new Audio(this.menuBgmPath);
    this.menuBgm.loop = true; // 반복 재생
    this.menuBgm.volume = this.targetVolume; // 볼륨 조절 (0.0 ~ 1.0)
    this.menuBgm.preload = 'auto';
    this.menuBgm.muted = !this.isSoundOn;
    console.log('Menu BGM initialized');
  },
  
  /**
   * 인트로 보이스 Pool 초기화 (딜레이 없는 재생)
   */
  initIntroVoicePool() {
    for (let i = 0; i < this.introVoicePoolSize; i++) {
      const audio = new Audio(this.introVoicePath);
      audio.preload = 'auto'; // 즉시 로드
      audio.volume = 0.7; // 볼륨 조절 (0.0 ~ 1.0)
      audio.muted = !this.isSoundOn; // 초기 mute 설정
      this.introVoicePool.push(audio);
    }
    console.log(`Intro voice pool created (${this.introVoicePoolSize} instances)`);
  },
  
  /**
   * 페이드 인/아웃 공통 함수
   * @param {Audio} audio - 오디오 객체
   * @param {number} targetVolume - 목표 볼륨 (0.0 ~ 1.0)
   * @param {number} duration - 페이드 시간 (ms)
   */
  fadeVolume(audio, targetVolume, duration) {
    if (!audio) return Promise.resolve();
    
    return new Promise((resolve) => {
      // 기존 페이드 중단
      if (this.fadeIntervalId) {
        clearInterval(this.fadeIntervalId);
        this.fadeIntervalId = null;
      }
      
      const startVolume = audio.volume;
      const volumeChange = targetVolume - startVolume;
      const steps = 50; // 페이드 단계 수
      const stepTime = duration / steps;
      const stepVolume = volumeChange / steps;
      
      let currentStep = 0;
      
      this.fadeIntervalId = setInterval(() => {
        currentStep++;
        
        if (currentStep >= steps) {
          audio.volume = targetVolume;
          clearInterval(this.fadeIntervalId);
          this.fadeIntervalId = null;
          resolve();
        } else {
          audio.volume = startVolume + (stepVolume * currentStep);
        }
      }, stepTime);
    });
  },
  
  /**
   * 메뉴 BGM 재생
   * @param {boolean} fade - 페이드 인 효과 사용 여부 (기본: false)
   */
  async playMenuBgm(fade = false) {
    if (!this.menuBgm) return;
    
    if (fade) {
      // 페이드 인: 볼륨을 0으로 설정하고 재생 시작
      this.menuBgm.volume = 0;
      
      try {
        await this.menuBgm.play();
        this.menuBgmStarted = true;
        console.log('Menu BGM playing with fade in');
        
        // 페이드 인
        await this.fadeVolume(this.menuBgm, this.targetVolume, this.fadeDuration);
      } catch (e) {
        this.menuBgmStarted = false;
        console.log('Menu BGM play failed (browser autoplay policy):', e.message);
      }
    } else {
      // 페이드 없이 바로 재생
      this.menuBgm.volume = this.targetVolume;
      
      try {
        await this.menuBgm.play();
        this.menuBgmStarted = true;
        console.log('Menu BGM playing (no fade)');
      } catch (e) {
        this.menuBgmStarted = false;
        console.log('Menu BGM play failed (browser autoplay policy):', e.message);
      }
    }
  },
  
  /**
   * 메뉴 BGM 일시정지
   * @param {boolean} fade - 페이드 아웃 효과 사용 여부 (기본: false)
   */
  async pauseMenuBgm(fade = false) {
    if (!this.menuBgm) return;
    
    if (fade) {
      // 페이드 아웃
      await this.fadeVolume(this.menuBgm, 0, this.fadeDuration);
      this.menuBgm.pause();
      console.log('Menu BGM paused with fade out');
    } else {
      // 페이드 없이 바로 일시정지
      this.menuBgm.pause();
      console.log('Menu BGM paused (no fade)');
    }
  },
  
  /**
   * 메뉴 BGM 정지 (처음으로 되돌림)
   */
  stopMenuBgm() {
    if (!this.menuBgm) return;
    
    // 페이드 중단
    if (this.fadeIntervalId) {
      clearInterval(this.fadeIntervalId);
      this.fadeIntervalId = null;
    }
    
    this.menuBgm.pause();
    this.menuBgm.currentTime = 0;
    this.menuBgm.volume = this.targetVolume;
    console.log('Menu BGM stopped');
  },
  
  /**
   * 인트로 보이스 재생 (Audio Pool 사용 - 딜레이 없음!)
   * 모바일 중복 방지를 위한 디바운싱 추가
   */
  playIntroVoice() {
    if (!this.isSoundOn || this.introVoicePool.length === 0) return;
    
    // 디바운싱: 마지막 재생 후 일정 시간 이내면 무시 (모바일 중복 방지)
    const now = Date.now();
    if (now - this.lastIntroVoiceTime < this.introVoiceDebounceDelay) {
      console.log('Intro voice debounced (too fast)');
      return; // 너무 빠른 연속 재생 무시
    }
    this.lastIntroVoiceTime = now;
    
    // Round-robin 방식으로 사용 가능한 Audio 객체 선택
    const audio = this.introVoicePool[this.introVoiceIndex];
    this.introVoiceIndex = (this.introVoiceIndex + 1) % this.introVoicePoolSize;
    
    // 재생 중이어도 처음부터 재생 (딜레이 0ms!)
    audio.currentTime = 0;
    audio.play()
      .then(() => console.log('Intro voice playing'))
      .catch(e => console.log('Intro voice play failed:', e));
  },
  
  /**
   * 클릭 사운드 Pool 초기화 (딜레이 없는 재생)
   */
  initClickSoundPool(soundPath) {
    for (let i = 0; i < this.clickSoundPoolSize; i++) {
      const audio = new Audio(soundPath);
      audio.preload = 'auto'; // 즉시 로드
      audio.volume = 0.3; // 볼륨 조절 (0.0 ~ 1.0)
      audio.muted = !this.isSoundOn; // 초기 mute 설정
      this.clickSoundPool.push(audio);
    }
    console.log(`Click sound pool created (${this.clickSoundPoolSize} instances)`);
  },
  
  /**
   * 이벤트 리스너 바인딩
   */
  bindEvents() {
    // 모든 sound-toggle 버튼에 클릭 이벤트
    document.querySelectorAll('.sound-toggle').forEach(btn => {
      btn.addEventListener('click', () => this.toggle());
    });
  },
  
  /**
   * 사운드 on/off 토글
   */
  toggle() {
    this.isSoundOn = !this.isSoundOn;
    
    // localStorage에 저장
    localStorage.setItem('soundOn', this.isSoundOn);
    
    // OFF → ON 전환 시: BGM이 아직 시작되지 않았으면 시작 시도
    if (this.isSoundOn && !this.menuBgmStarted) {
      const currentPage = window.PageManager ? window.PageManager.currentPage : '';
      if (currentPage === 'intro' || currentPage === 'chapter-select') {
        this.playMenuBgm(false); // 페이드 없이 바로 시작
        console.log('BGM started on sound toggle (OFF → ON)');
      }
    }
    
    // 모든 아이콘 업데이트
    this.updateAllIcons();
    
    // 현재 재생 중인 오디오에 적용
    this.applyToAllAudio();
    
    // 클릭 사운드 Pool도 mute 설정 업데이트
    this.clickSoundPool.forEach(audio => {
      audio.muted = !this.isSoundOn;
    });
    
    // 메뉴 BGM mute 설정 업데이트
    if (this.menuBgm) {
      this.menuBgm.muted = !this.isSoundOn;
    }
    
    // 인트로 보이스 Pool mute 설정 업데이트
    this.introVoicePool.forEach(audio => {
      audio.muted = !this.isSoundOn;
    });
    
    console.log('Sound toggled:', this.isSoundOn ? 'ON' : 'OFF');
  },
  
  /**
   * 모든 sound-toggle 버튼의 아이콘 업데이트
   */
  updateAllIcons() {
    document.querySelectorAll('.sound-toggle').forEach(btn => {
      const onIcon = btn.querySelector('.sound-on');
      const offIcon = btn.querySelector('.sound-off');
      
      if (onIcon && offIcon) {
        onIcon.style.display = this.isSoundOn ? 'block' : 'none';
        offIcon.style.display = this.isSoundOn ? 'none' : 'block';
      }
    });
  },
  
  /**
   * 모든 오디오에 사운드 설정 적용
   */
  applyToAllAudio() {
    // 모든 audio 태그 제어
    document.querySelectorAll('audio').forEach(audio => {
      audio.muted = !this.isSoundOn;
    });
    
    // DialoguePage의 오디오 객체들도 제어
    if (window.DialoguePage) {
      if (window.DialoguePage.bgm) {
        window.DialoguePage.bgm.muted = !this.isSoundOn;
      }
      if (window.DialoguePage.voice) {
        window.DialoguePage.voice.muted = !this.isSoundOn;
      }
      // SFX 배열의 모든 sfx도 제어
      if (window.DialoguePage.sfxs && Array.isArray(window.DialoguePage.sfxs)) {
        window.DialoguePage.sfxs.forEach(sfx => {
          if (sfx) sfx.muted = !this.isSoundOn;
        });
      }
    }
    
    // EndingPage의 오디오 객체들도 제어
    if (window.EndingPage && window.EndingPage.voiceAudio) {
      window.EndingPage.voiceAudio.muted = !this.isSoundOn;
    }
    
    // 메뉴 BGM mute 설정
    if (this.menuBgm) {
      this.menuBgm.muted = !this.isSoundOn;
    }
    
    // 인트로 보이스 Pool mute 설정
    this.introVoicePool.forEach(audio => {
      audio.muted = !this.isSoundOn;
    });
  },
  
  /**
   * 클릭 사운드 재생 (Audio Pool 사용 - 딜레이 없음!)
   * 모바일 터치 이벤트 중복 방지 (디바운싱)
   */
  playClickSound() {
    if (!this.isSoundOn || this.clickSoundPool.length === 0) return;
    
    // 디바운싱: 마지막 클릭 후 일정 시간 이내면 무시 (모바일 중복 방지)
    const now = Date.now();
    if (now - this.lastClickTime < this.clickDebounceDelay) {
      return; // 너무 빠른 연속 클릭 무시
    }
    this.lastClickTime = now;
    
    // Round-robin 방식으로 사용 가능한 Audio 객체 선택
    const audio = this.clickSoundPool[this.clickSoundIndex];
    this.clickSoundIndex = (this.clickSoundIndex + 1) % this.clickSoundPoolSize;
    
    // 재생 중이어도 처음부터 재생 (딜레이 0ms!)
    audio.currentTime = 0;
    audio.play().catch(e => console.log('Click sound play failed:', e));
  },
  
  /**
   * 새로운 오디오 객체 생성 시 사운드 설정 적용
   */
  applyToAudio(audio) {
    if (audio) {
      audio.muted = !this.isSoundOn;
    }
    return audio;
  }
};

// 페이지 로드 시 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    SoundManager.init();
  });
} else {
  SoundManager.init();
}

// 전역으로 노출
window.SoundManager = SoundManager;
