import './changelogScreen.css';

export function createChangelogScreen() {
    return `
        <div id="changelog-screen">
            <div class="changelog-screen-close" id="changelog-screen-close">×</div>
            <h3>Changelog</h3>
            <div class="changelog-content">
                <div class="change-item">
                    <div class="change-date">2024-07-16</div>
                    <div class="change-description">Updated the used model.</div>
                </div>
                <div class="change-item">
                    <div class="change-date">2024-06-07</div>
                    <div class="change-description">Added new feature: Clear the chat.</div>
                </div>
                <div class="change-item">
                    <div class="change-date">2024-06-06</div>
                    <div class="change-description">Fixed bug related to model changing.</div>
                </div>
            </div>
        </div>
    `;
}
