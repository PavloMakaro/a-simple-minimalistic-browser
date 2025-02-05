const { BrowserWindow } = require('@electron/remote');

class Browser {
    constructor() {
        try {
            this.tabs = [];
            this.activeTabId = null;
            this.initModules();
            this.initElements();
            this.initEventListeners();
            this.initFirstTab();

            this.settings = this.loadSettings();
            this.initSettings();
            this.initHotkeys();
            this.urlDisplay = document.querySelector('.url-display');
            this.initUrlPreview();
            this.initAI();
            this.bookmarks = this.loadBookmarks();
            this.initBookmarks();
            this.pipWindow = null;
            this.loadBrowserState();
            
            // Добавляем слушатель для сохранения состояния при закрытии
            window.addEventListener('beforeunload', () => {
                this.saveBrowserState();
            });

            this.initPiP();
            this.initDevTools();
            this.initSettingsMenu();
            setTimeout(() => {
                this.showWelcomeModal();
            }, 1000);
        } catch (error) {
            console.error('Ошибка при инициализации браузера:', error);
        }
    }

    initModules() {
        try {
            this.windowManager = new WindowManager();
            this.tabManager = new TabManager(this);
            this.navigationManager = new NavigationManager(this);
            this.settingsManager = new SettingsManager(this);
            this.extensionsManager = new ExtensionsManager(this);
            this.accountManager = new AccountManager(this);
            this.aiManager = new AIManager(this);
        } catch (error) {
            console.error('Ошибка инициализации модуля:', error);
            // Продолжаем работу с доступными модулями
        }
    }

    initElements() {
        try {
            // Основные элементы управления
            this.controls = {
                close: document.querySelector('.control.close'),
                minimize: document.querySelector('.control.minimize'),
                maximize: document.querySelector('.control.maximize'),
                reload: document.querySelector('.reload-btn'),
                home: document.querySelector('.home-btn'),
                settings: document.querySelector('.settings-btn'),
                theme: document.querySelector('.theme-btn'),
                account: document.querySelector('.account-btn'),
                share: document.querySelector('.share-btn'),
                bookmark: document.querySelector('.bookmark-btn'),
            };

            // Меню
            this.menus = {
                settings: {
                    container: document.querySelector('.settings-menu'),
                    close: document.querySelector('.close-settings')
                },
                fontSettings: {
                    container: document.querySelector('.font-settings-menu'),
                    close: document.querySelector('.close-font-settings'),
                    zoomBtns: document.querySelectorAll('.zoom-btn'),
                    zoomValue: document.querySelector('.zoom-value'),
                    fontSelect: document.querySelector('.font-family-select')
                },
                account: {
                    container: document.querySelector('.account-menu'),
                    close: document.querySelector('.close-account')
                }
            };

            // URL превью
            this.urlPreview = document.querySelector('.url-display');
            
            // WebView
            this.webview = document.querySelector('webview');

            // Добавляем элементы для вкладок
            this.tabsContainer = document.querySelector('.tabs');
            this.addTabBtn = document.querySelector('.add-tab');
            this.browserContent = document.querySelector('.browser-content');

            // AI чат
            this.aiChat = {
                window: document.querySelector('.ai-chat-window'),
                messages: document.querySelector('.ai-chat-messages'),
                input: document.querySelector('.ai-chat-input textarea'),
                sendBtn: document.querySelector('.send-message'),
                closeBtn: document.querySelector('.close-ai-chat')
            };

            // Тема
            this.themeMenu = {
                container: document.querySelector('.theme-menu'),
                close: document.querySelector('.close-theme'),
                options: document.querySelectorAll('.theme-option'),
                zoomBtns: document.querySelectorAll('.zoom-btn'),
                zoomValue: document.querySelector('.zoom-value'),
                fontSelect: document.querySelector('.font-family-select')
            };

            // Проверяем наличие всех необходимых элементов
            const allElements = {
                ...this.controls,
                ...this.menus,
                ...this.urlPreview,
                ...this.webview,
                ...this.tabsContainer,
                ...this.addTabBtn,
                ...this.aiChat,
                ...this.themeMenu
            };

            for (const [name, element] of Object.entries(allElements)) {
                if (!element) {
                    console.warn(`Элемент ${name} не найден`);
                }
            }

        } catch (error) {
            console.error('Ошибка при инициализации элементов:', error);
        }
    }

    initEventListeners() {
        try {
            // Обработчики окна
            this.controls.close?.addEventListener('click', () => window.close());
            this.controls.minimize?.addEventListener('click', () => {
                    require('@electron/remote').getCurrentWindow().minimize();
            });
            this.controls.maximize?.addEventListener('click', () => this.toggleMaximize());

            // Обработчики навигации
            this.controls.reload?.addEventListener('click', () => {
                const activeTab = this.getActiveTab();
                if (activeTab?.webview) {
                    activeTab.webview.reload();
                }
            });

            this.controls.home?.addEventListener('click', () => {
                const activeTab = this.getActiveTab();
                if (activeTab?.webview) {
                    activeTab.webview.loadURL('https://www.google.com');
                }
            });

            // Обработчики меню
            this.controls.settings?.addEventListener('click', () => this.toggleMenu('settings'));
            this.controls.theme?.addEventListener('click', () => this.toggleThemeMenu());
            this.controls.account?.addEventListener('click', () => this.toggleMenu('account'));
            this.controls.share?.addEventListener('click', () => this.shareCurrentPage());
            this.controls.bookmark?.addEventListener('click', (e) => {
                e.stopPropagation();
                const bookmarksMenu = document.querySelector('.bookmarks-menu');
                bookmarksMenu.classList.toggle('show');
            });

            // Обработчики закрытия меню
            this.menus.settings.close?.addEventListener('click', () => this.toggleMenu('settings'));
            this.menus.fontSettings.close?.addEventListener('click', () => this.toggleMenu('fontSettings'));
            this.menus.account.close?.addEventListener('click', () => this.toggleMenu('account'));

            // Обработчики масштабирования
            this.menus.fontSettings.zoomBtns?.forEach(btn => {
                btn.addEventListener('click', () => this.handleZoom(btn.dataset.zoom));
            });

            // Обработчик выбора шрифта
            this.menus.fontSettings.fontSelect?.addEventListener('change', (e) => {
                this.changeFontFamily(e.target.value);
            });

            // Добавляем обработчик для кнопки новой вкладки
            this.addTabBtn?.addEventListener('click', () => this.createTab());

            // AI чат
            this.aiChat.closeBtn?.addEventListener('click', () => this.toggleAIChat());
            this.aiChat.sendBtn?.addEventListener('click', () => this.sendAIMessage());
            this.aiChat.input?.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendAIMessage();
                }
            });

            // Тема
            this.themeMenu.close?.addEventListener('click', () => this.toggleThemeMenu());
            this.themeMenu.options?.forEach(option => {
                option.addEventListener('click', () => {
                    const theme = option.classList.contains('light-theme') ? 'light' : 'dark';
                    this.setTheme(theme);
                });
            });

            // Обработчики для настройки фона
            document.getElementById('background-video')?.addEventListener('change', (e) => {
                const customUpload = document.getElementById('custom-video-upload');
                customUpload.style.display = e.target.value === 'custom' ? 'flex' : 'none';
                this.updateBackgroundVideo(e.target.value);
            });

            document.getElementById('background-opacity')?.addEventListener('input', (e) => {
                this.updateBackgroundOpacity(e.target.value);
            });

            document.getElementById('background-blur')?.addEventListener('input', (e) => {
                this.updateBackgroundBlur(e.target.value);
            });

            // Обработчик для загрузки пользовательского видео
            document.querySelector('.upload-btn')?.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'video/*';
                input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const url = URL.createObjectURL(file);
                        this.updateBackgroundVideo('custom', url);
                    }
                };
                input.click();
            });

            // Добавляем обработчик клика вне меню для закрытия
            document.addEventListener('click', (e) => {
                const bookmarksMenu = document.querySelector('.bookmarks-menu');
                const bookmarkBtn = document.querySelector('.bookmark-btn');
                
                if (!bookmarksMenu.contains(e.target) && !bookmarkBtn.contains(e.target)) {
                    bookmarksMenu.classList.remove('show');
                }
            });

        } catch (error) {
            console.error('Ошибка при инициализации обработчиков событий:', error);
        }
    }

    initFirstTab() {
        const initialTab = this.tabsContainer.querySelector('.tab');
        const initialWebview = document.querySelector('webview');
        if (initialTab && initialWebview) {
            const tabId = 'tab-' + Date.now();
            initialTab.setAttribute('data-tab-id', tabId);
            this.tabs.push({ id: tabId, webview: initialWebview, tab: initialTab });
            this.activeTabId = tabId;
            this.initTabEvents(initialTab, initialWebview);
        }
    }

    initTabEvents(tab, webview) {
        // Клик по вкладке
            tab.addEventListener('click', (e) => {
                if (!e.target.classList.contains('tab-close')) {
                const tabId = tab.getAttribute('data-tab-id');
                    this.activateTab(tabId);
                }
            });

        // Закрытие вкладки
        const closeBtn = tab.querySelector('.tab-close');
        closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
            const tabId = tab.getAttribute('data-tab-id');
                this.closeTab(tabId);
            });

        // События webview
            webview.addEventListener('page-title-updated', (e) => {
                tab.querySelector('.tab-title').textContent = e.title;
            });

            webview.addEventListener('did-start-loading', () => {
            this.controls.reload.textContent = '×';
            });

            webview.addEventListener('did-stop-loading', () => {
            this.controls.reload.textContent = '↻';
            this.updateUrlPreview(webview.getURL());
            });

            // Добавляем обработчик ошибок
            webview.addEventListener('did-fail-load', (e) => {
                console.error('Ошибка загрузки страницы:', {
                    errorCode: e.errorCode,
                    errorDescription: e.errorDescription,
                    validatedURL: e.validatedURL,
                    isMainFrame: e.isMainFrame
                });
                
                if (e.errorCode !== -3) { // Игнорируем ошибку отмены загрузки
                    this.showErrorPage(webview, e.errorDescription);
                }
            });

        // Добавляем обработчики для перетаскивания
        tab.setAttribute('draggable', 'true');
        
        tab.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', tab.getAttribute('data-tab-id'));
            tab.classList.add('dragging');
            
            // Создаем индикатор места вставки, если его еще нет
            if (!this.dropIndicator) {
                this.dropIndicator = document.createElement('div');
                this.dropIndicator.className = 'tab-drop-indicator';
                this.tabsContainer.appendChild(this.dropIndicator);
            }
        });

        tab.addEventListener('dragend', () => {
            tab.classList.remove('dragging');
            // Скрываем индикатор
            if (this.dropIndicator) {
                this.dropIndicator.classList.remove('show');
            }
            // Убираем класс drag-over со всех вкладок
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('drag-over'));
        });

        tab.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggingTab = document.querySelector('.dragging');
            if (!draggingTab || draggingTab === tab) return;

            const tabRect = tab.getBoundingClientRect();
            const afterElement = e.clientX > tabRect.left + tabRect.width / 2;

            // Показываем индикатор места вставки
            if (this.dropIndicator) {
                const indicatorX = afterElement ? tabRect.right : tabRect.left;
                this.dropIndicator.style.left = `${indicatorX}px`;
                this.dropIndicator.style.top = `${tabRect.top}px`;
                this.dropIndicator.classList.add('show');
            }

            // Добавляем визуальный эффект
            document.querySelectorAll('.tab').forEach(t => {
                if (t === tab) {
                    t.classList.add('drag-over');
                } else {
                    t.classList.remove('drag-over');
                }
            });
        });

        tab.addEventListener('drop', (e) => {
            e.preventDefault();
            const draggedTabId = e.dataTransfer.getData('text/plain');
            const draggedTab = document.querySelector(`[data-tab-id="${draggedTabId}"]`);
            if (!draggedTab || draggedTab === tab) return;

            const tabRect = tab.getBoundingClientRect();
            const afterElement = e.clientX > tabRect.left + tabRect.width / 2;

            // Перемещаем вкладку
            const draggedIndex = this.tabs.findIndex(t => t.id === draggedTabId);
            const targetIndex = this.tabs.findIndex(t => t.id === tab.getAttribute('data-tab-id'));
            
            if (draggedIndex !== -1 && targetIndex !== -1) {
                // Обновляем массив вкладок
                const [draggedTabData] = this.tabs.splice(draggedIndex, 1);
                const newIndex = afterElement ? targetIndex + 1 : targetIndex;
                this.tabs.splice(newIndex, 0, draggedTabData);

                // Обновляем DOM
                if (afterElement) {
                    tab.parentNode.insertBefore(draggedTab, tab.nextSibling);
                } else {
                    tab.parentNode.insertBefore(draggedTab, tab);
                }
            }

            // Убираем визуальные эффекты
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('drag-over'));
            if (this.dropIndicator) {
                this.dropIndicator.classList.remove('show');
            }
        });

        tab.addEventListener('dragleave', () => {
            tab.classList.remove('drag-over');
        });
    }

    initUrlPreview() {
        // Обновляем URL при загрузке страницы
        this.tabs.forEach(({ webview }) => {
            webview.addEventListener('did-navigate', () => {
                if (webview === this.getActiveTab()?.webview) {
                    this.updateUrlPreview(webview.getURL());
                }
            });

            webview.addEventListener('did-navigate-in-page', () => {
                if (webview === this.getActiveTab()?.webview) {
                    this.updateUrlPreview(webview.getURL());
                }
            });
        });
    }

    updateUrlPreview(url) {
        if (this.urlPreview) {
            this.urlPreview.textContent = url;
        }
    }

    createTab(url = 'https://www.google.com') {
        const tabId = 'tab-' + Date.now();
        
        // Создаем вкладку
        const tab = document.createElement('div');
        tab.className = 'tab';
        tab.setAttribute('data-tab-id', tabId);
        tab.innerHTML = `
            <span class="tab-title">Новая вкладка</span>
            <span class="tab-close">×</span>
        `;

        // Создаем webview
        const webview = document.createElement('webview');
        webview.setAttribute('src', url);
        webview.setAttribute('autosize', 'on');
        webview.style.display = 'none';

        // Добавляем элементы в DOM
        this.tabsContainer.insertBefore(tab, this.addTabBtn);
        this.browserContent.appendChild(webview);

        // Инициализируем события
        this.initTabEvents(tab, webview);

        // Добавляем в массив и активируем
        this.tabs.push({ id: tabId, webview, tab });
        this.activateTab(tabId);

        // Добавляем обработчики для новой вкладки
        webview.addEventListener('did-navigate', (e) => {
            const bookmarksMenu = document.querySelector('.bookmarks-menu');
            if (e.url === 'https://www.google.com/' || e.url === 'https://www.google.com') {
                bookmarksMenu.classList.add('show');
            } else {
                bookmarksMenu.classList.remove('show');
            }
        });

        // Если это новая вкладка с Google, сразу показываем избранное
        if (url === 'https://www.google.com') {
            const favoritesOverlay = document.querySelector('.favorites-overlay');
            favoritesOverlay.style.display = 'block';
            setTimeout(() => {
                favoritesOverlay.classList.add('show');
            }, 100);
        }

        // Добавляем слушатели для сохранения состояния
        webview.addEventListener('did-navigate', () => {
            this.saveBrowserState();
        });

        webview.addEventListener('page-title-updated', () => {
            this.saveBrowserState();
        });

        // Добавляем обработчик для открытия DevTools
        webview.addEventListener('dom-ready', () => {
            // Добавляем возможность открывать DevTools для iframe и webview внутри страниц
            webview.executeJavaScript(`
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'F12') {
                        require('electron').ipcRenderer.send('open-devtools');
                    }
                });
            `);
        });

        // Возвращаем tabId
        return tabId;
    }

    activateTab(tabId) {
        this.tabs.forEach(({ id, tab, webview }) => {
            if (id === tabId) {
                tab.classList.add('active');
                webview.style.display = 'flex';
                this.activeTabId = id;
                this.updateUrlPreview(webview.getURL());
            } else {
                tab.classList.remove('active');
                webview.style.display = 'none';
            }
        });
        
        this.saveBrowserState(); // Сохраняем состояние при смене вкладки
    }

    closeTab(tabId) {
        const index = this.tabs.findIndex(t => t.id === tabId);
        if (index === -1) return;

        const { tab, webview } = this.tabs[index];
        tab.remove();
        webview.remove();
        this.tabs.splice(index, 1);

        // Если закрыли активную вкладку
        if (this.activeTabId === tabId) {
            const newTab = this.tabs[index] || this.tabs[index - 1];
            if (newTab) {
                this.activateTab(newTab.id);
            } else if (this.tabs.length === 0) {
                this.createTab();
            }
        }
        
        this.saveBrowserState(); // Сохраняем состояние при закрытии вкладки
    }

    getActiveTab() {
        return this.tabs.find(tab => tab.id === this.activeTabId);
    }

    navigateToUrl(input) {
        try {
            const activeTab = this.getActiveTab();
            if (!activeTab) {
                console.warn('Нет активной вкладки для навигации');
                return;
            }

            let url = input.trim();
            if (!url.includes('.') || url.includes(' ')) {
                const searchEngines = {
                    google: 'https://www.google.com/search?q=',
                    yandex: 'https://yandex.ru/search/?text=',
                    bing: 'https://www.bing.com/search?q=',
                    duckduckgo: 'https://duckduckgo.com/?q='
                };
                url = searchEngines[this.settings.defaultSearch] + encodeURIComponent(url);
            } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }

            if (this.settings.searchInNewTab && !input.startsWith('http')) {
                this.createTab(url);
            } else {
                activeTab.webview.loadURL(url);
            }

            // Сохраняем в историю
            const history = JSON.parse(localStorage.getItem('browser_history') || '[]');
            history.unshift({
                url: url,
                title: activeTab.webview.getTitle() || url,
                time: Date.now()
            });
            localStorage.setItem('browser_history', JSON.stringify(history.slice(0, 1000))); // Ограничиваем историю 1000 записями
        } catch (error) {
            console.error('Ошибка при навигации:', error);
        }
    }

    toggleMaximize() {
        const win = require('@electron/remote').getCurrentWindow();
        if (win.isMaximized()) {
            win.unmaximize();
        } else {
            win.maximize();
        }
    }

    toggleMenu(menuName) {
        const menu = this.menus[menuName].container;
        if (!menu) return;

        const isVisible = menu.style.display === 'flex';
        menu.style.display = isVisible ? 'none' : 'flex';

        if (!isVisible) {
            menu.style.transform = 'translateX(100%)';
            requestAnimationFrame(() => {
                menu.style.transition = 'transform 0.3s ease-out';
                menu.style.transform = 'translateX(0)';
            });
        }
    }

    handleZoom(direction) {
        const activeTab = this.getActiveTab();
        if (!activeTab?.webview) return;

        const currentZoom = activeTab.webview.getZoomFactor();
        const newZoom = direction === '+' ? 
            Math.min(currentZoom + 0.1, 2.0) : 
            Math.max(currentZoom - 0.1, 0.5);

        activeTab.webview.setZoomFactor(newZoom);
        this.menus.fontSettings.zoomValue.textContent = `${Math.round(newZoom * 100)}%`;
    }

    changeFontFamily(fontFamily) {
        const activeTab = this.getActiveTab();
        if (!activeTab?.webview) return;

        const css = `* { font-family: ${fontFamily === 'default' ? 'inherit' : fontFamily} !important; }`;
        activeTab.webview.insertCSS(css);
    }

    shareCurrentPage() {
        if (!this.webview) return;

        const url = this.webview.getURL();
        navigator.clipboard.writeText(url).then(() => {
            this.showNotification('URL скопирован в буфер обмена');
        });
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2000);
    }

    showErrorPage(webview, errorText) {
        const errorHTML = `
            <html>
            <head>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        margin: 0;
                        background: #f5f5f7;
                    }
                    .error-container {
                        text-align: center;
                        padding: 20px;
                    }
                    .error-title {
                        font-size: 24px;
                        margin-bottom: 10px;
                        color: #1a1a1a;
                    }
                    .error-message {
                        color: #666;
                        margin-bottom: 20px;
                    }
                    .retry-button {
                        padding: 8px 16px;
                        background: #0066cc;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                    }
                </style>
            </head>
            <body>
                <div class="error-container">
                    <div class="error-title">Ошибка загрузки страницы</div>
                    <div class="error-message">${errorText}</div>
                    <button class="retry-button" onclick="window.location.reload()">Повторить</button>
                </div>
            </body>
            </html>
        `;
        webview.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHTML)}`);
    }

    loadSettings() {
        return JSON.parse(localStorage.getItem('browser_settings')) || {
            defaultSearch: 'google',
            searchInNewTab: false,
            theme: 'system',
            fontSize: 'medium',
            showFavorites: true,
            blockTrackers: true,
            blockAds: false,
            clearOnExit: false,
            incognitoByDefault: false,
            downloadPath: require('@electron/remote').app.getPath('downloads'),
            askDownloadPath: false,
            experimentalFeatures: false,
            autoRefresh: '0',
            hotkeys: {
                newTab: 'Ctrl+T',
                closeTab: 'Ctrl+W',
                nextTab: 'Ctrl+Tab',
                prevTab: 'Ctrl+Shift+Tab',
                settings: 'Ctrl+,'
            }
        };
    }

    initSettings() {
        // Применяем настройки
        document.body.classList.add(`theme-${this.settings.theme}`);
        document.body.classList.add(`font-${this.settings.fontSize}`);

        // Инициализируем автообновление
        this.initAutoRefresh();
    }

    initHotkeys() {
        window.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 't') {
                this.createTab();
            } else if (e.ctrlKey && e.key === 'w') {
                const activeTab = this.getActiveTab();
                if (activeTab) this.closeTab(activeTab.id);
            } else if (e.ctrlKey && e.key === 'Tab') {
                if (e.shiftKey) {
                    this.switchToPrevTab();
                } else {
                    this.switchToNextTab();
                }
            } else if (e.ctrlKey && e.key === ',') {
                this.toggleMenu('settings');
            }
        });
    }

    switchToNextTab() {
        const currentIndex = this.tabs.findIndex(tab => tab.id === this.activeTabId);
        const nextIndex = (currentIndex + 1) % this.tabs.length;
        this.activateTab(this.tabs[nextIndex].id);
    }

    switchToPrevTab() {
        const currentIndex = this.tabs.findIndex(tab => tab.id === this.activeTabId);
        const prevIndex = (currentIndex - 1 + this.tabs.length) % this.tabs.length;
        this.activateTab(this.tabs[prevIndex].id);
    }

    initAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }
        
        const interval = parseInt(this.settings.autoRefresh);
        if (interval > 0) {
            this.autoRefreshInterval = setInterval(() => {
                const activeTab = this.getActiveTab();
                if (activeTab) {
                    activeTab.webview.reload();
                }
            }, interval * 1000);
        }
    }

    toggleAccountMenu() {
        const display = this.accountMenu.style.display;
        this.accountMenu.style.display = display === 'none' || display === '' ? 'flex' : 'none';
    }

    async signInWithGoogle() {
        try {
            // Здесь будет код для авторизации через Google OAuth
            const result = await this.googleAuth();
            if (result.success) {
                this.updateAccountUI(result.user);
                this.startSync();
            }
        } catch (error) {
            console.error('Ошибка авторизации:', error);
        }
    }

    signOut() {
        // Очищаем данные аккаунта
        localStorage.removeItem('google_account');
        document.getElementById('not-signed-in').style.display = 'block';
        document.getElementById('signed-in').style.display = 'none';
        this.stopSync();
    }

    updateAccountUI(user) {
        document.getElementById('not-signed-in').style.display = 'none';
        document.getElementById('signed-in').style.display = 'block';
        document.querySelector('.account-avatar').src = user.avatar;
        document.querySelector('.account-name').textContent = user.name;
        document.querySelector('.account-email').textContent = user.email;
    }

    startSync() {
        // Запускаем синхронизацию данных
        this.syncInterval = setInterval(() => {
            this.syncData();
        }, 5 * 60 * 1000); // Синхронизация каждые 5 минут
    }

    stopSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
    }

    async syncData() {
        if (document.getElementById('sync-bookmarks').checked) {
            await this.syncBookmarks();
        }
        if (document.getElementById('sync-history').checked) {
            await this.syncHistory();
        }
        if (document.getElementById('sync-passwords').checked) {
            await this.syncPasswords();
        }
        if (document.getElementById('sync-settings').checked) {
            await this.syncSettings();
        }
    }

    toggleHistory() {
        const display = this.historyMenu.style.display;
        this.historyMenu.style.display = display === 'none' || display === '' ? 'flex' : 'none';
        if (display === 'none' || display === '') {
            this.loadHistory();
        }
    }

    loadHistory() {
        const history = JSON.parse(localStorage.getItem('browser_history') || '[]');
        this.renderHistory(history);
    }

    renderHistory(history) {
        this.historyList.innerHTML = '';
        history.forEach(item => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.innerHTML = `
                <img class="history-item-icon" src="https://www.google.com/s2/favicons?domain=${item.url}" alt="favicon">
                <div class="history-item-info">
                    <div class="history-item-title">${item.title}</div>
                    <div class="history-item-url">${item.url}</div>
                </div>
                <div class="history-item-time">${new Date(item.time).toLocaleString()}</div>
            `;
            historyItem.addEventListener('click', () => this.navigateToUrl(item.url));
            this.historyList.appendChild(historyItem);
        });
    }

    searchHistory(query) {
        const history = JSON.parse(localStorage.getItem('browser_history') || '[]');
        const filtered = history.filter(item => 
            item.title.toLowerCase().includes(query.toLowerCase()) ||
            item.url.toLowerCase().includes(query.toLowerCase())
        );
        this.renderHistory(filtered);
    }

    clearHistory() {
        if (confirm('Вы уверены, что хотите очистить всю историю?')) {
            localStorage.setItem('browser_history', '[]');
            this.historyList.innerHTML = '';
        }
    }

    changeZoom(direction) {
        const activeTab = this.getActiveTab();
        if (!activeTab) return;

        const currentZoom = activeTab.webview.getZoomFactor() * 100;
        let newZoom;

        if (direction === '+') {
            newZoom = Math.min(currentZoom + 10, 200);
        } else {
            newZoom = Math.max(currentZoom - 10, 25);
        }

        this.setZoom(newZoom);
    }

    setZoom(zoomLevel) {
        const activeTab = this.getActiveTab();
        if (!activeTab) return;

        const zoomFactor = zoomLevel / 100;
        activeTab.webview.setZoomFactor(zoomFactor);
        this.zoomValue.textContent = `${zoomLevel}%`;
    }

    setMinFontSize(size) {
        const activeTab = this.getActiveTab();
        if (!activeTab) return;

        activeTab.webview.setMinimumFontSize(parseInt(size));
    }

    initAI() {
        this.aiConfig = {
            enabled: false,
            apiKey: null
        };
        
        // Загружаем конфигурацию AI из localStorage
        const savedConfig = localStorage.getItem('ai_config');
        if (savedConfig) {
            this.aiConfig = JSON.parse(savedConfig);
        }
    }

    async handleAIClick() {
        try {
            if (!this.aiConfig.apiKey) {
                const key = await this.promptForAPIKey();
                if (key) {
                    this.aiConfig.apiKey = key;
                    this.aiConfig.enabled = true;
                    localStorage.setItem('ai_config', JSON.stringify(this.aiConfig));
                }
            }

            if (this.aiConfig.enabled) {
                const activeTab = this.getActiveTab();
                if (activeTab?.webview) {
                    // Получаем текст со страницы
                    const pageText = await activeTab.webview.executeJavaScript(`
                        document.body.innerText
                    `);
                    
                    // Анализируем текст с помощью AI
                    const summary = await this.aiManager.analyzePage(pageText);
                    
                    // Показываем результат
                    this.showAIResults(summary);
                }
            }
        } catch (error) {
            console.error('Ошибка при обработке AI:', error);
            this.showNotification('Ошибка при обработке AI запроса');
        }
    }

    promptForAPIKey() {
        return new Promise((resolve) => {
            const key = prompt('Пожалуйста, введите ваш API ключ для AI:');
            resolve(key);
        });
    }

    showAIResults(results) {
        // Создаем всплывающее окно с результатами
        const popup = document.createElement('div');
        popup.className = 'ai-results-popup';
        popup.innerHTML = `
            <div class="ai-results-header">
                <h3>AI Анализ</h3>
                <button class="close-ai-results">×</button>
            </div>
            <div class="ai-results-content">
                ${results}
            </div>
        `;

        document.body.appendChild(popup);

        // Добавляем стили для попапа
        const style = document.createElement('style');
        style.textContent = `
            .ai-results-popup {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                z-index: 1000;
                max-width: 80%;
                max-height: 80%;
                overflow-y: auto;
            }
            
            .ai-results-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
            }
            
            .close-ai-results {
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
            }
            
            body.theme-dark .ai-results-popup {
                background: #2c2c2c;
                color: white;
            }
        `;
        document.head.appendChild(style);

        // Добавляем обработчик закрытия
        popup.querySelector('.close-ai-results').addEventListener('click', () => {
            popup.remove();
            style.remove();
        });
    }

    toggleAIChat() {
        if (!this.aiConfig.apiKey) {
            this.promptForAPIKey().then(key => {
                if (key) {
                    this.aiConfig.apiKey = key;
                    this.aiConfig.enabled = true;
                    localStorage.setItem('ai_config', JSON.stringify(this.aiConfig));
                    this.aiChat.window.style.display = 'flex';
                }
            });
        } else {
            this.aiChat.window.style.display = 
                this.aiChat.window.style.display === 'none' ? 'flex' : 'none';
        }
    }

    async sendAIMessage() {
        const message = this.aiChat.input.value.trim();
        if (!message) return;

        // Очищаем поле ввода
        this.aiChat.input.value = '';

        // Добавляем сообщение пользователя
        this.addChatMessage(message, 'user');

        // Получаем ответ от AI
        const response = await this.aiManager.sendMessage(message);
        
        // Добавляем ответ AI
        this.addChatMessage(response, 'assistant');
    }

    addChatMessage(text, role) {
        const message = document.createElement('div');
        message.className = `message ${role}`;
        message.textContent = text;
        this.aiChat.messages.appendChild(message);
        this.aiChat.messages.scrollTop = this.aiChat.messages.scrollHeight;
    }

    toggleThemeMenu() {
        const isVisible = this.themeMenu.container.style.display === 'block';
        this.themeMenu.container.style.display = isVisible ? 'none' : 'block';
        
        if (!isVisible) {
            // Отмечаем активную тему
            const currentTheme = document.body.classList.contains('theme-dark') ? 'dark' : 'light';
            this.themeMenu.options.forEach(option => {
                option.classList.toggle('active', 
                    (option.classList.contains('light-theme') && currentTheme === 'light') ||
                    (option.classList.contains('dark-theme') && currentTheme === 'dark')
                );
            });
        }
    }

    setTheme(theme) {
        document.body.classList.toggle('theme-dark', theme === 'dark');
        localStorage.setItem('theme', theme);
        this.themeMenu.options.forEach(option => {
            option.classList.toggle('active', 
                (option.classList.contains('light-theme') && theme === 'light') ||
                (option.classList.contains('dark-theme') && theme === 'dark')
            );
        });
    }

    // Методы для обновления фона
    updateBackgroundVideo(type, customUrl = null) {
        const videoSources = {
            waves: 'assets/waves.mp4',
            particles: 'assets/particles.mp4',
            gradient: 'assets/gradient.mp4',
            custom: customUrl
        };

        const video = document.querySelector('.background-video');
        if (video) {
            video.src = videoSources[type];
            localStorage.setItem('background-video', type);
            if (customUrl) {
                localStorage.setItem('custom-video-url', customUrl);
            }
        }
    }

    updateBackgroundOpacity(value) {
        const video = document.querySelector('.background-video');
        if (video) {
            video.style.opacity = value;
            localStorage.setItem('background-opacity', value);
        }
    }

    updateBackgroundBlur(value) {
        const content = document.querySelector('.content');
        if (content) {
            content.style.backdropFilter = `blur(${value}px)`;
            localStorage.setItem('background-blur', value);
        }
    }

    loadBookmarks() {
        const defaultBookmarks = [
            { title: 'Google', url: 'https://www.google.com', favicon: 'https://www.google.com/favicon.ico' },
            { title: 'YouTube', url: 'https://www.youtube.com', favicon: 'https://www.youtube.com/favicon.ico' },
            { title: 'GitHub', url: 'https://github.com', favicon: 'https://github.com/favicon.ico' },
            { title: 'VK', url: 'https://vk.com', favicon: 'https://vk.com/favicon.ico' }
        ];

        const savedBookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
        return savedBookmarks.length ? savedBookmarks : defaultBookmarks;
    }

    saveBookmarks() {
        localStorage.setItem('bookmarks', JSON.stringify(this.bookmarks));
    }

    initBookmarks() {
        this.renderBookmarks();

        // Обработчик для быстрого добавления текущей страницы
        document.querySelector('.quick-add-bookmark')?.addEventListener('click', async () => {
            const activeTab = this.getActiveTab();
            if (activeTab?.webview) {
                const url = activeTab.webview.getURL();
                const title = await activeTab.webview.getTitle();
                this.addBookmark(title, url);
                this.showNotification('Закладка добавлена');
            }
        });

        // Существующий обработчик для формы добавления
        document.querySelector('.add-bookmark-btn')?.addEventListener('click', () => {
            const title = document.getElementById('bookmark-title').value;
            const url = document.getElementById('bookmark-url').value;
            if (title && url) {
                this.addBookmark(title, url);
                document.getElementById('bookmark-title').value = '';
                document.getElementById('bookmark-url').value = '';
                this.showNotification('Закладка добавлена');
            }
        });
    }

    addBookmark(title, url) {
        const favicon = `https://www.google.com/s2/favicons?domain=${url}`;
        this.bookmarks.push({ title, url, favicon });
        this.saveBookmarks();
        this.renderBookmarks();
    }

    removeBookmark(index) {
        this.bookmarks.splice(index, 1);
        this.saveBookmarks();
        this.renderBookmarks();
    }

    renderBookmarks() {
        const container = document.querySelector('.bookmarks-list');
        if (!container) return;

        container.innerHTML = this.bookmarks.map((bookmark, index) => `
            <div class="bookmark-item" data-preset="${bookmark.title.toLowerCase()}">
                <img class="bookmark-icon" src="${bookmark.favicon}" alt="">
                <span class="bookmark-title">${bookmark.title}</span>
                <button class="bookmark-delete" onclick="browser.removeBookmark(${index})">×</button>
            </div>
        `).join('');

        // Добавляем обработчики клика
        container.querySelectorAll('.bookmark-item').forEach((item, index) => {
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('bookmark-delete')) {
                    this.navigateToUrl(this.bookmarks[index].url);
                    document.querySelector('.bookmarks-menu').classList.remove('show');
                }
            });
        });
    }

    // Обновляем методы для PiP
    async createPiPWindow(sourceWebview) {
        if (this.pipWindow) {
            this.pipWindow.focus();
            return;
        }

        // Создаем новое окно
        this.pipWindow = new BrowserWindow({
            width: 400,
            height: 225,
            minWidth: 240,
            minHeight: 135,
            frame: false,
            alwaysOnTop: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                webviewTag: true
            }
        });

        // Загружаем HTML с видео
        const videoUrl = sourceWebview.getURL();
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { margin: 0; overflow: hidden; background: black; }
                    #video-container { width: 100vw; height: 100vh; }
                    .header {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        height: 30px;
                        background: rgba(0,0,0,0.7);
                        display: flex;
                        justify-content: flex-end;
                        align-items: center;
                        padding: 0 8px;
                        -webkit-app-region: drag;
                        opacity: 0;
                        transition: opacity 0.3s;
                    }
                    .header:hover { opacity: 1; }
                    .close-btn {
                        -webkit-app-region: no-drag;
                        background: none;
                        border: none;
                        color: white;
                        cursor: pointer;
                        font-size: 20px;
                        padding: 4px 8px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <button class="close-btn">×</button>
                </div>
                <webview id="video-container" src="${videoUrl}" autosize="on"></webview>
                <script>
                    const { getCurrentWindow } = require('@electron/remote');
                    const webview = document.getElementById('video-container');
                    
                    document.querySelector('.close-btn').onclick = () => {
                        getCurrentWindow().close();
                    };

                    webview.addEventListener('dom-ready', () => {
                        webview.executeJavaScript(\`
                            const video = document.querySelector('video');
                            if (video) {
                                video.style.position = 'fixed';
                                video.style.top = '0';
                                video.style.left = '0';
                                video.style.width = '100%';
                                video.style.height = '100%';
                                video.play();
                            }
                        \`);
                    });
                </script>
            </body>
            </html>
        `;

        await this.pipWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));

        // Обработчик закрытия
        this.pipWindow.on('closed', () => {
            this.pipWindow = null;
        });
    }

    saveBrowserState() {
        try {
            const state = {
                tabs: this.tabs.map(tab => ({
                    url: tab.webview.getURL(),
                    title: tab.tab.querySelector('.tab-title').textContent
                })),
                activeTabId: this.getActiveTab()?.id,
                pipWindow: this.pipWindow ? {
                    url: this.pipWindow.webContents.getURL(),
                    bounds: this.pipWindow.getBounds()
                } : null
            };
            localStorage.setItem('browser-state', JSON.stringify(state));
        } catch (error) {
            console.error('Ошибка при сохранении состояния:', error);
        }
    }

    loadBrowserState() {
        try {
            const state = JSON.parse(localStorage.getItem('browser-state'));
            if (!state) return;

            // Закрываем все существующие вкладки
            while (this.tabs.length > 0) {
                this.closeTab(this.tabs[0].id);
            }

            // Восстанавливаем вкладки
            state.tabs.forEach(tabState => {
                this.createTab(tabState.url);
            });

            // Активируем нужную вкладку
            if (state.activeTabId) {
                setTimeout(() => {
                    this.activateTab(state.activeTabId);
                }, 100);
            }

            // Восстанавливаем PiP окно
            if (state.pipWindow) {
                setTimeout(() => {
                    this.createPiPWindow({ getURL: () => state.pipWindow.url })
                        .then(() => {
                            if (this.pipWindow && state.pipWindow.bounds) {
                                this.pipWindow.setBounds(state.pipWindow.bounds);
                            }
                        });
                }, 500);
            }
        } catch (error) {
            console.error('Ошибка при загрузке состояния:', error);
        }
    }

    // Добавляем метод для инициализации PiP
    initPiP() {
        // Добавляем обработчик для всех вкладок
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                const activeTab = this.getActiveTab();
                if (activeTab?.webview) {
                    const url = activeTab.webview.getURL();
                    if (url.includes('youtube.com/watch')) {
                        this.createPiPWindow(activeTab.webview);
                    }
                }
            }
        });
    }

    initDevTools() {
        // Добавляем обработчик клавиши F12
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F12') {
                const activeTab = this.getActiveTab();
                if (activeTab?.webview) {
                    if (activeTab.webview.isDevToolsOpened()) {
                        activeTab.webview.closeDevTools();
                    } else {
                        activeTab.webview.openDevTools({
                            mode: 'detach', // Отдельное окно
                            activate: true // Сразу активируем
                        });
                    }
                }
            }
        });

        // Добавляем контекстное меню для DevTools
        document.addEventListener('contextmenu', (e) => {
            const activeTab = this.getActiveTab();
            if (activeTab?.webview) {
                const menu = new (require('@electron/remote').Menu)();
                menu.append(new (require('@electron/remote').MenuItem)({
                    label: 'Инструменты разработчика',
                    click: () => {
                        if (activeTab.webview.isDevToolsOpened()) {
                            activeTab.webview.closeDevTools();
                        } else {
                            activeTab.webview.openDevTools({
                                mode: 'detach',
                                activate: true
                            });
                        }
                    }
                }));
                menu.popup();
            }
        });
    }

    initSettingsMenu() {
        const settingsBtn = document.querySelector('.settings-btn');
        const settingsMenu = document.querySelector('.settings-menu');

        settingsBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            settingsMenu.classList.toggle('show');
        });

        // Обработчики кнопок меню
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleMenuAction(action);
                settingsMenu.classList.remove('show');
            });
        });

        // Закрываем меню при клике вне его
        document.addEventListener('click', (e) => {
            if (!settingsMenu.contains(e.target) && !settingsBtn.contains(e.target)) {
                settingsMenu.classList.remove('show');
            }
        });
    }

    handleMenuAction(action) {
        switch(action) {
            case 'incognito':
                this.createIncognitoWindow();
                break;
            case 'history':
                this.loadSpecialPage('История', `
                    <div class="coming-soon">
                        <h3>История просмотров</h3>
                        <p>Эта функция будет доступна в следующем обновлении</p>
                        <span class="version-note">Ожидается в версии 1.2.0</span>
                    </div>
                `);
                break;
            case 'bookmarks':
                this.loadSpecialPage('Закладки', `
                    <div class="coming-soon">
                        <h3>Закладки</h3>
                        <p>Эта функция будет доступна в следующем обновлении</p>
                        <span class="version-note">Ожидается в версии 1.2.0</span>
                    </div>
                `);
                break;
            case 'downloads':
                this.loadSpecialPage('Загрузки', `
                    <div class="coming-soon">
                        <h3>Загрузки</h3>
                        <p>Эта функция будет доступна в следующем обновлении</p>
                        <span class="version-note">Ожидается в версии 1.2.0</span>
                    </div>
                `);
                break;
            case 'passwords':
                this.loadSpecialPage('Пароли', `
                    <div class="coming-soon">
                        <h3>Пароли и данные</h3>
                        <p>Эта функция будет доступна в следующем обновлении</p>
                        <span class="version-note">Ожидается в версии 1.2.0</span>
                    </div>
                `);
                break;
            case 'extensions':
                this.loadSpecialPage('Расширения', `
                    <div class="coming-soon">
                        <h3>Расширения</h3>
                        <p>Эта функция будет доступна в следующем обновлении</p>
                        <span class="version-note">Ожидается в версии 1.2.0</span>
                    </div>
                `);
                break;
            case 'more':
                this.loadSpecialPage('Дополнительно', `
                    <div class="coming-soon">
                        <h3>Дополнительные настройки</h3>
                        <p>Эта функция будет доступна в следующем обновлении</p>
                        <span class="version-note">Ожидается в версии 1.2.0</span>
                    </div>
                `);
                break;
            case 'help':
                this.loadSpecialPage('Помощь', `
                    <div class="coming-soon">
                        <h3>Помощь</h3>
                        <p>Эта функция будет доступна в следующем обновлении</p>
                        <span class="version-note">Ожидается в версии 1.2.0</span>
                    </div>
                `);
                break;
            case 'settings':
                this.loadSpecialPage('Настройки', `
                    <div class="coming-soon">
                        <h3>Настройки</h3>
                        <p>Эта функция будет доступна в следующем обновлении</p>
                        <span class="version-note">Ожидается в версии 1.2.0</span>
                    </div>
                `);
                break;
            case 'exit':
                const { getCurrentWindow } = require('@electron/remote');
                getCurrentWindow().close();
                break;
        }
    }

    loadSpecialPage(title, content) {
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    :root {
                        --background-color: ${window.getComputedStyle(document.body).getPropertyValue('--background-color')};
                        --text-color: ${window.getComputedStyle(document.body).getPropertyValue('--text-color')};
                        --accent-color: ${window.getComputedStyle(document.body).getPropertyValue('--accent-color')};
                    }
                    
                    body {
                        margin: 0;
                        padding: 20px;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        background: var(--background-color);
                        color: var(--text-color);
                        height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    
                    .coming-soon {
                        text-align: center;
                        padding: 40px;
                        max-width: 400px;
                        background: ${window.getComputedStyle(document.body).getPropertyValue('--hover-background')};
                        border-radius: 12px;
                        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                    }
                    
                    h3 {
                        margin: 0 0 16px 0;
                        font-size: 24px;
                        font-weight: 500;
                    }
                    
                    p {
                        margin: 0 0 20px 0;
                        font-size: 14px;
                        opacity: 0.8;
                        line-height: 1.5;
                    }
                    
                    .version-note {
                        display: inline-block;
                        padding: 6px 16px;
                        background: var(--accent-color);
                        color: white;
                        border-radius: 20px;
                        font-size: 12px;
                        font-weight: 500;
                    }
                </style>
            </head>
            <body>
                ${content}
            </body>
            </html>
        `;

        // Находим активную вкладку или создаем новую
        let activeTab = this.getActiveTab();
        if (!activeTab) {
            const tabId = this.createTab('about:blank');
            activeTab = this.getTabById(tabId);
        }

        // Загружаем контент в активную вкладку
        if (activeTab?.webview) {
            activeTab.webview.loadURL(`data:text/html,${encodeURIComponent(htmlContent)}`);
            
            // Обновляем заголовок вкладки
            const tabElement = document.querySelector(`[data-tab-id="${activeTab.id}"]`);
            if (tabElement) {
                const titleElement = tabElement.querySelector('.tab-title');
                if (titleElement) {
                    titleElement.textContent = title;
                }
            }
        }
    }

    createIncognitoWindow() {
        const { BrowserWindow } = require('@electron/remote');
        const win = new BrowserWindow({
            width: 1200,
            height: 800,
            frame: false,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                webviewTag: true,
                enableRemoteModule: true
            }
        });
        win.loadFile('index.html');
        // Добавляем флаг инкогнито
        win.webContents.session.setProxy({ mode: 'direct' });
        win.webContents.session.clearStorageData();
    }

    // Методы для работы с данными
    getHistoryItems() {
        return `
            <div class="coming-soon">
                <h3>История просмотров</h3>
                <p>Эта функция будет доступна в следующем обновлении</p>
                <span class="version-note">Ожидается в версии 1.2.0</span>
            </div>
        `;
    }

    getBookmarkItems() {
        return `
            <div class="coming-soon">
                <h3>Закладки</h3>
                <p>Эта функция будет доступна в следующем обновлении</p>
                <span class="version-note">Ожидается в версии 1.2.0</span>
            </div>
        `;
    }

    getDownloadItems() {
        return `
            <div class="coming-soon">
                <h3>Загрузки</h3>
                <p>Эта функция будет доступна в следующем обновлении</p>
                <span class="version-note">Ожидается в версии 1.2.0</span>
            </div>
        `;
    }

    getPasswordItems() {
        return `
            <div class="coming-soon">
                <h3>Пароли и данные</h3>
                <p>Эта функция будет доступна в следующем обновлении</p>
                <span class="version-note">Ожидается в версии 1.2.0</span>
            </div>
        `;
    }

    getExtensionItems() {
        return `
            <div class="coming-soon">
                <h3>Расширения</h3>
                <p>Эта функция будет доступна в следующем обновлении</p>
                <span class="version-note">Ожидается в версии 1.2.0</span>
            </div>
        `;
    }

    // Вспомогательные методы
    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 Byte';
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
    }

    getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const icons = {
            pdf: '📄',
            doc: '📝',
            docx: '📝',
            xls: '📊',
            xlsx: '📊',
            jpg: '🖼️',
            jpeg: '🖼️',
            png: '🖼️',
            gif: '🖼️',
            zip: '📦',
            rar: '📦',
            default: '📄'
        };
        return icons[ext] || icons.default;
    }

    decryptPasswords(encrypted) {
        // Простое демо-дешифрование
        try {
            return JSON.parse(atob(encrypted));
        } catch {
            return [];
        }
    }

    // Добавляем обработчики событий для новых элементов
    initSpecialTabEvents(tabId) {
        const tab = this.getTabById(tabId);
        if (!tab?.webview) return;

        tab.webview.addEventListener('dom-ready', () => {
            const webview = tab.webview;

            // Обработчики для истории
            webview.querySelectorAll('.delete-item').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const url = e.target.dataset.url;
                    this.deleteHistoryItem(url);
                    e.target.closest('.history-item').remove();
                });
            });

            // Обработчики для закладок
            webview.querySelectorAll('.delete-bookmark').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const url = e.target.dataset.url;
                    this.deleteBookmark(url);
                    e.target.closest('.bookmark-item').remove();
                });
            });

            // Обработчики для паролей
            webview.querySelectorAll('.show-password').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const input = e.target.closest('.password-item').querySelector('.item-password');
                    input.type = input.type === 'password' ? 'text' : 'password';
                });
            });

            // Обработчики для расширений
            webview.querySelectorAll('.extension-card input[type="checkbox"]').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    this.toggleExtension(e.target.dataset.id, e.target.checked);
                });
            });
        });
    }

    showWelcomeModal() {
        // Проверяем, нужно ли показывать окно
        if (localStorage.getItem('dontShowWelcome')) {
            return;
        }

        const modal = document.querySelector('.welcome-modal');
        if (!modal) {
            console.error('Welcome modal not found');
            return;
        }

        const startButton = modal.querySelector('.start-button');
        const dontShowCheckbox = modal.querySelector('#dontShowAgain');

        // Показываем модальное окно
        modal.classList.add('show');

        // Обработчик кнопки "Get Started"
        startButton.addEventListener('click', () => {
            modal.classList.remove('show');
            if (dontShowCheckbox.checked) {
                localStorage.setItem('dontShowWelcome', 'true');
            }
        });

        // Добавляем обработчик клика вне модального окна
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
                if (dontShowCheckbox.checked) {
                    localStorage.setItem('dontShowWelcome', 'true');
                }
            }
        });
    }
}

// Глобальный обработчик необработанных ошибок
window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('Необработанная ошибка:', {
        message: msg,
        url: url,
        lineNumber: lineNo,
        columnNumber: columnNo,
        error: error
    });
    return false;
};

// Глобальный обработчик необработанных промисов
window.addEventListener('unhandledrejection', function(event) {
    console.error('Необработанный промис:', event.reason);
});

const browser = new Browser(); 