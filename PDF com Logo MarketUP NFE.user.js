// ==UserScript==
// @name         PDF com Logo MarketUP NFE
// @namespace    http://tampermonkey.net/
// @version      2025
// @description  Adiciona uma logo ao PDF da DANFE
// @author       Eriandson Azevedo
// @match        https://*/index.html
// @match        https://*/index-adesampa.html
// @match        https://*/muppos/*
// @require      https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js
// @require      https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js
// @require      https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js
// @require      https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=marketup.com
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    // Evita execução em iframes
    if (window.self !== window.top) {
        console.log("Script não executado em iframe:", window.location.href);
        return;
    }

    console.log("Userscript iniciado em:", window.location.href, "em", new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }));

    // Data URL para imagem de fallback
    const BLANK_IMAGE_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALYAAACUCAMAAAAJSiMLAAAAA1BMVEX///+nxBvIAAAAMElEQVR4nO3BAQEAAACCIP+vbkhAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD8GmnMAAGjcCc5AAAAAElFTkSuQmCC';
    let cachedLogoURL = null;
    // Função para obter a URL da logo dinamicamente
    function getLogoURL() {
        if (cachedLogoURL) return cachedLogoURL;
        let installID = '2930402';
        try {
            const marketUPCurrentErp = localStorage.getItem('MarketUPCurrentErp');
            if (marketUPCurrentErp) {
                const erpData = JSON.parse(marketUPCurrentErp);
                if (erpData && erpData.InstallSummaryInfo && erpData.InstallSummaryInfo.InstallID) {
                    installID = erpData.InstallSummaryInfo.InstallID;
                    console.log("InstallID encontrado:", installID);
                }
            }
        } catch (error) {
            console.error("Erro ao acessar localStorage:", error.message);
        }
        cachedLogoURL = `https://marketup-cdn.s3.amazonaws.com/files/${installID}/profile/logo.png?v=636323545159742903`;
        return cachedLogoURL;
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    // Função para carregar biblioteca dinamicamente
    function loadScriptDynamically(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = () => {
                console.log("Biblioteca carregada dinamicamente:", url);
                resolve();
            };
            script.onerror = () => {
                console.error("Erro ao carregar biblioteca dinamicamente:", url);
                reject(new Error(`Falha ao carregar ${url}`));
            };
            document.head.appendChild(script);
        });
    }

    // Função para carregar a imagem da logo usando GM_xmlhttpRequest (CORS BYPASS)
    function loadImage(url) {
        return new Promise((resolve, reject) => {
            console.log("Tentando carregar logo com GM_xmlhttpRequest (CORS bypass):", url);
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                responseType: 'arraybuffer',
                onload: function(response) {
                    if (response.status >= 200 && response.status < 300) {
                        console.log("Logo capturada com sucesso via GM_xmlhttpRequest.");
                        // Converte arraybuffer para base64
                        const arrayBuffer = response.response;
                        const bytes = new Uint8Array(arrayBuffer);
                        let binary = '';
                        for (let i = 0; i < bytes.byteLength; i++) {
                            binary += String.fromCharCode(bytes[i]);
                        }
                        const base64 = window.btoa(binary);
                        const dataUrl = `data:image/png;base64,${base64}`;
                        // Cria imagem com data URL
                        const img = new Image();
                        img.onload = () => {
                            console.log("Logo carregada como imagem:", url);
                            resolve(img);
                        };
                        img.onerror = () => {
                            console.error("Erro ao carregar logo como imagem:", url);
                            reject(new Error("Erro ao carregar a imagem da logo"));
                        };
                        img.src = dataUrl;
                    } else {
                        console.warn(`Erro ao carregar logo de ${url}, usando imagem de fallback. Status: ${response.status}`);
                        const img = new Image();
                        img.onload = () => {
                            console.log("Imagem de fallback carregada:", BLANK_IMAGE_URL);
                            resolve(img);
                        };
                        img.onerror = () => {
                            console.error("Erro ao carregar imagem de fallback:", BLANK_IMAGE_URL);
                            reject(new Error("Erro ao carregar a imagem de fallback"));
                        };
                        img.src = BLANK_IMAGE_URL;
                    }
                },
                onerror: function(error) {
                    console.warn(`Erro de rede ao carregar logo de ${url}, usando imagem de fallback.`, error);
                    const img = new Image();
                    img.onload = () => {
                        console.log("Imagem de fallback carregada:", BLANK_IMAGE_URL);
                        resolve(img);
                    };
                    img.onerror = () => {
                        console.error("Erro ao carregar imagem de fallback:", BLANK_IMAGE_URL);
                        reject(new Error("Erro ao carregar a imagem de fallback"));
                    };
                    img.src = BLANK_IMAGE_URL;
                }
            });
        });
    }

    // Função para verificar o carregamento das bibliotecas
    async function waitForLibraries(timeout = 1000) {
        return new Promise(async (resolve, reject) => {
            const startTime = Date.now();
            const check = async () => {
                console.log("Verificando bibliotecas... pdfLib:", !!window.PDFLib, "html2canvas:", !!window.html2canvas);
                if (window.PDFLib && window.PDFLib.PDFDocument && window.html2canvas) {
                    console.log("Bibliotecas pdf-lib e html2canvas carregadas com sucesso.");
                    resolve();
                } else if (Date.now() - startTime > timeout) {
                    console.error("Timeout: Alguma biblioteca não carregada.");
                    console.error("pdfLib disponível:", !!window.PDFLib, "html2canvas disponível:", !!window.html2canvas);
                    try {
                        if (!window.PDFLib) await loadScriptDynamically('https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js');
                        if (!window.html2canvas) await loadScriptDynamically('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/html2canvas.min.js');
                        if (window.PDFLib && window.PDFLib.PDFDocument && window.html2canvas) {
                            console.log("Bibliotecas carregadas via fallback.");
                            resolve();
                        } else {
                            reject(new Error("Falha ao carregar bibliotecas mesmo com fallback."));
                        }
                    } catch (error) {
                        reject(error);
                    }
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }

    // Função para capturar o blob PDF e extrair a chave de acesso (CORS BYPASS)
    async function captureBlobPDF(timeout = 10000) {
        return new Promise((resolve, reject) => {
            console.log("Iniciando captura de blob PDF...");

            let pdfURL = null;
            let chave = null;
            let blobCaptured = false;

            // Função para tentar fetch com GM_xmlhttpRequest (CORS BYPASS)
            function tryFetchPDF(url) {
                return new Promise((resolveFetch, rejectFetch) => {
                    console.log("Tentando fetch do PDF com GM_xmlhttpRequest (CORS bypass):", url);
                    GM_xmlhttpRequest({
                        method: 'GET',
                        url: url,
                        responseType: 'arraybuffer',
                        onload: function(response) {
                            if (response.status >= 200 && response.status < 300) {
                                console.log("PDF capturado com sucesso via GM_xmlhttpRequest.");
                                resolveFetch(response.response);
                            } else {
                                console.error("Erro ao fetch PDF via GM_xmlhttpRequest:", response.status, response.statusText);
                                rejectFetch(new Error(`Falha ao fetch PDF: ${response.status}`));
                            }
                        },
                        onerror: function(error) {
                            console.error("Erro de rede ao fetch PDF via GM_xmlhttpRequest:", error);
                            rejectFetch(error);
                        }
                    });
                });
            }

            // Intercepta fetch
            const originalFetch = window.fetch;
            window.fetch = async function(resource, init) {
                const response = await originalFetch.call(window, resource, init);
                if (typeof resource === 'string' && resource.includes('marketup-cdn') && resource.endsWith('.pdf')) {
                    pdfURL = resource;
                    console.log("URL do PDF detectada via fetch:", pdfURL);
                    const chaveMatch = pdfURL.match(/\/(\d{44})\.pdf(?:\?.*)?$/);
                    if (chaveMatch) {
                        chave = chaveMatch[1];
                        console.log("Chave de acesso extraída da URL (fetch):", chave);
                    }
                    // Tenta fetch com GM_xmlhttpRequest
                    try {
                        const arrayBuffer = await tryFetchPDF(pdfURL);
                        blobCaptured = true;
                        cleanup();
                        resolve({ arrayBuffer, chave });
                    } catch (error) {
                        console.error("Falha ao fetch PDF via GM_xmlhttpRequest no fetch:", error.message);
                    }
                }
                return response;
            };

            // Intercepta XMLHttpRequest
            const originalXHROpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(method, url) {
                if (url.includes('marketup-cdn') && url.endsWith('.pdf')) {
                    pdfURL = url;
                    console.log("URL do PDF detectada via XMLHttpRequest:", pdfURL);
                    const chaveMatch = url.match(/\/(\d{44})\.pdf(?:\?.*)?$/);
                    if (chaveMatch) {
                        chave = chaveMatch[1];
                        console.log("Chave de acesso extraída da URL (XMLHttpRequest):", chave);
                    }
                    // Tenta fetch com GM_xmlhttpRequest
                    tryFetchPDF(pdfURL)
                        .then(arrayBuffer => {
                            blobCaptured = true;
                            cleanup();
                            resolve({ arrayBuffer, chave });
                        })
                        .catch(error => {
                            console.error("Falha ao fetch PDF via GM_xmlhttpRequest no XMLHttpRequest:", error.message);
                        });
                }
                return originalXHROpen.apply(this, arguments);
            };

            // Monitora cliques em links <a>
            const handleClick = function(event) {
                const target = event.target.closest('a');
                if (target && target.href && target.href.includes('marketup-cdn') && target.href.endsWith('.pdf')) {
                    pdfURL = target.href;
                    console.log("URL do PDF detectada via clique em <a>:", pdfURL);
                    const chaveMatch = pdfURL.match(/\/(\d{44})\.pdf(?:\?.*)?$/);
                    if (chaveMatch) {
                        chave = chaveMatch[1];
                        console.log("Chave de acesso extraída da URL (clique):", chave);
                    }
                    // Tenta fetch com GM_xmlhttpRequest
                    tryFetchPDF(pdfURL)
                        .then(arrayBuffer => {
                            blobCaptured = true;
                            cleanup();
                            resolve({ arrayBuffer, chave });
                        })
                        .catch(error => {
                            console.error("Falha ao fetch PDF via GM_xmlhttpRequest no clique:", error.message);
                        });
                }
            };
            document.addEventListener('click', handleClick, true);

            // Monitora elementos <a> com href blob:https://
            const observer = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeName === 'A' && node.href && node.href.startsWith('blob:https://')) {
                            console.log("Link blob PDF detectado:", node.href);
                            fetch(node.href)
                                .then(response => {
                                    if (!response.ok) throw new Error("Falha ao acessar blob: " + response.status);
                                    return response.arrayBuffer();
                                })
                                .then(arrayBuffer => {
                                    console.log("Blob PDF capturado com sucesso via MutationObserver.");
                                    blobCaptured = true;
                                    cleanup();
                                    resolve({ arrayBuffer, chave });
                                })
                                .catch(err => {
                                    console.error("Erro ao capturar blob PDF via MutationObserver:", err.message);
                                });
                        }
                    });
                });
            });
            observer.observe(document.body, { childList: true, subtree: true });

            // Intercepta URL.createObjectURL
            const originalCreateObjectURL = URL.createObjectURL;
            URL.createObjectURL = function(blob) {
                const url = originalCreateObjectURL.call(URL, blob);
                if (blob.type === 'application/pdf' && url.startsWith('blob:https://')) {
                    console.log("Blob PDF detectado via createObjectURL:", url);
                    fetch(url)
                        .then(response => {
                            if (!response.ok) throw new Error("Falha ao acessar blob: " + response.status);
                            return response.arrayBuffer();
                        })
                        .then(arrayBuffer => {
                            console.log("Blob PDF capturado com sucesso via createObjectURL.");
                            blobCaptured = true;
                            cleanup();
                            resolve({ arrayBuffer, chave });
                        })
                        .catch(err => {
                            console.error("Erro ao capturar blob PDF via createObjectURL:", err.message);
                        });
                }
                return url;
            };

            // Função para limpar interceptadores e observadores
            function cleanup() {
                observer.disconnect();
                window.fetch = originalFetch;
                XMLHttpRequest.prototype.open = originalXHROpen;
                URL.createObjectURL = originalCreateObjectURL;
                document.removeEventListener('click', handleClick);
                console.log("Interceptadores e observadores limpos.");
            }

            // Timeout com fallback para download manual
            setTimeout(() => {
                if (!blobCaptured) {
                    console.log("Timeout: Nenhum blob PDF detectado após", timeout, "ms.");
                    cleanup();
                    if (pdfURL) {
                        console.log("Tentando fallback: Solicitando download manual do PDF...");
                        alert("Não foi possível capturar o PDF automaticamente. Clique em OK para abrir o PDF em uma nova aba, baixe-o manualmente e depois selecione o arquivo baixado.");
                        window.open(pdfURL, '_blank');
                        // Cria input para upload do PDF
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'application/pdf';
                        input.style.display = 'none';
                        document.body.appendChild(input);
                        input.addEventListener('change', async (event) => {
                            const file = event.target.files[0];
                            if (file && file.type === 'application/pdf') {
                                console.log("Arquivo PDF selecionado pelo usuário:", file.name);
                                const arrayBuffer = await file.arrayBuffer();
                                resolve({ arrayBuffer, chave });
                            } else {
                                console.error("Nenhum arquivo PDF válido selecionado.");
                                alert("Por favor, selecione um arquivo PDF válido.");
                                reject(new Error("Nenhum arquivo PDF válido selecionado."));
                            }
                            document.body.removeChild(input);
                        });
                        input.click();
                    } else {
                        reject(new Error("Nenhum blob PDF capturado e nenhuma URL de PDF detectada."));
                    }
                }
            }, timeout);
        });
    }

    // Função para adicionar a logo a todas as páginas do PDF
    async function addLogoToPDF(pdfArrayBuffer, chave) {
        try {
            await waitForLibraries();
            const { PDFDocument } = window.PDFLib;

            console.log("Carregando PDF do blob...");
            const pdfDoc = await PDFDocument.load(pdfArrayBuffer);

            // Define o nome do arquivo
            const fileName = chave ? `${chave}.pdf` : 'danfe_com_logo.pdf';
            console.log("Nome do arquivo definido:", fileName);

            // Carrega a imagem da logo
            const logoUrl = getLogoURL();
            const logoImg = await loadImage(logoUrl);
            const logoCanvas = document.createElement('canvas');
            logoCanvas.width = 100;
            logoCanvas.height = 100;
            const ctx = logoCanvas.getContext('2d');
            ctx.drawImage(logoImg, 0, 0, 100, 100);
            const logoBytes = logoCanvas.toDataURL('image/png');

            // Incorpora a logo no PDF
            const logoImage = await pdfDoc.embedPng(logoBytes);
            const pages = pdfDoc.getPages();
            console.log(`Adicionando logo a ${pages.length} página(s) do PDF.`);

            // Adiciona a logo em todas as páginas
            pages.forEach(page => {
                const { width, height } = page.getSize();
                // Converte posições de px para pontos (1px = 0.75pt)
                const logoWidth = 111 * 0.75;
                const logoHeight = 111 * 0.75;
                const logoX = 60 * 0.75;
                const logoY = height - (122 * 0.75) - logoHeight;

                page.drawImage(logoImage, {
                    x: logoX,
                    y: logoY,
                    width: logoWidth,
                    height: logoHeight,
                });
            });
            console.log("Logo adicionada a todas as páginas do PDF.");

            // Salva o PDF modificado
            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
            console.log("PDF modificado baixado como:", fileName);
        } catch (error) {
            console.error("Erro ao adicionar logo ao PDF:", error.message);
            alert("Erro ao processar o PDF. Verifique o console para detalhes.");
            throw error;
        }
    }

    // Detecta cliques nos botões #viewNf, #invoice_detail_emitir e botão NFCe usando MutationObserver
function setupButtonListeners() {
    const observer = new MutationObserver((mutations, obs) => {
        // Detecta o botão #viewNf
        const viewNfButton = document.getElementById('viewNf');
        if (viewNfButton && !viewNfButton.dataset.listenerAttached) {
            console.log("Botão #viewNf encontrado via MutationObserver!");
            viewNfButton.addEventListener('click', async (event) => {
                console.log("Botão #viewNf clicado!");
                event.preventDefault();
                try {
                    const { arrayBuffer, chave } = await captureBlobPDF();
                    if (arrayBuffer) {
                        console.log("Processando blob PDF...");
                        await addLogoToPDF(arrayBuffer, chave);
                    } else {
                        console.error("Nenhum blob PDF capturado.");
                        alert("Nenhum PDF foi detectado. Verifique o console para detalhes.");
                    }
                } catch (error) {
                    console.error("Erro ao processar clique no #viewNf:", error.message);
                    alert("Erro ao processar o PDF. Verifique o console para detalhes.");
                }
            });
            viewNfButton.dataset.listenerAttached = 'true';
        }

        // Detecta o botão #invoice_detail_emitir (NFe)
        const nfeButton = document.getElementById('invoice_detail_emitir');
        if (nfeButton && !nfeButton.dataset.listenerAttached) {
            console.log("Botão #invoice_detail_emitir encontrado via MutationObserver!");
            nfeButton.addEventListener('click', async (event) => {
                console.log("Botão #invoice_detail_emitir clicado!");
                event.preventDefault();
                try {
                    const { arrayBuffer, chave } = await captureBlobPDF();
                    if (arrayBuffer) {
                        console.log("Processando blob PDF...");
                        await addLogoToPDF(arrayBuffer, chave);
                    } else {
                        console.error("Nenhum blob PDF capturado.");
                        alert("Nenhum PDF foi detectado. Verifique o console para detalhes.");
                    }
                } catch (error) {
                    console.error("Erro ao processar clique no #invoice_detail_emitir:", error.message);
                    alert("Erro ao processar o PDF. Verifique o console para detalhes.");
                }
            });
            nfeButton.dataset.listenerAttached = 'true';
        }

        // Detecta o botão NFCe (baseado na classe 'issue' e ng-click="controller.issueNfce()")
        const nfceButtons = document.querySelectorAll('button.issue[ng-click="controller.issueNfce()"]');
        nfceButtons.forEach((nfceButton, index) => {
            if (!nfceButton.dataset.listenerAttached) {
                console.log(`Botão NFCe (índice ${index}) encontrado via MutationObserver!`);
                nfceButton.addEventListener('click', async (event) => {
                    console.log(`Botão NFCe (índice ${index}) clicado!`);
                    event.preventDefault();
                    try {
                        const { arrayBuffer, chave } = await captureBlobPDF();
                        if (arrayBuffer) {
                            console.log("Processando blob PDF...");
                            await addLogoToPDF(arrayBuffer, chave);
                        } else {
                            console.error("Nenhum blob PDF capturado.");
                            alert("Nenhum PDF foi detectado. Verifique o console para detalhes.");
                        }
                    } catch (error) {
                        console.error(`Erro ao processar clique no botão NFCe (índice ${index}):`, error.message);
                        alert("Erro ao processar o PDF. Verifique o console para detalhes.");
                    }
                });
                nfceButton.dataset.listenerAttached = 'true';
            }
        });

    });

    observer.observe(document.body, { childList: true, subtree: true });
    console.log("MutationObserver iniciado para detectar botões #viewNf, #invoice_detail_emitir e NFCe...");
}

// Detecta mudanças de URL em SPAs (Single Page Applications)
(function monitorURLChanges() {
    let lastUrl = location.href;
    new MutationObserver(() => {
        const currentUrl = location.href;
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            setupButtonListeners();
        }
    }).observe(document, { subtree: true, childList: true });

    // Função para substituir a logo
    function substituirLogo() {
        const minhaLogo = getLogoURL();

        // Verifica iframes
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach((iframe, index) => {
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                const clientLogoImages = iframeDoc.querySelectorAll('img.client_logo');
                clientLogoImages.forEach((img, imgIndex) => {
                    if (img.src !== minhaLogo) {
                        img.src = minhaLogo;
                    } else {
                    }
                });
            } catch (e) {
                console.warn(`Erro ao acessar o iframe ${index}: ${e.message}`);
            }
        });
    }

    // Observador para mudanças no DOM
    const observer = new MutationObserver(() => {
        substituirLogo();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src']
    });

    // Executa a substituição inicial
    window.addEventListener('load', () => {
        substituirLogo();
    });
    })();
})();
