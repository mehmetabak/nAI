import './menuScreen.css';

export function createMenuScreen() {
    return `
        <div id="menu-screen">
            <div class="menu-screen-close" id="menu-screen-close">×</div>
            <h5>Use Model:</h5>
            <select id="model-selector">
            </select>
        </div>
    `;
}