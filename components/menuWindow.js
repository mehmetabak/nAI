import './menuWindow.css';

export function createMenuWindow() {
    return `
        <div id="menu-window">
            <div id="menu-window-close">/></div>
            <div id="aboutB" class="menu-content menu-item">About</div>
            <div id="changelogB" class="menu-content menu-item">What's New</div>
            <div id="gitB" class="menu-content menu-item">Source Code</div>
            <div id="settingsB" class="menu-content menu-item">Settings</div>
        </div>
    `;
}