// ==UserScript==
// @name         PDF com Logo MarketUP
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

    // Função para debounce
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
                resolve();
            };
            script.onerror = () => {
                console.error("Erro ao carregar biblioteca dinamicamente:", url);
                reject(new Error(`Falha ao carregar ${url}`));
            };
            document.head.appendChild(script);
        });
    }

    // Função para carregar a imagem do logotipo usando GM_xmlhttpRequest (CORS BYPASS)
    function loadImage(url) {
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                responseType: 'arraybuffer',
                onload: function(response) {
                    if (response.status >= 200 && response.status < 300) {
                        const arrayBuffer = response.response;
                        const bytes = new Uint8Array(arrayBuffer);
                        let binary = '';
                        for (let i = 0; i < bytes.byteLength; i++) {
                            binary += String.fromCharCode(bytes[i]);
                        }
                        const base64 = window.btoa(binary);
                        const dataUrl = `data:image/png;base64,${base64}`;
                        const img = new Image();
                        img.onload = () => {
                            console.log("Logo carregada como imagem:", url);
                            resolve(img);
                        };
                        img.onerror = () => {
                            console.warn("Erro ao carregar logo como imagem, usando fallback:", url);
                            const fallbackImg = new Image();
                            fallbackImg.onload = () => resolve(fallbackImg);
                            fallbackImg.onerror = () => {
                                console.error("Erro ao carregar imagem de fallback:", BLANK_IMAGE_URL);
                                resolve(fallbackImg);
                            };
                            fallbackImg.src = BLANK_IMAGE_URL;
                        };
                        img.src = dataUrl;
                    } else {
                        console.warn(`Erro ao carregar logo de ${url}, usando imagem de fallback. Status: ${response.status}`);
                        const fallbackImg = new Image();
                        fallbackImg.onload = () => resolve(fallbackImg);
                        fallbackImg.onerror = () => {
                            console.error("Erro ao carregar imagem de fallback:", BLANK_IMAGE_URL);
                            resolve(fallbackImg);
                        };
                        fallbackImg.src = BLANK_IMAGE_URL;
                    }
                },
                onerror: function(error) {
                    console.warn(`Erro de rede ao carregar logo de ${url}, usando imagem de fallback.`, error);
                    const fallbackImg = new Image();
                    fallbackImg.onload = () => resolve(fallbackImg);
                    fallbackImg.onerror = () => {
                        console.error("Erro ao carregar imagem de fallback:", BLANK_IMAGE_URL);
                        resolve(fallbackImg);
                    };
                    fallbackImg.src = BLANK_IMAGE_URL;
                }
            });
        });
    }

    // Função para verificar o carregamento das bibliotecas
    async function waitForLibraries(timeout = 1000) {
        return new Promise(async (resolve, reject) => {
            const startTime = Date.now();
            const check = async () => {
                if (window.PDFLib && window.PDFLib.PDFDocument && window.html2canvas) {
                    resolve();
                } else if (Date.now() - startTime > timeout) {
                    console.error("Timeout: Alguma biblioteca não carregada.");
                    console.error("pdfLib disponível:", !!window.PDFLib, "html2canvas disponível:", !!window.html2canvas);
                    try {
                        if (!window.PDFLib) await loadScriptDynamically('https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js');
                        if (!window.html2canvas) await loadScriptDynamically('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/html2canvas.min.js');
                        if (window.PDFLib && window.PDFLib.PDFDocument && window.html2canvas) {
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

    // Função para capturar a chave de acesso do DOM
    function getChaveFromDOM() {
        let chave = null;
        const spanElement = document.querySelector('span.col-xs-12.ng-binding');
        if (spanElement) {
            const text = spanElement.textContent.trim();
            if (/^\d{44}$/.test(text)) {
                console.log("Chave de acesso encontrada no elemento <span>:", text);
                return text;
            } else {
                console.warn("Conteúdo do elemento <span> não é uma chave válida:", text);
            }
        } else {
            console.warn("Elemento <span class='col-xs-12 ng-binding'> não encontrado.");
        }

        const elements = document.querySelectorAll('span, div, p');
        for (let element of elements) {
            const text = element.textContent.trim();
            if (/^\d{44}$/.test(text)) {
                console.log("Chave de acesso encontrada em outro elemento:", text);
                return text;
            }
        }

        console.warn("Nenhuma chave de acesso encontrada no DOM.");
        return chave;
    }

    // Função para extrair o nome do arquivo a partir do DOM
    function getFileNameFromDOM() {
	// Verifica o número do pedido em <p class="order-number ng-binding">
        const orderNumberElement = document.querySelector('p.order-number.ng-binding');
        if (orderNumberElement) {
            const orderNumber = orderNumberElement.textContent.trim();
            if (/^\d+$/.test(orderNumber)) {
                console.log("Número do pedido encontrado em <p class='order-number ng-binding'>:", orderNumber);
                return `Pedido de Venda ${orderNumber}.pdf`;
            } else {
                console.warn("Conteúdo de <p class='order-number ng-binding'> não é um número válido:", orderNumber);
            }
        } else {
            console.warn("Elemento <p class='order-number ng-binding'> não encontrado.");
        }

	// Verifica o título em <span id="title"> para orçamentos
        const titleElement = document.querySelector('span#title');
        if (titleElement) {
            const titleText = titleElement.textContent.trim();
            console.log("Conteúdo do <span id='title'>:", titleText);
            const orcamentoMatch = titleText.match(/Orçamento de Venda (\d+)/i);
            if (orcamentoMatch) {
                const numero = orcamentoMatch[1];
                return `orcamento-de-venda-${numero}.pdf`;
            }
            console.warn("Título não corresponde a Orçamento de Venda:", titleText);
        } else {
            console.warn("Elemento <span id='title'> não encontrado.");
        }

        return null;
    }

    // Função para capturar o blob PDF e extrair a chave de acesso (CORS BYPASS)
    async function captureBlobPDF(timeout = 15000) {
        return new Promise((resolve, reject) => {
            console.log("Iniciando captura de blob PDF...");

            let pdfURL = null;
            let chave = getChaveFromDOM();
            let blobCaptured = false;

            function tryFetchPDF(url) {
                return new Promise((resolveFetch, rejectFetch) => {
                    GM_xmlhttpRequest({
                        method: 'GET',
                        url: url,
                        responseType: 'arraybuffer',
                        onload: function(response) {
                            if (response.status >= 200 && response.status < 300) {
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

	// Monitora alterações no DOM para detectar a chave dinamicamente
            const chaveObserver = new MutationObserver((mutations) => {
                if (!chave) {
                    chave = getChaveFromDOM();
                    if (chave) {
                        console.log("Chave de acesso detectada via MutationObserver:", chave);
                    }
                }
            });
            chaveObserver.observe(document.body, { childList: true, subtree: true, characterData: true });

	// Busca de interceptação
            const originalFetch = window.fetch;
            window.fetch = async function(resource, init) {
                const response = await originalFetch.call(window, resource, init);
                if (typeof resource === 'string' && resource.includes('marketup-cdn') && resource.endsWith('.pdf')) {
                    pdfURL = resource;
                    if (!chave) {
                        const chaveMatch = pdfURL.match(/\/(\d{44})\.pdf(?:\?.*)?$/);
                        if (chaveMatch) {
                            chave = chaveMatch[1];
                            console.log("Chave de acesso extraída da URL (fetch):", chave);
                        }
                    }
                    try {
                        const arrayBuffer = await tryFetchPDF(pdfURL);
                        blobCaptured = true;
                        cleanupInterceptors();
                        resolve({ arrayBuffer, chave, url: pdfURL });
                    } catch (error) {
                        console.error("Falha ao fetch PDF via GM_xmlhttpRequest no fetch:", error.message);
                    }
                }
                return response;
            };

            const originalXHROpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(method, url) {
                if (url.includes('marketup-cdn') && url.endsWith('.pdf')) {
                    pdfURL = url;
                    if (!chave) {
                        const chaveMatch = url.match(/\/(\d{44})\.pdf(?:\?.*)?$/);
                        if (chaveMatch) {
                            chave = chaveMatch[1];
                            console.log("Chave de acesso extraída da URL (XMLHttpRequest):", chave);
                        }
                    }
                    tryFetchPDF(url)
                        .then(arrayBuffer => {
                            blobCaptured = true;
                            cleanupInterceptors();
                            resolve({ arrayBuffer, chave, url: pdfURL });
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
                    if (!chave) {
                        const chaveMatch = pdfURL.match(/\/(\d{44})\.pdf(?:\?.*)?$/);
                        if (chaveMatch) {
                            chave = chaveMatch[1];
                            console.log("Chave de acesso extraída da URL (clique):", chave);
                        }
                    }
                    tryFetchPDF(pdfURL)
                        .then(arrayBuffer => {
                            blobCaptured = true;
                            cleanupInterceptors();
                            resolve({ arrayBuffer, chave, url: pdfURL });
                        })
                        .catch(error => {
                            console.error("Falha ao fetch PDF via GM_xmlhttpRequest no clique:", error.message);
                        });
                }
            };
            document.addEventListener('click', handleClick, true);

	// Monitora elementos <a> com href blob:https://
            const blobObserver = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeName === 'A' && node.href && node.href.startsWith('blob:https://')) {
                            fetch(node.href)
                                .then(response => {
                                    if (!response.ok) throw new Error("Falha ao acessar blob: " + response.status);
                                    return response.arrayBuffer();
                                })
                                .then(arrayBuffer => {
                                    blobCaptured = true;
                                    cleanupInterceptors();
                                    resolve({ arrayBuffer, chave, url: pdfURL });
                                })
                                .catch(err => {
                                    console.error("Erro ao capturar blob PDF via MutationObserver:", err.message);
                                });
                        }
                    });
                });
            });
            blobObserver.observe(document.body, { childList: true, subtree: true });

	// Intercepta URL.createObjectURL
            const originalCreateObjectURL = URL.createObjectURL;
            URL.createObjectURL = function(blob) {
                const url = originalCreateObjectURL.call(URL, blob);
                if (blob.type === 'application/pdf' && url.startsWith('blob:https://')) {
                    fetch(url)
                        .then(response => {
                            if (!response.ok) throw new Error("Falha ao acessar blob: " + response.status);
                            return response.arrayBuffer();
                        })
                        .then(arrayBuffer => {
                            blobCaptured = true;
                            cleanupInterceptors();
                            resolve({ arrayBuffer, chave, url: pdfURL });
                        })
                        .catch(err => {
                            console.error("Erro ao capturar blob PDF via createObjectURL:", err.message);
                        });
                }
                return url;
            };

	// Função para limpar interceptadores e observadores
            function cleanupInterceptors() {
                window.fetch = originalFetch;
                XMLHttpRequest.prototype.open = originalXHROpen;
                URL.createObjectURL = originalCreateObjectURL;
                document.removeEventListener('click', handleClick);
                blobObserver.disconnect();
                chaveObserver.disconnect();
            }

	// Timeout com fallback para download manual
            setTimeout(() => {
                if (!blobCaptured) {
                    console.log("Timeout: Nenhum blob PDF detectado após", timeout, "ms.");
                    cleanupInterceptors();
                    if (pdfURL) {
                        console.log("Tentando fallback: Solicitando download manual do PDF...");
                        alert("Não foi possível capturar o PDF automaticamente. Clique em OK para abrir o PDF em uma nova aba, baixe-o manualmente e depois selecione o arquivo baixado.");
                        window.open(pdfURL, '_blank');
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
                                resolve({ arrayBuffer, chave, url: pdfURL });
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
    async function addLogoToPDF(pdfArrayBuffer, { chave, url }, isPrintIcon = false, isViewNf = false) {
        try {
            await waitForLibraries();
            const { PDFDocument } = window.PDFLib;

            const pdfDoc = await PDFDocument.load(pdfArrayBuffer);

	// Define o nome do arquivo
            let fileName = 'documento_com_logo.pdf';
            if (chave) {
                fileName = isViewNf ? `NFCe ${chave}.pdf` : `NFe ${chave}.pdf`;
                console.log(`Nome do arquivo definido como ${isViewNf ? 'NFCe' : 'NFe'} com chave:`, fileName);
            } else {
                const domFileName = getFileNameFromDOM();
                if (domFileName) {
                    fileName = domFileName;
                    console.log("Nome do arquivo definido a partir do DOM:", fileName);
                } else if (url) {
	// Fallback para URL
                    if (url.includes('pedido-de-venda')) {
                        fileName = 'pedido-de-venda_com_logo.pdf';
                        console.log("Nome do arquivo definido como pedido (URL):", fileName);
                    } else if (url.includes('or%25C3%25A7amento-de-venda')) {
                        fileName = 'orcamento-de-venda_com_logo.pdf';
                        console.log("Nome do arquivo definido como orçamento (URL):", fileName);
                    } else {
                        console.warn("URL não corresponde a padrão conhecido, usando fallback:", url);
                    }
                } else {
                    console.warn("Nenhuma chave, número de pedido, título ou URL válida fornecida, usando nome padrão:", fileName);
                }
            }

	// Carregue a imagem do logotipo
            const logoUrl = getLogoURL();
            let logoImage;
            try {
                const logoImg = await loadImage(logoUrl);
                const logoCanvas = document.createElement('canvas');
                logoCanvas.width = 100;
                logoCanvas.height = 100;
                const ctx = logoCanvas.getContext('2d');
                ctx.drawImage(logoImg, 0, 0, 100, 100);
                const logoBytes = logoCanvas.toDataURL('image/png');
                logoImage = await pdfDoc.embedPng(logoBytes);
                console.log("Imagem da logo processada com sucesso.");
            } catch (error) {
                console.warn("Erro ao processar a imagem da logo, usando PDF sem logo:", error.message);
	// Prossegue sem adicionar o logotipo
                const pdfBytes = await pdfDoc.save();
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                const blobUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = fileName;
                a.click();
                URL.revokeObjectURL(blobUrl);
                console.log("PDF sem logo baixado como:", fileName);
                return;
            }

            const pages = pdfDoc.getPages();
            pages.forEach(page => {
                const { width, height } = page.getSize();
                let logoWidth, logoHeight, logoX, logoY;

                if (isViewNf) {
	//Configurações específicas para ng-click="controller.viewNfce()"
                    logoWidth = 65 * 0.75;
                    logoHeight = 65 * 0.75;
                    logoX = 17 * 0.75;
                    logoY = height - (20 * 0.75) - logoHeight;
                } else if (isPrintIcon) {
	// Configurações para o ícone de impressão
                    logoWidth = 80;
                    logoHeight = 80;
                    logoX = 15;
                    logoY = height - 40 - logoHeight;
                } else {
	// configurações padrão (incluindo ng-click="controller.viewNfe()")
                    logoWidth = 111 * 0.75;
                    logoHeight = 111 * 0.75;
                    logoX = 60 * 0.75;
                    logoY = height - (122 * 0.75) - logoHeight;
                }

                try {
                    page.drawImage(logoImage, {
                        x: logoX,
                        y: logoY,
                        width: logoWidth,
                        height: logoHeight,
                    });
                } catch (error) {
                    console.warn("Erro ao desenhar a logo na página, continuando com PDF sem logo:", error.message);
                }
            });
            console.log("Logo adicionado a todas as páginas do PDF.");

	// Salvar o PDF modificado
            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(blobUrl);
            console.log("PDF modificado baixado como:", fileName);
        } catch (error) {
            console.error("Erro crítico ao adicionar logo ao PDF:", error.message);
            alert("Erro ao processar o PDF. Verifique o console para detalhes.");
            throw error;
        }
    }

    // Função para detectar botões e o ícone de impressão
    function setupButtonListeners() {
        const observer = new MutationObserver((mutations, obs) => {
            try {
                // Função auxiliar para adicionar listener
                const addClickListener = (element, identifier, isPrintIcon = false, isViewNf = false) => {
                    if (element && !element.dataset.listenerAttached) {
                        console.log(`Elemento (${identifier}) encontrado via MutationObserver!`);
                        element.addEventListener('click', async (event) => {
                            console.log(`Elemento (${identifier}) clicado!`);
                            event.preventDefault();
                            try {
                                const result = await captureBlobPDF();
                                if (result.arrayBuffer) {
                                    await addLogoToPDF(result.arrayBuffer, result, isPrintIcon, isViewNf);
                                } else {
                                    console.error("Nenhum blob PDF capturado.");
                                    alert("Nenhum PDF foi detectado. Verifique o console para detalhes.");
                                }
                            } catch (error) {
                                console.error(`Erro ao processar clique no elemento (${identifier}):`, error.message);
                                alert("Erro ao processar o PDF. Verifique o console para detalhes.");
                            }
                        });
                        element.dataset.listenerAttached = 'true';
                    }
                };

                // Detecta o botão #viewNf
                const viewNfButton = document.getElementById('viewNf');
                if (viewNfButton && !viewNfButton.dataset.listenerAttached) {
                    const ngClick = viewNfButton.getAttribute('ng-click');
                    const isViewNf = ngClick && ngClick.includes('controller.viewNfce()');
                    console.log("Botão #viewNf encontrado, é NFC-e (ng-click='controller.viewNfce()')?", isViewNf);
                    addClickListener(viewNfButton, '#viewNf', false, isViewNf);
                }

                // Detecta o botão #invoice_detail_emitir (NFe)
                const nfeButton = document.getElementById('invoice_detail_emitir');
                addClickListener(nfeButton, '#invoice_detail_emitir');

                // Detecta os botões NFCe (antigo e novo seletor)
                const nfceButtons = document.querySelectorAll('button.n-issue-button, button.issue');
                nfceButtons.forEach((nfceButton, index) => {
                    const isViewNf = nfceButton.getAttribute('ng-click')?.includes('controller.issueNfce()');
                    addClickListener(nfceButton, `NFCe índice ${index} (class: ${nfceButton.className})`, false, isViewNf);
                });

                // Detecta o botão #complete
                const completeButton = document.getElementById('complete');
                addClickListener(completeButton, '#complete');

                // Detecta os ícones de impressão
                const printIcons = document.querySelectorAll('i.sprite-new-erp.print, i.sprite-new-erp.bottom-print');
                printIcons.forEach((printIcon) => {
                    addClickListener(printIcon, `ícone de impressão ${printIcon.className}`, true);
                });

                // Intercepta controller.issueNfce()
                if (window.controller?.issueNfce && !window.controller.issueNfce._intercepted) {
                    console.log("Interceptando controller.issueNfce...");
                    const originalIssueNfce = window.controller.issueNfce;
                    window.controller.issueNfce = async function (...args) {
                        console.log("Função controller.issueNfce() chamada!");
                        try {
                            const result = await captureBlobPDF();
                            if (result.arrayBuffer) {
                                await addLogoToPDF(result.arrayBuffer, result, false, true);
                            } else {
                                console.error("Nenhum blob PDF capturado em controller.issueNfce().");
                                alert("Nenhum PDF foi detectado. Verifique o console para detalhes.");
                            }
                            return originalIssueNfce.apply(this, args);
                        } catch (error) {
                            console.error("Erro ao processar controller.issueNfce():", error.message);
                            alert("Erro ao processar o PDF. Verifique o console para detalhes.");
                        }
                    };
                    window.controller.issueNfce._intercepted = true;
                }
            } catch (error) {
                console.error("Erro no MutationObserver:", error.message);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
        return observer;
    }

    // Função para substituir a logo
    function substituirLogo() {
        const minhaLogo = getLogoURL();
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach((iframe, index) => {
            try {
                const iframeOrigin = new URL(iframe.src, window.location.origin).origin;
                if (iframeOrigin !== window.location.origin) {
                    return;
                }
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                const clientLogoImages = iframeDoc.querySelectorAll('img.client_logo');
                clientLogoImages.forEach((img, imgIndex) => {
                    if (img.src !== minhaLogo) {
                        img.src = minhaLogo;
                    }
                });
            } catch (e) {
                console.warn(`Não foi possível acessar o iframe ${index}: ${e.message}`);
            }
        });
    }

    // Monitoramento de mudanças de URL em SPAs
    function monitorURLChanges() {
        let lastUrl = location.href;
        const urlObserver = new MutationObserver(() => {
            const currentUrl = location.href;
            if (currentUrl !== lastUrl) {
                lastUrl = currentUrl;
                setupButtonListeners();
                substituirLogo();
            }
        });
        urlObserver.observe(document, { subtree: true, childList: true });

        window.addEventListener('popstate', () => {
            const currentUrl = location.href;
            if (currentUrl !== lastUrl) {
                lastUrl = currentUrl;
                setupButtonListeners();
                substituirLogo();
            }
        });

        window.addEventListener('load', () => {
            substituirLogo();
            setupButtonListeners();
        });

        const logoObserver = new MutationObserver(() => {
            substituirLogo();
        });
        logoObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['src']
        });
    }

    // Iniciar o monitoramento
    monitorURLChanges();
})();
