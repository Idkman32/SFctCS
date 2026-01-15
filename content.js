// content.js - GÜÇLENDİRİLMİŞ VERSİYON

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getFEN") {
        console.log("Analiz isteği alındı, tahta aranıyor...");
        
        let fen = "";

        // 1. YÖNTEM: Chess.com DOM Tarama (En Yaygın)
        if (window.location.hostname.includes("chess.com")) {
            fen = scanChessCom();
        } 
        
        // 2. YÖNTEM: Lichess DOM Tarama
        else if (window.location.hostname.includes("lichess.org")) {
            fen = scanLichess();
        }

        // 3. YÖNTEM: Hala bulunamadıysa Sayfa Kaynağında FEN ara (Acil Durum)
        if (!fen) {
            console.log("DOM taraması başarısız, kaynak koduna bakılıyor...");
            fen = findFenInPage();
        }

        if (fen) {
            console.log("FEN BULUNDU:", fen);
            sendResponse({ fen: fen });
        } else {
            console.error("HİÇBİR YÖNTEMLE FEN BULUNAMADI.");
            sendResponse({ fen: null });
        }
    }
});

// --- CHESS.COM TARAYICI ---
function scanChessCom() {
    // Chess.com genelde 'square-11' (a1) formatı kullanır.
    // Ancak bazen HTML yapısı değişir. En garantisi kareleri koordinatla aramaktır.
    
    let board = [];
    
    // Satranç tahtası 8. satırdan 1. satıra doğru okunur
    for (let r = 8; r >= 1; r--) { 
        let empty = 0;
        let rowStr = "";
        
        for (let c = 1; c <= 8; c++) {
            // Kareyi bulmaya çalış (farklı versiyonlar için çoklu deneme)
            // Versiyon A: .piece.square-11
            // Versiyon B: .piece.sq-11
            let pieceEl = document.querySelector(`.piece.square-${c}${r}, .piece.sq-${c}${r}`);
            
            if (pieceEl) {
                if (empty > 0) { rowStr += empty; empty = 0; }
                
                // Sınıfları oku: "piece wp square-11" -> wp (white pawn)
                let cls = pieceEl.className;
                let char = "";

                // Renk ve Tip Tespiti
                if (cls.includes("wp") || cls.includes("pawn") && cls.includes("white")) char = "P";
                else if (cls.includes("wn") || cls.includes("knight") && cls.includes("white")) char = "N";
                else if (cls.includes("wb") || cls.includes("bishop") && cls.includes("white")) char = "B";
                else if (cls.includes("wr") || cls.includes("rook") && cls.includes("white")) char = "R";
                else if (cls.includes("wq") || cls.includes("queen") && cls.includes("white")) char = "Q";
                else if (cls.includes("wk") || cls.includes("king") && cls.includes("white")) char = "K";
                
                else if (cls.includes("bp") || cls.includes("pawn") && cls.includes("black")) char = "p";
                else if (cls.includes("bn") || cls.includes("knight") && cls.includes("black")) char = "n";
                else if (cls.includes("bb") || cls.includes("bishop") && cls.includes("black")) char = "b";
                else if (cls.includes("br") || cls.includes("rook") && cls.includes("black")) char = "r";
                else if (cls.includes("bq") || cls.includes("queen") && cls.includes("black")) char = "q";
                else if (cls.includes("bk") || cls.includes("king") && cls.includes("black")) char = "k";
                
                rowStr += char;
            } else {
                empty++;
            }
        }
        if (empty > 0) rowStr += empty;
        board.push(rowStr);
    }
    
    // Eğer tahta boş çıktıysa (hiç taş yoksa) muhtemelen tarama başarısızdır.
    let result = board.join("/");
    if (result === "8/8/8/8/8/8/8/8") return ""; 
    
    return result + " w - - 0 1";
}

// --- LICHEss TARAYICI ---
function scanLichess() {
    // Lichess DOM yapısı çok karışıktır (transform translate kullanır).
    // En güvenli yol, sayfa başlığı veya gizli script verileridir.
    return findFenInPage(); 
}

// --- GENEL FEN BULUCU (Regex) ---
function findFenInPage() {
    const html = document.body.innerHTML;
    // Regex ile FEN formatına benzeyen uzun dizgeleri arar
    // Örn: rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR
    const fenRegex = /([rnbqkpRNBQKP1-8]{1,8}\/){7}[rnbqkpRNBQKP1-8]{1,8} [wb] (K?Q?k?q?|-) (.|-) \d+ \d+/;
    
    let match = html.match(fenRegex);
    if (match) return match[0];
    
    // Bazen sadece tahta kısmı olur, devamı olmaz
    const shortFenRegex = /([rnbqkpRNBQKP1-8]{1,8}\/){7}[rnbqkpRNBQKP1-8]{1,8}/;
    match = html.match(shortFenRegex);
    if (match) return match[0] + " w - - 0 1";

    return "";
}