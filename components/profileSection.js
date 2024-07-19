import './profileSection.css';

export function createProfileSection() {
    return `
        <div id="profile-section">
            <div id="user-info">
                <img id="profile-picture" src="https://images.vexels.com/media/users/3/137047/isolated/lists/5831a17a290077c646a48c4db78a81bb-user-profile-blue-icon.png" alt="Profile Picture">
                nAI User
            </div>
            <div id="action-buttons">
                <div id="clean-button" class="action-button"><i class="fa-solid fa-eraser"></i></div>
                <div id="toggle-menu-button" class="action-button"><i class="fa-solid fa-ellipsis"></i></div>
            </div>
        </div>
    `;
}
