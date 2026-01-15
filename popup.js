document.addEventListener('DOMContentLoaded', function() {
    
    // HTML Elementleri
    const langSelect = document.getElementById('langSelect');
    const scanBtn = document.getElementById('scanBtn');
    const pieceInfo = document.getElementById('piece-info');
    const mainMove = document.getElementById('main-move');
    const btnW = document.getElementById('btnW');
    const btnB = document.getElementById('btnB');
    const range = document.getElementById('depthRange');
    const timeLabel = document.getElementById('timeLabel');
    const statusMsg = document.getElementById('statusMsg');

    let userColor = 'w'; 
    let stockfish = null;
    let currentFen = "";
    // DİKKAT: Burayı 'en' yaptık. Eğer hafızada kayıt yoksa İngilizce başlar.
    let currentLang = localStorage.getItem('chessLang') || 'en'; 

    // --- DİL SÖZLÜĞÜ ---
    const translations = {
        tr: {
            title: "OTO ANALİZ",
            white: "BEYAZ",
            black: "SİYAH",
            scanBtn: "TAHTAYI TARA",
            rescanBtn: "YENİDEN TARA",
            waiting: "Siteden bekleniyor...",
            thinking: "Düşünülüyor...",
            scanning: "Aranıyor...",
            notFound: "Tahta Bulunamadı!",
            gameEnded: "OYUN BİTTİ",
            errorSf: "HATA: Motor dosyası eksik!",
            status: "STOCKFISH 11",
            statusReady: "Konum Analiz Ediliyor...",
            statusErr: "Lütfen oyunu açın ve yenileyin.",
            timePrefix: "Düşünme:",
            promo: "TERFİ",
            movePre: "OYNUYOR", 
            moveTo: "'E GİT"   
        },
        en: {
            title: "AUTO ANALYZE",
            white: "WHITE",
            black: "BLACK",
            scanBtn: "SCAN BOARD",
            rescanBtn: "RE-SCAN",
            waiting: "Waiting for site...",
            thinking: "Thinking...",
            scanning: "Scanning...",
            notFound: "Board Not Found!",
            gameEnded: "GAME OVER",
            errorSf: "ERROR: Engine missing!",
            status: "STOCKFISH 11",
            statusReady: "Analyzing position...",
            statusErr: "Please open game and refresh.",
            timePrefix: "Thinking:",
            promo: "PROMOTION",
            movePre: "MOVES",   
            moveTo: " TO"       
        }
    };

    // Taş İsimleri
    const pieceNames = {
        'p': { tr: 'PİYON', en: 'PAWN' },
        'r': { tr: 'KALE', en: 'ROOK' },
        'n': { tr: 'AT', en: 'KNIGHT' },
        'b': { tr: 'FİL', en: 'BISHOP' },
        'q': { tr: 'VEZİR', en: 'QUEEN' },
        'k': { tr: 'ŞAH', en: 'KING' }
    };

    // --- Başlangıç Ayarları ---
    langSelect.value = currentLang;
    updateLanguage(currentLang);

    // Dil Değişimi
    langSelect.addEventListener('change', () => {
        currentLang = langSelect.value;
        localStorage.setItem('chessLang', currentLang); 
        updateLanguage(currentLang);
    });

    function updateLanguage(lang) {
        document.querySelectorAll('[data-key]').forEach(el => {
            const key = el.getAttribute('data-key');
            if (translations[lang][key]) {
                el.innerText = translations[lang][key];
            }
        });
        updateTimeLabel();
    }

    // --- Stockfish Başlat ---
    try {
        stockfish = new Worker('stockfish.js');
        
        stockfish.onmessage = function(event) {
            const line = event.data;
            if (line && line.startsWith('bestmove')) {
                const parts = line.split(' ');
                const moveData = parts[1];
                
                if (!moveData || moveData === "(none)") {
                    mainMove.innerText = translations[currentLang].gameEnded;
                    pieceInfo.innerText = "---";
                } else {
                    const fromSq = moveData.substring(0, 2);
                    const toSq = moveData.substring(2, 4);
                    
                    const pieceChar = getPieceAtSquare(currentFen, fromSq);
                    let pName = "Piece";
                    if (pieceNames[pieceChar.toLowerCase()]) {
                        pName = pieceNames[pieceChar.toLowerCase()][currentLang];
                    }

                    pieceInfo.innerText = `${pName} ${translations[currentLang].movePre}`; 
                    
                    if (currentLang === 'tr') {
                        mainMove.innerText = `${toSq.toUpperCase()}'E`;
                    } else {
                        mainMove.innerText = `${translations[currentLang].moveTo} ${toSq.toUpperCase()}`;
                    }
                    
                    if (moveData.length === 5) {
                        mainMove.innerText += ` (${translations[currentLang].promo})`;
                    }
                }
                
                scanBtn.innerText = translations[currentLang].rescanBtn;
                scanBtn.disabled = false;
            }
        };
    } catch (e) {
        pieceInfo.innerText = translations[currentLang].errorSf;
    }

    // Butonlar
    btnW.onclick = () => { userColor = 'w'; updateBtns(); };
    btnB.onclick = () => { userColor = 'b'; updateBtns(); };

    function updateBtns() {
        if(userColor === 'w') {
            btnW.classList.add('active-w'); btnB.classList.remove('active-b');
        } else {
            btnB.classList.add('active-b'); btnW.classList.remove('active-w');
        }
    }

    range.oninput = updateTimeLabel;
    
    function updateTimeLabel() {
        const txt = translations[currentLang].timePrefix;
        timeLabel.innerText = `${txt} ${(range.value/10).toFixed(1)} s`;
    }

    // --- Tara ve Hesapla ---
    scanBtn.onclick = () => {
        pieceInfo.innerText = translations[currentLang].scanning;
        mainMove.innerText = "⏳";
        scanBtn.disabled = true;

        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if(!tabs[0].id) return;
            
            chrome.tabs.sendMessage(tabs[0].id, {action: "getFEN"}, function(response) {
                if (chrome.runtime.lastError || !response || !response.fen) {
                    pieceInfo.innerText = translations[currentLang].notFound;
                    mainMove.innerText = "X";
                    statusMsg.innerText = translations[currentLang].statusErr;
                    scanBtn.disabled = false;
                    scanBtn.innerText = translations[currentLang].scanBtn;
                    return;
                }

                let fen = response.fen;
                let parts = fen.split(' ');
                parts[1] = userColor; 
                currentFen = parts.join(' ');

                statusMsg.innerText = translations[currentLang].statusReady;
                pieceInfo.innerText = translations[currentLang].thinking;
                
                stockfish.postMessage('uci');
                stockfish.postMessage('position fen ' + currentFen);
                let waitTime = range.value * 100; 
                stockfish.postMessage('go movetime ' + waitTime);
            });
        });
    };

    function getPieceAtSquare(fen, square) {
        if (!fen || !square) return '?';
        const file = square[0]; 
        const rank = square[1]; 
        const files = ['a','b','c','d','e','f','g','h'];
        const fileIdx = files.indexOf(file);
        const rankIdx = 8 - parseInt(rank);
        const boardFen = fen.split(' ')[0];
        const rows = boardFen.split('/');
        const targetRow = rows[rankIdx];
        let currentCol = 0;
        for (let char of targetRow) {
            if (!isNaN(char)) {
                currentCol += parseInt(char);
            } else {
                if (currentCol === fileIdx) return char;
                currentCol++;
            }
            if (currentCol > fileIdx) return '?';
        }
        return '?';
    }
});