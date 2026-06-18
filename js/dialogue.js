/**
 * PLAY NOWZ Dialogue (Enhanced Version)
 * - 흰색 플래시, 검은색 페이드 기능
 * - 나레이션 줄바꿈 지원
 * - 선택지 클릭 시 nextSceneId로 이동
 * - 코치 대사는 이름 숨김 (독백 처리)
 * - 엔딩 선택지 2x3 그리드 지원
 * - 씬 타이틀 페이드 효과
 */
(() => {
  const PATHS = { bg: "./assets/bg/", char: "./assets/char/", bgm: "./assets/audio/bgm/", sfx: "./assets/audio/sfx/", voice: "./assets/audio/voice/" };
  const CHAPTER_URL = "./chapter-select.html";

  // DOM
  const el = {
    bgImage: document.getElementById("bgImage"),
    charImage: document.getElementById("characterImage"),
    sceneTitle: document.getElementById("sceneTitle"),
    sceneTitleHeading: document.getElementById("sceneTitleHeading"),
    sceneTitleSub: document.getElementById("sceneTitleSub"),
    dialogContainer: document.getElementById("dialogContainer"),
    dialogText: document.getElementById("dialogText"),
    nameLabel: document.getElementById("nameLabel"),
    speakerName: document.getElementById("speakerName"),
    choiceLayer: document.getElementById("choiceLayer"),
    choiceButtons: document.getElementById("choiceButtons"),
    screenOverlay: document.getElementById("screenOverlay"),
    screenText: document.getElementById("screenText"),
    screenBtn: document.getElementById("screenBtn"),
    autoBtn: document.getElementById("autoBtn"),
    btnToChapterSelect: document.getElementById("btnToChapterSelect"),
    popupToMain: document.getElementById("popupToMain"),
    popupNextChapter: document.getElementById("popupNextChapter"),
  };

  // State
  let scenes = []; 
  let idx = 0;
  let isTyping = false; 
  let finishTyping = null;
  let auto = false; 
  let timer = null;
  const AUTO_DELAY = 900;
  let currentChapter = 1; // 현재 챕터 번호
  
  // Ending 선택지 매핑 (Chapter 4 전용)
  const ENDING_CHOICE_MAP = {
    "계획적이고 부지런한 선수겠지.": "ending1",
    "모두에게 다정한 선수 아닐까?": "ending4",
    "선수라면 승부욕이 있어야지.": "ending5",
    "눈치가 빠른 선수가 아무래도 좋지.": "ending2",
    "건강한 선수가 최고야.": "ending3",
    "역시··· 고를 수 없다.": "ending6"
  };
  
  // Audio state
  let currentBGM = null;
  let currentVoice = null;
  let currentSFXs = []; // 재생 중인 SFX 배열

  // Transition Layer 생성 (흰색 플래시, 검은색 페이드용)
  const transitionLayer = document.createElement('div');
  transitionLayer.className = 'transition-layer';
  document.body.appendChild(transitionLayer);

  // Utils
  function resolve(kind, name) {
    if (!name) return null;
    if (name.startsWith("./") || name.startsWith("/") || name.startsWith("http")) return name;
    return PATHS[kind] + name;
  }

  function setBG(file) { 
    if (!file) return; 
    const src = resolve("bg", file); 
    if (src) {
      el.bgImage.src = src;
      // ✨ 배경이 로드되면 opacity를 1로 복원 (init에서 숨긴 것 다시 표시)
      el.bgImage.style.opacity = "1";
    }
  }

  function setChar(file) {
    if (!file) { 
      el.charImage.style.display = "none"; 
      return; 
    }
    const src = resolve("char", file);
    if (src) { 
      el.charImage.src = src; 
      el.charImage.style.display = ""; 
    }
  }

  function show(elm, on = true) { 
    if (!elm) return; 
    elm.setAttribute("aria-hidden", on ? "false" : "true"); 
    elm.style.display = on ? "" : "none"; 
  }

  function showDialog(on = true) { 
    const dc = el.dialogContainer; 
    if (!dc) return; 
    dc.setAttribute("aria-hidden", on ? "false" : "true"); 
    
    // 인라인 스타일 제거 및 is-visible 클래스로 제어
    if (on) {
      dc.style.opacity = "";
      dc.style.visibility = "";
      dc.style.display = "";
      dc.classList.add("is-visible");
    } else {
      dc.classList.remove("is-visible");
      dc.style.display = "none";
    }
  }

  function setName(text) { 
    const has = !!(text && String(text).trim()); 
    el.speakerName.textContent = has ? text : ""; 
    el.nameLabel.setAttribute("aria-hidden", has ? "false" : "true"); 
  }

  function clearText() { 
    el.dialogText.innerHTML = ""; 
    el.screenText.textContent = ""; 
    el.screenBtn.style.display = "none"; 
  }

  function normText(s) {
    if (s == null) return "";
    return String(s)
      .replace(/₩n/g, "\n")
      .replace(/\\n/g, "\n")
      .replace(/\r\n?/g, "\n");
  }

  /**
   * 마크다운 볼드 변환 (**텍스트** → <strong>텍스트</strong>)
   */
  function convertMarkdown(text) {
    if (!text) return "";
    // **텍스트** → <strong>텍스트</strong>
    return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }

  async function typeInto(node, text, cps = 28) {
    if (isTyping && typeof finishTyping === "function") { 
      finishTyping(); 
    }
    isTyping = true; 
    
    // 마크다운 볼드 변환 후 \n을 <br />로 변환
    const markdownText = convertMarkdown(text);
    const htmlText = markdownText.replace(/\n/g, '<br />');
    
    return new Promise(resolve => {
      let done = false;
      finishTyping = () => { 
        if (done) return; 
        node.innerHTML = htmlText; 
        done = true; 
        isTyping = false; 
        finishTyping = null; 
        resolve(); 
      };
      node.innerHTML = ""; 
      if (!text || cps <= 0) { 
        finishTyping(); 
        return; 
      }
      
      // HTML 태그를 제외한 실제 텍스트만 타이핑
      const parts = htmlText.split(/(<br \/>)/);
      let currentPartIndex = 0;
      let currentCharIndex = 0;
      const delay = Math.max(5, Math.round(1000 / cps));
      
      (function tick() { 
        if (done) return; 
        
        // 모든 파트 완료
        if (currentPartIndex >= parts.length) { 
          finishTyping(); 
          return; 
        }
        
        const currentPart = parts[currentPartIndex];
        
        // <br /> 태그인 경우
        if (currentPart === '<br />') {
          node.innerHTML += currentPart;
          currentPartIndex++;
          currentCharIndex = 0;
          setTimeout(tick, delay);
          return;
        }
        
        // 일반 텍스트 타이핑
        if (currentCharIndex < currentPart.length) {
          node.innerHTML += currentPart[currentCharIndex++];
          setTimeout(tick, delay);
        } else {
          // 현재 파트 완료, 다음 파트로
          currentPartIndex++;
          currentCharIndex = 0;
          setTimeout(tick, delay);
        }
      })();
    });
  }

  function scheduleAuto() { 
    if (!auto) return; 
    if (timer) clearTimeout(timer); 
    timer = setTimeout(() => { 
      if (!auto) return; 
      next(); 
    }, AUTO_DELAY); 
  }

  // Audio functions
  function playBGM(file) {
    if (!file) return;
    const src = resolve("bgm", file);
    if (!src) return;
    
    // 같은 BGM이면 재생 안 함
    if (currentBGM && currentBGM.src === src) return;
    
    // 기존 BGM 정지
    if (currentBGM) {
      currentBGM.pause();
      currentBGM = null;
    }
    
    // 새 BGM 재생
    currentBGM = new Audio(src);
    currentBGM.loop = true;
    currentBGM.volume = 0.2;
    
    // ✨ SoundManager 설정 적용 (play 전에!)
    if (window.SoundManager) {
      window.SoundManager.applyToAudio(currentBGM);
    }
    
    currentBGM.play().catch(e => console.log('BGM play failed:', e));
  }
  
  function stopBGM() {
    if (currentBGM) {
      currentBGM.pause();
      currentBGM = null;
    }
  }
  
  function playVoice(file) {
    if (!file) return;
    const src = resolve("voice", file);
    if (!src) return;
    
    // 기존 보이스 정지
    if (currentVoice) {
      currentVoice.pause();
    }
    
    currentVoice = new Audio(src);
    currentVoice.volume = 1;
    
    // ✨ SoundManager 설정 적용
    if (window.SoundManager) {
      window.SoundManager.applyToAudio(currentVoice);
    }

    currentVoice.play().catch(e => console.log('Voice play failed:', e));
  }
  
  function stopVoice() {
    if (currentVoice) {
      currentVoice.pause();
      currentVoice = null;
    }
  }
  
  function playSFX(file) {
    if (!file) return;
    
    // 쉼표로 구분된 여러 SFX 지원
    const files = file.split(',').map(f => f.trim()).filter(f => f);
    
    files.forEach(f => {
      const src = resolve("sfx", f);
      if (!src) return;
      
      const sfx = new Audio(src);
      sfx.volume = 1;
      
      // ✨ SoundManager 설정 적용
      if (window.SoundManager) {
        window.SoundManager.applyToAudio(sfx);
      }
      
      // ✨ 재생 중인 SFX 배열에 추가
      currentSFXs.push(sfx);
      
      // ✨ 재생 종료 시 배열에서 제거
      sfx.addEventListener('ended', () => {
        const index = currentSFXs.indexOf(sfx);
        if (index > -1) {
          currentSFXs.splice(index, 1);
        }
      });

      sfx.play().catch(e => console.log('SFX play failed:', e));
    });
  }
  
  function stopAllSFX() {
    currentSFXs.forEach(sfx => {
      sfx.pause();
      sfx.currentTime = 0;
    });
    currentSFXs = [];
  }

  // Popup helpers
  function showPopup(popupEl, on) { 
    if (!popupEl) return; 
    popupEl.setAttribute("aria-hidden", on ? "false" : "true"); 
  }

  /**
   * 흰색 플래시 효과
   * @param {number} duration - 지속 시간(ms)
   */
  async function whiteFlash(duration = 300) {
    return new Promise(resolve => {
      transitionLayer.className = 'transition-layer white-flash active';
      setTimeout(() => {
        transitionLayer.classList.remove('active');
        setTimeout(() => {
          transitionLayer.className = 'transition-layer';
          resolve();
        }, 300);
      }, duration);
    });
  }

  /**
   * 검은색 페이드 인 (화면이 검게 변함)
   * @param {number} duration - 지속 시간(ms)
   */
  async function blackFadeIn(duration = 500) {
    return new Promise(resolve => {
      transitionLayer.className = 'transition-layer black-fade';
      setTimeout(() => {
        transitionLayer.classList.add('active');
        setTimeout(resolve, duration);
      }, 50);
    });
  }

  /**
   * 검은색 페이드 아웃 (화면이 밝아짐)
   * @param {number} duration - 지속 시간(ms)
   */
  async function blackFadeOut(duration = 500) {
    return new Promise(resolve => {
      transitionLayer.classList.remove('active');
      setTimeout(() => {
        transitionLayer.className = 'transition-layer';
        resolve();
      }, duration);
    });
  }

  // Render
  async function render(line) {
    const tRaw = (line.type == null ? '' : String(line.type));
    let t = tRaw.toLowerCase();
    
    // aliases
    if (t === 'scene' || t === 'scenetitle') t = 'scene_title';
    if (t === 'chapter' || t === 'chaptertitle') t = 'chapter_title';
    if (t === 'narration') t = 'narration_button';

    // 페이드 효과 처리
    if (line.whiteFlash) {
      await whiteFlash(line.flashDuration || 300);
    }
    if (line.blackFadeIn) {
      await blackFadeIn(line.fadeDuration || 500);
    }
    if (line.blackFadeOut) {
      await blackFadeOut(line.fadeDuration || 500);
    }

    clearText();
    show(el.screenOverlay, false);
    el.choiceLayer.setAttribute("aria-hidden", "true");
    showDialog(true);
    setName("");

    // BG/Char
    if (line.background) setBG(line.background);
    if (line.character) setChar(line.character);  // ✅ 캐릭터 처리 추가
    
    // Audio handling
    if (line.bgm) {
      if (line.bgm === 'stop') {
        stopBGM();
      } else {
        playBGM(line.bgm);
      }
    }
    if (line.voice) playVoice(line.voice);
    if (line.sfx) playSFX(line.sfx);

    // Hide rules
    const hideByType = (t === "chapter_title" || t === "scene_title");
    const shouldHide = hideByType || (t === "narration_button");
    if (shouldHide) {
      showDialog(false);
      // 캐릭터도 숨김 (chapter_title, scene_title, narration_button에서)
      if (hideByType || t === "narration_button") {
        el.charImage.style.display = "none";
      }
    }

    switch (t) {
      case "chapter_title": {
        // 씬 타이틀은 먼저 완전히 숨김
        el.sceneTitle.classList.remove('fade-in');
        el.sceneTitle.style.opacity = '0';
        el.sceneTitle.style.visibility = 'hidden';
        
        el.sceneTitleHeading.textContent = normText(line.title || line.chapterTitle || "");
        el.sceneTitleSub.textContent = normText(line.sub || line.sceneSubtitle || "");
        
        // 약간의 딜레이 후 페이드 인 시작
        setTimeout(() => {
          el.sceneTitle.style.visibility = 'visible';
          el.sceneTitle.setAttribute("aria-hidden", "false");
          el.sceneTitle.classList.add('fade-in');
        }, 50);
        
        el.sceneTitle.onclick = () => { 
          el.sceneTitle.onclick = null; 
          el.sceneTitle.classList.remove('fade-in');
          el.sceneTitle.style.opacity = '0';
          el.sceneTitle.style.visibility = 'hidden';
          el.sceneTitle.setAttribute("aria-hidden", "true");
          next(); 
        };
        break;
      }
      
      case "scene_title": {
        // 씬 타이틀은 먼저 완전히 숨김
        el.sceneTitle.classList.remove('fade-in');
        el.sceneTitle.style.opacity = '0';
        el.sceneTitle.style.visibility = 'hidden';
        
        // 줄바꿈 처리 (마크다운 볼드 변환 후 \n → <br>)
        const headingText = convertMarkdown(normText(line.title || line.chapterTitle || ""));
        const subtitleText = convertMarkdown(normText(line.sub || line.sceneSubtitle || ""));
        el.sceneTitleHeading.innerHTML = headingText.replace(/\n/g, '<br>');
        el.sceneTitleSub.innerHTML = subtitleText.replace(/\n/g, '<br>');
        
        // 약간의 딜레이 후 페이드 인 시작
        setTimeout(() => {
          el.sceneTitle.style.visibility = 'visible';
          el.sceneTitle.setAttribute("aria-hidden", "false");
          el.sceneTitle.classList.add('fade-in');
        }, 50);
        
        el.sceneTitle.onclick = () => { 
          el.sceneTitle.onclick = null; 
          el.sceneTitle.classList.remove('fade-in');
          el.sceneTitle.style.opacity = '0';
          el.sceneTitle.style.visibility = 'hidden';
          el.sceneTitle.setAttribute("aria-hidden", "true");
          next(); 
        };
        break;
      }
      
      case "narration_button": {
        const text = normText(line.text || line.narration || "");
        el.screenText.textContent = "";
        
        // 버튼 텍스트 줄바꿈 처리
        const buttonText = convertMarkdown(normText(line.buttonText || "계속"));
        el.screenBtn.innerHTML = buttonText.replace(/\n/g, '<br>');
        el.screenBtn.style.opacity = "0"; // 초기 숨김
        el.screenBtn.style.display = "";
        show(el.screenOverlay, true);
        let finished = false;
        
        // 타이핑 완료 후 버튼 페이드 인
        typeInto(el.screenText, text, 28).then(() => { 
          finished = true;
          // 버튼 페이드 인 애니메이션
          setTimeout(() => {
            el.screenBtn.style.transition = "opacity 0.5s ease";
            el.screenBtn.style.opacity = "1";
          }, 200);
        });
        
        el.screenBtn.onclick = () => {
          // ✨ 클릭음 재생
          if (window.SoundManager) {
            window.SoundManager.playClickSound();
          }
          if (!finished && typeof finishTyping === "function") { 
            finishTyping(); 
            return; 
          } 
          next(); 
        };
        break;
      }

      case "monologue": {
        const text = normText(line.text || "");
        el.screenText.textContent = "";
        show(el.screenOverlay, true);
        let finished = false;
        typeInto(el.screenText, text, 28).then(() => { finished = true; });
        el.screenOverlay.onclick = (e) => {
          if (e.target.closest("#screenBtn")) return;
          if (!finished && typeof finishTyping === "function") { 
            finishTyping(); 
            return; 
          }
          el.screenOverlay.onclick = null; 
          next();
        };
        break;
      }

      case "choice": {
        el.dialogText.textContent = line.question || "어떻게 할까?";
        showDialog(true);
        el.choiceLayer.setAttribute("aria-hidden", "false");
        el.choiceButtons.innerHTML = "";
        (line.choices || []).forEach((c, i) => {
          const b = document.createElement("button");
          b.className = "choice-btn";
          // 줄바꿈 처리 (마크다운 볼드 변환 후 \n → <br>)
          const choiceText = convertMarkdown(normText(c.text || `선택지 ${i + 1}`));
          b.innerHTML = choiceText.replace(/\n/g, '<br>');
          b.addEventListener("click", () => {
            // ✨ 클릭음 재생
            if (window.SoundManager) {
              window.SoundManager.playClickSound();
            }
            el.choiceLayer.setAttribute("aria-hidden", "true");
            // 일직선 스토리이므로 항상 다음 씬으로 진행
            next();
          });
          el.choiceButtons.appendChild(b);
        });
        break;
      }

      case "ending_choice": {
        // 엔딩 선택지 - 2x3 그리드 레이아웃 + 상단 질문 + 페이드인 애니메이션
        showDialog(false);
        
        // 기존 엔딩 레이어가 있으면 제거하고 새로 생성
        let endingLayer = document.getElementById("endingChoiceLayer");
        if (endingLayer) {
          endingLayer.remove();
        }
        
        // 새로운 엔딩 레이어 생성
        endingLayer = document.createElement("div");
        endingLayer.id = "endingChoiceLayer";
        endingLayer.className = "ending-choice-layer";
        endingLayer.innerHTML = `
          <div class="ending-choice-layer__scrim"></div>
          <div class="ending-choice-layer__content">
            <div class="ending-choice-question" id="endingChoiceQuestion"></div>
            <div class="ending-choice-layer__buttons" id="endingChoiceButtons"></div>
          </div>
        `;
        document.querySelector('.view-dialogue').appendChild(endingLayer);
        
        endingLayer.setAttribute("aria-hidden", "false");
        
        // 질문 표시 (줄바꿈 처리)
        const questionEl = document.getElementById("endingChoiceQuestion");
        const questionText = convertMarkdown(normText(line.question || "엔딩을 선택하세요"));
        questionEl.innerHTML = questionText.replace(/\n/g, '<br>');
        
        const endingButtons = document.getElementById("endingChoiceButtons");
        endingButtons.innerHTML = "";
        
        // 버튼 생성 (초기에는 투명)
        (line.choices || []).forEach((c, i) => {
          const b = document.createElement("button");
          b.className = "ending-choice-btn";
          // 줄바꿈 처리 (마크다운 볼드 변환 후 \n → <br>)
          const choiceText = convertMarkdown(normText(c.text || `엔딩 ${i + 1}`));
          b.innerHTML = choiceText.replace(/\n/g, '<br>');
          b.style.opacity = "0";
          b.style.transform = "translateY(20px)";
          b.addEventListener("click", () => {
            // ✨ 클릭음 재생
            if (window.SoundManager) {
              window.SoundManager.playClickSound();
            }
            console.log('🎯 Ending choice button clicked!');
            
            // Ending 선택지 - SPA 방식으로 ending 페이지로 이동
            const choiceText = c.text;
            const endingId = ENDING_CHOICE_MAP[choiceText] || "ending1";
            
            console.log(`✨ Ending choice selected: "${choiceText}" → ${endingId}`);
            console.log('📍 PageManager available:', !!window.PageManager);
            
            // 다이얼로그 UI 정리
            showDialog(false);
            el.choiceLayer.setAttribute("aria-hidden", "true");
            
            // PageManager를 통해 ending 페이지로 이동
            if (window.PageManager) {
              console.log('🚀 Calling PageManager.navigateTo...');
              window.PageManager.navigateTo('ending', { ending: endingId })
                .then(() => {
                  console.log('✅ Navigation completed');
                })
                .catch(err => {
                  console.error('❌ Navigation failed:', err);
                });
            } else {
              // 폴백: 직접 URL로 이동
              console.log('⚠️ PageManager not found, using direct navigation');
              window.location.href = `./ending.html?ending=${endingId}`;
            }
          });
          endingButtons.appendChild(b);
        });
        
        // 질문 표시 후 버튼들을 순차적으로 페이드인
        setTimeout(() => {
          const buttons = endingButtons.querySelectorAll('.ending-choice-btn');
          buttons.forEach((btn, i) => {
            setTimeout(() => {
              btn.style.transition = "all 0.2s ease";
              btn.style.opacity = "1";
              btn.style.transform = "translateY(0)";
            }, i * 150); // 각 버튼마다 150ms 간격
          });
        }, 300); // 질문 표시 후 300ms 대기
        
        break;
      }

      case "next_chapter": {
        // 다음 챕터로 이동 - 팝업 표시
        console.log('[next_chapter] Starting...');
        
        // UI 모두 숨김 (클릭 이벤트 방지)
        showDialog(false);
        el.choiceLayer.setAttribute("aria-hidden", "true");
        el.screenOverlay.setAttribute("aria-hidden", "true");
        
        // 페이드 아웃
        console.log('[next_chapter] Fade out starting...');
        await blackFadeIn(line.fadeDuration || 800);
        console.log('[next_chapter] Fade out complete');
        
        // 검은 화면 제거 (팝업이 보이도록)
        transitionLayer.classList.remove('active');
        transitionLayer.className = 'transition-layer';
        console.log('[next_chapter] Black screen removed');
        
        // 팝업 표시
        console.log('[next_chapter] Showing popup...', el.popupNextChapter);
        showPopup(el.popupNextChapter, true);
        console.log('[next_chapter] Popup aria-hidden:', el.popupNextChapter?.getAttribute('aria-hidden'));
        
        // 중요: next() 호출 방지 - 팝업에서 선택할 때까지 대기
        return; // break 대신 return으로 함수 종료
      }

      case "dialogue":
      default: {
        setChar(line.character || "");
        
        // 코치 대사는 이름 숨김 (독백 처리)
        const speaker = line.speaker || "";
        if (speaker === "코치" || speaker === "Coach") {
          setName(""); // 이름 숨김
        } else {
          setName(speaker);
        }
        
        await typeInto(el.dialogText, normText(line.dialogue || line.text || ""), 28);
        scheduleAuto();
        break;
      }
    }
  }

  function next() {
    if (isTyping && typeof finishTyping === "function") { 
      finishTyping(); 
      return; 
    }
    
    // 마지막 씬이면 챕터 종료 처리
    if (idx >= scenes.length - 1) {
      endChapter();
      return;
    }
    
    idx = Math.min(idx + 1, scenes.length - 1);
    render(scenes[idx]);
  }

  /**
   * 특정 씬으로 이동
   * @param {number} sceneId - 이동할 씬 ID
   */
  function jumpToScene(sceneId) {
    const targetIdx = scenes.findIndex(s => s.id === sceneId);
    if (targetIdx !== -1) {
      idx = targetIdx;
      render(scenes[idx]);
    } else {
      console.warn(`Scene ID ${sceneId} not found`);
      next();
    }
  }

  /**
   * 챕터 종료 처리
   */
  async function endChapter() {
    await blackFadeIn(800);
    // 다음 챕터 팝업 표시
    showPopup(el.popupNextChapter, true);
  }

  // Dialogue click to progress (when visible)
  document.addEventListener("click", (e) => {
    if (el.dialogContainer?.getAttribute("aria-hidden") === "true") return;
    if (e.target.closest("#dialogContainer")) {
      if (isTyping && typeof finishTyping === "function") { 
        finishTyping(); 
        return; 
      }
      next();
    }
  });

  // AUTO toggle
  el.autoBtn?.addEventListener("click", () => {
    // ✨ 클릭음 재생
    if (window.SoundManager) {
      window.SoundManager.playClickSound();
    }
    auto = !auto;
    el.autoBtn.setAttribute("aria-pressed", auto ? "true" : "false");
    if (auto) scheduleAuto(); 
    else if (timer) { 
      clearTimeout(timer); 
      timer = null; 
    }
  });

  // MENU → popup open
  el.btnToChapterSelect?.addEventListener("click", () => {
    // ✨ 클릭음 재생
    if (window.SoundManager) {
      window.SoundManager.playClickSound();
    }
    showPopup(el.popupToMain, true);
  });

  // Popup actions - 메인으로 가기
  el.popupToMain?.addEventListener("click", (e) => {
    const role = e.target?.getAttribute("data-role");
    if (!role) {
      if (e.target.classList.contains("popup__scrim")) 
        showPopup(el.popupToMain, false);
      return;
    }
    if (role === "confirm-main") {
      // ✨ 클릭음 재생
      if (window.SoundManager) {
        window.SoundManager.playClickSound();
      }
      showPopup(el.popupToMain, false); // 팝업 닫기
      goToChapterSelect();
    }
    if (role === "cancel-main") {
      // ✨ 클릭음 재생
      if (window.SoundManager) {
        window.SoundManager.playClickSound();
      }
      showPopup(el.popupToMain, false); 
    }
  });

  // Popup actions - 다음 챕터
  el.popupNextChapter?.addEventListener("click", (e) => {
    const role = e.target?.getAttribute("data-role");
    if (!role) return;
    if (role === "goto-next") {
      // ✨ 클릭음 재생
      if (window.SoundManager) {
        window.SoundManager.playClickSound();
      }
      // 다음 챕터로 이동
      showPopup(el.popupNextChapter, false); // 팝업 닫기
      goToChapter(currentChapter + 1);
    }
    if (role === "goto-main") {
      // ✨ 클릭음 재생
      if (window.SoundManager) {
        window.SoundManager.playClickSound();
      }
      showPopup(el.popupNextChapter, false); // 팝업 닫기
      goToChapterSelect();
    }
  });

  // JSON loader
  async function loadJSON(chapterNum) {
    // URL 파라미터에서 챕터 번호 가져오기 (없으면 기본값 사용)
    if (!chapterNum) {
      const params = new URLSearchParams(window.location.search);
      chapterNum = parseInt(params.get('chapter')) || 1;
    }
    
    currentChapter = chapterNum;
    console.log(`[Loading Chapter ${chapterNum}]`);
    
    const urls = [
      `./js/chapter${chapterNum}.json?v=${Date.now()}`,  // 타임스탬프로 캐시 무효화
      `./js/chapter${chapterNum}.json`,
      `./data/chapter${chapterNum}.json?v=${Date.now()}`,
      `./chapter${chapterNum}.json?v=${Date.now()}`,
      `./data/chapter${chapterNum}.json`,
      `./chapter${chapterNum}.json`
    ];
    
    for (const u of urls) {
      try {
        const r = await fetch(u, { cache: "no-store" });
        if (r.ok) { 
          console.log("[JSON loaded]", u); 
          return await r.json(); 
        }
      } catch (e) { 
        console.warn("[JSON] fail", u, e); 
      }
    }
    throw new Error(`Chapter ${chapterNum} JSON not found`);
  }
  
  async function loadChapter(chapterNum) {
    try {
      const data = await loadJSON(chapterNum);
      scenes = Array.isArray(data.scenes) ? data.scenes : [];
      if (!scenes.length) throw new Error("No scenes");
      idx = 0;
      if (scenes[0].background) setBG(scenes[0].background);
      render(scenes[0]);
    } catch (e) {
      console.error(e);
      if (el.dialogText) el.dialogText.textContent = `챕터 ${chapterNum} 로드 실패`;
    }
  }
  
  function goToChapterSelect() {
    // BGM/Voice 정지
    stopBGM();
    stopVoice();
    
    // PageManager를 통해 챕터 선택으로 이동
    if (window.PageManager) {
      window.PageManager.navigateTo('chapter-select');
    } else {
      // 폴백: 직접 URL로 이동
      window.location.href = 'chapter-select.html';
    }
  }
  
  function goToChapter(chapterNum) {
    // BGM/Voice 정지
    stopBGM();
    stopVoice();
    
    // PageManager를 통해 다른 챕터로 이동
    if (window.PageManager) {
      window.PageManager.navigateTo('dialogue', { chapter: chapterNum });
    } else {
      // 폴백: 직접 URL로 이동
      window.location.href = `dialogue.html?chapter=${chapterNum}`;
    }
  }

  // SPA를 위한 전역 객체 노출
  window.DialoguePage = {
    // ✨ getter로 변경하여 실시간 값 반환
    get bgm() {
      return currentBGM;
    },
    get voice() {
      return currentVoice;
    },
    get sfxs() {
      return currentSFXs;
    },
    
    // 초기화
    init(chapterNum) {
      console.log('DialoguePage init, chapter:', chapterNum);
      
      // ===== 🔥 이전 챕터 화면 즉시 숨김 (깜빡임 방지) =====
      // 1. 배경 초기화 (검은 화면 또는 기본 배경)
      if (el.bgImage) {
        el.bgImage.style.opacity = "0"; // 배경 페이드 아웃
      }
      
      // 2. 캐릭터 숨김
      if (el.charImage) {
        el.charImage.style.display = "none";
      }
      
      // 3. 대화창 숨김
      if (el.dialogContainer) {
        el.dialogContainer.style.opacity = "0";
        el.dialogContainer.style.visibility = "hidden";
      }
      
      // 4. 네임라벨 숨김
      if (el.nameLabel) {
        el.nameLabel.setAttribute("aria-hidden", "true");
      }
      
      // 5. 화면 오버레이 숨김
      if (el.screenOverlay) {
        el.screenOverlay.setAttribute("aria-hidden", "true");
      }
      
      // 6. 씬 타이틀 숨김
      if (el.sceneTitle) {
        el.sceneTitle.setAttribute("aria-hidden", "true");
      }
      
      // ===== 선택지 레이어 초기화 =====
      // 7. 일반 선택지 레이어
      if (el.choiceLayer) {
        el.choiceLayer.setAttribute("aria-hidden", "true");
      }
      if (el.choiceButtons) {
        el.choiceButtons.innerHTML = "";
      }
      
      // 8. 엔딩 선택지 레이어 제거
      const endingLayer = document.getElementById("endingChoiceLayer");
      if (endingLayer) {
        console.log('🗑️ Removing existing endingChoiceLayer');
        endingLayer.remove();
      }
      
      // ===== 새 챕터 로드 =====
      // 챕터 로드 (render 함수가 배경을 다시 표시함)
      currentChapter = parseInt(chapterNum) || 1;
      loadChapter(currentChapter);
      
      // 사운드 설정 적용
      if (window.SoundManager) {
        window.SoundManager.applyToAllAudio();
      }
    },
    
    // 정리
    cleanup() {
      console.log('DialoguePage cleanup');
      stopBGM();
      stopVoice();
      clearTimeout(timer);
      stopAllSFX();
      
      // ===== 🔥 선택지 레이어 정리 =====
      // 1. 일반 선택지 레이어
      if (el.choiceButtons) {
        el.choiceButtons.innerHTML = "";
      }
      if (el.choiceLayer) {
        el.choiceLayer.setAttribute("aria-hidden", "true");
        // style.display는 건드리지 않음
      }
      
      // 2. 엔딩 선택지 레이어 제거
      const endingLayer = document.getElementById("endingChoiceLayer");
      if (endingLayer) {
        console.log('🗑️ Cleanup: Removing endingChoiceLayer');
        endingLayer.remove();
      }
    }
  };

  // DOMContentLoaded는 SPA에서는 사용하지 않음
  // PageManager가 init()을 호출할 것임
})();
