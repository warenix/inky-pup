/**
 * UI translations.
 *
 * The spoken language (TeacherSettings.lang) is separate from this: a child
 * can read a Chinese worksheet but still want the interface in English, or
 * practise Cantonese dictation from an English screen.
 */

export type Locale = "en" | "zh-Hant";

export const LOCALES: Array<{ value: Locale; label: string }> = [
  { value: "en", label: "English" },
  { value: "zh-Hant", label: "繁體中文" },
];

const STORAGE_KEY = "inky-pup-locale";

/* ------------------------------------------------------------------ *
 * Dictionary
 *
 * English is the shape of record: every other locale must supply all of
 * these keys. Values may contain {placeholders} filled in by vars.
 * ------------------------------------------------------------------ */

const en = {
  /* ---- common ---- */
  "common.back": "← Back",
  "common.next": "Next!",
  "common.save": "Save",
  "common.saving": "Saving…",
  "common.cancel": "Cancel",
  "common.done": "Done",
  "common.delete": "Delete",
  "common.library": "Library",
  "common.home": "← Home",
  "common.retry": "Try again",
  "common.language": "Language",
  "common.mascotAlt": "Inky Pup mascot",

  /* ---- stepper ---- */
  "step.photo": "Photo",
  "step.areas": "Areas",
  "step.words": "Words",
  "step.ready": "Ready",
  "step.play": "Play",
  "step.library": "Library",
  "step.progress": "Progress",

  /* ---- home ---- */
  "home.title": "Inky Pup",
  "home.subtitle": "Let\'s practise! 🐾",
  "home.new": "📝 New dictation",
  "home.myDictations": "📚 My dictations",
  "home.privacy": "Photos and words stay on this device. The reading voice may need internet.",

  /* ---- capture ---- */
  "capture.title": "📷 Take a photo!",
  "capture.subtitle": "Snap your dictation sheet. Lay it flat — ask a grown-up to help! 🙏",
  "capture.appendBadge": "New words will join your {n} words!",
  "capture.takePhoto": "📷 Take photo",
  "capture.choosePicture": "🖼️ Choose picture",
  "capture.previewAlt": "Dictation sheet preview",
  "capture.sheetAlt": "Uploaded dictation sheet",
  "capture.errNotImage": "That doesn't look like a picture. Please pick an image!",
  "capture.errTooBig": "That picture is a bit too big — under 25 MB please!",
  "capture.backRetake": "← Retake photo",

  /* ---- crop editor ---- */
  "crop.title": "✏️ Circle the words!",
  "crop.helpFirst": "Draw a box around the words with your finger! 👆 Leave a little space around the letters.",
  "crop.helpMore": "Draw more boxes around the words with your finger! 👆 Leave a little space around the letters.",
  "crop.modeLines": "Sentences",
  "crop.modeWords": "Words",
  "crop.hintLines": "Pick this for sentences — long lines! 📝",
  "crop.hintWords": "Pick this for word lists — one word at a time! 🔤",
  "crop.readDrawing": "🔍 Read my drawing!",
  "crop.readBoxes": "🔍 Read {n} box!",
  "crop.readBoxesPlural": "🔍 Read {n} boxes!",
  "crop.readWhole": "📄 Read the whole photo",
  "crop.startOver": "Start over",
  "crop.deleteArea": "Delete area {n}",

  /* ---- scanning ---- */
  "scan.reading": "Reading your photo…",
  "scan.wait": "Good things take a few seconds! ⏳",
  "scan.oops": "Oops! {message}",
  "scan.demo": "Try demo words instead",
  "scan.noWordsFound": "No words found — try a clearer photo!",

  /* ---- review ---- */
  "review.title": "✅ Check the words!",
  "review.subtitle": "Tap ▲ ▼ to move words around, fix typos here! 🔍",
  "review.placeholder": "Tap to type… ✏️",
  "review.empty": "No words yet — add your first one below! 👇",
  "review.editWord": "Edit word {n}",
  "review.moveUp": "Move word {n} up",
  "review.moveDown": "Move word {n} down",
  "review.deleteWord": "Delete word {n}",
  "review.dialogLabel": "Word {n}",
  "review.wordLabel": "Word {n} text",
  "review.modalTitle": "✏️ Word {n}",
  "review.mergeLabel": "Merge word {a} with word {b}",
  "review.mergeHint": "OCR split a word? Tap + between the rows to join them.",

  /* ---- add words ---- */
  "add.title": "➕ Add more words!",
  "add.subtitleEmpty": "Start your list — pick one! 👇",
  "add.subtitleMore": "Keep growing your list! 🌱",
  "add.manual": "✏️ Write it myself",
  "add.photo": "📷 Photo",
  "add.upload": "🖼️ Upload",

  /* ---- share ---- */
  "share.title": "📤 Share",
  "share.subtitle": "Send to another device — no account, the link holds the words!",
  "share.copyLink": "🔗 Copy link",
  "share.copied": "Copied!",
  "share.showQR": "📱 Show QR",
  "share.hideQR": "Hide QR",
  "share.sendChat": "💬 Send via chat…",
  "share.download": "💾 Download file (for long lists)",
  "share.shareTitle": "My dictation",
  "share.shareText": "{n} words to practise!",
  "share.tooLong": "Long list — QR may be hard to scan. Copy link or file works better!",
  "share.copyError": "Couldn't copy — long-press the link below to copy it.",
  "share.qrHint": "Scan with the other phone\'s camera 📷",

  /* ---- receive ---- */
  "receive.title": "📥 Got a share?",
  "receive.subtitle": "Paste the link your teacher sent you!",
  "receive.placeholder": "Paste share link here… 🔗",
  "receive.open": "Open! 🚀",
  "receive.loadFile": "📁 Load from file instead",
  "receive.errNotLink": "That doesn't look like a share link",
  "receive.errOpen": "Couldn't open that link — check it was copied fully!",
  "receive.errRead": "Couldn't read that file",

  /* ---- library ---- */
  "library.title": "📚 My dictations",
  "library.subtitle": "Tap one to practise! ▶️",
  "library.emptyTitle": "Nothing here yet!",
  "library.emptyBody": "Scan a sheet, check the words, then tap Save to keep it here.",
  "library.meta": "{n} words · {date}",
  "library.loaded": "Loaded ✓",
  "library.practise": "▶ Practise!",
  "library.rename": "Rename {name}",
  "library.cancelRename": "Cancel rename",
  "library.nameLabel": "Dictation name",
  "library.saveName": "Save name",

  /* ---- settings ---- */
  "settings.title": "🎧 Get ready!",
  "settings.subtitle": "Pick how you want to practise.",
  "settings.voice": "Voice",
  "settings.speed": "How fast?",
  "settings.repeats": "Read how many times?",
  "settings.writingTime": "Writing time?",
  "settings.sayMarks": "Say the marks?",
  "settings.smallParts": "Small parts?",
  "settings.hideWords": "Hide the words?",
  "settings.speedSlow": "Slow",
  "settings.speedJustRight": "Just right",
  "settings.speedFast": "Fast!",
  "settings.repeatOnce": "once",
  "settings.repeatTimes": "{n} times",
  "settings.seconds": "{n} seconds",
  "settings.sayMarksYes": "Yes! Read . , !",
  "settings.sayMarksNo": "No, silent",
  "settings.smallPartsYes": "Yes, bit by bit!",
  "settings.smallPartsNo": "No, whole lines",
  "settings.hideWordsYes": "Yes, test me!",
  "settings.hideWordsNo": "No, show them",
  "settings.lang.en-US": "English (US)",
  "settings.lang.en-GB": "English (UK)",
  "settings.lang.yue-HK": "Cantonese (廣東話)",
  "settings.lang.zh-CN": "Mandarin (普通話)",

  /* ---- ready screen ---- */
  "ready.start": "▶ Start!",
  "ready.checkWords": "← Check words",
  "ready.voiceRemembered": "🔊 Voice will be remembered for “{name}”",
  "ready.speechUnsupported": "🎤 Web Speech API not available — some dictation features will be limited",
  "estimate.seconds": "About {n} seconds",
  "estimate.exactSeconds": "≈ {n} sec in total",
  "estimate.minutes": "About {n} min",
  "estimate.exactMinutes": "≈ {n} min in total",
  "estimate.exactMinutesSeconds": "≈ {n} min {s} sec in total",
  "estimate.words": "{n} words",

  /* ---- player ---- */
  "play.title": "🎧 Listen and write!",
  "play.getReady": "Get ready…",
  "play.done": "Done!",
  "play.noPeeking": "No peeking! Get your pencil ready…",
  "play.listenCarefully": "Listen carefully…",
  "play.paused": "Paused — take a breath!",
  "play.writeItDown": "Write it down!",
  "play.pencilReady": "Get your pencil ready…",
  "play.progress": "Word {current} of {total}",
  "play.repeatCount": " · {current}/{total}",
  "play.partCount": " · Part {current}/{total}",
  "play.startNow": "Start now",
  "play.pause": "Pause",
  "play.keepGoing": "Keep going!",
  "play.again": "Again!",
  "play.next": "Next",
  "play.startOver": "Start over",
  "play.stopAndGoBack": "Stop and go back",
  "play.holdToPeek": "👀 Hold to peek!",
  "play.peekLabel": "Hold to peek at the answer",
  "play.noWordsTitle": "No words yet!",
  "play.noWordsBody": "Go back and add some words first. 📷",

  /* ---- answers ---- */
  "answer.titleHidden": "Answers — mark your work!",
  "answer.titleShown": "What you practised",
  "answer.hint": "Tap each one: got it / missed.",
  "answer.score": "{correct}/{marked} right!",
  "answer.perfect": "{correct}/{marked} right! Perfect! 🏆",
  "answer.got": "Got it",
  "answer.missed": "Missed",
  "answer.unmarked": "—",

  /* ---- done screen ---- */
  "done.title": "🎉 Amazing work! 🎉",
  "done.subtitle": "You finished {n} words! So proud of you!",
  "done.practiseMissed": "Practise missed words ({n})",
  "done.practiseAgain": "Practise again",
  "done.checkWords": "← Check words",
  "done.new": "📝 New",

  /* ---- validation & messages ---- */
  "msg.saved": "Saved! Find it in My dictations.",
  "msg.addWordsFirst": "Add some words before you start!",
  "msg.blankOne": "Word {n} is still empty — type it or press ✕ to delete it.",
  "msg.blankMany": "{n} words are still empty — type them or press ✕ to delete them.",
  "msg.readingFailed": "Reading failed",
  "msg.saveFailed": "Couldn't save — this browser blocks saving. 😢",
  "msg.deleteFailed": "Couldn't delete — try again! 😢",
  "msg.renameFailed": "Couldn't rename — try again! 😢",
  "msg.startFreshConfirm": "Start a brand-new empty word list? Unsaved words will be gone! 🗑️",
  "msg.deleteConfirm": "Delete “{name}”? This can't be undone. 🗑️",
  "msg.deleteConfirmUnknown": "Delete this dictation? This can't be undone. 🗑️",

  /* ---- speech warning ---- */
  "speechWarn.title": "Web Speech API not supported",
  "speechWarn.body": "Your browser cannot use the Web Speech API for dictation. Some features may not work properly. Please use a modern browser (Chrome, Edge, Safari) or check your browser settings.",
  "speechWarn.dismiss": "✕ Dismiss",

  /* ---- error pages ---- */
  "errorPage.title": "Oops! Something tripped up.",
  "errorPage.body": "Don't worry — your words are safe. Try again!",
  "errorPage.retry": "🔁 Try again",
  "errorPage.crashTitle": "Something went wrong",
  "errorPage.reload": "🔁 Reload",
  "notFound.icon": "🗺️",
  "notFound.title": "Page not found",
  "notFound.body": "That page wandered off!",
  "notFound.home": "🏠 Home",
  /* ---- camera ---- */
  "camera.title": "Take a photo",
  "camera.starting": "Starting the camera…",
  "camera.shutter": "Take the photo",
  "camera.switch": "Switch camera",
  "camera.cancel": "Cancel",
  "camera.denied": "Camera access was blocked.",
  "camera.missing": "No camera was found.",
  "camera.unsupported": "This browser can't use the camera.",
  "camera.fallbackHint": "Choose a picture from your computer instead.",
} as const;

export type TKey = keyof typeof en;
type Dictionary = Record<TKey, string>;

const zhHant: Dictionary = {
  /* ---- common ---- */
  "common.back": "← 返回",
  "common.next": "下一步！",
  "common.save": "儲存",
  "common.saving": "儲存中…",
  "common.cancel": "取消",
  "common.done": "完成",
  "common.delete": "刪除",
  "common.library": "字庫",
  "common.home": "← 首頁",
  "common.retry": "再試一次",
  "common.language": "語言",
  "common.mascotAlt": "黑犬吉祥物",

  /* ---- stepper ---- */
  "step.photo": "拍照",
  "step.areas": "圈選",
  "step.words": "生字",
  "step.ready": "準備",
  "step.play": "播放",
  "step.library": "字庫",
  "step.progress": "進度",

  /* ---- home ---- */
  "home.title": "黑犬聽寫",
  "home.subtitle": "一起練習吧！🐾",
  "home.new": "📝 新聽寫",
  "home.myDictations": "📚 我的聽寫",
  "home.privacy": "相片和文字只留在這部裝置，朗讀語音需要網絡。",

  /* ---- capture ---- */
  "capture.title": "📷 拍一張相！",
  "capture.subtitle": "拍下聽寫紙，放平一點會更容易認出。🙏",
  "capture.appendBadge": "新字會加進你的 {n} 個字裡。",
  "capture.takePhoto": "📷 拍照",
  "capture.choosePicture": "🖼️ 選擇圖片",
  "capture.previewAlt": "聽寫紙預覽",
  "capture.sheetAlt": "已上載的聽寫紙",
  "capture.errNotImage": "這不是圖片，請選擇一張圖片。",
  "capture.errTooBig": "圖片太大了，請選擇小於 25 MB 的圖片。",
  "capture.backRetake": "← 重新拍攝",

  /* ---- crop editor ---- */
  "crop.title": "✏️ 圈出要讀的字",
  "crop.helpFirst": "用手指圈出要讀的字，留一點空間會更清楚。",
  "crop.helpMore": "再圈多幾個框，留一點空間會更清楚。",
  "crop.modeLines": "句子",
  "crop.modeWords": "生字",
  "crop.hintLines": "讀句子請選這個 📝",
  "crop.hintWords": "讀生字請選這個 🔤",
  "crop.readDrawing": "🔍 讀圈選的字",
  "crop.readBoxes": "🔍 讀 {n} 個框",
  "crop.readBoxesPlural": "🔍 讀 {n} 個框",
  "crop.readWhole": "📄 讀整張相片",
  "crop.startOver": "重新圈選",
  "crop.deleteArea": "刪除第 {n} 個框",

  /* ---- scanning ---- */
  "scan.reading": "正在辨認相片…",
  "scan.wait": "請稍等一會兒，很快就好 ⏳",
  "scan.oops": "哎呀！{message}",
  "scan.demo": "試用示範字",
  "scan.noWordsFound": "沒有找到字，請拍一張更清楚的相片。",

  /* ---- review ---- */
  "review.title": "✅ 檢查生字",
  "review.subtitle": "用 ▲ ▼ 調整順序，點一下就能修改錯字。🔍",
  "review.placeholder": "點一下輸入… ✏️",
  "review.empty": "還沒有字，請在下面加入第一個。",
  "review.editWord": "修改第 {n} 個字",
  "review.moveUp": "第 {n} 個字向上移",
  "review.moveDown": "第 {n} 個字向下移",
  "review.deleteWord": "刪除第 {n} 個字",
  "review.dialogLabel": "第 {n} 個字",
  "review.wordLabel": "第 {n} 個字的內容",
  "review.modalTitle": "✏️ 第 {n} 個字",
  "review.mergeLabel": "合併第 {a} 和第 {b} 個字",
  "review.mergeHint": "如果一個字被分開了，點一下兩行之間的 + 即可合併。",

  /* ---- add words ---- */
  "add.title": "➕ 加入更多生字",
  "add.subtitleEmpty": "開始你的字表，選一個方式。",
  "add.subtitleMore": "繼續加入更多字。",
  "add.manual": "✏️ 自己寫",
  "add.photo": "📷 拍照",
  "add.upload": "🖼️ 上載",

  /* ---- share ---- */
  "share.title": "📤 分享",
  "share.subtitle": "傳到另一部裝置也可以，不需要帳戶，字都放在連結裡。",
  "share.copyLink": "🔗 複製連結",
  "share.copied": "已複製",
  "share.showQR": "📱 顯示 QR",
  "share.hideQR": "隱藏 QR",
  "share.sendChat": "💬 傳送到對話…",
  "share.download": "💾 下載檔案（字多時使用）",
  "share.shareTitle": "我的聽寫",
  "share.shareText": "一共有 {n} 個字一起練習！",
  "share.tooLong": "字數較多，QR 碼可能不易掃描，複製連結或下載檔案會更方便。",
  "share.copyError": "無法複製，請長按下面的連結複製。",
  "share.qrHint": "用另一部裝置的相機掃描 📷",

  /* ---- receive ---- */
  "receive.title": "📥 收到分享？",
  "receive.subtitle": "貼上老師給你的連結。",
  "receive.placeholder": "貼上分享連結… 🔗",
  "receive.open": "開啟！🚀",
  "receive.loadFile": "📁 改用檔案開啟",
  "receive.errNotLink": "這不是分享連結",
  "receive.errOpen": "無法開啟這個連結，請確認已完整複製。",
  "receive.errRead": "無法讀取這個檔案",

  /* ---- library ---- */
  "library.title": "📚 我的聽寫",
  "library.subtitle": "點選一份開始練習 ▶️",
  "library.emptyTitle": "這裡還沒有內容",
  "library.emptyBody": "拍下聽寫紙、檢查生字，再點「儲存」，就會出現在這裡。",
  "library.meta": "{n} 個字 · {date}",
  "library.loaded": "已載入 ✓",
  "library.practise": "▶ 開始練習",
  "library.rename": "重新命名 {name}",
  "library.cancelRename": "取消命名",
  "library.nameLabel": "聽寫名稱",
  "library.saveName": "儲存名稱",

  /* ---- settings ---- */
  "settings.title": "🎧 準備好了",
  "settings.subtitle": "選一個你喜歡的練習方式。",
  "settings.voice": "讀音",
  "settings.speed": "讀多快？",
  "settings.repeats": "讀幾多次？",
  "settings.writingTime": "寫字時間？",
  "settings.sayMarks": "讀出標點符號？",
  "settings.smallParts": "分段朗讀？",
  "settings.hideWords": "遮住生字？",
  "settings.speedSlow": "慢",
  "settings.speedJustRight": "剛剛好",
  "settings.speedFast": "快",
  "settings.repeatOnce": "一次",
  "settings.repeatTimes": "{n} 次",
  "settings.seconds": "{n} 秒",
  "settings.sayMarksYes": "是，讀出 . , !",
  "settings.sayMarksNo": "不，保持安靜",
  "settings.smallPartsYes": "是，分段讀",
  "settings.smallPartsNo": "不，讀完整句",
  "settings.hideWordsYes": "是，測試自己",
  "settings.hideWordsNo": "不，顯示出來",
  "settings.lang.en-US": "英文（美式）",
  "settings.lang.en-GB": "英文（英式）",
  "settings.lang.yue-HK": "廣東話",
  "settings.lang.zh-CN": "普通話",

  /* ---- ready screen ---- */
  "ready.start": "▶ 開始",
  "ready.checkWords": "← 檢查生字",
  "ready.voiceRemembered": "🔊 會記住「{name}」的讀音",
  "ready.speechUnsupported": "🎤 這部裝置不支援語音朗讀，部分功能會受限制",
  "estimate.seconds": "大約 {n} 秒",
  "estimate.exactSeconds": "≈ 合共 {n} 秒",
  "estimate.minutes": "大約 {n} 分鐘",
  "estimate.exactMinutes": "≈ 合共 {n} 分鐘",
  "estimate.exactMinutesSeconds": "≈ 合共 {n} 分 {s} 秒",
  "estimate.words": "{n} 個字",

  /* ---- player ---- */
  "play.title": "🎧 聽清楚再寫",
  "play.getReady": "準備好了…",
  "play.done": "完成！",
  "play.noPeeking": "先不要偷看，把筆準備好！",
  "play.listenCarefully": "專心聆聽…",
  "play.paused": "暫停一下，休息一會兒",
  "play.writeItDown": "寫下來吧！",
  "play.pencilReady": "把筆準備好…",
  "play.progress": "第 {current} 個字，共 {total} 個",
  "play.repeatCount": " · {current}/{total}",
  "play.partCount": " · 第 {current}/{total} 段",
  "play.startNow": "立即開始",
  "play.pause": "暫停",
  "play.keepGoing": "繼續",
  "play.again": "再聽一次",
  "play.next": "下一個",
  "play.startOver": "重新開始",
  "play.stopAndGoBack": "停止並返回",
  "play.holdToPeek": "👀 按住查看",
  "play.peekLabel": "按住可查看答案",
  "play.noWordsTitle": "還沒有生字",
  "play.noWordsBody": "請先回去加入一些字。📷",

  /* ---- answers ---- */
  "answer.titleHidden": "答案 — 自己批改一下",
  "answer.titleShown": "你練習過的字",
  "answer.hint": "逐個點一下，檢查自己記不記得。",
  "answer.score": "{correct}/{marked} 正確",
  "answer.perfect": "{correct}/{marked} 全部正確！🏆",
  "answer.got": "記得",
  "answer.missed": "再試試",
  "answer.unmarked": "—",

  /* ---- done screen ---- */
  "done.title": "🎉 做得好！🎉",
  "done.subtitle": "你完成了 {n} 個字，非常棒！",
  "done.practiseMissed": "再練習這些字（{n}）",
  "done.practiseAgain": "再練習一次",
  "done.checkWords": "← 檢查生字",
  "done.new": "📝 新的",

  /* ---- validation & messages ---- */
  "msg.saved": "已儲存，可在「我的聽寫」找到。",
  "msg.addWordsFirst": "請先加入一些字再開始。",
  "msg.blankOne": "第 {n} 個字還是空白，請輸入或按 ✕ 刪除。",
  "msg.blankMany": "還有 {n} 個字是空白，請輸入或按 ✕ 刪除。",
  "msg.readingFailed": "辨認失敗",
  "msg.saveFailed": "無法儲存，這個瀏覽器不支援儲存。😢",
  "msg.deleteFailed": "無法刪除，請再試一次。😢",
  "msg.renameFailed": "無法重新命名，請再試一次。😢",
  "msg.startFreshConfirm": "開始一份全新的空字表？未儲存的字將會消失。🗑️",
  "msg.deleteConfirm": "刪除「{name}」？這個動作無法復原。🗑️",
  "msg.deleteConfirmUnknown": "刪除這份聽寫？這個動作無法復原。🗑️",

  /* ---- speech warning ---- */
  "speechWarn.title": "不支援語音功能",
  "speechWarn.body": "這個瀏覽器無法使用語音朗讀，部分功能可能無法正常使用。請使用較新版本的瀏覽器（Chrome、Edge、Safari），或檢查瀏覽器設定。",
  "speechWarn.dismiss": "✕ 關閉",

  /* ---- error pages ---- */
  "errorPage.title": "哎呀，遇到一點問題。",
  "errorPage.body": "不用擔心，你的字還在。再試一次吧！",
  "errorPage.retry": "🔁 再試一次",
  "errorPage.crashTitle": "發生錯誤",
  "errorPage.reload": "🔁 重新載入",
  "notFound.icon": "🗺️",
  "notFound.title": "找不到這個頁面",
  "notFound.body": "這個頁面走丟了！",
  "notFound.home": "🏠 首頁",
  /* ---- camera ---- */
  "camera.title": "影一張相",
  "camera.starting": "正在開啟相機…",
  "camera.shutter": "拍下照片",
  "camera.switch": "切換鏡頭",
  "camera.cancel": "取消",
  "camera.denied": "未能使用相機。",
  "camera.missing": "找不到相機。",
  "camera.unsupported": "這個瀏覽器無法使用相機。",
  "camera.fallbackHint": "可以改為從電腦選擇圖片。",
};

const DICTIONARIES: Record<Locale, Dictionary> = {
  en,
  "zh-Hant": zhHant,
};

export type Vars = Record<string, string | number>;

/** Substitute {placeholders} in a template. */
function fill(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match
  );
}

/** Look up a key and fill its placeholders. Falls back to English, then key. */
export function translate(locale: Locale, key: TKey, vars?: Vars): string {
  const table = DICTIONARIES[locale] ?? DICTIONARIES.en;
  return fill(table[key] ?? DICTIONARIES.en[key] ?? key, vars);
}

/** Best guess from the browser, restricted to supported locales. */
export function detectLocale(): Locale {
  if (typeof navigator === "undefined") return "en";
  for (const tag of navigator.languages?.length ? navigator.languages : [navigator.language]) {
    const lower = (tag ?? "").toLowerCase();
    if (lower.startsWith("zh")) {
      // Traditional regions: HK, MO, TW.
      if (/-(hk|mo|tw|hant)/.test(lower)) return "zh-Hant";
      continue;
    }
    if (lower.startsWith("en")) return "en";
  }
  return "en";
}

export function readStoredLocale(): Locale | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === "en" || raw === "zh-Hant" ? raw : null;
  } catch {
    return null; // storage blocked (private mode) — fall back to detection
  }
}

export function writeStoredLocale(locale: Locale): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* storage blocked — the choice just won't persist */
  }
}