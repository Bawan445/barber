var timeSlotsTemplate = [
    "12:00 PM", "12:30 PM",
    "01:00 PM", "01:30 PM",
    "02:00 PM", "02:30 PM",
    "03:00 PM", "03:30 PM",
    "04:00 PM", "04:30 PM",
    "05:00 PM", "05:30 PM",
    "06:00 PM", "06:30 PM",
    "07:00 PM", "07:30 PM",
    "08:00 PM", "08:30 PM",
    "09:00 PM", "09:30 PM",
    "10:00 PM", "10:30 PM",
    "11:00 PM", "11:30 PM",
    "12:00 AM"
];

var bookings = JSON.parse(localStorage.getItem("barber_direct_slots")) || {};
var financeRecords = JSON.parse(localStorage.getItem("barber_finance")) || [];
var bookingHistoryLog = JSON.parse(localStorage.getItem("barber_booking_log")) || [];
var lastActiveDate = localStorage.getItem("barber_last_date") || "";

var currentPasscode = localStorage.getItem("barber_pin") || "1234";
var enteredPin = "";

window.onload = function() {
    checkMidnightAutoReset(); // پشکنینی ئۆتۆماتیکی بۆ گۆڕانی ڕۆژ دوای کاتژمێر ١٢ی شەو
    startClock();
    renderSchedule();
    renderFinance();
    populateArchiveMonths();
    setInterval(updateSlotColorsOnly, 30000);
    setInterval(checkMidnightAutoReset, 60000); // هەموو خولەکێک دەپشکنێت
};

// ==========================================
// ١. لۆژیکی بەتاڵبوونەوەی ئۆتۆماتیکی دوای ١٢ی شەو
// ==========================================
function checkMidnightAutoReset() {
    var todayStr = new Date().toISOString().split("T")[0];

    if (!lastActiveDate) {
        lastActiveDate = todayStr;
        localStorage.setItem("barber_last_date", todayStr);
        return;
    }

    // ئەگەر بەروارەکە ڕۆشتە سەر ڕۆژێکی تر (واتە ١٢ی شەو تێپەڕی)
    if (lastActiveDate !== todayStr) {
        // تەواوی خانەکانی شاشە بەتاڵ دەبنەوە بۆ ڕۆژە نوێکە
        bookings = {};
        localStorage.removeItem("barber_direct_slots");

        // بەرواری نوێ تۆمار دەکرێت
        lastActiveDate = todayStr;
        localStorage.setItem("barber_last_date", todayStr);

        renderSchedule();
    }
}

function startClock() {
    function update() {
        var now = new Date();
        var timeElem = document.getElementById("live-time");
        var dateElem = document.getElementById("live-date");
        if (timeElem) timeElem.innerText = now.toLocaleTimeString("en-US", { hour12: true });
        if (dateElem) {
            var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            dateElem.innerText = now.toLocaleDateString('ckb', options);
        }
    }
    update();
    setInterval(update, 1000);
}

function isTimePassed(timeStr) {
    var now = new Date();
    var parts = timeStr.split(" ");
    var hm = parts[0].split(":");
    var hour = parseInt(hm[0], 10);
    var minute = parseInt(hm[1], 10);
    var ampm = parts[1];

    if (ampm === "PM" && hour < 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 24;

    var currentHour = now.getHours();
    var currentMin = now.getMinutes();

    if (currentHour === 0 && hour === 24) {
        return currentMin >= minute;
    }

    if (currentHour > hour) return true;
    if (currentHour === hour && currentMin >= minute) return true;
    return false;
}

// کێشانی خانەکان
function renderSchedule() {
    var container = document.getElementById("slots-container");
    if (!container) return;
    container.innerHTML = "";

    for (var i = 0; i < timeSlotsTemplate.length; i++) {
        var time = timeSlotsTemplate[i];
        var data = bookings[time] || { work: "", phone: "" };
        var hasData = (data.work.trim() !== "" || data.phone.trim() !== "");
        var passed = isTimePassed(time);

        var statusClass = "";
        if (hasData) {
            statusClass = passed ? "status-expired" : "status-active";
        }

        var readonlyAttr = hasData ? "readonly" : "";

        var actionBtnHtml = "";
        if (hasData) {
            actionBtnHtml = '<button type="button" class="btn-clear-slot" onclick="clearSlot(' + i + ')">✕ لادان</button>';
        } else {
            actionBtnHtml = '<button type="button" class="btn-save-slot" onclick="saveSlot(' + i + ')">تۆمارکردن</button>';
        }

        var html = 
            '<div class="time-slot-row ' + statusClass + '" id="slot-row-' + i + '">' +
                '<div class="slot-time-badge">' + time + '</div>' +
                '<div class="slot-inputs">' +
                    '<input type="text" class="input-work" id="work-in-' + i + '" placeholder="کاری موشتەری (قژ، ئوتو، ...)" value="' + (data.work || '') + '" ' + readonlyAttr + '>' +
                    '<input type="tel" class="input-phone" id="phone-in-' + i + '" placeholder="ژمارەی مۆبایل" value="' + (data.phone || '') + '" ' + readonlyAttr + '>' +
                '</div>' +
                '<div class="slot-btns">' +
                    actionBtnHtml +
                '</div>' +
            '</div>';

        container.innerHTML += html;
    }
}

function updateSlotColorsOnly() {
    for (var i = 0; i < timeSlotsTemplate.length; i++) {
        var time = timeSlotsTemplate[i];
        var data = bookings[time] || { work: "", phone: "" };
        var hasData = (data.work.trim() !== "" || data.phone.trim() !== "");
        var row = document.getElementById("slot-row-" + i);

        if (row) {
            row.classList.remove("status-active", "status-expired");
            if (hasData) {
                var passed = isTimePassed(time);
                row.classList.add(passed ? "status-expired" : "status-active");
            }
        }
    }
}

// تۆمارکردنی نۆرە
window.saveSlot = function(index) {
    var time = timeSlotsTemplate[index];
    var workIn = document.getElementById("work-in-" + index);
    var phoneIn = document.getElementById("phone-in-" + index);

    var workVal = workIn ? workIn.value.trim() : "";
    var phoneVal = phoneIn ? phoneIn.value.trim() : "";

    if (workVal === "" && phoneVal === "") {
        alert("تکایە کاری موشتەری یان مۆبایل بنووسە پێش تۆمارکردن!");
        return;
    }

    bookings[time] = {
        work: workVal,
        phone: phoneVal
    };
    localStorage.setItem("barber_direct_slots", JSON.stringify(bookings));

    // پاشەکەوتکردنی هەمیشەیی لە لۆگی مێژوودا بۆ ئەرشیفی مانگانە
    bookingHistoryLog.push({
        time: time,
        work: workVal,
        phone: phoneVal,
        timestamp: new Date().toISOString()
    });
    localStorage.setItem("barber_booking_log", JSON.stringify(bookingHistoryLog));

    renderSchedule();
    populateArchiveMonths();
};

window.clearSlot = function(index) {
    var time = timeSlotsTemplate[index];
    if (confirm("ئایا دڵنیایت دەتەوێت نۆرەی کاتژمێر " + time + " لابدەیت؟")) {
        delete bookings[time];
        localStorage.setItem("barber_direct_slots", JSON.stringify(bookings));
        renderSchedule();
    }
};

window.clearTodayBookings = function() {
    if (confirm("ئایا دڵنیایت دەتەوێت خشتەی هەموو ڕۆژەکە بەتاڵ بکەیتەوە؟")) {
        bookings = {};
        localStorage.removeItem("barber_direct_slots");
        renderSchedule();
    }
};

// ==========================================
// ٢. ئەرشیفی مانگانە و ژمێریاری
// ==========================================
window.openFinanceModal = function() {
    renderFinance();
    populateArchiveMonths();
    document.getElementById("finance-modal").classList.add("active");
};

window.closeFinanceModal = function() {
    document.getElementById("finance-modal").classList.remove("active");
};

function renderFinance() {
    var now = new Date();
    var todayStr = now.toISOString().split("T")[0];
    var currentMonth = now.getMonth();
    var currentYear = now.getFullYear();

    var todayCount = 0;
    var monthCount = 0;

    bookingHistoryLog.forEach(function(item) {
        var d = new Date(item.timestamp);
        if (item.timestamp && item.timestamp.indexOf(todayStr) === 0) {
            todayCount++;
        }
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
            monthCount++;
        }
    });

    var todayEl = document.getElementById("stat-today-count");
    var monthEl = document.getElementById("stat-month-count");
    if (todayEl) todayEl.innerText = todayCount;
    if (monthEl) monthEl.innerText = monthCount;

    var totalInc = 0;
    var totalExp = 0;

    financeRecords.forEach(function(item) {
        var d = new Date(item.date || item.id);
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
            if (item.type === "income") totalInc += item.amount;
            else totalExp += item.amount;
        }
    });

    document.getElementById("display-total-income").innerText = totalInc.toLocaleString() + " دینار";
    document.getElementById("display-total-expense").innerText = totalExp.toLocaleString() + " دینار";
    document.getElementById("display-net-profit").innerText = (totalInc - totalExp).toLocaleString() + " دینار";
}

window.addFinanceRecord = function() {
    var note = document.getElementById("fin-note").value.trim();
    var amount = parseInt(document.getElementById("fin-amount").value, 10);
    var type = document.getElementById("fin-type").value;

    if (!note || isNaN(amount) || amount <= 0) {
        alert("تکایە وردەکاری و بڕی پارەکە بە دروستی بنووسە!");
        return;
    }

    financeRecords.push({
        id: Date.now(),
        note: note,
        amount: amount,
        type: type,
        date: new Date().toISOString(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    localStorage.setItem("barber_finance", JSON.stringify(financeRecords));
    document.getElementById("fin-note").value = "";
    document.getElementById("fin-amount").value = "";
    renderFinance();
};

// کۆکردنەوەی ناوی هەموو ئەو مانگانەی داتایان تێدایە بۆ ناو سەلێکت
function populateArchiveMonths() {
    var select = document.getElementById("archive-month-select");
    if (!select) return;

    var monthsSet = {};
    bookingHistoryLog.forEach(function(item) {
        var key = item.timestamp.substring(0, 7); // YYYY-MM
        monthsSet[key] = true;
    });

    financeRecords.forEach(function(item) {
        var d = new Date(item.date || item.id);
        var key = d.toISOString().substring(0, 7);
        monthsSet[key] = true;
    });

    var keys = Object.keys(monthsSet).sort().reverse();
    select.innerHTML = '<option value="">-- مانگێک دیاریبکە --</option>';

    keys.forEach(function(mKey) {
        select.innerHTML += '<option value="' + mKey + '">' + mKey + '</option>';
    });
}

// کاتێک مانگێک لە ئەرشیف هەڵدەبژێردرێت، ئامارەکەی دەردەهێنێت
window.loadSelectedMonthArchive = function() {
    var mKey = document.getElementById("archive-month-select").value;
    var resultBox = document.getElementById("archive-result-box");
    if (!mKey) {
        resultBox.innerHTML = "";
        return;
    }

    var bookingsCount = 0;
    bookingHistoryLog.forEach(function(item) {
        if (item.timestamp.indexOf(mKey) === 0) {
            bookingsCount++;
        }
    });

    var income = 0;
    var expense = 0;
    financeRecords.forEach(function(item) {
        var d = new Date(item.date || item.id);
        if (d.toISOString().indexOf(mKey) === 0) {
            if (item.type === "income") income += item.amount;
            else expense += item.amount;
        }
    });

    resultBox.innerHTML = 
        '<div style="background:#040914; padding:10px; border-radius:8px; border:1px solid #1e3152;">' +
            '📌 <strong>ئاماری مانگی (' + mKey + '):</strong><br>' +
            '✂️ ژمارەی نۆرە تۆمارکراوەکان: <strong>' + bookingsCount + ' نۆرە</strong><br>' +
            '💰 کۆی داهات: <span style="color:#34d399;">' + income.toLocaleString() + ' دینار</span><br>' +
            '📉 کۆی خەرجی: <span style="color:#f87171;">' + expense.toLocaleString() + ' دینار</span><br>' +
            '💎 قازانجی پاک: <span style="color:#38bdf8; font-weight:bold;">' + (income - expense).toLocaleString() + ' دینار</span>' +
        '</div>';
};

// دابەزاندنی نوسخەی پاشەکەوت (Backup)
window.exportDataToFile = function() {
    var backupObj = {
        bookingLog: bookingHistoryLog,
        finance: financeRecords
    };
    var str = JSON.stringify(backupObj, null, 2);
    var blob = new Blob([str], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "Barbershop_Archive_" + new Date().toISOString().split("T")[0] + ".json";
    a.click();
    URL.revokeObjectURL(url);
};

// ==========================================
// ٣. پاسۆرد و قوفڵ (PIN)
// ==========================================
window.pressKey = function(num) {
    if (enteredPin.length < 4) {
        enteredPin += num.toString();
        updateDots();
    }
    if (enteredPin.length === 4) {
        setTimeout(verifyPin, 100);
    }
};

window.deleteKey = function() {
    if (enteredPin.length > 0) {
        enteredPin = enteredPin.slice(0, -1);
        updateDots();
    }
};

window.clearPin = function() {
    enteredPin = "";
    updateDots();
    document.getElementById("lock-error").innerText = "";
};

function updateDots() {
    for (var i = 1; i <= 4; i++) {
        var dot = document.getElementById("dot-" + i);
        if (dot) {
            if (i <= enteredPin.length) {
                dot.classList.add("filled");
            } else {
                dot.classList.remove("filled");
            }
        }
    }
}

function verifyPin() {
    if (enteredPin === currentPasscode) {
        document.getElementById("lock-screen").classList.remove("active");
        enteredPin = "";
        updateDots();
        document.getElementById("lock-error").innerText = "";
    } else {
        document.getElementById("lock-error").innerText = "پاسۆرد هەڵەیە! دووبارە هەوڵبدەرەوە";
        enteredPin = "";
        updateDots();
    }
}

window.lockApp = function() {
    enteredPin = "";
    updateDots();
    document.getElementById("lock-error").innerText = "";
    document.getElementById("lock-screen").classList.add("active");
};

window.changePasscodePrompt = function() {
    var oldP = prompt("تکایە پاسۆردی ئێستا لێبدە:");
    if (oldP === currentPasscode) {
        var newP = prompt("پاسۆردی نوێ (٤ ژمارە بنووسە):");
        if (newP && newP.length === 4 && !isNaN(newP)) {
            currentPasscode = newP;
            localStorage.setItem("barber_pin", newP);
            alert("پاسۆردەکە بە سەرکەوتوویی گۆڕدرا بۆ: " + newP);
        } else {
            alert("هەڵەیە! پاسۆرد دەبێت ڕێک ٤ ژمارە بێت.");
        }
    } else if (oldP !== null) {
        alert("پاسۆردی کۆن هەڵەیە!");
    }
};