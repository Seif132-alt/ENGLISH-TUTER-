

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// --- Type Definitions for Web Speech API ---
interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
}

type SpeechRecognitionErrorCode =
  | 'no-speech'
  | 'aborted'
  | 'audio-capture'
  | 'network'
  | 'not-allowed'
  | 'service-not-allowed'
  | 'bad-grammar'
  | 'language-not-supported';

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: SpeechRecognitionErrorCode;
  readonly message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionStatic {
  new(): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionStatic;
    webkitSpeechRecognition: SpeechRecognitionStatic;
  }
}

import { GoogleGenAI, Chat } from '@google/genai';

// --- Interfaces ---
interface AppSettings {
    level: 'Beginner' | 'Intermediate' | 'Advanced';
    voice: string;
    speed: number;
    fontSize: 'small' | 'medium' | 'large';
}

// --- DOM Elements ---
const chatContainer = document.getElementById('chat-container') as HTMLElement;
const micButton = document.getElementById('mic-button') as HTMLButtonElement;
const footerError = document.getElementById('footer-error') as HTMLElement;
const levelSelectionOverlay = document.getElementById('level-selection-overlay') as HTMLElement;
const appContainer = document.getElementById('app-container') as HTMLElement;
const offlineOverlay = document.getElementById('offline-overlay') as HTMLElement;
const levelButtons = {
    beginner: document.getElementById('level-beginner') as HTMLButtonElement,
    intermediate: document.getElementById('level-intermediate') as HTMLButtonElement,
    advanced: document.getElementById('level-advanced') as HTMLButtonElement,
};
const settingsButton = document.getElementById('settings-button') as HTMLElement;
const settingsOverlay = document.getElementById('settings-overlay') as HTMLElement;
const closeSettingsButton = document.getElementById('close-settings-button') as HTMLButtonElement;
const levelSelect = document.getElementById('level-select') as HTMLSelectElement;
const voiceSelect = document.getElementById('voice-select') as HTMLSelectElement;
const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
const fontSizeButtons = document.querySelectorAll('.font-size-btn');

// --- App State ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const speechSynthesis = window.speechSynthesis;
let recognition: SpeechRecognition | null = null;
let isRecording = false;
let ai: GoogleGenAI | null = null;
let chat: Chat | null = null;
let settings: AppSettings;
let voices: SpeechSynthesisVoice[] = [];

const defaultSettings: AppSettings = {
    level: 'Intermediate',
    voice: '',
    speed: 1,
    fontSize: 'medium'
};

// --- Settings Management ---
function saveSettings() {
    localStorage.setItem('appSettings', JSON.stringify(settings));
}

function loadSettings() {
    const saved = localStorage.getItem('appSettings');
    settings = saved ? { ...defaultSettings, ...JSON.parse(saved) } : { ...defaultSettings };
}

function applySettings() {
    // Font size
    document.body.className = document.body.className.replace(/font-size-\w+/g, '').trim();
    document.body.classList.add(`font-size-${settings.fontSize}`);
    fontSizeButtons.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-size') === settings.fontSize);
    });

    // Update settings modal inputs
    levelSelect.value = settings.level;
    voiceSelect.value = settings.voice;
    speedSlider.value = String(settings.speed);
}


/**
 * Creates a system instruction prompt for the AI based on the user's selected level.
 * @param {string} level - The user's selected proficiency level ('Beginner', 'Intermediate', 'Advanced').
 * @returns {string} The system instruction string.
 */
function createSystemInstruction(level: string): string {
    const baseInstruction = `You are an AI English speaking partner named Alex. Your goal is to help me practice my English conversation skills in a natural and encouraging way. After your conversational response, add a section titled '--- Feedback ---'. In this section, provide clear, constructive feedback on my previous message. Do not provide feedback on my very first message. Start the conversation first. Your entire response should be in a single block of text. You are acting as a conversational partner for a user with a proficiency level of: ${level}.`;

    switch (level) {
        case 'Beginner':
            return `${baseInstruction}\n\n**Your Persona:** Be extremely friendly, patient, and encouraging. Speak slowly and use simple vocabulary and short, clear sentences. Be very patient and wait for me to finish speaking. If I make a mistake, gently correct it. Start conversations with simple questions like "How was your day?" or "What is your favorite color?". The feedback should be very simple and focus on basic errors.`;
        case 'Intermediate':
            return `${baseInstruction}\n\n**Your Persona:** Be a friendly and helpful conversationalist. Speak at a natural, clear pace. Use a good range of vocabulary and sentence structures, but avoid overly complex language. Encourage me to explain my ideas in more detail by asking follow-up questions. The feedback should focus on improving word choice and natural phrasing.`;
        case 'Advanced':
            return `${baseInstruction}\n\n**Your Persona:** Be an articulate, engaging, and witty conversationalist, like a good friend. Speak fluently and naturally, using a rich vocabulary, idioms, and complex sentence structures. Feel free to challenge my ideas, introduce new topics, and engage in deeper, more nuanced conversations. Act like a peer. The feedback should be detailed, focusing on subtle errors, awkward phrasing, and suggesting more sophisticated expressions.`;
        default:
            return baseInstruction; // Fallback
    }
}

/**
 * Gets a level-appropriate welcome message from the AI.
 * @param {string} level - The user's selected proficiency level.
 * @returns {string} The welcome message.
 */
function getWelcomeMessageForLevel(level: 'Beginner' | 'Intermediate' | 'Advanced'): string {
    switch (level) {
        case 'Beginner':
            return "Hello! I'm Alex. Let's start with something easy. What is your favorite animal?";
        case 'Intermediate':
            return "Hi there! I'm Alex. It's great to practice with you. What's something interesting you did this week?";
        case 'Advanced':
            return "Welcome. I'm Alex, and I'm ready for an engaging conversation. What is a complex topic you're passionate about discussing today?";
        default:
            return "Hello! I'm Alex. Let's practice your English. What would you like to talk about today?";
    }
}

/**
 * Initializes the application.
 */
function initializeApp() {
    loadSettings();
    applySettings();
    populateVoiceList();

    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = populateVoiceList;
    }

    // Handle online/offline status
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (!navigator.onLine) {
        handleOffline();
    }
    
    if (!SpeechRecognition) {
        levelSelectionOverlay.classList.add('hidden');
        appContainer.classList.remove('hidden');
        showFooterError("Speech Recognition Not Supported", "Please use a modern browser like Chrome or Edge.");
        micButton.classList.add('hidden');
        return;
    }

    micButton.addEventListener('click', toggleRecording);

    const firstTimeUser = !localStorage.getItem('appSettings');
    if (firstTimeUser) {
        levelSelectionOverlay.classList.remove('hidden');
    } else {
        startChatSession(settings.level);
    }
    
    levelButtons.beginner.addEventListener('click', () => startChatSession('Beginner'));
    levelButtons.intermediate.addEventListener('click', () => startChatSession('Intermediate'));
    levelButtons.advanced.addEventListener('click', () => startChatSession('Advanced'));
    
    setupSettingsEventListeners();
}

/**
 * Starts the main chat session.
 * @param {string} level - The proficiency level chosen by the user.
 */
async function startChatSession(level: 'Beginner' | 'Intermediate' | 'Advanced') {
    if (!levelSelectionOverlay.classList.contains('hidden')) {
        levelSelectionOverlay.classList.add('hidden');
    }
    appContainer.classList.remove('hidden');

    settings.level = level;
    saveSettings();
    levelSelect.value = level;

    try {
        const systemInstruction = createSystemInstruction(level);
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: systemInstruction,
            },
        });
        setupSpeechRecognition();
        await handlePermissions(); // Proactively handle permissions
        
        // Always add the welcome message when a new session starts.
        const welcomeMessage = getWelcomeMessageForLevel(level);
        addMessageToChat(welcomeMessage, 'ai', true);

    } catch (error) {
        console.error("Initialization failed:", error);
        showFooterError("Initialization Failed", "Please check your API key and refresh.");
    }
}

/**
 * Sets up the SpeechRecognition instance.
 */
function setupSpeechRecognition() {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = handleRecognitionResult;
    recognition.onerror = handleRecognitionError;
    recognition.onend = () => { if (isRecording) stopRecording(); };
}

/**
 * Handles all event listeners for the settings modal.
 */
function setupSettingsEventListeners() {
    settingsButton.addEventListener('click', () => settingsOverlay.classList.remove('hidden'));
    closeSettingsButton.addEventListener('click', () => settingsOverlay.classList.add('hidden'));
    settingsOverlay.addEventListener('click', (e) => {
        if (e.target === settingsOverlay) {
            settingsOverlay.classList.add('hidden');
        }
    });

    levelSelect.addEventListener('change', () => {
        const newLevel = levelSelect.value as AppSettings['level'];
        if (newLevel !== settings.level) {
            chatContainer.innerHTML = '';
            startChatSession(newLevel);
        }
    });

    voiceSelect.addEventListener('change', () => {
        settings.voice = voiceSelect.value;
        saveSettings();
    });

    speedSlider.addEventListener('input', () => {
        settings.speed = parseFloat(speedSlider.value);
        saveSettings();
    });

    fontSizeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            settings.fontSize = btn.getAttribute('data-size') as AppSettings['fontSize'];
            saveSettings();
            applySettings();
        });
    });
}


/** Toggles microphone recording. */
function toggleRecording() {
    if (!recognition) return;
    isRecording ? stopRecording() : startRecording();
}

/** Starts speech recognition. */
function startRecording() {
    if (isRecording || !recognition) return;
    isRecording = true;
    micButton.classList.add('recording');
    micButton.setAttribute('aria-label', 'Stop recording');
    try {
        recognition.start();
    } catch(e) {
        console.error("Recognition start error:", e);
        stopRecording();
    }
}

/** Stops speech recognition. */
function stopRecording() {
    if (!isRecording || !recognition) return;
    isRecording = false;
    micButton.classList.remove('recording');
    micButton.setAttribute('aria-label', 'Start recording');
    recognition.stop();
}

/** Handles speech recognition results. */
async function handleRecognitionResult(event: SpeechRecognitionEvent) {
    const transcript = event.results[event.results.length - 1][0].transcript.trim();
    if (transcript) {
        addMessageToChat(transcript, 'user');
        showThinkingIndicator(true);
        try {
            if (!chat) throw new Error("Chat not initialized");
            const response = await chat.sendMessage({ message: transcript });
            showThinkingIndicator(false);
            const aiText = response.text;

            const feedbackSeparator = '--- Feedback ---';
            let conversationalPart = aiText;
            let feedbackPart = '';
            
            if (aiText.includes(feedbackSeparator)) {
                const parts = aiText.split(feedbackSeparator);
                conversationalPart = parts[0].trim();
                feedbackPart = parts[1].trim();
            }

            addMessageToChat(conversationalPart, 'ai', true, feedbackPart);
        } catch (error) {
            console.error("Gemini API error:", error);
            showThinkingIndicator(false);
            addMessageToChat("Sorry, I had trouble understanding that. Could you try again?", 'ai', true);
        }
    }
}

/** Handles speech recognition errors. */
function handleRecognitionError(event: SpeechRecognitionErrorEvent) {
    console.error('Speech recognition error:', event.error, event.message);
    stopRecording();
    
    switch (event.error) {
        case 'not-allowed':
        case 'service-not-allowed':
            showFooterError("Permission Denied", "Please allow microphone access in your browser settings.");
            micButton.classList.add('hidden');
            break;
        case 'audio-capture':
            showFooterError("No Microphone", "No microphone was found. Please ensure one is connected.");
            micButton.classList.add('hidden');
            break;
        case 'no-speech':
            // No visual error needed for this, it's not a persistent state.
            break;
        case 'network':
             handleOffline();
             break;
        default:
            showFooterError("Speech Error", "An unexpected error occurred. Please try again.");
    }
}

/** Displays a specific error message in the footer. */
function showFooterError(title: string, message: string) {
    const titleEl = footerError.querySelector('.error-title') as HTMLElement;
    const messageEl = footerError.querySelector('.error-message') as HTMLElement;
    if (titleEl && messageEl) {
        titleEl.textContent = title;
        messageEl.textContent = message;
    }
    micButton.classList.add('hidden');
    footerError.classList.remove('hidden');
}

/** Checks for connected audio devices and then requests microphone permissions. */
async function handlePermissions() {
    if (!navigator.mediaDevices?.enumerateDevices) {
        showFooterError("Feature Not Supported", "Your browser cannot enumerate devices.");
        micButton.classList.add('hidden');
        return;
    }

    try {
        // First, check if any audio input devices are available
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasMicrophone = devices.some(device => device.kind === 'audioinput');

        if (!hasMicrophone) {
             showFooterError("No Microphone Found", "Please connect a microphone and grant permission in your browser settings.");
             micButton.classList.add('hidden');
             return; // Stop here if no microphone is found
        }
        
        // Proactively request permission. This will trigger the browser prompt if the user hasn't chosen yet.
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // We have permission, so we can stop the tracks immediately as we don't need to hold the stream open.
        stream.getTracks().forEach(track => track.stop());
        
        // Ensure the mic button is visible and any previous error is hidden.
        micButton.classList.remove('hidden');
        footerError.classList.add('hidden');

    } catch (err) {
        console.error('Error requesting microphone permission:', err);
        micButton.classList.add('hidden');

        // Provide specific feedback to the user based on the error type.
        if (err instanceof DOMException) {
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                showFooterError("Permission Denied", "You've blocked microphone access. Please enable it in your browser's site settings to continue.");
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                showFooterError("No Microphone", "No microphone was found. Please ensure one is connected and working.");
            } else {
                showFooterError("Permission Error", `An unexpected hardware error occurred: ${err.message}`);
            }
        } else {
            showFooterError("Permission Error", "An unknown error occurred while trying to access the microphone.");
        }
    }
}

/** Adds a message to the chat UI. */
function addMessageToChat(text: string, sender: 'user' | 'ai', shouldSpeak: boolean = false, feedback: string = '') {
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message', sender);
    
    const textNode = document.createTextNode(text);
    messageElement.appendChild(textNode);

    if (feedback) {
        const feedbackElement = document.createElement('div');
        feedbackElement.classList.add('feedback');
        const feedbackTitle = document.createElement('strong');
        feedbackTitle.textContent = 'Feedback:';
        feedbackElement.appendChild(feedbackTitle);
        feedbackElement.appendChild(document.createElement('br'));
        const feedbackTextNode = document.createTextNode(feedback);
        feedbackElement.appendChild(feedbackTextNode);
        messageElement.appendChild(feedbackElement);
    }
    
    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    if (shouldSpeak && speechSynthesis && text) {
        speak(text);
    }
}

/** Shows or hides the "AI is thinking" indicator. */
function showThinkingIndicator(show: boolean) {
    let thinkingElement = document.getElementById('thinking-indicator');
    if (show) {
        if (!thinkingElement) {
            thinkingElement = document.createElement('div');
            thinkingElement.id = 'thinking-indicator';
            thinkingElement.classList.add('chat-message', 'thinking');
            thinkingElement.innerHTML = `<div></div><div></div><div></div>`;
            chatContainer.appendChild(thinkingElement);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    } else {
        if (thinkingElement) {
            thinkingElement.remove();
        }
    }
}

/** Populates the voice dropdown in the settings. */
function populateVoiceList() {
    voices = speechSynthesis.getVoices();
    const currentVoice = voiceSelect.value;
    voiceSelect.innerHTML = '';
    
    const filteredVoices = voices.filter(v => v.lang.startsWith('en-'));
    if (filteredVoices.length === 0 && voices.length > 0) {
        // Fallback if no english voices are explicitly listed
        filteredVoices.push(...voices.filter(v => v.default));
    }
    
    if(filteredVoices.length === 0) {
        voiceSelect.innerHTML = '<option>No voices available</option>';
        return;
    }

    filteredVoices.forEach(voice => {
        const option = document.createElement('option');
        option.textContent = `${voice.name} (${voice.lang})`;
        option.value = voice.name;
        voiceSelect.appendChild(option);
    });

    // Set default voice if not already set
    if (!settings.voice) {
        const defaultUSVoice = filteredVoices.find(v => v.lang === 'en-US' && v.default);
        settings.voice = defaultUSVoice ? defaultUSVoice.name : filteredVoices[0].name;
        saveSettings();
    }

    voiceSelect.value = settings.voice || currentVoice;
}


/** Uses the Web Speech API to speak text. */
function speak(text: string) {
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
    }
    const utterance = new SpeechSynthesisUtterance(text);
    const selectedVoice = voices.find(v => v.name === settings.voice);
    
    utterance.voice = selectedVoice || voices.find(v => v.default && v.lang.startsWith('en-')) || null;
    utterance.rate = settings.speed;
    utterance.pitch = 1;
    speechSynthesis.speak(utterance);
}

/** Handles the app going offline. */
function handleOffline() {
    offlineOverlay.classList.remove('hidden');
    micButton.disabled = true;
    if (isRecording) {
        stopRecording();
    }
}

/** Handles the app coming back online. */
function handleOnline() {
    offlineOverlay.classList.add('hidden');
    micButton.disabled = false;
    // Re-check permissions in case they were affected or this is the first time online with the app.
    if(chat) {
        handlePermissions();
    }
}


// --- App Entry Point ---
document.addEventListener('DOMContentLoaded', initializeApp);