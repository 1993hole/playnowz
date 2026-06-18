/**
 * PLAY NOWZ - Ending Page Manager
 * 엔딩 페이지 데이터 로드 및 UI 업데이트
 */

class EndingManager {
    constructor() {
        this.endingData = null;
        this.currentEndingId = null;
        this.voiceAudio = null; // 음성 오디오 객체
        this.elements = null; // init()에서 초기화
        
        // ✨ 이벤트 핸들러 참조 저장 (제거를 위해)
        this.eventHandlers = {
            voiceBtn: null,
            btnShare: null,
            btnMain: []
        };
    }
    
    /**
     * DOM 요소 초기화 (SPA에서는 페이지가 보일 때 호출해야 함)
     */
    initElements() {
        this.elements = {
            // Section 1: Profile
            individualLayout: document.querySelector('#page-ending .individual-layout'),
            teamLayouts: document.querySelectorAll('#page-ending .team-layout'),
            characterImg: document.querySelector('#page-ending .character-img'),
            signImg: document.querySelector('#page-ending .sign-img'),
            teamImg: document.querySelector('#page-ending .team-img'),
            carouselImgs: {
                team: document.querySelector('#page-ending .carousel-img-team'),
                hyeonbin: document.querySelector('#page-ending .carousel-img-hyeonbin'),
                yoon: document.querySelector('#page-ending .carousel-img-yoon'),
                yeonwoo: document.querySelector('#page-ending .carousel-img-yeonwoo'),
                jinhyuk: document.querySelector('#page-ending .carousel-img-jinhyuk'),
                siyun: document.querySelector('#page-ending .carousel-img-siyun')
            },
            positionBadge: document.querySelector('#page-ending .position-badge'),
            nameKo: document.querySelector('#page-ending .name-ko'),
            nameEn: document.querySelector('#page-ending .name-en'),
            characterDesc: document.querySelector('#page-ending .character-desc'),
            voiceBtn: document.querySelector('#page-ending .voice-btn'),
            statItems: document.querySelectorAll('#page-ending .stat-item'),
            
            // Section 2: Result
            title: document.querySelector('#page-ending #section2 .title'),
            hashtags: document.querySelector('#page-ending .hashtags'),
            description: document.querySelector('#page-ending #section2 .description'),
            btnShare: document.querySelector('#page-ending .btn-share'),
            btnMain: document.querySelectorAll('#page-ending .btn-main')
        };
    }

    /**
     * 초기화 및 엔딩 데이터 로드
     */
    async init(endingId = null) {
        try {
            // ✨ Ending 페이지에서만 body 스크롤 활성화
            document.body.style.overflow = 'auto';

            // endingId가 파라미터로 전달되면 사용, 아니면 URL에서 추출
            if (endingId) {
                this.currentEndingId = endingId;
            } else {
                const urlParams = new URLSearchParams(window.location.search);
                this.currentEndingId = urlParams.get('ending') || 'ending1';
            }
            
            // DOM 요소 초기화 (SPA에서 중요!)
            this.initElements();
            
            // ✨ 기존 이벤트 리스너 제거 (SPA 중복 방지)
            this.removeEventListeners();
            
            // JSON 데이터 로드
            await this.loadEndingData();
            
            // 엔딩 적용
            this.applyEnding(this.currentEndingId);
            
            // 버튼 이벤트 설정
            this.setupEventListeners();
            
            // 페이지 맨 위로 스크롤
            window.scrollTo(0, 0);

            
            console.log(`✅ 엔딩 로드 완료: ${this.currentEndingId}`);
        } catch (error) {
            console.error('❌ 엔딩 로드 실패:', error);
            this.showError();
        }
    }

    /**
     * JSON 데이터 로드
     */
    async loadEndingData() {
        try {
            const response = await fetch('./js/ending-data.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.endingData = data.endings;
        } catch (error) {
            console.error('JSON 로드 실패:', error);
            throw error;
        }
    }

    /**
     * 엔딩 데이터 적용
     */
    applyEnding(endingId) {
        const ending = this.endingData.find(e => e.id === endingId);
        
        if (!ending) {
            console.error(`엔딩을 찾을 수 없습니다: ${endingId}`);
            return;
        }

        // Section 1: 프로필 업데이트
        this.updateSection1(ending.section1);
        
        // Section 2: 결과 업데이트
        this.updateSection2(ending.section2);
    }

    /**
     * Section 1: 캐릭터 프로필 업데이트
     */
    updateSection1(data) {
        // 레이아웃 타입에 따라 표시/숨김
        if (data.type === 'individual') {
            this.showIndividualProfile(data);
        } else if (data.type === 'team') {
            this.showTeamProfile(data);
        }

        // 프로필 정보 업데이트
        this.updateProfileInfo(data);
        
        // 스탯 게이지 업데이트
        this.updateStats(data.stats);
        
        console.log('📊 Section1 데이터:', data);
        console.log('🎤 voiceFile:', data.voiceFile);
        // 음성 로드 및 자동 재생
        if (data.voiceFile) {
            this.loadVoice(data.voiceFile);
            // 자동 재생 시도 (브라우저 정책에 따라 실패할 수 있음)
            setTimeout(() => this.playVoice(), 500);
        } else {
            console.warn('⚠️ voiceFile이 없습니다!');
        }
    }

    /**
     * 개인 프로필 표시
     */
    showIndividualProfile(data) {
        // 개인 레이아웃 표시
        this.elements.individualLayout.style.display = 'block';
        
        // 팀 레이아웃 숨김
        this.elements.teamLayouts.forEach(el => {
            el.style.display = 'none';
        });

        // 캐릭터 이미지 설정
        if (this.elements.characterImg && data.characterImage) {
            this.elements.characterImg.style.backgroundImage = `url('${data.characterImage}')`;
        }

        // 사인 이미지 설정
        if (this.elements.signImg && data.signImage) {
            this.elements.signImg.style.backgroundImage = `url('${data.signImage}')`;
        }

        // 모바일용 head 이미지는 CSS 미디어쿼리에서 자동 처리되도록
        // 동적 스타일 생성 (선택사항)
        if (data.headImage) {
            this.injectMediaQueryStyle(data.headImage);
        }
    }

    /**
     * 팀 프로필 표시
     */
    showTeamProfile(data) {
        // 개인 레이아웃 숨김
        this.elements.individualLayout.style.display = 'none';
        
        // 팀 레이아웃 표시 - show 클래스 추가 (CSS가 PC/모바일 자동 처리)
        this.elements.teamLayouts.forEach(el => {
            el.classList.add('show');
        });

        // PC용 팀 이미지
        if (this.elements.teamImg && data.teamImage) {
            this.elements.teamImg.style.backgroundImage = `url('${data.teamImage}')`;
        }

        // 모바일 캐러셀 이미지 (6개)
        if (data.carouselImages && data.carouselImages.length === 6) {
            const carouselKeys = ['team', 'hyeonbin', 'yoon', 'yeonwoo', 'jinhyuk', 'siyun'];
            carouselKeys.forEach((key, index) => {
                const imgEl = this.elements.carouselImgs[key];
                if (imgEl && data.carouselImages[index]) {
                    imgEl.style.backgroundImage = `url('${data.carouselImages[index]}')`;
                }
            });
        }
    }

    /**
     * 프로필 정보 업데이트 (포지션, 이름, 설명)
     */
    updateProfileInfo(data) {
        if (this.elements.positionBadge) {
            this.elements.positionBadge.textContent = data.position || '포지션';
        }

        if (this.elements.nameKo) {
            this.elements.nameKo.textContent = data.nameKo || '이름';
        }

        if (this.elements.nameEn) {
            this.elements.nameEn.textContent = data.nameEn || 'Name';
        }

        if (this.elements.characterDesc) {
            // \n을 <br>로 변환
            const descriptionHtml = (data.description || '').replace(/\n/g, '<br>');
            this.elements.characterDesc.innerHTML = descriptionHtml;
        }
    }

    /**
     * 스탯 게이지 업데이트
     */
    updateStats(stats) {
        if (!stats || stats.length !== 5) {
            console.warn('스탯 데이터가 올바르지 않습니다');
            return;
        }

        this.elements.statItems.forEach((item, index) => {
            if (index >= stats.length) return;

            const stat = stats[index];
            const labelEl = item.querySelector('.stat-label');
            const valueEl = item.querySelector('.stat-value');
            const gaugeFillEl = item.querySelector('.gauge-fill');

            // 라벨 업데이트
            if (labelEl) {
                labelEl.textContent = stat.label;
            }

            // 값 업데이트
            if (valueEl) {
                valueEl.textContent = `${stat.value}%`;
            }

            // 게이지 퍼센트 업데이트
            if (gaugeFillEl) {
                gaugeFillEl.style.setProperty('--gauge-percent', `${stat.value}%`);
            }
        });
    }

    /**
     * Section 2: 결과 텍스트 업데이트
     */
    updateSection2(data) {
        // 제목
        if (this.elements.title) {
            this.elements.title.textContent = data.title || '결과 제목';
        }

        // 해시태그
        if (this.elements.hashtags && data.hashtags) {
            this.elements.hashtags.innerHTML = data.hashtags
                .map(tag => `<span class="hashtag">${tag}</span>`)
                .join('');
        }

        // 설명 (줄바꿈 처리)
        if (this.elements.description) {
            // \n을 <br>로 변환
            const descriptionHtml = (data.description || '').replace(/\n/g, '<br>');
            this.elements.description.innerHTML = descriptionHtml;
        }
    }

    /**
     * 모바일용 head 이미지 동적 스타일 주입 (선택사항)
     */
    injectMediaQueryStyle(headImageUrl) {
        // 이미 스타일이 주입되어 있으면 제거
        const existingStyle = document.getElementById('dynamic-head-style');
        if (existingStyle) {
            existingStyle.remove();
        }

        // 새 스타일 생성
        const style = document.createElement('style');
        style.id = 'dynamic-head-style';
        style.textContent = `
            @media (max-width: 1024px) {
                .character-img {
                    background-image: url('${headImageUrl}') !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * ✨ 기존 이벤트 리스너 제거 (SPA 중복 방지)
     */
    removeEventListeners() {
        console.log('🧹 Removing old event listeners...');
        
        // Voice 버튼
        if (this.elements?.voiceBtn && this.eventHandlers.voiceBtn) {
            this.elements.voiceBtn.removeEventListener('click', this.eventHandlers.voiceBtn);
            console.log('  ✓ Voice button listener removed');
        }
        
        // 공유하기 버튼
        if (this.elements?.btnShare && this.eventHandlers.btnShare) {
            this.elements.btnShare.removeEventListener('click', this.eventHandlers.btnShare);
            console.log('  ✓ Share button listener removed');
        }
        
        // 메인으로 가기 버튼들
        if (this.elements?.btnMain && this.eventHandlers.btnMain.length > 0) {
            this.elements.btnMain.forEach((btn, index) => {
                if (this.eventHandlers.btnMain[index]) {
                    btn.removeEventListener('click', this.eventHandlers.btnMain[index]);
                }
            });
            console.log(`  ✓ ${this.eventHandlers.btnMain.length} main button listeners removed`);
        }
        
        // 핸들러 배열 초기화
        this.eventHandlers = {
            voiceBtn: null,
            btnShare: null,
            btnMain: []
        };
    }

    /**
     * 버튼 이벤트 설정
     */
    setupEventListeners() {
        console.log('🎯 Setting up event listeners...');
        
        // 프로필 공유하기
        if (this.elements.btnShare) {
            // ✨ 핸들러 함수 저장
            this.eventHandlers.btnShare = () => {
                // ✨ 클릭음 재생
                if (window.SoundManager) {
                    window.SoundManager.playClickSound();
                }
                this.shareProfile();
            };
            this.elements.btnShare.addEventListener('click', this.eventHandlers.btnShare);
            console.log('  ✓ Share button listener added');
        }

        // 메인으로 가기 (여러 개)
        this.elements.btnMain.forEach(btn => {
            // ✨ 핸들러 함수 저장
            const handler = () => {
                // ✨ 클릭음 재생
                if (window.SoundManager) {
                    window.SoundManager.playClickSound();
                }
                this.goToMain();
            };
            this.eventHandlers.btnMain.push(handler);
            btn.addEventListener('click', handler);
        });
        console.log(`  ✓ ${this.elements.btnMain.length} main button listeners added`);

        // Voice 버튼
        if (this.elements.voiceBtn) {
            // ✨ 핸들러 함수 저장 (나중에 제거하기 위해)
            this.eventHandlers.voiceBtn = () => {
                console.log('🔊 Voice button clicked');
                this.playVoice();
            };
            this.elements.voiceBtn.addEventListener('click', this.eventHandlers.voiceBtn);
            console.log('  ✓ Voice button listener added');
        }
    }

    /**
     * 프로필 공유하기
     */
    async shareProfile() {
        // 공유할 텍스트 구성
        const shareText = `코치가 되어 NOWZ와 함께하고 싶다면?\n${window.location.href}`;

        try {
            if (navigator.share) {
                // 네이티브 공유 API 사용 (모바일)
                await navigator.share({
                    title: 'PLAY NOWZ - 나의 엔딩',
                    text: shareText
                });
                console.log('✅ 공유 완료');
            } else {
                // 데스크톱: 클립보드 복사 시도
                const copySuccess = await this.copyToClipboard(shareText);
                
                if (copySuccess) {
                    console.log('✅ 클립보드 복사 완료');
                    this.showToast('링크가 클립보드에 복사되었습니다!');
                } else {
                    throw new Error('클립보드 복사 실패');
                }
            }
        } catch (error) {
            console.error('공유 실패:', error);
            
            // 폴백: 텍스트 선택 안내
            this.showCopyFallback(shareText);
        }
    }

    /**
     * 클립보드 복사 (HTTP/HTTPS 모두 지원)
     */
    async copyToClipboard(text) {
        // 방법 1: 최신 Clipboard API (HTTPS 전용)
        if (navigator.clipboard && window.isSecureContext) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (err) {
                console.warn('Clipboard API 실패, 폴백 사용:', err);
            }
        }

        // 방법 2: execCommand 폴백 (HTTP에서도 작동)
        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.left = '-999999px';
            textarea.style.top = '-999999px';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            
            const successful = document.execCommand('copy');
            document.body.removeChild(textarea);
            
            return successful;
        } catch (err) {
            console.error('execCommand 복사 실패:', err);
            return false;
        }
    }

    /**
     * 복사 실패 시 폴백 UI
     */
    showCopyFallback(text) {
        // 모달 생성
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            font-family: 'Pretendard', sans-serif;
        `;

        modal.innerHTML = `
            <div style="
                background: white;
                padding: 30px;
                border-radius: 12px;
                max-width: 500px;
                width: 90%;
                text-align: center;
            ">
                <h3 style="margin: 0 0 20px 0; color: #333;">링크 복사</h3>
                <textarea readonly style="
                    width: 100%;
                    height: 100px;
                    padding: 12px;
                    border: 2px solid #ddd;
                    border-radius: 8px;
                    font-size: 14px;
                    resize: none;
                    font-family: 'Pretendard', sans-serif;
                    line-height: 1.6;
                ">${text}</textarea>
                <p style="margin: 15px 0; color: #666; font-size: 14px;">
                    위 텍스트를 직접 복사해주세요 (Ctrl+C 또는 Cmd+C)
                </p>
                <button onclick="this.closest('div').parentElement.remove()" style="
                    background: #2196F3;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 16px;
                    font-family: 'Pretendard', sans-serif;
                ">닫기</button>
            </div>
        `;

        // 텍스트 영역 자동 선택
        document.body.appendChild(modal);
        const textarea = modal.querySelector('textarea');
        textarea.focus();
        textarea.select();

        // 배경 클릭 시 닫기
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    /**
     * 토스트 메시지 표시
     */
    showToast(message, type = 'success') {
        // 기존 토스트 제거
        const existingToast = document.querySelector('.custom-toast');
        if (existingToast) {
            existingToast.remove();
        }

        // 토스트 생성
        const toast = document.createElement('div');
        toast.className = 'custom-toast';
        toast.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: ${type === 'success' ? '#4CAF50' : '#f44336'};
            color: white;
            padding: 20px 40px;
            border-radius: 12px;
            font-family: 'Pretendard', sans-serif;
            font-size: 18px;
            font-weight: 600;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            animation: toastFadeIn 0.3s ease-out;
        `;
        toast.textContent = message;

        // CSS 애니메이션 추가
        const style = document.createElement('style');
        style.textContent = `
            @keyframes toastFadeIn {
                from {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.8);
                }
                to {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
            }
            @keyframes toastFadeOut {
                from {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
                to {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.8);
                }
            }
        `;
        document.head.appendChild(style);

        // DOM에 추가
        document.body.appendChild(toast);

        // 2초 후 페이드아웃 & 제거
        setTimeout(() => {
            toast.style.animation = 'toastFadeOut 0.3s ease-out';
            setTimeout(() => {
                toast.remove();
                style.remove();
            }, 300);
        }, 2000);
    }

    /**
     * 메인으로 가기
     */
    goToMain() {
        // PageManager를 통해 intro 페이지로 이동
        if (window.PageManager) {
            window.PageManager.navigateTo('intro');
        } else {
            // 폴백: 직접 URL로 이동
            window.location.href = './index.html';
        }
    }

    /**
     * 음성 로드
     */
    loadVoice(voiceFile) {
        if (!voiceFile) {
            console.warn('음성 파일 경로가 없습니다');
            return;
        }

        // 기존 오디오 정지 및 제거
        if (this.voiceAudio) {
            this.voiceAudio.pause();
            this.voiceAudio.currentTime = 0;
        }

        // 새 오디오 객체 생성
        this.voiceAudio = new Audio(voiceFile);
        
        // 에러 처리
        this.voiceAudio.addEventListener('error', (e) => {
            console.error('음성 파일 로드 실패:', voiceFile, e);
        });

        console.log('✅ 음성 로드:', voiceFile);
    }

    /**
     * 음성 재생 (자동 재생 또는 버튼 클릭)
     */
    playVoice() {
        if (!this.voiceAudio) {
            console.warn('재생할 음성이 없습니다');
            return;
        }

        // 처음부터 재생
        this.voiceAudio.currentTime = 0;
        
        // 재생 시도
        const playPromise = this.voiceAudio.play();

        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    console.log('🎵 음성 재생 시작');
                })
                .catch(error => {
                    console.warn('음성 자동 재생 실패 (사용자 상호작용 필요):', error);
                    // 자동 재생 실패 시 사용자가 버튼을 눌러야 함
                });
        }
    }

    /**
     * 음성 정지
     */
    stopVoice() {
        if (this.voiceAudio) {
            this.voiceAudio.pause();
            this.voiceAudio.currentTime = 0;
            console.log('⏹️ 음성 정지');
        }
    }

    /**
     * ✨ 정리 (페이지 이탈 시 호출)
     */
    destroy() {
        console.log('🧹 EndingManager cleanup...');
        
        // 이벤트 리스너 제거
        this.removeEventListeners();
        
        // 오디오 정지 및 제거
        this.stopVoice();
        this.voiceAudio = null;
        
        console.log('✅ EndingManager destroyed');
    }

    /**
     * 에러 표시
     */
    showError() {
        const errorMsg = document.createElement('div');
        errorMsg.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 2rem;
            border-radius: 8px;
            text-align: center;
            z-index: 9999;
        `;
        errorMsg.innerHTML = `
            <h2>엔딩 로드 실패</h2>
            <p>데이터를 불러올 수 없습니다.</p>
            <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; cursor: pointer;">
                다시 시도
            </button>
        `;
        document.body.appendChild(errorMsg);
    }
}

// SPA를 위한 전역 객체 노출
let endingManagerInstance = null;

window.EndingPage = {
    voiceAudio: null,
    
    // 초기화
    async init(endingId) {
        console.log('🎯 EndingPage.init() called, ending:', endingId);
        
        // ✨ 기존 인스턴스 정리
        if (endingManagerInstance) {
            console.log('🧹 Cleaning up previous instance...');
            endingManagerInstance.destroy();
            endingManagerInstance = null;
        }
        
        // 새 인스턴스 생성
        endingManagerInstance = new EndingManager();
        
        // 초기화 (endingId를 파라미터로 전달)
        await endingManagerInstance.init(endingId || 'ending1');
        
        // 사운드 설정 적용
        if (window.SoundManager) {
            window.SoundManager.applyToAllAudio();
        }
        
        // voiceAudio 참조 저장 (SoundManager가 접근할 수 있도록)
        this.voiceAudio = endingManagerInstance.voiceAudio;
        
        console.log('✨ EndingPage 초기화 완료');
    },
    
    // 정리
    cleanup() {
        console.log('🧹 EndingPage cleanup');
        // body 스크롤 원래대로
        document.body.style.overflow = 'hidden';

        // ✨ 인스턴스 정리
        if (endingManagerInstance) {
            endingManagerInstance.destroy();
            endingManagerInstance = null;
        }
        
        this.voiceAudio = null;
    }
};

// DOMContentLoaded는 SPA에서는 사용하지 않음
// PageManager가 init()을 호출할 것임
