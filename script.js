document.addEventListener("DOMContentLoaded", () => {
  const desktop = document.getElementById("desktop");
  const taskbarClockTime = document.getElementById("clock-time");
  const taskbarClockDate = document.getElementById("clock-date");
  const windowContainer = document.getElementById("window-container");
  const windowTemplate = document.getElementById("window-template");
  const startButton = document.getElementById("start-button");
  const startMenu = document.getElementById("start-menu");
  const startSearchInput = document.getElementById("start-search-input");
  const startSearchResults = document.getElementById("start-search-results");
  const startSearchAppsList = document.getElementById("search-apps-list");
  const startSearchAppsCategory = document.getElementById(
    "search-apps-category"
  );
  const startPinnedArea = document.getElementById("start-pinned-area");
  const startAllAppsArea = document.getElementById("start-all-apps-area");
  const allAppsListContainer = document.getElementById("all-apps-list");
  const startRecommendedItemsContainer = document.getElementById(
    "start-recommended-items"
  );
  const trayArrow = document.getElementById("tray-arrow");
  const trayFlyout = document.getElementById("tray-flyout");
  const minimizedWindowsContainer =
    document.getElementById("minimized-windows");
  const taskbar = document.getElementById("taskbar");
  const taskbarIconsContainer = document.querySelector(
    ".taskbar-center .taskbar-icons"
  );
  const contextMenu = document.getElementById("context-menu");
  const fileContextMenu = document.getElementById("file-context-menu");
  const taskbarContextMenu = document.getElementById("taskbar-context-menu");
  const snapHint = document.getElementById("snap-hint");
  const loadingIndicator = document.getElementById("loading-indicator");
  const widgetsButton = document.getElementById("widgets-button");
  const widgetsPanel = document.getElementById("widgets-panel");
  const taskViewButton = document.getElementById("taskview-button");
  const taskView = document.getElementById("task-view");
  const taskViewGrid = document.getElementById("task-view-grid");
  const closeTaskViewButton = document.getElementById("close-task-view");
  const loginScreen = document.getElementById("login-screen");
  const clockSection = document.getElementById("clock-section");
  const calendarFlyout = document.getElementById("calendar-flyout");
  const notificationButton = document.getElementById("notification-button");
  const notificationBadge = document.getElementById("notification-badge");
  const actionCenter = document.getElementById("action-center");
  const notificationList = document.getElementById("notification-list");
  const toastContainer = document.getElementById("toast-container");
  const toastTemplate = document.getElementById("notification-toast-template");
  const errorModal = document.getElementById("error-modal");
  const errorModalMessage = document.getElementById("error-modal-message");
  const bodyElement = document.body;

  let openWindows = {};
  let simulatedFileSystem = {};
  let recycleBinContents = [];
  let notifications = [];
  let recentlyOpenedApps = [];
  let pinnedTaskbarApps = ["my-computer", "browser"];
  let highestZIndex = 10;
  let nextWindowId = 1;
  let nextDesktopItemId = 1000;
  let activeWindowId = null;
  let draggedIcon = null;
  let draggedFileExplorerItem = null;
  let dragIconOffsetX = 0;
  let dragIconOffsetY = 0;
  let contextMenuTarget = null;
  let currentCalendarDate = new Date();
  let notificationCounter = 0;
  let renameInput = null;

  const TASKBAR_HEIGHT = 48;
  const WINDOW_SNAP_MARGIN = 5;
  const WINDOW_SNAP_THRESHOLD = 30;
  const MAX_RECENT_APPS = 6;
  const SAVE_STATE_KEY = "win11SimState_v4_accurate";

  function saveState() {
    try {
      const state = {
        windows: {},
        desktopIcons: {},
        fileSystem: simulatedFileSystem,
        recycleBin: recycleBinContents,
        notifications: notifications,
        recentApps: recentlyOpenedApps,
        pinnedTaskbarApps: pinnedTaskbarApps,
        nextWindowId: nextWindowId,
        nextDesktopItemId: nextDesktopItemId,
        highestZIndex: highestZIndex,
        wallpaper: desktop.style.backgroundImage || 'url("wallpaper.jpg")',
        accentColor:
          document.documentElement.style.getPropertyValue("--accent-color") ||
          "#0078d4",
        theme: bodyElement.classList.contains("dark-mode") ? "dark" : "light",
      };

      Object.values(openWindows).forEach((win) => {
        if (win.element && document.body.contains(win.element)) {
          const style = win.element.style;
          state.windows[win.id] = {
            id: win.id,
            title: win.title,
            icon: win.icon,
            appType: win.appType,
            state: win.state,
            zIndex: parseInt(style.zIndex || 10),
            left: style.left || "0px",
            top: style.top || "0px",
            width: style.width || "600px",
            height: style.height || "400px",
            originalBounds: win.originalBounds,
            content: null,
          };
          if (win.appType === "notepad") {
            const textarea = win.element.querySelector(".notepad-content");
            state.windows[win.id].content = textarea ? textarea.value : "";
          }
        }
      });
      document.querySelectorAll(".desktop-icon").forEach((icon) => {
        if (icon.id && document.body.contains(icon)) {
          state.desktopIcons[icon.id] = {
            left: icon.style.left,
            top: icon.style.top,
            title: icon.title,
            spanText: icon.querySelector("span").textContent,
            iconUrl: icon.dataset.iconUrl || icon.querySelector("img")?.src,
            appType: icon.dataset.appType,
            dynamic: icon.classList.contains("dynamic-item"),
          };
        }
      });
      localStorage.setItem(SAVE_STATE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error("Error saving state:", error);
      showErrorModal("Could not save simulation state.");
    }
  }

  function loadState() {
    hidePopups();
    try {
      const savedStateString = localStorage.getItem(SAVE_STATE_KEY);
      if (!savedStateString) {
        console.log("No saved state found. Applying defaults.");
        applyTheme("#0078d4");
        applyWallpaper('url("wallpaper.jpg")');
        applyLightDarkMode("light");
        initializeDefaultFileSystem();
        positionInitialIcons();
        updateTaskbarPinnedIcons();
        updateRecycleBinIcon();
        showNotification(
          "Welcome!",
          "Windows 11 Simulation Enhanced loaded.",
          "https://img.icons8.com/fluency/48/info.png"
        );
        return;
      }

      const state = JSON.parse(savedStateString);

      nextWindowId = state.nextWindowId || 1;
      nextDesktopItemId = state.nextDesktopItemId || 1000;
      highestZIndex = state.highestZIndex || 10;
      simulatedFileSystem = state.fileSystem || {};
      recycleBinContents = state.recycleBin || [];
      notifications = state.notifications || [];
      recentlyOpenedApps = state.recentApps || [];
      pinnedTaskbarApps = state.pinnedTaskbarApps || ["my-computer", "browser"];
      applyTheme(state.accentColor || "#0078d4");
      applyWallpaper(state.wallpaper || 'url("wallpaper.jpg")');
      applyLightDarkMode(state.theme || "light");

      const currentIconsOnPage = {};
      document
        .querySelectorAll(".desktop-icon")
        .forEach((icon) => (currentIconsOnPage[icon.id] = icon));
      let hasSavedIconPositions = false;

      for (const id in state.desktopIcons) {
        const iconState = state.desktopIcons[id];
        let iconElement = document.getElementById(id);
        if (!iconElement && iconState.dynamic) {
          iconElement = createDesktopIcon(
            id,
            iconState.title,
            iconState.spanText,
            iconState.iconUrl,
            iconState.appType,
            true
          );
        } else if (iconElement && iconState.dynamic) {
          iconElement.classList.add("dynamic-item");
          iconElement.dataset.appType = iconState.appType;
          iconElement.dataset.iconUrl = iconState.iconUrl;
        }
        if (iconElement) {
          if (!iconElement.dataset.appType)
            iconElement.dataset.appType = iconState.appType;
          if (iconState.left && iconState.top) {
            iconElement.style.left = iconState.left;
            iconElement.style.top = iconState.top;
            hasSavedIconPositions = true;
          }
          iconElement.title = iconState.title;
          iconElement.querySelector("span").textContent = iconState.spanText;
          delete currentIconsOnPage[id];
        }
      }
      Object.values(currentIconsOnPage).forEach((icon) => {
        if (icon && icon.classList.contains("dynamic-item")) {
          icon.remove();
        } else if (icon && !state.desktopIcons[icon.id]) {
          if (!icon.style.left && !icon.style.top) {
            hasSavedIconPositions = false;
          }
        }
      });
      if (!hasSavedIconPositions) {
        console.log("Positioning needed.");
        positionInitialIcons();
      }

      windowContainer.innerHTML = "";
      minimizedWindowsContainer.innerHTML = "";
      openWindows = {};
      const sortedWindowIds = Object.keys(state.windows || {}).sort(
        (a, b) =>
          (state.windows[a].zIndex || 0) - (state.windows[b].zIndex || 0)
      );

      for (const id of sortedWindowIds) {
        const winState = state.windows[id];
        if (
          winState &&
          (windowContentGenerators[winState.appType] ||
            winState.appType.startsWith("generic"))
        ) {
          let contentHtml = "";
          let contentGeneratorFunc = null;
          if (windowContentGenerators[winState.appType]) {
            contentGeneratorFunc = windowContentGenerators[winState.appType];
            contentHtml = contentGeneratorFunc();
          } else {
            contentHtml = `<div style="padding:20px;">Generic Content for ${winState.title}</div>`;
          }
          let savedContentForApp =
            winState.appType === "notepad" ? winState.content : null;
          createWindow(
            winState.id,
            winState.title,
            winState.icon,
            contentHtml,
            winState.width,
            winState.height,
            winState.left,
            winState.top,
            winState.appType,
            savedContentForApp,
            true
          );
          const newWin = openWindows[winState.id];
          if (newWin) {
            newWin.element.style.zIndex = winState.zIndex;
            newWin.originalBounds = winState.originalBounds;
            if (winState.state === "minimized") {
              newWin.state = "normal";
              minimizeWindow(winState.id, true);
            } else if (winState.state === "maximized") {
              newWin.state = "normal";
              maximizeWindow(winState.id, true);
            } else if (winState.state && winState.state.startsWith("snapped")) {
              snapWindow(
                winState.id,
                winState.state.replace("snapped-", ""),
                true
              );
            } else {
              newWin.state = "normal";
              if (!newWin.taskbarButton)
                newWin.taskbarButton = createMinimizedTaskbarItem(
                  winState.id,
                  winState.title,
                  winState.icon
                );
              if (newWin.taskbarButton)
                newWin.taskbarButton.classList.remove("active");
            }
          }
        } else {
          console.warn(
            `Content generator/appType not found for window ID "${id}". Skipping.`
          );
        }
      }
      let topWinIdRestored = null;
      let maxZRestored = 0;
      Object.values(openWindows).forEach((win) => {
        if (win.state !== "minimized" && win.element) {
          const z = parseInt(win.element.style.zIndex || 0);
          if (z >= maxZRestored) {
            maxZRestored = z;
            topWinIdRestored = win.id;
          }
        }
      });
      if (topWinIdRestored) bringToFront(topWinIdRestored);

      updateTaskbarPinnedIcons();
      updateRecycleBinIcon();
      updateNotifications();
      updateStartRecommendations();
      console.log("State loaded.");
    } catch (error) {
      console.error("Error loading state:", error);
      localStorage.removeItem(SAVE_STATE_KEY);
      showErrorModal("Failed to load previous state. Resetting to defaults.");
      applyTheme("#0078d4");
      applyWallpaper('url("wallpaper.jpg")');
      applyLightDarkMode("light");
      initializeDefaultFileSystem();
      positionInitialIcons();
      updateTaskbarPinnedIcons();
      updateRecycleBinIcon();
    }
  }

  function initializeDefaultFileSystem() {
    simulatedFileSystem = {
      "C:": {
        type: "drive",
        name: "Local Disk (C:)",
        children: {
          Users: { type: "folder", name: "Users", children: {} },
          Windows: { type: "folder", name: "Windows", children: {} },
          "Program Files": {
            type: "folder",
            name: "Program Files",
            children: {},
          },
        },
      },
      Desktop: { type: "folder", name: "Desktop", children: {} },
      Documents: { type: "folder", name: "Documents", children: {} },
      Downloads: { type: "folder", name: "Downloads", children: {} },
      Pictures: { type: "folder", name: "Pictures", children: {} },
      Music: { type: "folder", name: "Music", children: {} },
      Videos: { type: "folder", name: "Videos", children: {} },
    };
    document
      .querySelectorAll(".desktop-icon:not(.dynamic-item)")
      .forEach((icon) => {
        const id = icon.id.replace("-icon", "");
        const fsId = icon.id;
        simulatedFileSystem.Desktop.children[fsId] = {
          type: "file",
          name: icon.querySelector("span").textContent,
          appType: icon.dataset.appType,
          icon: icon.querySelector("img")?.src,
          desktopIconId: icon.id,
        };
      });
  }

  function updateClock() {
    const now = new Date();
    const timeOptions = { hour: "numeric", minute: "2-digit", hour12: true };
    const dateOptionsFull = { weekday: "long", month: "long", day: "numeric" };
    const dateOptionsShort = {
      month: "numeric",
      day: "numeric",
      year: "numeric",
    };
    taskbarClockTime.textContent = now.toLocaleTimeString("en-US", timeOptions);
    taskbarClockDate.textContent = now.toLocaleDateString(
      "en-US",
      dateOptionsShort
    );
    const loginTime = loginScreen.querySelector(".login-time");
    const loginDate = loginScreen.querySelector(".login-date");
    if (loginTime)
      loginTime.textContent = now.toLocaleTimeString("en-US", timeOptions);
    if (loginDate)
      loginDate.textContent = now.toLocaleDateString("en-US", dateOptionsFull);
    const widgetClock = document.getElementById("widget-clock");
    if (widgetsPanel.classList.contains("active") && widgetClock) {
      widgetClock.textContent = now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    }
  }
  function setupCalendar() {
    const monthYearLabel = document.getElementById("calendar-month-year");
    const daysContainer = document.querySelector(".calendar-days");
    const prevMonthBtn = document.getElementById("calendar-prev-month");
    const nextMonthBtn = document.getElementById("calendar-next-month");
    function renderCalendar(date) {
      daysContainer.innerHTML = "";
      const year = date.getFullYear();
      const month = date.getMonth();
      monthYearLabel.textContent = date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
      const firstDayOfMonth = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const today = new Date();
      for (let i = 0; i < firstDayOfMonth; i++) {
        daysContainer.appendChild(document.createElement("div"));
      }
      for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement("div");
        dayElement.textContent = day;
        dayElement.classList.add("calendar-day");
        if (
          year === today.getFullYear() &&
          month === today.getMonth() &&
          day === today.getDate()
        ) {
          dayElement.classList.add("today");
        }
        daysContainer.appendChild(dayElement);
      }
    }
    prevMonthBtn.addEventListener("click", () => {
      currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
      renderCalendar(currentCalendarDate);
    });
    nextMonthBtn.addEventListener("click", () => {
      currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
      renderCalendar(currentCalendarDate);
    });
    renderCalendar(currentCalendarDate);
  }
  if (loginScreen) {
    loginScreen.addEventListener(
      "click",
      () => {
        loginScreen.classList.add("hidden");
        setTimeout(() => {
          loadState();
        }, 100);
      },
      { once: true }
    );
  } else {
    loadState();
  }
  setInterval(updateClock, 1000);
  updateClock();
  setupCalendar();

  function updateNotificationBadge() {
    const unreadCount = notifications.filter((n) => !n.read).length;
    if (unreadCount > 0) {
      notificationBadge.textContent = unreadCount > 9 ? "9+" : unreadCount;
      notificationBadge.style.display = "block";
      notificationButton.classList.add("has-notifications");
    } else {
      notificationBadge.style.display = "none";
      notificationButton.classList.remove("has-notifications");
    }
  }
  function renderNotifications() {
    notificationList.innerHTML = "";
    if (notifications.length === 0) {
      notificationList.innerHTML =
        '<div class="no-notifications">No new notifications</div>';
      return;
    }
    notifications
      .slice()
      .reverse()
      .forEach((n) => {
        const item = document.createElement("div");
        item.className = "notification-item";
        item.innerHTML = `
                 <img src="${
                   n.icon || "https://img.icons8.com/fluency/48/info.png"
                 }" alt="icon" class="notification-icon">
                 <div class="notification-content">
                     <div class="notification-title">${n.title}</div>
                     <div class="notification-message">${n.message}</div>
                 </div>
             `;
        notificationList.appendChild(item);
      });
    updateNotificationBadge();
  }
  function showNotification(
    title,
    message,
    icon = "https://img.icons8.com/fluency/48/info.png",
    duration = 5000
  ) {
    const id = `notif-${notificationCounter++}`;
    const newNotification = {
      id,
      title,
      message,
      icon,
      read: false,
      timestamp: Date.now(),
    };
    notifications.push(newNotification);
    updateNotificationBadge();
    playSound("notification");

    const toast = toastTemplate.content.firstElementChild.cloneNode(true);
    toast.id = `toast-${id}`;
    toast.querySelector(".toast-icon").src = icon;
    toast.querySelector(".toast-title").textContent = title;
    toast.querySelector(".toast-message").textContent = message;
    toastContainer.appendChild(toast);

    const closeButton = toast.querySelector(".toast-close");
    const removeToast = () => {
      toast.classList.add("fade-out");
      toast.addEventListener("animationend", () => toast.remove(), {
        once: true,
      });
    };
    closeButton.addEventListener("click", removeToast);
    setTimeout(removeToast, duration);
    saveState();
  }
  notificationButton?.addEventListener("click", (e) => {
    e.stopPropagation();
    togglePopup(actionCenter);
    if (actionCenter.classList.contains("active")) {
      renderNotifications();
      notifications.forEach((n) => (n.read = true));
      updateNotificationBadge();
      saveState();
    }
  });
  actionCenter
    ?.querySelector("#clear-notifications-btn")
    ?.addEventListener("click", () => {
      notifications = [];
      renderNotifications();
      saveState();
    });

  function hidePopups(except = null) {
    const popups = [
      startMenu,
      trayFlyout,
      widgetsPanel,
      calendarFlyout,
      actionCenter,
      contextMenu,
      fileContextMenu,
      taskbarContextMenu,
    ];
    popups.forEach((popup) => {
      if (
        popup &&
        popup !== except &&
        (popup.classList.contains("active") ||
          popup.classList.contains("visible"))
      ) {
        popup.classList.remove("active", "visible");
        if (popup === startMenu) {
          startSearchInput.value = "";
          startSearchResults.classList.remove("visible");
          startPinnedArea.style.display = "flex";
          startAllAppsArea.style.display = "none";
        }
        if (
          popup === contextMenu ||
          popup === fileContextMenu ||
          popup === taskbarContextMenu
        ) {
          setTimeout(() => {
            if (!popup.classList.contains("visible"))
              popup.style.display = "none";
          }, 150);
        }
      }
    });
  }
  function togglePopup(popupElement) {
    const isActive =
      popupElement.classList.contains("active") ||
      popupElement.classList.contains("visible");
    hidePopups(popupElement);
    if (!isActive) {
      if (popupElement.id.includes("context-menu")) {
        popupElement.style.display = "block";
        void popupElement.offsetWidth;
        popupElement.classList.add("visible");
      } else {
        popupElement.classList.add("active");
      }
      if (
        popupElement === trayFlyout ||
        popupElement === calendarFlyout ||
        popupElement === actionCenter
      ) {
        popupElement.style.right = `5px`;
        popupElement.style.bottom = `${TASKBAR_HEIGHT + 7}px`;
      } else if (popupElement === widgetsPanel) {
        popupElement.style.left = `10px`;
        popupElement.style.bottom = `${TASKBAR_HEIGHT + 7}px`;
      }
    }
  }
  document.addEventListener("click", (event) => {
    if (!event.target.closest("#start-menu, #start-button, #search-button")) {
      startMenu.classList.remove("active");
      startSearchInput.value = "";
      startSearchResults.classList.remove("visible");
      startPinnedArea.style.display = "flex";
      startAllAppsArea.style.display = "none";
    }
    if (!event.target.closest("#tray-flyout, #tray-arrow"))
      trayFlyout.classList.remove("active");
    if (!event.target.closest("#widgets-panel, #widgets-button"))
      widgetsPanel.classList.remove("active");
    if (!event.target.closest("#calendar-flyout, #clock-section"))
      calendarFlyout.classList.remove("active");
    if (!event.target.closest("#action-center, #notification-button"))
      actionCenter.classList.remove("active");
    if (!event.target.closest(".context-menu")) hideContextMenu();
    if (
      !event.target.closest(".desktop-icon") &&
      !event.target.closest(".context-menu") &&
      !event.target.closest(".window")
    ) {
      if (event.target === desktop || event.target === windowContainer) {
        deselectAllDesktopIcons();
        if (renameInput) finishRename(true);
      }
    }
    if (
      !event.target.closest(".fe-item") &&
      !event.target.closest("#file-context-menu")
    ) {
      if (event.target.closest(".fe-content-area")) {
        deselectAllFileExplorerItems(event.target.closest(".window"));
        if (renameInput) finishRename(true);
      }
    }
    if (!event.target.closest(".start-search-box, #start-search-results")) {
      startSearchResults.classList.remove("visible");
    }
  });
  startButton?.addEventListener("click", (e) => {
    e.stopPropagation();
    togglePopup(startMenu);
  });
  trayArrow?.addEventListener("click", (e) => {
    e.stopPropagation();
    togglePopup(trayFlyout);
  });
  widgetsButton?.addEventListener("click", (e) => {
    e.stopPropagation();
    togglePopup(widgetsPanel);
  });
  clockSection?.addEventListener("click", (e) => {
    e.stopPropagation();
    togglePopup(calendarFlyout);
  });
  taskViewButton?.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleTaskView();
  });
  closeTaskViewButton?.addEventListener("click", () => toggleTaskView(false));
  document.getElementById("search-button")?.addEventListener("click", (e) => {
    e.stopPropagation();
    togglePopup(startMenu);
    startSearchInput.focus();
  });
  notificationButton?.addEventListener("click", (e) => {
    e.stopPropagation();
    togglePopup(actionCenter);
    if (actionCenter.classList.contains("active")) {
      renderNotifications();
      notifications.forEach((n) => (n.read = true));
      updateNotificationBadge();
      saveState();
    }
  });
  actionCenter
    ?.querySelector("#clear-notifications-btn")
    ?.addEventListener("click", () => {
      notifications = [];
      renderNotifications();
      saveState();
    });

  function filterStartMenuApps() {
    const searchTerm = startSearchInput.value.toLowerCase().trim();
    const apps = startMenu.querySelectorAll(
      "#start-pinned-area .start-app-grid .start-app-icon"
    );
    let hasVisibleApps = false;
    startSearchAppsList.innerHTML = "";
    if (searchTerm === "") {
      apps.forEach((app) => app.classList.remove("hidden"));
      startSearchResults.classList.remove("visible");
      startSearchAppsCategory.style.display = "none";
      startPinnedArea.style.display = "flex";
      startRecommendedItemsContainer.closest(
        ".recommended-section"
      ).style.display = "block";
      return;
    }
    startSearchResults.classList.add("visible");
    startPinnedArea.style.display = "none";
    startRecommendedItemsContainer.closest(
      ".recommended-section"
    ).style.display = "none";
    const allAppsData = getAllAppsData();
    allAppsData.forEach((appData) => {
      const appName = appData.title.toLowerCase();
      const isMatch = appName.includes(searchTerm);
      if (isMatch) {
        const li = document.createElement("li");
        li.dataset.appId = appData.id;
        li.innerHTML = `<img src="${appData.icon}" alt=""><span>${appData.title}</span>`;
        li.addEventListener("click", () => launchApp(appData.id));
        startSearchAppsList.appendChild(li);
        hasVisibleApps = true;
      }
    });
    startSearchAppsCategory.style.display = hasVisibleApps ? "block" : "none";
    document.getElementById("search-other-category").style.display =
      !hasVisibleApps ? "block" : "none";
  }
  function getAllAppsData() {
    const apps = [];
    const existingIds = new Set();
    startMenu
      .querySelectorAll("#start-pinned-area .start-app-grid .start-app-icon")
      .forEach((appIcon) => {
        const id = appIcon.dataset.appId;
        if (id && !existingIds.has(id)) {
          apps.push({
            id: id,
            title: appIcon.title,
            icon: appIcon.querySelector("img")?.src || "",
          });
          existingIds.add(id);
        }
      });
    const simulatedApps = [
      {
        id: "paint",
        title: "Paint",
        icon: "https://img.icons8.com/color/48/paint-palette.png",
      },
      {
        id: "camera",
        title: "Camera",
        icon: "https://img.icons8.com/fluency/48/camera.png",
      },
      {
        id: "terminal",
        title: "Terminal",
        icon: "https://img.icons8.com/fluency/48/console.png",
      },
      {
        id: "photos",
        title: "Photos",
        icon: "https://img.icons8.com/fluency/48/photos.png",
      },
      {
        id: "mail",
        title: "Mail",
        icon: "https://img.icons8.com/fluency/48/mail.png",
      },
      {
        id: "store",
        title: "Store",
        icon: "https://img.icons8.com/fluency/48/microsoft-store.png",
      },
      {
        id: "clock",
        title: "Clock",
        icon: "https://img.icons8.com/fluency/48/alarm-clock.png",
      },
      {
        id: "solitaire",
        title: "Solitaire",
        icon: "https://img.icons8.com/color/48/playing-cards.png",
      },
    ];
    simulatedApps.forEach((app) => {
      if (!existingIds.has(app.id)) {
        apps.push(app);
        existingIds.add(app.id);
      }
    });
    document.querySelectorAll(".desktop-icon").forEach((icon) => {
      const id = icon.id.replace("-icon", "");
      if (!existingIds.has(id)) {
        apps.push({
          id: id,
          title: icon.title,
          icon: icon.querySelector("img")?.src || "",
        });
        existingIds.add(id);
      }
    });
    return apps.sort((a, b) => a.title.localeCompare(b.title));
  }
  function populateAllAppsList() {
    allAppsListContainer.innerHTML = "";
    const allApps = getAllAppsData();
    allApps.forEach((app) => {
      const item = document.createElement("div");
      item.className = "all-apps-list-item";
      item.dataset.appId = app.id;
      item.title = app.title;
      item.innerHTML = `<img src="${app.icon}" alt="${app.title}"><span>${app.title}</span>`;
      item.addEventListener("click", () => launchApp(app.id));
      allAppsListContainer.appendChild(item);
    });
  }
  function updateStartRecommendations() {
    startRecommendedItemsContainer.innerHTML = "";
    const noRecMessage = startRecommendedItemsContainer.querySelector(
      ".no-recommendations"
    );
    if (noRecMessage) noRecMessage.remove();
    if (recentlyOpenedApps.length === 0) {
      startRecommendedItemsContainer.innerHTML =
        '<div class="no-recommendations">No recommendations (yet)</div>';
      return;
    }
    const uniqueRecent = [...new Set(recentlyOpenedApps)]
      .reverse()
      .slice(0, MAX_RECENT_APPS);
    uniqueRecent.forEach((appId) => {
      const details = getAppDetailsById(appId);
      if (details) {
        const recItem = document.createElement("div");
        recItem.className = "recommended-item";
        recItem.title = details.title;
        recItem.dataset.appId = details.id;
        recItem.innerHTML = ` <img src="${details.iconUrl}" alt="${details.title}"> <span>${details.title}</span> `;
        recItem.addEventListener("click", () => launchApp(details.id));
        startRecommendedItemsContainer.appendChild(recItem);
      }
    });
  }
  startSearchInput?.addEventListener("input", filterStartMenuApps);
  startSearchInput?.addEventListener("focus", filterStartMenuApps);
  startMenu.querySelector(".all-apps-button")?.addEventListener("click", () => {
    startPinnedArea.style.display = "none";
    startAllAppsArea.style.display = "flex";
    populateAllAppsList();
  });
  startMenu
    .querySelector(".back-to-pinned-button")
    ?.addEventListener("click", () => {
      startPinnedArea.style.display = "flex";
      startAllAppsArea.style.display = "none";
    });
  function addRecentApp(appId) {
    recentlyOpenedApps = recentlyOpenedApps.filter((id) => id !== appId);
    recentlyOpenedApps.unshift(appId);
    if (recentlyOpenedApps.length > MAX_RECENT_APPS * 2) {
      recentlyOpenedApps = recentlyOpenedApps.slice(0, MAX_RECENT_APPS * 2);
    }
    updateStartRecommendations();
  }

  function toggleTaskView(forceShow = null) {
    const show =
      forceShow !== null ? forceShow : !taskView.classList.contains("active");
    if (show) {
      hidePopups(taskView);
      taskViewGrid.innerHTML = "";
      let hasOpenWindows = false;
      const sortedWindows = Object.values(openWindows)
        .filter(
          (win) =>
            win.element &&
            win.state !== "minimized" &&
            document.body.contains(win.element)
        )
        .sort(
          (a, b) =>
            (parseInt(b.element.style.zIndex) || 0) -
            (parseInt(a.element.style.zIndex) || 0)
        );
      sortedWindows.forEach((win) => {
        hasOpenWindows = true;
        const thumb = document.createElement("div");
        thumb.className = "task-view-thumbnail";
        thumb.dataset.windowId = win.id;
        thumb.dataset.appType = win.appType || "generic";
        thumb.innerHTML = ` <div class="task-view-titlebar"> <img src="${win.icon}" alt=""> <span>${win.title}</span> </div> <div class="task-view-content-preview"> <i class="fa-solid fa-display"></i> </div> `;
        thumb.addEventListener("click", () => {
          bringToFront(win.id);
          toggleTaskView(false);
        });
        taskViewGrid.appendChild(thumb);
      });
      if (!hasOpenWindows) {
        taskViewGrid.innerHTML =
          '<p style="color: #ccc; grid-column: 1 / -1; text-align: center;">No open windows</p>';
      }
      taskView.style.display = "block";
      void taskView.offsetWidth;
      taskView.classList.add("active");
      playSound("taskViewOpen");
    } else {
      taskView.classList.remove("active");
      taskView.addEventListener(
        "transitionend",
        () => {
          if (!taskView.classList.contains("active")) {
            taskView.style.display = "none";
          }
        },
        { once: true }
      );
      playSound("taskViewClose");
    }
  }

  function bringToFront(windowId) {
    const win = openWindows[windowId];
    if (!win || !win.element || !document.body.contains(win.element)) return;
    if (win.state === "minimized") {
      restoreWindow(windowId);
      return;
    }
    highestZIndex++;
    win.element.style.zIndex = highestZIndex;
    if (document.activeElement !== win.element) {
      win.element.focus();
    }
    activeWindowId = windowId;
    document
      .querySelectorAll(".minimized-btn.active")
      .forEach((btn) => btn.classList.remove("active"));
    if (win.taskbarButton && document.body.contains(win.taskbarButton)) {
      win.taskbarButton.classList.add("active");
    } else if (win.taskbarButton) {
      console.warn(
        `Taskbar button for ${windowId} not in DOM, attempting re-creation.`
      );
      win.taskbarButton = createMinimizedTaskbarItem(
        windowId,
        win.title,
        win.icon
      );
      if (win.taskbarButton) win.taskbarButton.classList.add("active");
    }
    Object.values(openWindows).forEach((otherWin) => {
      if (otherWin.id !== windowId && otherWin.element) {
        otherWin.element.classList.remove("active-window");
      }
    });
    win.element.classList.add("active-window");
    saveState();
  }
  function createMinimizedTaskbarItem(id, title, iconSrc) {
    let button = minimizedWindowsContainer.querySelector(
      `.minimized-btn[data-window-id="${id}"]`
    );
    if (button) {
      button.title = title;
      const img = button.querySelector("img");
      if (img)
        img.src =
          iconSrc || "https://img.icons8.com/fluency/16/window-close.png";
      if (openWindows[id] && !openWindows[id].taskbarButton) {
        openWindows[id].taskbarButton = button;
      }
      return button;
    }
    button = document.createElement("button");
    button.className = "minimized-btn";
    button.dataset.windowId = id;
    button.title = title;
    const img = document.createElement("img");
    img.src = iconSrc || "https://img.icons8.com/fluency/16/window-close.png";
    img.alt = title.substring(0, 3);
    button.appendChild(img);
    button.addEventListener("click", () => {
      const currentWin = openWindows[id];
      if (
        !currentWin ||
        !currentWin.element ||
        !document.body.contains(currentWin.element)
      ) {
        removeMinimizedTaskbarItem(id);
        return;
      }
      if (currentWin.state === "minimized") restoreWindow(id);
      else if (activeWindowId === id) minimizeWindow(id);
      else bringToFront(id);
    });
    button.addEventListener("contextmenu", handleTaskbarItemContextMenu);
    minimizedWindowsContainer.appendChild(button);
    if (openWindows[id]) openWindows[id].taskbarButton = button;
    return button;
  }
  function removeMinimizedTaskbarItem(id) {
    const button = minimizedWindowsContainer.querySelector(
      `.minimized-btn[data-window-id="${id}"]`
    );
    if (button) button.remove();
    if (openWindows[id]) openWindows[id].taskbarButton = null;
    let topWinId = null;
    let maxZ = 0;
    Object.values(openWindows).forEach((win) => {
      if (
        win.id !== id &&
        win.element &&
        win.state !== "minimized" &&
        document.body.contains(win.element)
      ) {
        const z = parseInt(win.element.style.zIndex || 0);
        if (z >= maxZ) {
          maxZ = z;
          topWinId = win.id;
        }
      }
    });
    document
      .querySelectorAll(".minimized-btn.active")
      .forEach((btn) => btn.classList.remove("active"));
    if (topWinId && openWindows[topWinId]?.taskbarButton) {
      openWindows[topWinId].taskbarButton.classList.add("active");
      activeWindowId = topWinId;
    } else {
      activeWindowId = null;
    }
  }
  function minimizeWindow(id, skipStateSave = false) {
    const win = openWindows[id];
    if (!win || win.state === "minimized" || !win.element) return;
    playSound("minimize");
    const wasActive = activeWindowId === id;
    win.state = "minimized";
    win.element.classList.add("minimized");
    win.element.classList.remove("active-window");
    win.element.setAttribute("aria-hidden", "true");
    if (!win.taskbarButton || !document.body.contains(win.taskbarButton)) {
      win.taskbarButton = createMinimizedTaskbarItem(id, win.title, win.icon);
    }
    if (win.taskbarButton) win.taskbarButton.classList.remove("active");
    activeWindowId = null;
    if (wasActive) {
      let topWinId = null;
      let maxZ = 0;
      Object.values(openWindows).forEach((otherWin) => {
        if (
          otherWin.id !== id &&
          otherWin.state !== "minimized" &&
          otherWin.element
        ) {
          const z = parseInt(otherWin.element.style.zIndex || 0);
          if (z > maxZ) {
            maxZ = z;
            topWinId = otherWin.id;
          }
        }
      });
      if (topWinId) bringToFront(topWinId);
    }
    if (!skipStateSave) saveState();
  }
  function maximizeWindow(id, skipStateSave = false) {
    const win = openWindows[id];
    if (
      !win ||
      win.state === "maximized" ||
      win.state === "minimized" ||
      !win.element
    )
      return;
    playSound("maximize");
    if (win.state === "normal" || win.state.startsWith("snapped")) {
      win.originalBounds = {
        top: win.element.offsetTop,
        left: win.element.offsetLeft,
        width: win.element.offsetWidth,
        height: win.element.offsetHeight,
      };
    }
    win.state = "maximized";
    win.element.classList.remove(
      "snapped-left",
      "snapped-right",
      "snapped-top-left",
      "snapped-top-right",
      "snapped-bottom-left",
      "snapped-bottom-right",
      "snapped"
    );
    win.element.classList.add("maximized");
    win.element.style.top = `0px`;
    win.element.style.left = `0px`;
    win.element.style.width = `100%`;
    win.element.style.height = `calc(100vh - ${TASKBAR_HEIGHT}px)`;
    win.element.style.resize = "none";
    const maxRestoreBtn = win.element.querySelector(".win-maximize-restore");
    if (maxRestoreBtn) {
      const icon = maxRestoreBtn.querySelector("i");
      icon.classList.remove("fa-square", "fa-maximize-icon");
      icon.classList.add("fa-window-restore", "fa-restore-icon");
      maxRestoreBtn.title = "Restore";
    }
    if (!skipStateSave) {
      bringToFront(id);
      saveState();
    }
  }
  function restoreWindow(id, skipStateSave = false) {
    const win = openWindows[id];
    if (!win || !win.element) return;
    playSound("restore");
    const wasMinimized = win.state === "minimized";
    const wasMaximized = win.state === "maximized";
    const wasSnapped = win.state.startsWith("snapped");
    win.state = "normal";
    win.element.classList.remove(
      "minimized",
      "maximized",
      "snapped-left",
      "snapped-right",
      "snapped-top-left",
      "snapped-top-right",
      "snapped-bottom-left",
      "snapped-bottom-right",
      "snapped"
    );
    win.element.setAttribute("aria-hidden", "false");
    win.element.style.resize = "both";
    if ((wasMaximized || wasSnapped) && win.originalBounds) {
      win.element.style.transition = "none";
      requestAnimationFrame(() => {
        win.element.style.top = `${win.originalBounds.top}px`;
        win.element.style.left = `${win.originalBounds.left}px`;
        win.element.style.width = `${win.originalBounds.width}px`;
        win.element.style.height = `${win.originalBounds.height}px`;
        requestAnimationFrame(() => {
          win.element.style.transition = "";
        });
      });
    } else if (wasMaximized || wasSnapped) {
      win.element.style.width = "70%";
      win.element.style.height = "60%";
      win.element.style.top = "15%";
      win.element.style.left = "15%";
    }
    const maxRestoreBtn = win.element.querySelector(".win-maximize-restore");
    if (maxRestoreBtn) {
      const icon = maxRestoreBtn.querySelector("i");
      icon.classList.remove("fa-window-restore", "fa-restore-icon");
      icon.classList.add("fa-square", "fa-maximize-icon");
      maxRestoreBtn.title = "Maximize";
    }
    if (!win.taskbarButton || !document.body.contains(win.taskbarButton)) {
      win.taskbarButton = createMinimizedTaskbarItem(id, win.title, win.icon);
    }
    if (win.taskbarButton) {
      document
        .querySelectorAll(".minimized-btn.active")
        .forEach((btn) => btn.classList.remove("active"));
      win.taskbarButton.classList.add("active");
    }
    bringToFront(id);
    if (!skipStateSave) saveState();
  }
  function closeWindow(id) {
    const win = openWindows[id];
    if (!win || !win.element || win.closing) return;
    win.closing = true;
    playSound("close");
    win.element.classList.add("window-closing");
    win.element.style.pointerEvents = "none";
    const handleAnimationEnd = () => {
      win.element.removeEventListener("animationend", handleAnimationEnd);
      if (win.element && document.body.contains(win.element)) {
        win.element.remove();
      }
      removeMinimizedTaskbarItem(id);
      delete openWindows[id];
      saveState();
    };
    win.element.addEventListener("animationend", handleAnimationEnd);
    setTimeout(() => {
      if (openWindows[id] && openWindows[id].closing) {
        console.warn(`AnimationEnd fallback for closing window ${id}`);
        handleAnimationEnd();
      }
    }, 300);
  }
  function snapWindow(windowId, snapType, skipStateSave = false) {
    const win = openWindows[windowId];
    if (!win || !win.element || win.state === "minimized") return;
    if (win.state === "normal" || win.state === "maximized") {
      win.originalBounds = {
        top: win.element.offsetTop,
        left: win.element.offsetLeft,
        width: win.element.offsetWidth,
        height: win.element.offsetHeight,
      };
    }
    if (win.state === "maximized") {
      if (snapType === "maximize") {
        maximizeWindow(windowId, skipStateSave);
        return;
      }
      win.element.classList.remove("maximized");
      const bounds = win.originalBounds || {
        top: 50,
        left: 50,
        width: 600,
        height: 400,
      };
      win.element.style.top = `${bounds.top}px`;
      win.element.style.left = `${bounds.left}px`;
      win.element.style.width = `${bounds.width}px`;
      win.element.style.height = `${bounds.height}px`;
    }
    win.state = `snapped-${snapType}`;
    win.element.classList.add("snapped");
    win.element.className.split(" ").forEach((cls) => {
      if (cls.startsWith("snapped-") && cls !== "snapped")
        win.element.classList.remove(cls);
    });
    win.element.classList.add(`snapped-${snapType}`);
    win.element.style.resize = "none";
    const containerHeight = windowContainer.offsetHeight;
    const containerWidth = windowContainer.offsetWidth;
    let top = "0px",
      left = "0px",
      width = "50%",
      height = `${containerHeight}px`;
    switch (snapType) {
      case "left":
        width = "50%";
        left = "0px";
        break;
      case "right":
        width = "50%";
        left = "50%";
        break;
      case "top-left":
        width = "50%";
        height = `${containerHeight / 2}px`;
        top = "0px";
        left = "0px";
        break;
      case "top-right":
        width = "50%";
        height = `${containerHeight / 2}px`;
        top = "0px";
        left = "50%";
        break;
      case "bottom-left":
        width = "50%";
        height = `${containerHeight / 2}px`;
        top = `${containerHeight / 2}px`;
        left = "0px";
        break;
      case "bottom-right":
        width = "50%";
        height = `${containerHeight / 2}px`;
        top = `${containerHeight / 2}px`;
        left = "50%";
        break;
      case "trio-left":
        width = "33.33%";
        left = "0px";
        break;
      case "trio-mid":
        width = "33.34%";
        left = "33.33%";
        break;
      case "trio-right":
        width = "33.33%";
        left = "66.67%";
        break;
      default:
        win.state = "normal";
        win.element.classList.remove("snapped");
        return;
    }
    win.element.style.top = top;
    win.element.style.left = left;
    win.element.style.width = width;
    win.element.style.height = height;
    const maxRestoreBtn = win.element.querySelector(".win-maximize-restore");
    if (maxRestoreBtn) {
      const icon = maxRestoreBtn.querySelector("i");
      icon.classList.remove("fa-window-restore", "fa-restore-icon");
      icon.classList.add("fa-square", "fa-maximize-icon");
      maxRestoreBtn.title = "Maximize";
    }
    if (!skipStateSave) {
      bringToFront(id);
      saveState();
    }
  }

  function makeDraggableResizable(windowElement, windowId) {
    const titleBar = windowElement.querySelector(".window-titlebar");
    const maximizeButton = windowElement.querySelector(".win-maximize-restore");
    const snapLayoutsPopup = windowElement.querySelector("#snap-layouts-popup");
    let isDragging = false,
      isResizing = false;
    let dragOffsetX,
      dragOffsetY,
      resizeEdge,
      startX,
      startY,
      startWidth,
      startHeight,
      startLeft,
      startTop;
    let snapLayoutsTimeout = null;
    titleBar.addEventListener("mousedown", (e) => {
      if (
        e.button !== 0 ||
        e.target.closest(".window-control") ||
        getResizeEdge(e, windowElement)
      )
        return;
      const win = openWindows[windowId];
      if (win.state === "maximized") return;
      isDragging = true;
      dragOffsetX = e.clientX - windowElement.offsetLeft;
      dragOffsetY = e.clientY - windowElement.offsetTop;
      windowElement.style.cursor = "grabbing";
      titleBar.style.cursor = "grabbing";
      bringToFront(windowId);
      windowElement.classList.add("dragging-window");
      document.addEventListener("mousemove", onDragMove);
      document.addEventListener("mouseup", onDragUp);
    });
    titleBar.addEventListener("dblclick", (e) => {
      if (e.target.closest(".window-control")) return;
      const win = openWindows[windowId];
      if (win.state === "maximized") restoreWindow(windowId);
      else if (win.state === "normal" || win.state.startsWith("snapped"))
        maximizeWindow(windowId);
    });
    function onDragMove(e) {
      if (!isDragging) return;
      const win = openWindows[windowId];
      if (win.state.startsWith("snapped")) {
        restoreWindow(windowId);
        dragOffsetX = e.clientX - windowElement.offsetLeft;
        dragOffsetY = e.clientY - windowElement.offsetTop;
      }
      let newX = e.clientX - dragOffsetX;
      let newY = e.clientY - dragOffsetY;
      const containerRect = windowContainer.getBoundingClientRect();
      let snapSide = null;
      snapHint.style.display = "none";
      const clientYRelative = e.clientY - containerRect.top;
      if (clientYRelative < WINDOW_SNAP_MARGIN && clientYRelative > -50) {
        snapSide = "maximize";
        snapHint.style.top = `0px`;
        snapHint.style.left = `0px`;
        snapHint.style.width = `${containerRect.width}px`;
        snapHint.style.height = `${containerRect.height}px`;
        snapHint.style.display = "block";
      } else if (e.clientX < WINDOW_SNAP_MARGIN) {
        snapSide = "left";
        snapHint.style.top = `0px`;
        snapHint.style.left = `0px`;
        snapHint.style.width = `${containerRect.width / 2}px`;
        snapHint.style.height = `${containerRect.height}px`;
        snapHint.style.display = "block";
      } else if (e.clientX > window.innerWidth - WINDOW_SNAP_MARGIN) {
        snapSide = "right";
        snapHint.style.top = `0px`;
        snapHint.style.left = `${containerRect.width / 2}px`;
        snapHint.style.width = `${containerRect.width / 2}px`;
        snapHint.style.height = `${containerRect.height}px`;
        snapHint.style.display = "block";
      }
      windowElement.dataset.snapSide = snapSide || "";
      newX = Math.max(
        -windowElement.offsetWidth + 80,
        Math.min(newX, containerRect.width - 40)
      );
      newY = Math.max(
        0,
        Math.min(newY, containerRect.height - titleBar.offsetHeight)
      );
      windowElement.style.left = `${newX}px`;
      windowElement.style.top = `${newY}px`;
    }
    function onDragUp(e) {
      if (!isDragging) return;
      isDragging = false;
      windowElement.style.cursor = "default";
      titleBar.style.cursor = "grab";
      windowElement.classList.remove("dragging-window");
      snapHint.style.display = "none";
      document.removeEventListener("mousemove", onDragMove);
      document.removeEventListener("mouseup", onDragUp);
      const snapTarget = windowElement.dataset.snapSide;
      const releaseY = e.clientY - windowContainer.getBoundingClientRect().top;
      const releaseX = e.clientX;
      let snapped = false;
      if (snapTarget === "maximize" && releaseY < WINDOW_SNAP_THRESHOLD) {
        maximizeWindow(windowId);
        snapped = true;
      } else if (snapTarget === "left" && releaseX < WINDOW_SNAP_THRESHOLD) {
        snapWindow(windowId, "left");
        snapped = true;
      } else if (
        snapTarget === "right" &&
        releaseX > window.innerWidth - WINDOW_SNAP_THRESHOLD
      ) {
        snapWindow(windowId, "right");
        snapped = true;
      }
      windowElement.dataset.snapSide = "";
      if (snapped) playSound("snap");
      saveState();
    }
    const resizeBorderWidth = 8;
    function getResizeEdge(e, el) {
      const win = openWindows[windowId];
      if (!win || win.state === "maximized" || win.state.startsWith("snapped"))
        return null;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const onLeft = x < resizeBorderWidth,
        onRight = x > rect.width - resizeBorderWidth;
      const onTop = y < resizeBorderWidth,
        onBottom = y > rect.height - resizeBorderWidth;
      if (onTop && onLeft) return "nw";
      if (onTop && onRight) return "ne";
      if (onBottom && onLeft) return "sw";
      if (onBottom && onRight) return "se";
      if (onTop) return "n";
      if (onBottom) return "s";
      if (onLeft) return "w";
      if (onRight) return "e";
      return null;
    }
    windowElement.addEventListener("mousemove", (e) => {
      if (isDragging || isResizing) return;
      const edge = getResizeEdge(e, windowElement);
      windowElement.style.cursor = edge ? `${edge}-resize` : "default";
    });
    windowElement.addEventListener("mouseleave", () => {
      if (!isResizing) windowElement.style.cursor = "default";
    });
    windowElement.addEventListener("mousedown", (e) => {
      if (
        e.button !== 0 ||
        (e.target.closest(".window-titlebar") &&
          getResizeEdge(e, windowElement) !== "n")
      )
        return;
      if (e.target.closest(".window-control")) return;
      resizeEdge = getResizeEdge(e, windowElement);
      if (resizeEdge) {
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = windowElement.offsetWidth;
        startHeight = windowElement.offsetHeight;
        startLeft = windowElement.offsetLeft;
        startTop = windowElement.offsetTop;
        windowElement.classList.add("resizing");
        bringToFront(windowId);
        document.addEventListener("mousemove", handleResize);
        document.addEventListener("mouseup", onResizeUp);
      }
    });
    function handleResize(e) {
      if (!isResizing) return;
      const dx = e.clientX - startX,
        dy = e.clientY - startY;
      let newWidth = startWidth,
        newHeight = startHeight,
        newLeft = startLeft,
        newTop = startTop;
      const minWidth = parseInt(windowElement.style.minWidth) || 200;
      const minHeight = parseInt(windowElement.style.minHeight) || 150;
      const containerRect = windowContainer.getBoundingClientRect();
      if (resizeEdge.includes("e"))
        newWidth = Math.max(minWidth, startWidth + dx);
      if (resizeEdge.includes("w")) {
        newWidth = Math.max(minWidth, startWidth - dx);
        newLeft = startLeft + dx;
        if (newWidth === minWidth) newLeft = startLeft + startWidth - minWidth;
      }
      if (resizeEdge.includes("s"))
        newHeight = Math.max(minHeight, startHeight + dy);
      if (resizeEdge.includes("n")) {
        newHeight = Math.max(minHeight, startHeight - dy);
        newTop = startTop + dy;
        if (newHeight === minHeight)
          newTop = startTop + startHeight - minHeight;
      }
      if (newLeft < -minWidth + 50) {
        newWidth = startWidth + startLeft - (-minWidth + 50);
        newLeft = -minWidth + 50;
      }
      if (newTop < 0) {
        newHeight = startHeight + startTop;
        newTop = 0;
      }
      if (newLeft + newWidth > containerRect.width + minWidth - 50) {
        newWidth = containerRect.width + minWidth - 50 - newLeft;
      }
      if (newTop + newHeight > containerRect.height) {
        newHeight = containerRect.height - newTop;
      }
      windowElement.style.width = `${Math.max(minWidth, newWidth)}px`;
      windowElement.style.height = `${Math.max(minHeight, newHeight)}px`;
      if (resizeEdge.includes("w") || resizeEdge.includes("n")) {
        windowElement.style.left = `${newLeft}px`;
        windowElement.style.top = `${newTop}px`;
      }
    }
    function onResizeUp() {
      isResizing = false;
      windowElement.classList.remove("resizing");
      windowElement.style.cursor = "default";
      document.removeEventListener("mousemove", handleResize);
      document.removeEventListener("mouseup", onResizeUp);
      saveState();
    }
    windowElement.addEventListener(
      "mousedown",
      () => {
        if (openWindows[windowId]?.state !== "minimized") {
          bringToFront(windowId);
        }
      },
      true
    );
    if (maximizeButton && snapLayoutsPopup) {
      maximizeButton.addEventListener("mouseenter", () => {
        const win = openWindows[windowId];
        if (!win || win.state === "maximized" || win.state === "minimized")
          return;
        clearTimeout(snapLayoutsTimeout);
        snapLayoutsPopup.classList.add("visible");
      });
      maximizeButton.addEventListener("mouseleave", () => {
        snapLayoutsTimeout = setTimeout(
          () => snapLayoutsPopup.classList.remove("visible"),
          200
        );
      });
      snapLayoutsPopup.addEventListener("mouseenter", () =>
        clearTimeout(snapLayoutsTimeout)
      );
      snapLayoutsPopup.addEventListener(
        "mouseleave",
        () =>
          (snapLayoutsTimeout = setTimeout(
            () => snapLayoutsPopup.classList.remove("visible"),
            200
          ))
      );
      snapLayoutsPopup
        .querySelectorAll(".snap-layout-option")
        .forEach((option) => {
          option.addEventListener("click", (e) => {
            e.stopPropagation();
            const layout = option.dataset.layout;
            snapWindow(windowId, layout);
            snapLayoutsPopup.classList.remove("visible");
          });
        });
    }
  }
  function setupWindowControls(windowElement, windowId) {
    const minimizeButton = windowElement.querySelector(".win-minimize");
    const maximizeRestoreButton = windowElement.querySelector(
      ".win-maximize-restore"
    );
    const closeButton = windowElement.querySelector(".win-close");
    minimizeButton?.addEventListener("click", (e) => {
      e.stopPropagation();
      minimizeWindow(windowId);
    });
    maximizeRestoreButton?.addEventListener("click", (e) => {
      e.stopPropagation();
      const win = openWindows[windowId];
      if (win?.state === "maximized") restoreWindow(windowId);
      else maximizeWindow(windowId);
    });
    closeButton?.addEventListener("click", (e) => {
      e.stopPropagation();
      closeWindow(windowId);
    });
  }

  function showLoadingIndicator(duration = 150) {
    loadingIndicator.classList.add("visible");
    setTimeout(() => loadingIndicator.classList.remove("visible"), duration);
  }

  function createWindow(
    id,
    title,
    iconSrc,
    contentHtml,
    initialWidth = 600,
    initialHeight = 400,
    initialLeft,
    initialTop,
    appType,
    savedContent = null,
    skipStateSave = false
  ) {
    if (openWindows[id] && openWindows[id].state === "minimized") {
      showLoadingIndicator();
      restoreWindow(id);
      return openWindows[id].element;
    }
    if (
      openWindows[id] &&
      openWindows[id].element &&
      document.body.contains(openWindows[id].element)
    ) {
      bringToFront(id);
      return openWindows[id].element;
    }
    if (openWindows[id]) {
      console.warn(`Window ${id} object existed without element. Cleaning up.`);
      removeMinimizedTaskbarItem(id);
      delete openWindows[id];
    }
    showLoadingIndicator();
    playSound("open");
    const windowEl = windowTemplate.content.firstElementChild.cloneNode(true);
    const windowId = id || `window-${nextWindowId++}`;
    windowEl.id = windowId;
    windowEl.dataset.appType = appType || "generic";
    windowEl.querySelector(".window-title").textContent = title;
    const iconEl = windowEl.querySelector(".window-icon");
    iconEl.src =
      iconSrc || "https://img.icons8.com/fluency/16/window-close.png";
    iconEl.alt = title;
    windowEl.querySelector(".window-content").innerHTML = contentHtml;
    const maxRestoreBtn = windowEl.querySelector(".win-maximize-restore");
    if (maxRestoreBtn) {
      const icon = maxRestoreBtn.querySelector("i");
      icon.className = "fa-regular fa-square fa-maximize-icon";
    }
    const containerWidth = windowContainer.offsetWidth;
    const containerHeight = windowContainer.offsetHeight;
    const parseValue = (value, relativeTo) => {
      if (typeof value === "string") {
        if (value.endsWith("%")) return (parseFloat(value) / 100) * relativeTo;
        if (value.endsWith("px")) return parseInt(value);
      }
      return parseInt(value) || 0;
    };
    let width = parseValue(initialWidth, containerWidth);
    let height = parseValue(initialHeight, containerHeight);
    let left, top;
    if (initialLeft === undefined || initialTop === undefined) {
      const openCount = Object.keys(openWindows).length;
      left = (openCount * 30 + 70) % Math.max(100, containerWidth - width - 60);
      top =
        (openCount * 30 + 40) % Math.max(100, containerHeight - height - 60);
    } else {
      left = parseValue(initialLeft, containerWidth);
      top = parseValue(initialTop, containerHeight);
    }
    width = Math.max(300, width);
    height = Math.max(200, height);
    left = Math.max(0, Math.min(left, containerWidth - 50));
    top = Math.max(0, Math.min(top, containerHeight - 50));
    windowEl.style.left = `${left}px`;
    windowEl.style.top = `${top}px`;
    windowEl.style.width = `${width}px`;
    windowEl.style.height = `${height}px`;
    windowEl.style.minWidth = "300px";
    windowEl.style.minHeight = "200px";
    windowContainer.appendChild(windowEl);
    windowEl.classList.add("visible");
    openWindows[windowId] = {
      id: windowId,
      element: windowEl,
      state: "normal",
      originalBounds: null,
      taskbarButton: null,
      title: title,
      icon: iconSrc,
      appType: appType,
      closing: false,
    };
    if (appType === "notepad") setupNotepad(windowEl, windowId, savedContent);
    else if (appType === "calculator") setupCalculator(windowEl, windowId);
    else if (appType === "settings") setupSettingsApp(windowEl, windowId);
    else if (appType === "my-computer" || appType === "folder")
      setupFileExplorer(windowEl, windowId, appType === "folder" ? id : null);
    else if (appType === "browser") setupBrowser(windowEl, windowId);
    else if (appType === "recycle-bin") setupRecycleBin(windowEl, windowId);
    makeDraggableResizable(windowEl, windowId);
    setupWindowControls(windowEl, windowId);
    openWindows[windowId].taskbarButton = createMinimizedTaskbarItem(
      windowId,
      title,
      iconSrc
    );
    addRecentApp(windowId.replace("window-", ""));
    bringToFront(windowId);
    const focusable = windowEl.querySelector("textarea, input[type='text']");
    setTimeout(() => (focusable ? focusable.focus() : windowEl.focus()), 50);
    if (!skipStateSave) saveState();
    return windowEl;
  }

  const windowContentGenerators = {
    "my-computer": () => `<div class="file-explorer-content"></div>`,
    folder: () => `<div class="file-explorer-content"></div>`,
    notepad: () =>
      `<div class="notepad-content-wrapper"><div class="notepad-menubar"><div class="notepad-menu-item">File</div><div class="notepad-menu-item">Edit</div><div class="notepad-menu-item">View</div></div><textarea class="notepad-content" spellcheck="false"></textarea></div>`,
    "recycle-bin": () =>
      `<div class="recycle-bin-content" style="padding: 30px; text-align: center; color: var(--text-light-color); height: 100%; display:flex; flex-direction: column; align-items: center; justify-content: center;"><i class="fas fa-recycle" style="font-size: 48px; margin-bottom: 15px;"></i><p>Recycle Bin</p><div class="recycle-bin-items"></div><button class="empty-recycle-bin-btn" style="margin-top: 20px; padding: 8px 15px; cursor: pointer; background-color: var(--highlight-background); border: 1px solid var(--highlight-active-background); border-radius: 4px; color: var(--text-color);">Empty Recycle Bin</button></div>`,
    calculator: () =>
      `<div class="calculator-content"><div class="calc-history"></div><div class="calc-display">0</div><div class="calc-buttons"><button class="operator">%</button><button>CE</button><button>C</button><button class="operator">/</button><button>7</button><button>8</button><button>9</button><button class="operator">*</button><button>4</button><button>5</button><button>6</button><button class="operator">-</button><button>1</button><button>2</button><button>3</button><button class="operator">+</button><button>+/-</button><button>0</button><button>.</button><button class="equals">=</button></div></div>`,
    settings: () =>
      `<div class="settings-content"><div class="settings-sidebar"><ul><li class="active" data-section="personalization"><i class="fa-solid fa-palette"></i> Personalization</li><li data-section="theme"><i class="fa-solid fa-circle-half-stroke"></i> Theme</li><li data-section="system"><i class="fa-solid fa-gear"></i> System</li></ul></div><div class="settings-main"><div class="settings-section active" id="settings-personalization"><h3 >Personalization</h3><div class="settings-option"><label for="wallpaper-url-{{id}}">Background Image URL</label><input type="text" id="wallpaper-url-{{id}}" placeholder="Enter image URL..."><button class="apply-wallpaper-url">Apply</button><div style="margin-top: 10px;">Presets:</div><div class="wallpaper-previews"><div class="wallpaper-preview" data-url='url("wallpaper.jpg")' style="background-image: url('wallpaper.jpg');"></div><div class="wallpaper-preview" data-url='url("wallpaper2.jpg")' style="background-image: url('wallpaper2.jpg');"></div><div class="wallpaper-preview" data-url='url("wallpaper3.jpg")' style="background-image: url('wallpaper3.jpg');"></div><div class="wallpaper-preview" data-url='url("wallpaper4.jpg")' style="background-image: url('wallpaper4.jpg');"></div></div></div><div class="settings-option"><label for="accent-color-picker-{{id}}">Accent Color</label><input type="color" id="accent-color-picker-{{id}}" value="#0078d4"><div class="color-swatches"><div class="color-swatch" data-color="#0078d4" style="background-color: #0078d4;"></div><div class="color-swatch" data-color="#ff8c00" style="background-color: #ff8c00;"></div><div class="color-swatch" data-color="#e81123" style="background-color: #e81123;"></div><div class="color-swatch" data-color="#00b294" style="background-color: #00b294;"></div><div class="color-swatch" data-color="#7719aa" style="background-color: #7719aa;"></div><div class="color-swatch" data-color="#515c6b" style="background-color: #515c6b;"></div></div></div></div><div class="settings-section" id="settings-theme"><h3>Theme</h3><div class="settings-option"><label>Appearance</label><div class="theme-toggle"><button data-theme="light"><div class="theme-preview light"></div>Light</button><button data-theme="dark"><div class="theme-preview dark"></div>Dark</button></div></div></div><div class="settings-section" id="settings-system"><h3>System</h3><p>Simulated System Info:</p><ul><li>OS: Windows 11 Simulation</li><li>Processor: Simulated CPU</li><li>RAM: Lots of Virtual RAM</li><li>Version: ${SAVE_STATE_KEY}</li></ul></div></div></div>`,
    browser: () =>
      `<div class="browser-content"><div class="browser-toolbar"><button class="browser-back" disabled><i class="fa-solid fa-arrow-left"></i></button><button class="browser-forward" disabled><i class="fa-solid fa-arrow-right"></i></button><button class="browser-refresh"><i class="fa-solid fa-rotate-right"></i></button><input type="text" class="browser-address-bar" value="about:blank"><button class="browser-go"><i class="fa-solid fa-check"></i></button></div><div class="browser-iframe-container"><div class="iframe-loading-overlay"><i class="fa-solid fa-spinner fa-spin"></i>&nbsp; Loading...</div><iframe class="browser-iframe" src="about:blank" sandbox="allow-scripts allow-same-origin allow-popups allow-forms"></iframe></div></div>`,
    generic: () => `<div style="padding:20px;">Generic Window Content</div>`,
    "generic-dynamic": (title) =>
      `<div style="padding:20px;">Content for ${title}</div>`,
    "generic-unknown": (title, id) =>
      `<div style="padding:20px;">Content for ${title} (ID: ${id})</div>`,
  };
  function setupNotepad(notepadWindow, windowId, initialContent) {
    const textarea = notepadWindow.querySelector(".notepad-content");
    if (initialContent) textarea.value = initialContent;
    textarea.addEventListener("input", saveState);
    const menubar = notepadWindow.querySelector(".notepad-menubar");
    menubar?.addEventListener("click", (e) => {
      if (e.target.classList.contains("notepad-menu-item")) {
        alert(
          `Simulated "${e.target.textContent}" menu clicked. (Not implemented)`
        );
      }
    });
  }
  function setupCalculator(calcWindow, windowId) {
    const display = calcWindow.querySelector(".calc-display");
    const historyDisplay = calcWindow.querySelector(".calc-history");
    const buttons = calcWindow.querySelectorAll(".calc-buttons button");
    let currentInput = "0",
      previousInput = null,
      operator = null,
      shouldResetDisplay = false;
    let history = [];
    const updateDisplay = () => {
      display.textContent = currentInput;
      display.scrollLeft = display.scrollWidth;
    };
    const updateHistory = () => {
      historyDisplay.textContent = history[history.length - 1] || "";
    };
    const calculate = () => {
      const prev = parseFloat(previousInput);
      const current = parseFloat(currentInput);
      if (isNaN(prev) || isNaN(current) || !operator) return false;
      let result;
      switch (operator) {
        case "+":
          result = prev + current;
          break;
        case "-":
          result = prev - current;
          break;
        case "*":
          result = prev * current;
          break;
        case "/":
          result = current === 0 ? "Error: Div by zero" : prev / current;
          break;
        case "%":
          result = prev % current;
          break;
        default:
          return false;
      }
      const resultString = String(parseFloat(result.toFixed(10)));
      history.push(
        `${previousInput} ${operator} ${currentInput} = ${resultString}`
      );
      if (history.length > 5) history.shift();
      currentInput = resultString;
      operator = null;
      shouldResetDisplay = true;
      return true;
    };
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const value = button.textContent;
        const isOperator = button.classList.contains("operator");
        if (currentInput === "Error: Div by zero") {
          currentInput = "0";
          previousInput = null;
          operator = null;
          shouldResetDisplay = false;
          history = [];
        }
        if (!isNaN(parseInt(value))) {
          if (currentInput === "0" || shouldResetDisplay) {
            currentInput = value;
            shouldResetDisplay = false;
          } else {
            currentInput += value;
          }
        } else if (value === "." && !currentInput.includes(".")) {
          if (shouldResetDisplay) {
            currentInput = "0.";
            shouldResetDisplay = false;
          } else {
            currentInput += ".";
          }
        } else if (isOperator && value !== "+/-") {
          if (previousInput !== null && !shouldResetDisplay) calculate();
          operator = value;
          previousInput = currentInput;
          shouldResetDisplay = true;
        } else if (value === "+/-") {
          currentInput = String(parseFloat(currentInput) * -1);
        } else if (value === "C") {
          currentInput = "0";
          previousInput = null;
          operator = null;
          shouldResetDisplay = false;
          history = [];
        } else if (value === "CE") {
          currentInput = "0";
          shouldResetDisplay = false;
        } else if (value === "=") {
          if (calculate()) updateHistory();
        }
        updateDisplay();
      });
    });
    updateDisplay();
    updateHistory();
  }
  function applyTheme(color) {
    if (!color) color = "#0078d4";
    document.documentElement.style.setProperty("--accent-color", color);
    Object.values(openWindows).forEach((win) => {
      if (
        win.appType === "settings" &&
        win.element &&
        document.body.contains(win.element)
      ) {
        const baseId = win.id.replace("window-", "");
        const swatches = win.element.querySelectorAll(".color-swatch");
        const picker = win.element.querySelector(
          `#accent-color-picker-${baseId}`
        );
        if (picker) picker.value = color;
        swatches.forEach((sw) =>
          sw.classList.toggle("selected", sw.dataset.color === color)
        );
      }
    });
    if (
      !document.getElementById("login-screen")?.classList.contains("hidden")
    ) {
      return;
    }
    saveState();
  }
  function applyWallpaper(imageUrlCss) {
    if (!imageUrlCss || !imageUrlCss.startsWith("url("))
      imageUrlCss = 'url("wallpaper.jpg")';
    desktop.style.backgroundImage = imageUrlCss;
    Object.values(openWindows).forEach((win) => {
      if (
        win.appType === "settings" &&
        win.element &&
        document.body.contains(win.element)
      ) {
        const baseId = win.id.replace("window-", "");
        const previews = win.element.querySelectorAll(".wallpaper-preview");
        const urlInput = win.element.querySelector(`#wallpaper-url-${baseId}`);
        const urlMatch = imageUrlCss.match(/url\("?(.*?)"?\)/);
        if (urlInput) urlInput.value = urlMatch ? urlMatch[1] : "";
        previews.forEach((p) =>
          p.classList.toggle("selected", p.dataset.url === imageUrlCss)
        );
      }
    });
    if (
      !document.getElementById("login-screen")?.classList.contains("hidden")
    ) {
      return;
    }
    saveState();
  }
  function applyLightDarkMode(mode) {
    bodyElement.classList.remove("light-mode", "dark-mode");
    bodyElement.classList.add(mode === "dark" ? "dark-mode" : "light-mode");
    Object.values(openWindows).forEach((win) => {
      if (
        win.appType === "settings" &&
        win.element &&
        document.body.contains(win.element)
      ) {
        const themeButtons = win.element.querySelectorAll(
          ".theme-toggle button"
        );
        themeButtons.forEach((btn) =>
          btn.classList.toggle("active", btn.dataset.theme === mode)
        );
      }
    });
    if (
      !document.getElementById("login-screen")?.classList.contains("hidden")
    ) {
      return;
    }
    saveState();
  }
  function setupSettingsApp(settingsWindow, windowId) {
    const baseId = windowId.replace("window-", "");
    const sidebarLinks = settingsWindow.querySelectorAll(
      ".settings-sidebar li"
    );
    const mainSections = settingsWindow.querySelectorAll(
      ".settings-main .settings-section"
    );
    const wallpaperUrlInput = settingsWindow.querySelector(
      `#wallpaper-url-${baseId}`
    );
    const applyWallpaperUrlButton =
      settingsWindow.querySelector(`.apply-wallpaper-url`);
    const wallpaperPreviews =
      settingsWindow.querySelectorAll(".wallpaper-preview");
    const accentColorPicker = settingsWindow.querySelector(
      `#accent-color-picker-${baseId}`
    );
    const colorSwatches = settingsWindow.querySelectorAll(".color-swatch");
    const themeButtons = settingsWindow.querySelectorAll(
      ".theme-toggle button"
    );
    settingsWindow.innerHTML = settingsWindow.innerHTML.replace(
      /\{\{id\}\}/g,
      baseId
    );
    sidebarLinks.forEach((link) => {
      link.addEventListener("click", () => {
        const targetSectionId = `settings-${link.dataset.section}`;
        sidebarLinks.forEach((l) => l.classList.remove("active"));
        link.classList.add("active");
        mainSections.forEach((sec) =>
          sec.classList.toggle("active", sec.id === targetSectionId)
        );
      });
    });
    applyWallpaperUrlButton?.addEventListener("click", () => {
      const url = wallpaperUrlInput?.value.trim();
      if (
        url &&
        (url.startsWith("http") ||
          url.startsWith("/") ||
          url.startsWith("data:"))
      ) {
        applyWallpaper(`url("${url}")`);
      } else {
        showErrorModal("Please enter a valid image URL.");
      }
    });
    wallpaperPreviews.forEach((preview) =>
      preview.addEventListener("click", () =>
        applyWallpaper(preview.dataset.url)
      )
    );
    accentColorPicker?.addEventListener("input", (e) =>
      applyTheme(e.target.value)
    );
    colorSwatches.forEach((swatch) =>
      swatch.addEventListener("click", () => applyTheme(swatch.dataset.color))
    );
    themeButtons.forEach((button) =>
      button.addEventListener("click", () =>
        applyLightDarkMode(button.dataset.theme)
      )
    );
    applyTheme(
      document.documentElement.style.getPropertyValue("--accent-color")
    );
    applyWallpaper(desktop.style.backgroundImage);
    applyLightDarkMode(
      bodyElement.classList.contains("dark-mode") ? "dark" : "light"
    );
  }
  function setupBrowser(browserWindow, windowId) {
    const iframe = browserWindow.querySelector(".browser-iframe");
    const addressBar = browserWindow.querySelector(".browser-address-bar");
    const backBtn = browserWindow.querySelector(".browser-back");
    const forwardBtn = browserWindow.querySelector(".browser-forward");
    const refreshBtn = browserWindow.querySelector(".browser-refresh");
    const goBtn = browserWindow.querySelector(".browser-go");
    const loadingOverlay = browserWindow.querySelector(
      ".iframe-loading-overlay"
    );
    let history = ["about:blank"];
    let historyIndex = 0;
    const navigate = (url) => {
      if (!url || typeof url !== "string") return;
      url = url.trim();
      if (
        !(
          url.startsWith("http://") ||
          url.startsWith("https://") ||
          url.startsWith("about:")
        )
      ) {
        url = "https://" + url;
      }
      addressBar.value = url;
      loadingOverlay.classList.add("visible");
      iframe.src = url;
      if (url !== history[historyIndex]) {
        history = history.slice(0, historyIndex + 1);
        history.push(url);
        historyIndex = history.length - 1;
      }
      updateNavButtons();
    };
    const updateNavButtons = () => {
      backBtn.disabled = historyIndex <= 0;
      forwardBtn.disabled = historyIndex >= history.length - 1;
    };
    iframe.addEventListener("load", () => {
      loadingOverlay.classList.remove("visible");
      try {
        let loadedUrl = iframe.contentWindow.location.href;
        if (
          loadedUrl &&
          loadedUrl !== "about:blank" &&
          loadedUrl !== addressBar.value
        ) {
          addressBar.value = loadedUrl;
          if (loadedUrl !== history[historyIndex]) {
            history = history.slice(0, historyIndex + 1);
            history.push(loadedUrl);
            historyIndex = history.length - 1;
            updateNavButtons();
          }
        }
      } catch (e) {
        console.warn("Cross-origin frame access blocked.");
      }
    });
    iframe.addEventListener("error", () => {
      loadingOverlay.classList.remove("visible");
      iframe.src = "about:blank";
      showErrorModal(`Could not load URL: ${addressBar.value}`);
    });
    addressBar.addEventListener("keypress", (e) => {
      if (e.key === "Enter") navigate(addressBar.value);
    });
    goBtn.addEventListener("click", () => navigate(addressBar.value));
    refreshBtn.addEventListener("click", () => {
      loadingOverlay.classList.add("visible");
      iframe.src = iframe.src;
    });
    backBtn.addEventListener("click", () => {
      if (historyIndex > 0) {
        historyIndex--;
        navigate(history[historyIndex]);
      }
    });
    forwardBtn.addEventListener("click", () => {
      if (historyIndex < history.length - 1) {
        historyIndex++;
        navigate(history[historyIndex]);
      }
    });
    updateNavButtons();
  }
  function setupRecycleBin(rbWindow, windowId) {
    const itemsContainer = rbWindow.querySelector(".recycle-bin-items");
    const emptyBtn = rbWindow.querySelector(".empty-recycle-bin-btn");
    function renderRecycleBin() {
      itemsContainer.innerHTML = "";
      if (recycleBinContents.length === 0) {
        itemsContainer.innerHTML =
          '<p style="font-size: 13px; margin-top: 10px;">Recycle Bin is empty</p>';
        emptyBtn.style.display = "none";
      } else {
        emptyBtn.style.display = "block";
        recycleBinContents.forEach((item, index) => {
          const div = document.createElement("div");
          div.style.cssText =
            "display: flex; align-items: center; gap: 8px; padding: 4px; font-size: 13px;";
          div.innerHTML = `<img src="${item.iconUrl}" width="16" height="16"> <span>${item.name}</span>`;
          itemsContainer.appendChild(div);
        });
      }
    }
    emptyBtn.addEventListener("click", () => {
      if (
        confirm(
          "Are you sure you want to permanently delete all items in the Recycle Bin?"
        )
      ) {
        recycleBinContents = [];
        renderRecycleBin();
        updateRecycleBinIcon();
        saveState();
        playSound("emptyRecycleBin");
      }
    });
    renderRecycleBin();
  }

  function setupFileExplorer(feWindow, windowId, initialPath = null) {
    const contentWrapper = feWindow.querySelector(".file-explorer-content");
    let currentPath = initialPath || "This PC";
    let history = [currentPath];
    let historyIndex = 0;
    contentWrapper.innerHTML = ` <div class="fe-sidebar"> <h4>Favourites</h4> <ul> <li data-path="Desktop"><i class="fa-solid fa-desktop"></i> Desktop</li> <li data-path="Downloads"><i class="fa-solid fa-download"></i> Downloads</li> <li data-path="Documents"><i class="fa-regular fa-file-lines"></i> Documents</li> <li data-path="Pictures"><i class="fa-regular fa-image"></i> Pictures</li> </ul> <h4>This PC</h4> <ul> <li data-path="This PC"><i class="fa-solid fa-display"></i> This PC</li> <li data-path="C:"><i class="fa-solid fa-hard-drive"></i> Local Disk (C:)</li> <li data-path="Music"><i class="fa-solid fa-music"></i> Music</li> <li data-path="Videos"><i class="fa-solid fa-video"></i> Videos</li> </ul> </div> <div class="fe-main"> <div class="fe-address-bar"> <div class="fe-nav-buttons"> <button class="fe-back-btn" title="Back" disabled><i class="fa-solid fa-arrow-left"></i></button> <button class="fe-forward-btn" title="Forward" disabled><i class="fa-solid fa-arrow-right"></i></button> <button class="fe-up-btn" title="Up"><i class="fa-solid fa-arrow-up"></i></button> </div> <input type="text" class="fe-path" readonly> <div class="fe-view-controls" style="margin-left: 8px;"> <button class="fe-view-btn active" data-view="icons" title="Icons"><i class="fa-solid fa-grip"></i></button> <button class="fe-view-btn" data-view="list" title="List"><i class="fa-solid fa-list"></i></button> <button class="fe-view-btn" data-view="details" title="Details"><i class="fa-solid fa-bars"></i></button> </div> </div> <div class="fe-content-area"></div> </div>`;
    const sidebarLinks = feWindow.querySelectorAll(".fe-sidebar li");
    const mainContentArea = feWindow.querySelector(".fe-content-area");
    const pathInput = feWindow.querySelector(".fe-path");
    const backBtn = feWindow.querySelector(".fe-back-btn");
    const forwardBtn = feWindow.querySelector(".fe-forward-btn");
    const upBtn = feWindow.querySelector(".fe-up-btn");
    const viewButtons = feWindow.querySelectorAll(".fe-view-btn");
    let currentView = "icons";
    function navigateExplorer(newPath, addToHistory = true) {
      currentPath = newPath;
      pathInput.value = currentPath;
      updateSidebarActiveState(currentPath);
      renderMainContent(currentPath);
      if (addToHistory) {
        if (historyIndex < history.length - 1) {
          history = history.slice(0, historyIndex + 1);
        }
        if (history[history.length - 1] !== newPath) {
          history.push(newPath);
          historyIndex = history.length - 1;
        }
      }
      updateNavButtons();
    }
    function updateNavButtons() {
      backBtn.disabled = historyIndex <= 0;
      forwardBtn.disabled = historyIndex >= history.length - 1;
      upBtn.disabled =
        currentPath === "This PC" ||
        (currentPath.split("/").length <= 1 && !currentPath.includes(":"));
    }
    function updateSidebarActiveState(path) {
      sidebarLinks.forEach((l) =>
        l.classList.toggle("active", l.dataset.path === path)
      );
    }
    function getFileSystemNode(path) {
      if (path === "This PC") return null;
      if (simulatedFileSystem[path]) return simulatedFileSystem[path];
      const parts = path.split("/");
      let currentNode = simulatedFileSystem;
      for (const part of parts) {
        if (!part) continue;
        let nextNode =
          currentNode[part] ||
          (currentNode.children ? currentNode.children[part] : null);
        if (nextNode) {
          currentNode = nextNode;
        } else {
          return null;
        }
      }
      return currentNode;
    }
    function getParentPath(path) {
      if (
        path === "This PC" ||
        !path ||
        (path.includes(":") && path.split("/").length <= 1)
      )
        return "This PC";
      if (!path.includes("/")) return "This PC";
      const parts = path.split("/");
      parts.pop();
      return parts.join("/") || "This PC";
    }
    function renderMainContent(path) {
      mainContentArea.innerHTML = "";
      let currentViewClass = `view-${currentView}`;
      if (path === "This PC") {
        mainContentArea.innerHTML = ` <div class="fe-section"> <div class="fe-section-title">Devices and drives</div> <div class="fe-items-grid-section ${currentViewClass}"> <div class="fe-item" data-path="C:" data-type="drive" data-name="Local Disk (C:)" title="Local Disk (C:)"><i class="fa-solid fa-hard-drive"></i><span>Local Disk (C:)</span></div> </div> </div> <div class="fe-section"> <div class="fe-section-title">User Folders</div> <div class="fe-items-grid-section ${currentViewClass}"> <div class="fe-item" data-path="Desktop" data-type="folder" data-name="Desktop" title="Desktop"><i class="fa-solid fa-desktop"></i><span>Desktop</span></div> <div class="fe-item" data-path="Documents" data-type="folder" data-name="Documents" title="Documents"><i class="fa-regular fa-folder"></i><span>Documents</span></div> <div class="fe-item" data-path="Downloads" data-type="folder" data-name="Downloads" title="Downloads"><i class="fa-solid fa-download"></i><span>Downloads</span></div> <div class="fe-item" data-path="Pictures" data-type="folder" data-name="Pictures" title="Pictures"><i class="fa-regular fa-image"></i><span>Pictures</span></div> <div class="fe-item" data-path="Music" data-type="folder" data-name="Music" title="Music"><i class="fa-solid fa-music"></i><span>Music</span></div> <div class="fe-item" data-path="Videos" data-type="folder" data-name="Videos" title="Videos"><i class="fa-solid fa-video"></i><span>Videos</span></div> </div> </div>`;
        mainContentArea.querySelectorAll(".fe-item").forEach((item) => {
          item.addEventListener("dblclick", handleItemDoubleClick);
          item.addEventListener("click", handleItemSingleClick);
          item.addEventListener("contextmenu", handleFileContextMenu);
          makeItemDraggable(item);
        });
      } else {
        const node = getFileSystemNode(path);
        const itemsGridContainer = document.createElement("div");
        itemsGridContainer.className = `fe-items-grid ${currentViewClass}`;
        mainContentArea.appendChild(itemsGridContainer);
        if (
          node &&
          (node.type === "folder" || node.type === "drive") &&
          node.children
        ) {
          if (Object.keys(node.children).length === 0) {
            itemsGridContainer.innerHTML =
              '<p style="color:var(--text-light-color); padding: 10px;">Folder is empty.</p>';
          } else {
            Object.entries(node.children).forEach(([itemId, itemData]) => {
              const itemElement = createFeItemElement(itemId, itemData, path);
              itemsGridContainer.appendChild(itemElement);
            });
          }
        } else {
          itemsGridContainer.innerHTML =
            '<p style="color:red;">Error: Path not found or not viewable.</p>';
        }
      }
      mainContentArea.addEventListener("contextmenu", handleFileContextMenu);
    }
    function createFeItemElement(itemId, itemData, parentPath) {
      const itemElement = document.createElement("div");
      itemElement.className = "fe-item";
      itemElement.dataset.itemId = itemId;
      itemElement.dataset.path = `${parentPath}/${itemId}`;
      itemElement.dataset.type = itemData.type;
      itemElement.dataset.name = itemData.name;
      itemElement.title = itemData.name;
      itemElement.draggable = true;
      let iconHtml = '<i class="fa-regular fa-file"></i>';
      if (itemData.type === "folder")
        iconHtml = '<i class="fa-solid fa-folder"></i>';
      else if (itemData.type === "drive")
        iconHtml = '<i class="fa-solid fa-hard-drive"></i>';
      else if (itemData.icon) iconHtml = `<img src="${itemData.icon}" alt="">`;
      else if (itemData.appType === "notepad")
        iconHtml = '<i class="fa-regular fa-file-lines"></i>';
      else if (itemData.appType === "browser")
        iconHtml = '<i class="fa-brands fa-edge"></i>';
      itemElement.innerHTML = `${iconHtml}<span>${itemData.name}</span>`;
      itemElement.addEventListener("dblclick", handleItemDoubleClick);
      itemElement.addEventListener("click", handleItemSingleClick);
      itemElement.addEventListener("contextmenu", handleFileContextMenu);
      makeItemDraggable(itemElement);
      return itemElement;
    }
    function handleItemDoubleClick(event) {
      const targetItem = event.currentTarget;
      const type = targetItem.dataset.type;
      const path = targetItem.dataset.path;
      const appType =
        targetItem.dataset.appType ||
        (type === "folder" ? "folder" : "generic");
      const name = targetItem.dataset.name;
      const itemId = targetItem.dataset.itemId;
      if (type === "folder" || type === "drive") {
        navigateExplorer(path);
      } else {
        launchApp(appType, name, itemId);
      }
    }
    function handleItemSingleClick(event) {
      const targetItem = event.currentTarget;
      const container = targetItem.closest(".window");
      if (!event.ctrlKey && !event.shiftKey) {
        deselectAllFileExplorerItems(container);
      }
      targetItem.classList.toggle("active-select");
      if (renameInput) finishRename(true);
    }
    sidebarLinks.forEach((link) => {
      link.addEventListener("click", () => navigateExplorer(link.dataset.path));
    });
    backBtn.addEventListener("click", () => {
      if (historyIndex > 0) {
        historyIndex--;
        navigateExplorer(history[historyIndex], false);
      }
    });
    forwardBtn.addEventListener("click", () => {
      if (historyIndex < history.length - 1) {
        historyIndex++;
        navigateExplorer(history[historyIndex], false);
      }
    });
    upBtn.addEventListener("click", () => {
      navigateExplorer(getParentPath(currentPath));
    });
    viewButtons.forEach((button) => {
      button.addEventListener("click", () => {
        currentView = button.dataset.view;
        viewButtons.forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");
        renderMainContent(currentPath);
      });
    });
    navigateExplorer(currentPath, false);
  }
  function deselectAllFileExplorerItems(windowElement) {
    if (!windowElement) return;
    windowElement
      .querySelectorAll(".fe-item.active-select")
      .forEach((i) => i.classList.remove("active-select"));
  }

  function getAppDetailsById(appId) {
    let iconElement = document.getElementById(`${appId}-icon`);
    if (iconElement) return getAppDetailsFromIcon(iconElement);
    let taskbarIcon = document.getElementById(`taskbar-${appId}-icon`);
    if (taskbarIcon) {
      return {
        id: appId,
        title: taskbarIcon.title || appId,
        iconUrl: taskbarIcon.querySelector("img")?.src,
        appType: taskbarIcon.dataset.appId || "generic",
        contentGeneratorName: windowContentGenerators[taskbarIcon.dataset.appId]
          ? taskbarIcon.dataset.appId
          : "generic",
        width: 600,
        height: 400,
      };
    }
    let startIcon = startMenu.querySelector(
      `.start-app-icon[data-app-id="${appId}"]`
    );
    if (startIcon) {
      return {
        id: appId,
        title: startIcon.title,
        iconUrl: startIcon.querySelector("img")?.src,
        appType: appId,
        contentGeneratorName: windowContentGenerators[appId]
          ? appId
          : "generic",
        width: 600,
        height: 400,
      };
    }
    const allApps = getAllAppsData();
    const appData = allApps.find((app) => app.id === appId);
    if (appData) {
      return {
        id: appId,
        title: appData.title,
        iconUrl: appData.icon,
        appType: appId,
        contentGeneratorName: windowContentGenerators[appId]
          ? appId
          : "generic",
        width: 600,
        height: 400,
      };
    }
    console.warn(`Could not find app details for ID: ${appId}`);
    return null;
  }
  function getAppDetailsFromIcon(iconElement) {
    if (!iconElement) return null;
    const id = iconElement.id.replace("-icon", "");
    const title =
      iconElement.title || iconElement.querySelector("span")?.textContent;
    const iconUrl =
      iconElement.dataset.iconUrl || iconElement.querySelector("img")?.src;
    const appType = iconElement.dataset.appType || id;
    let contentGeneratorName = windowContentGenerators[appType]
      ? appType
      : "generic";
    let width = 600,
      height = 400;
    switch (appType) {
      case "my-computer":
      case "folder":
        width = 850;
        height = 550;
        break;
      case "recycle-bin":
        width = 500;
        height = 400;
        break;
      case "notepad":
        width = 600;
        height = 450;
        break;
      case "calculator":
        width = 350;
        height = 500;
        break;
      case "settings":
        width = 800;
        height = 600;
        break;
      case "browser":
        width = 1024;
        height = 768;
        break;
    }
    if (contentGeneratorName === "generic") {
      if (iconElement.classList.contains("dynamic-item")) {
        contentGeneratorName = "generic-dynamic";
      } else {
        contentGeneratorName = "generic-unknown";
      }
    }
    return {
      id: id,
      title: title,
      iconUrl: iconUrl,
      appType: appType,
      contentGeneratorName: contentGeneratorName,
      width: width,
      height: height,
    };
  }
  function deselectAllDesktopIcons() {
    document
      .querySelectorAll(".desktop-icon.active-select")
      .forEach((i) => i.classList.remove("active-select"));
  }
  function launchApp(appId, associatedData = null, itemId = null) {
    const details = getAppDetailsById(appId);
    if (details) {
      let content = "";
      let generator = details.contentGeneratorName;
      if (typeof generator === "string" && windowContentGenerators[generator]) {
        if (
          generator === "generic-dynamic" ||
          generator === "generic-unknown"
        ) {
          content = windowContentGenerators[generator](
            details.title,
            details.id
          );
          generator = null;
        } else {
          content = windowContentGenerators[generator]();
        }
      } else if (typeof generator === "function") {
        content = generator(details.title, details.id);
        generator = null;
      } else {
        console.error("Invalid content generator for:", details.title);
        showErrorModal(`Cannot open application "${details.title}".`);
        return;
      }
      let savedContent = null;
      if (details.appType === "notepad" && associatedData) {
      }
      createWindow(
        `window-${details.id}`,
        details.title,
        details.iconUrl,
        content,
        details.width,
        details.height,
        undefined,
        undefined,
        details.appType,
        savedContent
      );
      hidePopups();
    } else {
      showErrorModal(
        `Application "${appId}" is not implemented or could not be found.`
      );
      hidePopups();
    }
  }
  function setupDesktopIconEventListeners(icon) {
    icon.addEventListener("dblclick", () => {
      hidePopups();
      if (renameInput && renameInput.parentElement === icon) return;
      launchApp(icon.id.replace("-icon", ""));
      deselectAllDesktopIcons();
    });
    icon.addEventListener("click", (e) => {
      e.stopPropagation();
      hidePopups();
      if (renameInput && renameInput.parentElement !== icon) finishRename(true);
      if (!e.ctrlKey && !e.shiftKey) {
        deselectAllDesktopIcons();
      }
      icon.classList.add("active-select");
    });
    icon.addEventListener("dragstart", (e) => {
      if (renameInput && renameInput.parentElement === icon) {
        e.preventDefault();
        return;
      }
      if (
        e.target === icon ||
        (icon.contains(e.target) && !e.target.matches("input"))
      ) {
        draggedIcon = icon;
        const rect = draggedIcon.getBoundingClientRect();
        dragIconOffsetX = e.clientX - rect.left;
        dragIconOffsetY = e.clientY - rect.top;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", draggedIcon.id);
        e.dataTransfer.setData(
          "application/x-sim-icon-type",
          icon.dataset.appType || "generic"
        );
        e.dataTransfer.setData(
          "application/x-sim-icon-name",
          icon.querySelector("span").textContent
        );
        e.dataTransfer.setData(
          "application/x-sim-icon-url",
          icon.dataset.iconUrl
        );
        setTimeout(() => draggedIcon?.classList.add("dragging"), 0);
      } else {
        e.preventDefault();
      }
    });
    icon.addEventListener("dragend", (e) => {
      if (draggedIcon) draggedIcon.classList.remove("dragging");
      document
        .querySelectorAll(".drop-target-hover")
        .forEach((el) => el.classList.remove("drop-target-hover"));
      draggedIcon = null;
    });
    if (icon.id === "recycle-bin-icon") {
      icon.addEventListener("dragover", (e) => {
        e.preventDefault();
        if (
          draggedIcon &&
          draggedIcon !== icon &&
          (draggedIcon.classList.contains("dynamic-item") ||
            !["recycle-bin-icon", "my-computer-icon"].includes(draggedIcon.id))
        ) {
          e.dataTransfer.dropEffect = "move";
          icon.classList.add("drop-target-hover");
        } else {
          e.dataTransfer.dropEffect = "none";
        }
      });
      icon.addEventListener("dragleave", () => {
        icon.classList.remove("drop-target-hover");
      });
      icon.addEventListener("drop", handleRecycleBinDrop);
    }
  }
  document
    .querySelectorAll(".desktop-icon")
    .forEach(setupDesktopIconEventListeners);
  desktop.addEventListener("dragover", (e) => {
    e.preventDefault();
    if (draggedIcon) {
      e.dataTransfer.dropEffect = "move";
    } else {
      e.dataTransfer.dropEffect = "none";
    }
  });
  desktop.addEventListener("drop", (e) => {
    e.preventDefault();
    if (draggedIcon) {
      const desktopRect = desktop.getBoundingClientRect();
      let newX = e.clientX - desktopRect.left - dragIconOffsetX;
      let newY = e.clientY - desktopRect.top - dragIconOffsetY;
      const iconWidth = draggedIcon.offsetWidth;
      const iconHeight = draggedIcon.offsetHeight;
      newX = Math.max(0, Math.min(newX, desktopRect.width - iconWidth));
      newY = Math.max(0, Math.min(newY, desktopRect.height - iconHeight));
      draggedIcon.style.left = `${newX}px`;
      draggedIcon.style.top = `${newY}px`;
      draggedIcon.classList.remove("dragging");
      saveState();
    }
    draggedIcon = null;
  });
  function positionInitialIcons() {
    const icons = document.querySelectorAll("#desktop > .desktop-icon");
    const padding = 20;
    const iconWidth = 90;
    const iconHeight = 95;
    const desktopHeight = desktop.clientHeight;
    const iconsPerColumn = Math.max(
      1,
      Math.floor((desktopHeight - padding) / iconHeight)
    );
    let col = 0,
      row = 0;
    icons.forEach((icon) => {
      if (!icon.style.left && !icon.style.top) {
        icon.style.left = `${padding + col * (iconWidth + padding)}px`;
        icon.style.top = `${padding + row * iconHeight}px`;
        row++;
        if (row >= iconsPerColumn) {
          row = 0;
          col++;
        }
      }
    });
  }

  function updateRecycleBinIcon() {
    const binIcon = document.getElementById("recycle-bin-icon");
    const img = binIcon?.querySelector(".recycle-bin-image");
    if (!img) return;
    const isEmpty = recycleBinContents.length === 0;
    const emptyIconUrl = "https://img.icons8.com/color/48/recycle-bin.png";
    const fullIconUrl = "https://img.icons8.com/color/48/filled-trash.png";
    img.src = isEmpty ? emptyIconUrl : fullIconUrl;
    binIcon.dataset.iconUrl = img.src;
  }
  function handleRecycleBinDrop(e) {
    e.preventDefault();
    const icon = e.currentTarget;
    icon.classList.remove("drop-target-hover");
    if (
      draggedIcon &&
      draggedIcon !== icon &&
      (draggedIcon.classList.contains("dynamic-item") ||
        !["recycle-bin-icon", "my-computer-icon"].includes(draggedIcon.id))
    ) {
      const droppedIconId = draggedIcon.id;
      const droppedIconName = draggedIcon.querySelector("span").textContent;
      const droppedIconUrl = draggedIcon.dataset.iconUrl;
      recycleBinContents.push({
        id: droppedIconId,
        name: droppedIconName,
        iconUrl: droppedIconUrl,
        originalLeft: draggedIcon.style.left,
        originalTop: draggedIcon.style.top,
      });
      draggedIcon.remove();
      playSound("recycle");
      updateRecycleBinIcon();
      saveState();
      Object.values(openWindows).forEach((win) => {
        if (win.appType === "my-computer" || win.appType === "folder") {
          const feContentArea = win.element.querySelector(".fe-content-area");
          const pathInput = win.element.querySelector(".fe-path");
          if (feContentArea && pathInput && pathInput.value === "Desktop") {
            const itemToRemove = feContentArea.querySelector(
              `.fe-item[data-itemId="${droppedIconId}"]`
            );
            itemToRemove?.remove();
          }
        }
      });
    }
    draggedIcon = null;
  }

  function showContextMenu(menuElement, x, y, targetElement) {
    hidePopups(menuElement);
    contextMenuTarget = targetElement;
    menuElement
      .querySelectorAll(".context-submenu")
      .forEach((submenu) => (submenu.style.display = "none"));
    menuElement
      .querySelectorAll(".context-menu-item")
      .forEach((item) => item.classList.remove("hover"));
    updateContextMenuItems(menuElement, targetElement);
    menuElement.style.display = "block";
    const menuWidth = menuElement.offsetWidth;
    const menuHeight = menuElement.offsetHeight;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const effectiveViewportHeight = viewportHeight - TASKBAR_HEIGHT;
    let finalX = x,
      finalY = y;
    if (x + menuWidth > viewportWidth) finalX = viewportWidth - menuWidth - 5;
    if (y + menuHeight > effectiveViewportHeight)
      finalY = effectiveViewportHeight - menuHeight - 5;
    finalX = Math.max(5, finalX);
    finalY = Math.max(5, finalY);
    menuElement.style.left = `${finalX}px`;
    menuElement.style.top = `${finalY}px`;
    void menuElement.offsetWidth;
    menuElement.classList.add("visible");
  }
  function hideContextMenu() {
    [contextMenu, fileContextMenu, taskbarContextMenu].forEach((menu) => {
      if (menu && menu.classList.contains("visible")) {
        menu.classList.remove("visible");
        setTimeout(() => {
          if (!menu.classList.contains("visible")) menu.style.display = "none";
        }, 150);
      }
    });
    contextMenuTarget = null;
  }
  function updateContextMenuItems(menuElement, target) {
    const isDesktop = target === desktop || target === windowContainer;
    const isDesktopIcon = target?.classList.contains("desktop-icon");
    const isFeItem = target?.classList.contains("fe-item");
    const isFeBackground = target?.classList.contains("fe-content-area");
    const isTaskbarItem =
      target?.closest(".minimized-btn") || target?.closest(".taskbar-app-icon");
    const isTaskbarBg = target === taskbar && !isTaskbarItem;
    if (menuElement === contextMenu) {
      const pasteItem = menuElement.querySelector('[data-action="paste"]');
      const pasteShortcutItem = menuElement.querySelector(
        '[data-action="paste-shortcut"]'
      );
      if (pasteItem) pasteItem.classList.add("disabled");
      if (pasteShortcutItem) pasteShortcutItem.classList.add("disabled");
    }
    if (menuElement === fileContextMenu) {
      const openItem = menuElement.querySelector('[data-action="open"]');
      const runAdminItem = menuElement.querySelector(
        '[data-action="run-admin"]'
      );
      const renameItem = menuElement.querySelector('[data-action="rename"]');
      const deleteItem = menuElement.querySelector('[data-action="delete"]');
      const propertiesItem = menuElement.querySelector(
        '[data-action="properties"]'
      );
      const cutItem = menuElement.querySelector('[data-action="cut"]');
      const copyItem = menuElement.querySelector('[data-action="copy"]');
      const enableFileActions = isFeItem || isDesktopIcon;
      openItem?.classList.toggle("disabled", !enableFileActions);
      runAdminItem?.classList.toggle(
        "disabled",
        !enableFileActions || target?.dataset.type !== "file"
      );
      renameItem?.classList.toggle("disabled", !enableFileActions);
      deleteItem?.classList.toggle("disabled", !enableFileActions);
      propertiesItem?.classList.toggle("disabled", !enableFileActions);
      cutItem?.classList.toggle("disabled", !enableFileActions);
      copyItem?.classList.toggle("disabled", !enableFileActions);
      const newSubmenu = menuElement.querySelector('[data-action="new"]');
      if (newSubmenu)
        newSubmenu.style.display =
          isFeBackground || isDesktop ? "flex" : "none";
    }
    if (menuElement === taskbarContextMenu) {
      const openAppItem = menuElement.querySelector('[data-action="open-app"]');
      const unpinItem = menuElement.querySelector('[data-action="unpin"]');
      const pinItem = menuElement.querySelector('[data-action="pin"]');
      const closeItem = menuElement.querySelector(
        '[data-action="close-window"]'
      );
      const taskbarSettingsItem = menuElement.querySelector(
        '[data-action="taskbar-settings"]'
      );
      if (isTaskbarItem) {
        const appId = target.closest("[data-app-id]")?.dataset.appId;
        const windowId = target.closest("[data-window-id]")?.dataset.windowId;
        const isOpen = windowId && openWindows[windowId];
        const isPinned = appId && pinnedTaskbarApps.includes(appId);
        if (openAppItem) openAppItem.style.display = appId ? "flex" : "none";
        if (unpinItem) unpinItem.style.display = isPinned ? "flex" : "none";
        if (pinItem)
          pinItem.style.display = appId && !isPinned ? "flex" : "none";
        if (closeItem) closeItem.style.display = isOpen ? "flex" : "none";
        if (taskbarSettingsItem) taskbarSettingsItem.style.display = "none";
      } else if (isTaskbarBg) {
        if (openAppItem) openAppItem.style.display = "none";
        if (unpinItem) unpinItem.style.display = "none";
        if (pinItem) pinItem.style.display = "none";
        if (closeItem) closeItem.style.display = "none";
        if (taskbarSettingsItem) taskbarSettingsItem.style.display = "flex";
      } else {
        menuElement
          .querySelectorAll("li")
          .forEach((li) => (li.style.display = "none"));
      }
    }
  }
  desktop.addEventListener(
    "contextmenu",
    (event) => {
      event.preventDefault();
      const targetIcon = event.target.closest(".desktop-icon");
      if (renameInput && event.target !== renameInput) finishRename(true);
      if (targetIcon) {
        if (!targetIcon.classList.contains("active-select")) {
          deselectAllDesktopIcons();
          targetIcon.classList.add("active-select");
        }
        showContextMenu(contextMenu, event.clientX, event.clientY, targetIcon);
      } else if (event.target === desktop || event.target === windowContainer) {
        deselectAllDesktopIcons();
        showContextMenu(contextMenu, event.clientX, event.clientY, desktop);
      } else {
        hideContextMenu();
      }
    },
    false
  );
  taskbar.addEventListener("contextmenu", handleTaskbarItemContextMenu);
  function handleTaskbarItemContextMenu(event) {
    event.preventDefault();
    event.stopPropagation();
    const targetItem = event.target.closest(
      ".minimized-btn, .taskbar-app-icon"
    );
    showContextMenu(
      taskbarContextMenu,
      event.clientX,
      event.clientY,
      targetItem || taskbar
    );
  }
  function handleFileContextMenu(event) {
    event.preventDefault();
    event.stopPropagation();
    const targetItem = event.target.closest(".fe-item");
    const targetBg = event.target.closest(".fe-content-area");
    const container = event.target.closest(".window");
    if (renameInput && event.target !== renameInput) finishRename(true);
    if (targetItem) {
      if (!targetItem.classList.contains("active-select")) {
        deselectAllFileExplorerItems(container);
        targetItem.classList.add("active-select");
      }
      showContextMenu(
        fileContextMenu,
        event.clientX,
        event.clientY,
        targetItem
      );
    } else if (targetBg) {
      deselectAllFileExplorerItems(container);
      showContextMenu(fileContextMenu, event.clientX, event.clientY, targetBg);
    }
  }
  document.querySelectorAll(".context-menu").forEach((menu) => {
    menu.querySelectorAll(".has-submenu").forEach((item) => {
      const submenu = item.querySelector(":scope > .context-submenu");
      if (!submenu) return;
      item.addEventListener("mouseenter", () => {
        item.parentElement
          .querySelectorAll(":scope > .has-submenu > .context-submenu")
          .forEach((other) => {
            if (other !== submenu) other.style.display = "none";
          });
        submenu.style.display = "block";
        const itemRect = item.getBoundingClientRect();
        const parentMenuRect = menu.getBoundingClientRect();
        const subRect = submenu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight - TASKBAR_HEIGHT;
        let subLeft = parentMenuRect.left + parentMenuRect.width - 4;
        let subTop = itemRect.top - 7;
        if (subLeft + subRect.width > viewportWidth) {
          subLeft = parentMenuRect.left - subRect.width + 4;
        }
        if (subLeft < 0) {
          subLeft = 5;
        }
        if (itemRect.top + subRect.height > viewportHeight) {
          subTop = viewportHeight - subRect.height - 5;
        }
        if (subTop < 0) {
          subTop = 5;
        }
        submenu.style.left = `${subLeft - parentMenuRect.left}px`;
        submenu.style.top = `${subTop - parentMenuRect.top}px`;
      });
      const hideSubmenu = (relatedTarget) => {
        if (!item.contains(relatedTarget) && !submenu.contains(relatedTarget)) {
          submenu.style.display = "none";
        }
      };
      item.addEventListener("mouseleave", (e) => hideSubmenu(e.relatedTarget));
      submenu.addEventListener("mouseleave", (e) =>
        hideSubmenu(e.relatedTarget)
      );
    });
  });
  document.querySelectorAll(".context-menu").forEach((menu) => {
    menu.addEventListener("click", (e) => {
      const targetItem = e.target.closest(
        ".context-menu-item:not(.disabled), .context-submenu li:not(.disabled)"
      );
      if (!targetItem) return;
      const action =
        targetItem.dataset.action ||
        targetItem.closest(".context-menu-item")?.dataset.action;
      const subAction = targetItem.dataset.subAction;
      const menuId = menu.id;
      if (menuId === "context-menu")
        handleDesktopContextMenuAction(action, subAction, e);
      else if (menuId === "file-context-menu")
        handleFileContextMenuAction(action, subAction, e);
      else if (menuId === "taskbar-context-menu")
        handleTaskbarContextMenuAction(action, subAction, e);
      if (
        !targetItem.classList.contains("has-submenu") &&
        !targetItem.closest(".has-submenu")
      ) {
        hideContextMenu();
      }
    });
  });
  function handleDesktopContextMenuAction(action, subAction, event) {
    switch (action) {
      case "refresh":
        desktop.style.transition = "opacity 0.1s ease-in-out";
        desktop.style.opacity = 0.95;
        setTimeout(() => {
          desktop.style.opacity = 1;
          desktop.style.transition = "";
        }, 100);
        playSound("refresh");
        break;
      case "personalize":
        launchApp("settings", "personalization");
        break;
      case "display-settings":
        launchApp("settings", "display");
        break;
      case "change-background":
        launchApp("settings", "personalization");
        break;
      case "new":
        handleNewItem(subAction, event.clientX, event.clientY);
        break;
      case "open-terminal":
        showErrorModal("Open in Terminal (Not Implemented)");
        break;
    }
  }
  function handleFileContextMenuAction(action, subAction, event) {
    const target = contextMenuTarget;
    if (!target) return;
    const isItem = target.classList.contains("fe-item");
    const isBg = target.classList.contains("fe-content-area");
    switch (action) {
      case "open":
        if (isItem)
          target.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
        break;
      case "rename":
        if (isItem) startRename(target);
        break;
      case "delete":
        if (isItem) deleteFileSystemItem(target);
        break;
      case "properties":
        if (isItem)
          showErrorModal(
            `Properties for "${target.dataset.name}" (Not Implemented)`
          );
        break;
      case "cut":
        if (isItem) console.log("Simulated Cut:", target.dataset.name);
        break;
      case "copy":
        if (isItem) console.log("Simulated Copy:", target.dataset.name);
        break;
      case "new":
        if (isBg)
          handleNewItem(
            subAction,
            event.clientX,
            event.clientY,
            target.closest(".window")
          );
        break;
    }
  }
  function handleTaskbarContextMenuAction(action, subAction, event) {
    const target = contextMenuTarget;
    if (!target) return;
    const appId = target.dataset.appId;
    const windowId = target.dataset.windowId;
    switch (action) {
      case "open-app":
        if (appId) launchApp(appId);
        break;
      case "unpin":
        if (appId) unpinFromTaskbar(appId);
        break;
      case "pin":
        if (appId) pinToTaskbar(appId);
        break;
      case "close-window":
        if (windowId) closeWindow(windowId);
        break;
      case "taskbar-settings":
        launchApp("settings", "taskbar");
        break;
    }
  }

  function createDesktopIcon(
    id,
    title,
    spanText,
    iconUrl,
    appType,
    isDynamic = false
  ) {
    const icon = document.createElement("div");
    icon.className = "desktop-icon";
    icon.id = id;
    icon.title = title;
    icon.draggable = true;
    if (iconUrl) icon.dataset.iconUrl = iconUrl;
    icon.dataset.appType = appType || "generic";
    if (isDynamic) icon.classList.add("dynamic-item");
    const img = document.createElement("img");
    img.src = iconUrl || "https://img.icons8.com/fluency/48/folder-win11.png";
    img.alt = title;
    const span = document.createElement("span");
    span.textContent = spanText;
    icon.appendChild(img);
    icon.appendChild(span);
    desktop.appendChild(icon);
    setupDesktopIconEventListeners(icon);
    return icon;
  }
  function handleNewItem(type, x, y, feWindow = null) {
    if (!type) return;
    let newItemId = `item-${nextDesktopItemId++}`;
    let title,
      iconUrl,
      baseName,
      itemData = { type: "file" };
    let appType = "generic";
    switch (type) {
      case "new-folder":
        baseName = "New Folder";
        iconUrl =
          "https://img.icons8.com/?size=100&id=59786&format=png&color=E9F158";
        itemData.type = "folder";
        itemData.children = {};
        appType = "folder";
        break;
      case "new-text":
        baseName = "New Text Document";
        iconUrl = "https://img.icons8.com/color/48/txt.png";
        itemData.appType = "notepad";
        itemData.extension = ".txt";
        appType = "notepad";
        break;
      case "new-bitmap":
        baseName = "New Bitmap Image";
        iconUrl = "https://img.icons8.com/color/48/paint-palette.png";
        itemData.appType = "paint";
        itemData.extension = ".bmp";
        appType = "paint";
        break;
      case "new-word":
        baseName = "New Word Document";
        iconUrl = "https://img.icons8.com/color/48/000000/ms-word.png";
        itemData.appType = "word";
        itemData.extension = ".docx";
        appType = "word";
        break;
      case "new-zip":
        baseName = "New Compressed Folder";
        iconUrl = "https://img.icons8.com/color/48/zip.png";
        itemData.appType = "file-explorer";
        itemData.extension = ".zip";
        appType = "file-explorer";
        break;
      case "new-shortcut":
        baseName = "New Shortcut";
        iconUrl = "https://img.icons8.com/fluency/48/share-link.png";
        itemData.appType = "shortcut";
        itemData.extension = ".lnk";
        appType = "shortcut";
        break;
      default:
        console.warn("Unsupported 'New' type:", type);
        showErrorModal(`Cannot create item of type: ${type}`);
        return;
    }
    let newItemElement;
    let parentElement = desktop;
    let parentPath = "Desktop";
    if (feWindow) {
      parentElement = feWindow.querySelector(".fe-content-area");
      parentPath = feWindow.querySelector(".fe-path")?.value || "This PC";
      const parentNode = getFileSystemNode(parentPath);
      if (
        parentNode &&
        (parentNode.type === "folder" || parentNode.type === "drive") &&
        parentNode.children
      ) {
        title = generateUniqueName(
          parentNode.children,
          baseName,
          itemData.extension
        );
        itemData.name = title;
        itemData.icon = iconUrl;
        itemData.appType = appType;
        parentNode.children[newItemId] = itemData;
        const itemsGrid = parentElement.querySelector(".fe-items-grid");
        if (itemsGrid) {
          newItemElement = createFeItemElement(newItemId, itemData, parentPath);
          itemsGrid.appendChild(newItemElement);
          deselectAllFileExplorerItems(feWindow);
          newItemElement.classList.add("active-select");
        } else {
          console.error("Could not find items grid in FE window.");
          showErrorModal("Error displaying new item in File Explorer.");
          return;
        }
      } else {
        console.error("Cannot create item in path:", parentPath);
        showErrorModal(`Cannot create item in "${parentPath}".`);
        return;
      }
    } else {
      const desktopNode = getFileSystemNode("Desktop");
      title = generateUniqueName(
        desktopNode.children,
        baseName,
        itemData.extension
      );
      itemData.name = title;
      itemData.icon = iconUrl;
      itemData.appType = appType;
      if (desktopNode && desktopNode.children) {
        desktopNode.children[newItemId] = itemData;
      } else {
        console.error("Simulated Desktop folder not found!");
      }
      const desktopRect = desktop.getBoundingClientRect();
      let iconX = x - desktopRect.left - 10;
      let iconY = y - desktopRect.top - 20;
      iconX = Math.max(0, Math.round(iconX / 15) * 15);
      iconY = Math.max(0, Math.round(iconY / 15) * 15);
      newItemElement = createDesktopIcon(
        newItemId,
        title,
        title,
        iconUrl,
        appType,
        true
      );
      newItemElement.style.left = `${iconX}px`;
      newItemElement.style.top = `${iconY}px`;
      deselectAllDesktopIcons();
      newItemElement.classList.add("active-select");
    }
    playSound("createItem");
    startRename(newItemElement);
    saveState();
  }
  function generateUniqueName(
    itemsContainerOrObject,
    baseName,
    extension = ""
  ) {
    let count = 0;
    let finalName = baseName + extension;
    let existingNames;
    if (itemsContainerOrObject instanceof HTMLElement) {
      existingNames = Array.from(
        itemsContainerOrObject.querySelectorAll(
          ":scope > .desktop-icon span, :scope > .fe-item span"
        )
      ).map((s) => s.textContent.trim());
    } else if (
      typeof itemsContainerOrObject === "object" &&
      itemsContainerOrObject !== null
    ) {
      existingNames = Object.values(itemsContainerOrObject).map((item) =>
        item.name.trim()
      );
    } else {
      console.error("Invalid container/object for generating unique name.");
      return baseName + extension;
    }
    while (existingNames.includes(finalName)) {
      count++;
      finalName = `${baseName} (${count})${extension}`;
    }
    return finalName;
  }
  function startRename(itemElement) {
    if (!itemElement || renameInput) return;
    const span = itemElement.querySelector("span");
    if (!span) return;
    const currentName = span.textContent;
    const isDesktop = itemElement.classList.contains("desktop-icon");
    const input = document.createElement("input");
    input.type = "text";
    input.value = currentName;
    input.className = isDesktop ? "icon-name-input" : "fe-item-name-input";
    span.style.display = "none";
    itemElement.appendChild(input);
    input.focus();
    input.select();
    renameInput = input;
    input.addEventListener("blur", () => finishRename(true));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") finishRename(true);
      else if (e.key === "Escape") finishRename(false);
    });
    input.addEventListener("click", (e) => e.stopPropagation());
  }
  function finishRename(saveChanges) {
    if (!renameInput) return;
    const input = renameInput;
    const itemElement = input.parentElement;
    const span = itemElement?.querySelector("span");
    const oldName = span?.textContent;
    const newName = input.value.trim();
    const isDesktop = itemElement.classList.contains("desktop-icon");
    const itemId = itemElement.dataset.itemId || itemElement.id;
    renameInput = null;
    input.remove();
    if (span) span.style.display = "";
    if (saveChanges && newName && newName !== oldName) {
      const parentChildren = getParentChildren(itemElement);
      if (!parentChildren) {
        console.error(
          "Could not find parent context for rename uniqueness check."
        );
        showErrorModal("Error checking name uniqueness.");
        if (span) span.textContent = oldName;
        return;
      }
      const nameExists = Object.values(parentChildren).some(
        (item) => item.name === newName && item.id !== itemId
      );
      if (nameExists) {
        showErrorModal(`An item named "${newName}" already exists here.`);
        if (span) span.textContent = oldName;
      } else {
        if (span) span.textContent = newName;
        itemElement.title = newName;
        itemElement.dataset.name = newName;
        updateFileSystemItemName(itemId, newName, itemElement);
        saveState();
      }
    } else {
      if (span && oldName) span.textContent = oldName;
    }
  }
  function getParentChildren(itemElement) {
    if (itemElement.classList.contains("desktop-icon")) {
      const desktopNode = getFileSystemNode("Desktop");
      return desktopNode?.children;
    } else if (itemElement.classList.contains("fe-item")) {
      const feWindow = itemElement.closest(".window");
      const currentPath = feWindow?.querySelector(".fe-path")?.value;
      if (currentPath) {
        const parentPath = getParentPath(currentPath);
        const grandparent = getFileSystemNode(parentPath);
        const parentNameInGrandparent = currentPath.split("/").pop();
        const parentNode = grandparent?.children?.[parentNameInGrandparent];
        if (!parentNode) {
          const directParent = getFileSystemNode(currentPath);
          if (directParent) return directParent.children;
        }
        return parentNode?.children;
      }
    }
    return null;
  }
  function updateFileSystemItemName(itemId, newName, itemElement) {
    let parentNode;
    let itemKey;
    if (itemElement.classList.contains("desktop-icon")) {
      parentNode = getFileSystemNode("Desktop");
      itemKey = itemId;
    } else if (itemElement.classList.contains("fe-item")) {
      const feWindow = itemElement.closest(".window");
      const currentPath = feWindow?.querySelector(".fe-path")?.value;
      if (currentPath) {
        parentNode = getFileSystemNode(currentPath);
        itemKey = itemId;
      }
    }
    if (parentNode && parentNode.children && parentNode.children[itemKey]) {
      parentNode.children[itemKey].name = newName;
      console.log(`FS Rename: ${itemKey} to ${newName}`);
    } else {
      console.error("Could not find item in file system to rename:", itemId);
    }
  }
  function deleteFileSystemItem(itemElement) {
    if (!itemElement) return;
    const itemName =
      itemElement.dataset.name || itemElement.querySelector("span").textContent;
    if (
      !confirm(
        `Are you sure you want to move "${itemName}" to the Recycle Bin?`
      )
    ) {
      return;
    }
    const itemId = itemElement.dataset.itemId || itemElement.id;
    const isDesktop = itemElement.classList.contains("desktop-icon");
    let parentNode, itemKey;
    if (isDesktop) {
      parentNode = getFileSystemNode("Desktop");
      itemKey = itemId;
    } else {
      const feWindow = itemElement.closest(".window");
      const currentPath = feWindow?.querySelector(".fe-path")?.value;
      parentNode = getFileSystemNode(currentPath);
      itemKey = itemId;
    }
    if (parentNode && parentNode.children && parentNode.children[itemKey]) {
      const itemData = parentNode.children[itemKey];
      recycleBinContents.push({
        id: itemKey,
        name: itemData.name,
        iconUrl: itemData.icon,
        originalPath: parentNode.name || "Unknown",
        data: itemData,
      });
      delete parentNode.children[itemKey];
      itemElement.remove();
      updateRecycleBinIcon();
      playSound("recycle");
      saveState();
    } else {
      console.error("Could not find item to delete:", itemId);
      showErrorModal(
        "Error deleting item: Could not find item in simulated location."
      );
    }
  }

  function pinToTaskbar(appId) {
    if (!pinnedTaskbarApps.includes(appId)) {
      pinnedTaskbarApps.push(appId);
      updateTaskbarPinnedIcons();
      saveState();
    }
  }
  function unpinFromTaskbar(appId) {
    pinnedTaskbarApps = pinnedTaskbarApps.filter((id) => id !== appId);
    updateTaskbarPinnedIcons();
    saveState();
  }
  function updateTaskbarPinnedIcons() {
    taskbarIconsContainer
      .querySelectorAll(".taskbar-app-icon")
      .forEach((icon) => {
        icon.style.display = "none";
      });
    pinnedTaskbarApps.forEach((appId) => {
      let iconEl = document.getElementById(`taskbar-${appId}-icon`);
      if (iconEl) {
        iconEl.style.display = "flex";
      } else {
        const details = getAppDetailsById(appId);
        if (details) {
          const newIcon = document.createElement("div");
          newIcon.className = "taskbar-icon taskbar-app-icon";
          newIcon.id = `taskbar-${appId}-icon`;
          newIcon.dataset.appId = appId;
          newIcon.title = details.title;
          newIcon.innerHTML = `<img src="${
            details.iconUrl
          }" alt="${details.title.substring(0, 3)}">`;
          newIcon.addEventListener("click", () => launchApp(appId));
          newIcon.addEventListener("contextmenu", handleTaskbarItemContextMenu);
          taskbarIconsContainer.appendChild(newIcon);
        }
      }
    });
    pinnedTaskbarApps.forEach((appId) => {
      const defaultIcon = document.getElementById(`taskbar-${appId}-icon`);
      if (defaultIcon) defaultIcon.style.display = "flex";
    });
  }

  function makeItemDraggable(itemElement) {
    itemElement.addEventListener("dragstart", (e) => {
      if (renameInput && itemElement.contains(renameInput)) {
        e.preventDefault();
        return;
      }
      e.stopPropagation();
      draggedFileExplorerItem = itemElement;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", itemElement.dataset.itemId);
      e.dataTransfer.setData(
        "application/x-sim-fe-item-name",
        itemElement.dataset.name
      );
      e.dataTransfer.setData(
        "application/x-sim-fe-item-type",
        itemElement.dataset.type
      );
      setTimeout(() => itemElement.classList.add("dragging"), 0);
    });
    itemElement.addEventListener("dragend", (e) => {
      e.stopPropagation();
      if (draggedFileExplorerItem)
        draggedFileExplorerItem.classList.remove("dragging");
      document
        .querySelectorAll(".drop-target-hover")
        .forEach((el) => el.classList.remove("drop-target-hover"));
      draggedFileExplorerItem = null;
    });
    if (itemElement.dataset.type === "folder") {
      itemElement.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (
          draggedFileExplorerItem &&
          draggedFileExplorerItem !== itemElement
        ) {
          e.dataTransfer.dropEffect = "move";
          itemElement.classList.add("drop-target-hover");
        } else {
          e.dataTransfer.dropEffect = "none";
        }
      });
      itemElement.addEventListener("dragleave", (e) => {
        e.stopPropagation();
        itemElement.classList.remove("drop-target-hover");
      });
      itemElement.addEventListener("drop", handleFeItemDrop);
    }
  }
  function handleFeItemDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    const targetFolderElement = e.currentTarget;
    targetFolderElement.classList.remove("drop-target-hover");
    if (
      draggedFileExplorerItem &&
      draggedFileExplorerItem !== targetFolderElement
    ) {
      const sourceItemId = draggedFileExplorerItem.dataset.itemId;
      const sourceName = draggedFileExplorerItem.dataset.name;
      const targetPath = targetFolderElement.dataset.path;
      console.log(
        `Simulated Move: Item "${sourceName}" (${sourceItemId}) dropped onto Folder "${targetFolderElement.dataset.name}" (${targetPath})`
      );
      showErrorModal(
        `Moving items within File Explorer is not fully implemented yet.`
      );
    }
    draggedFileExplorerItem = null;
  }

  function playSound(soundName) {
    console.log(`Simulated Sound: ${soundName}`);
  }
  function showErrorModal(message) {
    errorModalMessage.textContent = message;
    errorModal.classList.add("visible");
    playSound("error");
    errorModal.querySelector(".modal-ok-button")?.focus();
  }
  function closeErrorModal() {
    errorModal.classList.remove("visible");
  }
  errorModal
    .querySelector(".modal-close")
    ?.addEventListener("click", closeErrorModal);
  errorModal
    .querySelector(".modal-ok-button")
    ?.addEventListener("click", closeErrorModal);
  errorModal.addEventListener("click", (e) => {
    if (e.target === errorModal) closeErrorModal();
  });

  console.log("Windows 11 Simulation Accurate Initialized.");
});
