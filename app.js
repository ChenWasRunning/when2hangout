(function () {
  "use strict";

  var firebaseVersion = "10.12.5";
  var maxEventDays = 180;
  var state = {
    storage: null,
    event: null,
    responses: {},
    participantId: localStorage.getItem("w2h.participantId") || randomId("p"),
    participantName: localStorage.getItem("w2h.participantName") || "",
    myDates: new Set(),
    dragValue: null,
    saveTimer: null
  };

  localStorage.setItem("w2h.participantId", state.participantId);

  var els = {
    syncStatus: document.getElementById("syncStatus"),
    setupNotice: document.getElementById("setupNotice"),
    eventForm: document.getElementById("eventForm"),
    eventTitle: document.getElementById("eventTitle"),
    startDate: document.getElementById("startDate"),
    endDate: document.getElementById("endDate"),
    joinForm: document.getElementById("joinForm"),
    joinCode: document.getElementById("joinCode"),
    eventPanel: document.getElementById("eventPanel"),
    eventRange: document.getElementById("eventRange"),
    eventName: document.getElementById("eventName"),
    eventCode: document.getElementById("eventCode"),
    shareLink: document.getElementById("shareLink"),
    copyLinkButton: document.getElementById("copyLinkButton"),
    newEventButton: document.getElementById("newEventButton"),
    participantName: document.getElementById("participantName"),
    saveState: document.getElementById("saveState"),
    calendarWrap: document.getElementById("calendarWrap"),
    clearMyDates: document.getElementById("clearMyDates"),
    participantCount: document.getElementById("participantCount"),
    bestDates: document.getElementById("bestDates"),
    heatmap: document.getElementById("heatmap")
  };

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    state.storage = createLocalStorageAdapter();
    setDefaultDates();
    bindEvents();
    setSyncStatus("demo", "Demo storage");
    bootFirebaseIfConfigured();
    routeFromHash();
  }

  function bindEvents() {
    els.eventForm.addEventListener("submit", function (event) {
      event.preventDefault();
      createEventFromForm();
    });

    els.joinForm.addEventListener("submit", function (event) {
      event.preventDefault();
      openJoinInput();
    });

    els.copyLinkButton.addEventListener("click", copyShareLink);
    els.newEventButton.addEventListener("click", function () {
      window.location.hash = "";
      state.event = null;
      state.responses = {};
      state.myDates = new Set();
      els.eventPanel.classList.add("hidden");
    });

    els.participantName.value = state.participantName;
    els.participantName.addEventListener("input", function () {
      state.participantName = els.participantName.value.trim();
      localStorage.setItem("w2h.participantName", state.participantName);
      scheduleSave();
    });

    els.clearMyDates.addEventListener("click", function () {
      state.myDates = new Set();
      renderCalendar();
      scheduleSave();
    });

    window.addEventListener("hashchange", routeFromHash);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);
  }

  function setDefaultDates() {
    var today = new Date();
    var start = addDays(today, 1);
    var end = addDays(today, 35);
    els.startDate.value = toISODate(start);
    els.endDate.value = toISODate(end);
  }

  function createEventFromForm() {
    var title = els.eventTitle.value.trim();
    var startDate = els.startDate.value;
    var endDate = els.endDate.value;
    var validation = validateEventDates(startDate, endDate);

    if (!title || validation) {
      alert(validation || "Please name the event.");
      return;
    }

    var event = {
      id: randomId("evt"),
      title: title,
      startDate: startDate,
      endDate: endDate,
      createdAt: new Date().toISOString()
    };

    state.storage.saveEvent(event).then(function () {
      navigateToEvent(event);
    }).catch(function (error) {
      console.error(error);
      alert("Could not create the event. Check the storage setup and try again.");
    });
  }

  function validateEventDates(startDate, endDate) {
    var start = dateFromISO(startDate);
    var end = dateFromISO(endDate);

    if (!start || !end) {
      return "Choose both start and end dates.";
    }

    if (end < start) {
      return "End date must be after start date.";
    }

    if (daysBetween(start, end) + 1 > maxEventDays) {
      return "Keep the interval to " + maxEventDays + " days or fewer.";
    }

    return "";
  }

  function navigateToEvent(event) {
    window.location.hash = "#/e/" + event.id + "/" + encodeEvent(event);
  }

  function openJoinInput() {
    var raw = els.joinCode.value.trim();
    if (!raw) {
      return;
    }

    try {
      var parsedUrl = new URL(raw);
      if (parsedUrl.hash) {
        window.location.hash = parsedUrl.hash;
        return;
      }
    } catch (ignore) {
      // Plain event codes are handled below.
    }

    window.location.hash = "#/e/" + encodeURIComponent(raw);
  }

  function routeFromHash() {
    var parts = window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    if (parts[0] !== "e" || !parts[1]) {
      return;
    }

    var eventId = decodeURIComponent(parts[1]);
    var encoded = parts[2] || "";
    var eventFromLink = encoded ? decodeEvent(encoded) : null;

    state.storage.getEvent(eventId).then(function (storedEvent) {
      var event = storedEvent || eventFromLink;
      if (!event) {
        alert("Event not found. Paste the full share link or configure Firebase for code-only joins.");
        return;
      }
      showEvent(event);
    }).catch(function () {
      if (eventFromLink) {
        showEvent(eventFromLink);
        return;
      }
      alert("Event not found. Paste the full share link or check the storage setup.");
    });
  }

  function showEvent(event) {
    state.event = event;
    state.responses = {};
    state.myDates = new Set();
    state.storage.saveEvent(event).catch(function (error) {
      console.warn("Could not cache event metadata.", error);
    });

    els.eventPanel.classList.remove("hidden");
    els.eventName.textContent = event.title;
    els.eventRange.textContent = formatDateRange(event.startDate, event.endDate);
    els.eventCode.textContent = event.id;
    els.shareLink.value = buildShareUrl(event);
    els.saveState.textContent = "Ready";

    state.storage.watchResponses(event.id, function (responses) {
      state.responses = responses || {};
      var mine = state.responses[state.participantId];
      state.myDates = new Set(mine && mine.dates ? Object.keys(mine.dates).filter(function (key) {
        return mine.dates[key];
      }) : Array.from(state.myDates));

      if (mine && mine.name && !els.participantName.value) {
        els.participantName.value = mine.name;
        state.participantName = mine.name;
      }

      renderCalendar();
      renderResults();
    });

    renderCalendar();
    renderResults();
  }

  function buildShareUrl(event) {
    var base = window.location.href.split("#")[0];
    return base + "#/e/" + event.id + "/" + encodeEvent(event);
  }

  function copyShareLink() {
    els.shareLink.select();
    navigator.clipboard.writeText(els.shareLink.value).then(function () {
      els.copyLinkButton.textContent = "Copied";
      setTimeout(function () {
        els.copyLinkButton.textContent = "Copy";
      }, 1200);
    }).catch(function () {
      document.execCommand("copy");
    });
  }

  function renderCalendar() {
    if (!state.event) {
      return;
    }

    var dates = enumerateDates(state.event.startDate, state.event.endDate);
    var months = groupDatesByMonth(dates);
    els.calendarWrap.innerHTML = "";

    months.forEach(function (month) {
      var block = document.createElement("div");
      block.className = "month-block";

      var title = document.createElement("div");
      title.className = "month-title";
      title.textContent = month.label;
      block.appendChild(title);

      var weekdays = document.createElement("div");
      weekdays.className = "weekday-row";
      ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach(function (day) {
        var node = document.createElement("div");
        node.textContent = day;
        weekdays.appendChild(node);
      });
      block.appendChild(weekdays);

      var grid = document.createElement("div");
      grid.className = "month-grid";

      for (var i = 0; i < month.leadingBlanks; i += 1) {
        var blank = document.createElement("div");
        blank.className = "blank-cell";
        grid.appendChild(blank);
      }

      month.dates.forEach(function (dateInfo) {
        var cell = document.createElement("button");
        cell.type = "button";
        cell.className = "date-cell" + (state.myDates.has(dateInfo.iso) ? " selected" : "");
        cell.dataset.date = dateInfo.iso;
        cell.setAttribute("aria-pressed", state.myDates.has(dateInfo.iso) ? "true" : "false");
        cell.innerHTML =
          '<span class="date-day">' + dateInfo.day + '</span>' +
          '<span class="date-weekday">' + dateInfo.weekday + '</span>';

        cell.addEventListener("pointerdown", startDragging);
        cell.addEventListener("pointerenter", continueDragging);
        grid.appendChild(cell);
      });

      block.appendChild(grid);
      els.calendarWrap.appendChild(block);
    });
  }

  function startDragging(event) {
    if (!state.participantName) {
      els.participantName.focus();
      els.saveState.textContent = "Add your name first";
      return;
    }

    event.preventDefault();
    var date = event.currentTarget.dataset.date;
    state.dragValue = !state.myDates.has(date);
    applyDateSelection(date, state.dragValue);
  }

  function continueDragging(event) {
    if (state.dragValue === null) {
      return;
    }

    applyDateSelection(event.currentTarget.dataset.date, state.dragValue);
  }

  function stopDragging() {
    if (state.dragValue !== null) {
      state.dragValue = null;
      scheduleSave();
    }
  }

  function applyDateSelection(date, selected) {
    if (selected) {
      state.myDates.add(date);
    } else {
      state.myDates.delete(date);
    }

    document.querySelectorAll('.date-cell[data-date="' + date + '"]').forEach(function (cell) {
      cell.classList.toggle("selected", selected);
      cell.setAttribute("aria-pressed", selected ? "true" : "false");
    });
  }

  function scheduleSave() {
    if (!state.event || !state.participantName) {
      return;
    }

    clearTimeout(state.saveTimer);
    els.saveState.textContent = "Saving...";
    state.saveTimer = setTimeout(saveMyResponse, 250);
  }

  function saveMyResponse() {
    var dates = {};
    Array.from(state.myDates).sort().forEach(function (date) {
      dates[date] = true;
    });

    state.storage.saveResponse(state.event.id, state.participantId, {
      name: state.participantName,
      dates: dates,
      updatedAt: new Date().toISOString()
    }).then(function () {
      els.saveState.textContent = "Saved";
    }).catch(function (error) {
      console.error(error);
      els.saveState.textContent = "Save failed";
    });
  }

  function renderResults() {
    if (!state.event) {
      return;
    }

    var dates = enumerateDates(state.event.startDate, state.event.endDate);
    var responses = Object.keys(state.responses).map(function (key) {
      return state.responses[key];
    }).filter(function (response) {
      return response && response.name;
    });

    els.participantCount.textContent =
      responses.length + (responses.length === 1 ? " person" : " people");

    var counts = dates.map(function (dateInfo) {
      var names = responses.filter(function (response) {
        return response.dates && response.dates[dateInfo.iso];
      }).map(function (response) {
        return response.name;
      });

      return {
        iso: dateInfo.iso,
        label: formatDateShort(dateInfo.iso),
        names: names,
        count: names.length
      };
    });

    var best = counts.slice().sort(function (a, b) {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.iso.localeCompare(b.iso);
    }).slice(0, 5);

    els.bestDates.innerHTML = "";
    if (!responses.length) {
      els.bestDates.innerHTML = '<div class="empty-results">No one has added availability yet.</div>';
    } else {
      best.forEach(function (item) {
        var card = document.createElement("div");
        card.className = "best-card";
        card.innerHTML =
          "<strong>" + item.label + "</strong>" +
          "<span>" + item.count + " available" + formatNames(item.names) + "</span>";
        els.bestDates.appendChild(card);
      });
    }

    var maxCount = Math.max(1, responses.length);
    els.heatmap.innerHTML = "";
    counts.forEach(function (item) {
      var level = item.count === 0 ? 0 : Math.max(1, Math.ceil((item.count / maxCount) * 4));
      var cell = document.createElement("div");
      cell.className = "heat-cell";
      cell.dataset.level = String(level);
      cell.title = item.names.length ? item.names.join(", ") : "No availability yet";
      cell.innerHTML =
        "<strong>" + item.label + "</strong>" +
        "<span>" + item.count + "/" + responses.length + " available</span>";
      els.heatmap.appendChild(cell);
    });
  }

  function formatNames(names) {
    if (!names.length) {
      return "";
    }
    if (names.length <= 3) {
      return ": " + names.join(", ");
    }
    return ": " + names.slice(0, 3).join(", ") + " +" + (names.length - 3);
  }

  function createLocalStorageAdapter() {
    var unwatchers = {};

    return {
      mode: "demo",
      saveEvent: function (event) {
        localStorage.setItem("w2h.event." + event.id, JSON.stringify(event));
        return Promise.resolve();
      },
      getEvent: function (eventId) {
        var raw = localStorage.getItem("w2h.event." + eventId);
        return Promise.resolve(raw ? JSON.parse(raw) : null);
      },
      saveResponse: function (eventId, participantId, response) {
        var key = "w2h.responses." + eventId;
        var responses = JSON.parse(localStorage.getItem(key) || "{}");
        responses[participantId] = response;
        localStorage.setItem(key, JSON.stringify(responses));
        if (unwatchers[eventId]) {
          unwatchers[eventId](responses);
        }
        return Promise.resolve();
      },
      watchResponses: function (eventId, callback) {
        var key = "w2h.responses." + eventId;
        unwatchers[eventId] = callback;
        callback(JSON.parse(localStorage.getItem(key) || "{}"));
        return function () {
          delete unwatchers[eventId];
        };
      }
    };
  }

  function bootFirebaseIfConfigured() {
    var config = window.WHEN2HANGOUT_CONFIG && window.WHEN2HANGOUT_CONFIG.firebase;
    if (!config || !config.apiKey || !config.databaseURL || !config.projectId) {
      return;
    }

    Promise.all([
      import("https://www.gstatic.com/firebasejs/" + firebaseVersion + "/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/" + firebaseVersion + "/firebase-database.js")
    ]).then(function (modules) {
      var firebaseApp = modules[0];
      var firebaseDb = modules[1];
      var app = firebaseApp.initializeApp(config);
      var database = firebaseDb.getDatabase(app);

      state.storage = createFirebaseAdapter(firebaseDb, database);
      setSyncStatus("online", "Shared sync");
      els.setupNotice.classList.add("hidden");

      if (state.event) {
        state.storage.saveEvent(state.event);
        showEvent(state.event);
      }
    }).catch(function (error) {
      console.error(error);
      setSyncStatus("demo", "Firebase unavailable");
    });
  }

  function createFirebaseAdapter(firebaseDb, database) {
    var activeUnsubscribe = null;

    return {
      mode: "firebase",
      saveEvent: function (event) {
        return firebaseDb.set(firebaseDb.ref(database, "events/" + event.id), event);
      },
      getEvent: function (eventId) {
        return firebaseDb.get(firebaseDb.ref(database, "events/" + eventId)).then(function (snapshot) {
          return snapshot.exists() ? snapshot.val() : null;
        });
      },
      saveResponse: function (eventId, participantId, response) {
        return firebaseDb.set(
          firebaseDb.ref(database, "responses/" + eventId + "/" + participantId),
          response
        );
      },
      watchResponses: function (eventId, callback) {
        if (activeUnsubscribe) {
          activeUnsubscribe();
        }

        activeUnsubscribe = firebaseDb.onValue(
          firebaseDb.ref(database, "responses/" + eventId),
          function (snapshot) {
            callback(snapshot.exists() ? snapshot.val() : {});
          }
        );

        return activeUnsubscribe;
      }
    };
  }

  function setSyncStatus(mode, text) {
    els.syncStatus.textContent = text;
    els.syncStatus.className = "sync-pill " + mode;
  }

  function randomId(prefix) {
    var bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    var token = Array.from(bytes).map(function (byte) {
      return byte.toString(36).padStart(2, "0");
    }).join("").slice(0, 10);
    return prefix + "-" + token;
  }

  function encodeEvent(event) {
    return encodeBase64Url(JSON.stringify({
      id: event.id,
      title: event.title,
      startDate: event.startDate,
      endDate: event.endDate,
      createdAt: event.createdAt
    }));
  }

  function decodeEvent(encoded) {
    try {
      return JSON.parse(decodeBase64Url(encoded));
    } catch (error) {
      return null;
    }
  }

  function encodeBase64Url(value) {
    var bytes = new TextEncoder().encode(value);
    var binary = "";
    bytes.forEach(function (byte) {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function decodeBase64Url(encoded) {
    var normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
    while (normalized.length % 4) {
      normalized += "=";
    }

    var binary = atob(normalized);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }

  function enumerateDates(startISO, endISO) {
    var start = dateFromISO(startISO);
    var end = dateFromISO(endISO);
    var dates = [];
    var cursor = start;

    while (cursor <= end) {
      dates.push({
        iso: toISODate(cursor),
        day: cursor.getDate(),
        weekday: cursor.toLocaleDateString(undefined, { weekday: "short" })
      });
      cursor = addDays(cursor, 1);
    }

    return dates;
  }

  function groupDatesByMonth(dates) {
    var groups = [];

    dates.forEach(function (dateInfo) {
      var date = dateFromISO(dateInfo.iso);
      var key = date.getFullYear() + "-" + date.getMonth();
      var group = groups.find(function (item) {
        return item.key === key;
      });

      if (!group) {
        group = {
          key: key,
          label: date.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
          leadingBlanks: date.getDay(),
          dates: []
        };
        groups.push(group);
      }

      group.dates.push(dateInfo);
    });

    return groups;
  }

  function dateFromISO(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
      return null;
    }
    var parts = value.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function toISODate(date) {
    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, "0");
    var day = String(date.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  function addDays(date, days) {
    var next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    next.setDate(next.getDate() + days);
    return next;
  }

  function daysBetween(start, end) {
    return Math.round((end - start) / 86400000);
  }

  function formatDateRange(startISO, endISO) {
    return formatDateShort(startISO) + " to " + formatDateShort(endISO);
  }

  function formatDateShort(iso) {
    return dateFromISO(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      weekday: "short"
    });
  }
})();
