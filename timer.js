// Timer Module
import { addActivity } from './utils.js';
import { saveData, loadData } from './storage.js';

// DOM Elements
let timerElement;
let timerPulse;
let hoursDisplay;
let minutesDisplay;
let secondsDisplay;
let startBtn;
let pauseBtn;
let stopBtn;
let projectSelect;
let notificationToggle;
let todayWorkedDisplay;
let weekWorkedDisplay;
let timerAlertAudio;

// Timer variables
let timerInterval;
let isTimerRunning = false;
let totalSeconds = 0;
let currentProject = '';
let notificationsEnabled = true;
let timerStartTime = null;
let timerPauseTime = null;
let timerHistory = [];

// Initialize timer module
export function initTimer() {
    // Get DOM elements
    timerElement = document.getElementById('timer');
    timerPulse = document.getElementById('timer-pulse');
    hoursDisplay = document.getElementById('hours');
    minutesDisplay = document.getElementById('minutes');
    secondsDisplay = document.getElementById('seconds');
    startBtn = document.getElementById('start-btn');
    pauseBtn = document.getElementById('pause-btn');
    stopBtn = document.getElementById('stop-btn');
    projectSelect = document.getElementById('project-select');
    notificationToggle = document.getElementById('notification-toggle');
    todayWorkedDisplay = document.getElementById('today-worked');
    weekWorkedDisplay = document.getElementById('week-worked');
    timerAlertAudio = document.getElementById('timerAlertAudio');

    // Initialize event listeners
    startBtn.addEventListener('click', startTimer);
    pauseBtn.addEventListener('click', pauseTimer);
    stopBtn.addEventListener('click', stopTimer);
    
    // Initialize project selection
    if (projectSelect) {
        projectSelect.addEventListener('change', function() {
            currentProject = this.value;
        });
        currentProject = projectSelect.value;
    }

    // Initialize notifications
    initNotifications();
    
    // Load previous timer state (if any)
    loadTimerState();
    
    // Load timer history and update stats
    loadTimerHistory();
    updateTimerStats();
}

// Initialize notifications support
function initNotifications() {
    if ('Notification' in window) {
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            notificationToggle.addEventListener('change', requestNotificationPermission);
        } else if (Notification.permission === 'granted') {
            notificationsEnabled = true;
            notificationToggle.checked = true;
        } else {
            notificationsEnabled = false;
            notificationToggle.checked = false;
        }
        
        // Add event listener for notification toggle
        notificationToggle.addEventListener('change', function() {
            if (this.checked && Notification.permission !== 'granted') {
                requestNotificationPermission();
            } else {
                notificationsEnabled = this.checked;
            }
        });
    } else {
        // Browser does not support notifications
        notificationsEnabled = false;
        notificationToggle.checked = false;
        notificationToggle.disabled = true;
    }
}

// Request notification permission
function requestNotificationPermission() {
    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            notificationsEnabled = true;
            notificationToggle.checked = true;
            
            // Send a test notification
            const notification = new Notification('Notifikace povoleny', {
                body: 'Nyní budete dostávat upozornění z časovače.',
                icon: 'img/logo.png'
            });
        } else {
            notificationsEnabled = false;
            notificationToggle.checked = false;
        }
    });
}

// Start the timer
export function startTimer() {
    if (isTimerRunning) return;
    
    isTimerRunning = true;
    
    // Add pulse animation
    timerPulse.classList.add('pulse-animation');
    
    if (timerPauseTime) {
        // Resume from pause
        const pauseDuration = Date.now() - timerPauseTime;
        timerStartTime = new Date(timerStartTime.getTime() + pauseDuration);
        timerPauseTime = null;
    } else {
        // Start new timer
        timerStartTime = new Date();
        totalSeconds = 0;
        updateTimerDisplay();
    }
    
    // Log activity if utils module is available
    if (typeof addActivity === 'function') {
        const projectName = projectSelect ? projectSelect.options[projectSelect.selectedIndex].text : 'Obecný';
        addActivity('timer-start', 'Zahájeno měření času', projectName);
    }
    
    timerInterval = setInterval(() => {
        totalSeconds = Math.floor((Date.now() - timerStartTime.getTime()) / 1000);
        updateTimerDisplay();
        
        // Save timer state periodically
        if (totalSeconds % 10 === 0) {
            saveTimerState();
        }
    }, 1000);
}

// Pause the timer
export function pauseTimer() {
    if (!isTimerRunning) return;
    
    isTimerRunning = false;
    timerPulse.classList.remove('pulse-animation');
    clearInterval(timerInterval);
    timerPauseTime = Date.now();
    
    // Log activity if utils module is available
    if (typeof addActivity === 'function') {
        const projectName = projectSelect ? projectSelect.options[projectSelect.selectedIndex].text : 'Obecný';
        addActivity('timer-pause', 'Pozastaveno měření času', projectName);
    }
    
    // Save timer state
    saveTimerState();
}

// Stop the timer
export function stopTimer() {
    if (!timerStartTime) return;
    
    // Calculate final duration
    let endTime = timerPauseTime || Date.now();
    let duration = Math.floor((endTime - timerStartTime.getTime()) / 1000);
    
    // Add to timer history
    const projectName = projectSelect ? projectSelect.options[projectSelect.selectedIndex].text : 'Obecný';
    const projectId = currentProject || '0';
    
    timerHistory.push({
        project: projectName,
        projectId: projectId,
        startTime: timerStartTime,
        endTime: new Date(endTime),
        duration: duration
    });
    
    // Save timer history
    saveTimerHistory();
    
    // Reset timer
    clearInterval(timerInterval);
    isTimerRunning = false;
    timerPulse.classList.remove('pulse-animation');
    timerStartTime = null;
    timerPauseTime = null;
    totalSeconds = 0;
    updateTimerDisplay();
    
    // Show notification if enabled
    if (notificationsEnabled && Notification.permission === 'granted') {
        const formattedDuration = formatTimeForDisplay(duration);
        const notification = new Notification('Časovač zastaven', {
            body: `Celkový čas: ${formattedDuration} na projektu ${projectName}`,
            icon: 'img/logo.png',
            vibrate: [200, 100, 200]
        });
        
        // Play alert sound
        playAlertSound();
    }
    
    // Log activity if utils module is available
    if (typeof addActivity === 'function') {
        addActivity('timer-stop', 'Ukončeno měření času', `Celkem: ${formatTimeForDisplay(duration)}`);
    }
    
    // Update timer stats
    updateTimerStats();
    
    // Clear saved timer state
    clearSavedTimerState();
}

// Update timer display
function updateTimerDisplay() {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hoursDisplay) hoursDisplay.textContent = hours.toString().padStart(2, '0');
    if (minutesDisplay) minutesDisplay.textContent = minutes.toString().padStart(2, '0');
    if (secondsDisplay) secondsDisplay.textContent = seconds.toString().padStart(2, '0');
}

// Format time for display
function formatTimeForDisplay(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
}

// Save timer state to localStorage
function saveTimerState() {
    if (!timerStartTime) return;
    
    const timerState = {
        isRunning: isTimerRunning,
        startTime: timerStartTime.getTime(),
        pauseTime: timerPauseTime,
        projectId: currentProject
    };
    
    // Use storage module if available, otherwise use localStorage directly
    if (typeof saveData === 'function') {
        saveData('currentTimerState', timerState);
    } else {
        localStorage.setItem('currentTimerState', JSON.stringify(timerState));
    }
}

// Load timer state from localStorage
function loadTimerState() {
    let savedState;
    
    // Use storage module if available, otherwise use localStorage directly
    if (typeof loadData === 'function') {
        savedState = loadData('currentTimerState');
    } else {
        const savedStateString = localStorage.getItem('currentTimerState');
        if (savedStateString) {
            try {
                savedState = JSON.parse(savedStateString);
            } catch (e) {
                console.error('Error parsing timer state:', e);
            }
        }
    }
    
    if (!savedState) return;
    
    try {
        timerStartTime = new Date(savedState.startTime);
        timerPauseTime = savedState.pauseTime ? new Date(savedState.pauseTime) : null;
        currentProject = savedState.projectId;
        
        // Set project select value if it exists
        if (projectSelect && currentProject) {
            projectSelect.value = currentProject;
        }
        
        if (timerPauseTime) {
            // Timer was paused
            totalSeconds = Math.floor((timerPauseTime - timerStartTime.getTime()) / 1000);
            updateTimerDisplay();
        } else {
            // Timer was running, resume it
            totalSeconds = Math.floor((Date.now() - timerStartTime.getTime()) / 1000);
            updateTimerDisplay();
            
            if (savedState.isRunning) {
                startTimer();
            }
        }
    } catch (error) {
        console.error('Error loading timer state:', error);
        clearSavedTimerState();
    }
}

// Clear saved timer state
function clearSavedTimerState() {
    // Use storage module if available, otherwise use localStorage directly
    if (typeof saveData === 'function') {
        saveData('currentTimerState', null);
    } else {
        localStorage.removeItem('currentTimerState');
    }
}

// Load timer history
function loadTimerHistory() {
    // Use storage module if available, otherwise use localStorage directly
    if (typeof loadData === 'function') {
        const history = loadData('timerHistory');
        if (history) {
            timerHistory = history;
            
            // Convert date strings to Date objects
            timerHistory.forEach(entry => {
                if (typeof entry.startTime === 'string') {
                    entry.startTime = new Date(entry.startTime);
                }
                if (typeof entry.endTime === 'string') {
                    entry.endTime = new Date(entry.endTime);
                }
            });
        }
    } else {
        const savedHistory = localStorage.getItem('timerHistory');
        if (savedHistory) {
            try {
                timerHistory = JSON.parse(savedHistory);
                
                // Convert date strings to Date objects
                timerHistory.forEach(entry => {
                    if (typeof entry.startTime === 'string') {
                        entry.startTime = new Date(entry.startTime);
                    }
                    if (typeof entry.endTime === 'string') {
                        entry.endTime = new Date(entry.endTime);
                    }
                });
            } catch (error) {
                console.error('Error loading timer history:', error);
                timerHistory = [];
            }
        } else {
            timerHistory = [];
        }
    }
}

// Save timer history
function saveTimerHistory() {
    // Use storage module if available, otherwise use localStorage directly
    if (typeof saveData === 'function') {
        saveData('timerHistory', timerHistory);
    } else {
        localStorage.setItem('timerHistory', JSON.stringify(timerHistory));
    }
}

// Update timer statistics displays
function updateTimerStats() {
    if (!todayWorkedDisplay || !weekWorkedDisplay) return;
    
    // Ensure timer history is loaded
    loadTimerHistory();
    
    // Calculate today's worked time
    const today = new Date().toDateString();
    const todayWorked = timerHistory.reduce((total, entry) => {
        const entryDate = entry.startTime instanceof Date ? entry.startTime : new Date(entry.startTime);
        if (entryDate.toDateString() === today) {
            return total + entry.duration;
        }
        return total;
    }, 0);
    
    // Calculate this week's worked time
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    const weekWorked = timerHistory.reduce((total, entry) => {
        const entryDate = entry.startTime instanceof Date ? entry.startTime : new Date(entry.startTime);
        if (entryDate >= weekStart) {
            return total + entry.duration;
        }
        return total;
    }, 0);
    
    // Update displays
    todayWorkedDisplay.textContent = formatTimeForDisplay(todayWorked);
    weekWorkedDisplay.textContent = formatTimeForDisplay(weekWorked);
}

// Play alert sound
function playAlertSound() {
    // Get sound setting from localStorage or use default
    const soundSetting = localStorage.getItem('timerAlertSound') || 'beep';
    
    if (soundSetting !== 'none' && timerAlertAudio) {
        timerAlertAudio.src = `sounds/${soundSetting}.mp3`;
        try {
            timerAlertAudio.play();
        } catch (error) {
            console.error('Error playing alert sound:', error);
        }
    }
}

// Export additional functions that may be needed by other modules
export {
    updateTimerStats,
    loadTimerHistory,
    getTimerHistory: () => timerHistory,
    formatTimeForDisplay
};