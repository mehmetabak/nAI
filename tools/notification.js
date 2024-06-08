import toastr from 'toastr';
import 'toastr/build/toastr.min.css';

export const showNotification = (message, imageUrl) => {
    toastr.options = {
        positionClass: 'toast-bottom-right',
        timeOut: 8000,
        closeButton: true,
        progressBar: false,
        preventDuplicates: true,
        newestOnTop: true,
        extendedTimeOut: 1000,
        showMethod: 'fadeIn',
        hideMethod: 'fadeOut',
        onclick: null,
        showDuration: 300,
        hideDuration: 1000,
        timeOut: 5000,
        extendedTimeOut: 1000,
    };

    const content = `
        <div style="display: flex; align-items: center;">
            <img src="${imageUrl}" style="width: 50px; height: 50px; margin-right: 10px;" alt="notification image"/>
            <div>${message}</div>
        </div>
    `;

    toastr.success(content, "Welcome!", { allowHtml: true });

    // Custom CSS for toastr notifications
    const toastrStyle = document.createElement('style');
    toastrStyle.innerHTML = `
        #toast-container > .toast-success {
            background-color: #1abc9c; /* Turquoise background */
            color: #ffffff; /* White text */
            border-radius: 8px; /* Rounded corners for modern look */
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); /* Subtle shadow for depth */
        }
        #toast-container > .toast-success .toast-title {
            color: #ffffff; /* Title color */
            font-weight: bold; /* Bold title */
        }
        #toast-container > .toast-success .toast-message {
            color: #ffffff; /* Message color */
        }
        #toast-container > .toast-success .toast-close-button {
            color: #ffffff; /* Close button color */
        }
    `;
    document.head.appendChild(toastrStyle);
};